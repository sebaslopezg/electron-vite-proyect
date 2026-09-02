import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerEncargosHandlers = () => {
    
    try {
        db.exec("ALTER TABLE encargos ADD COLUMN titulo_personalizado TEXT;")
    } catch (error) {}

    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS encargos_campos (
                id TEXT PRIMARY KEY,
                label TEXT,
                type TEXT,
                options TEXT,
                required INTEGER,
                orden INTEGER
            );
        `)
        db.exec("ALTER TABLE encargos ADD COLUMN custom_data TEXT;")
        logger.info('MIGRACION', 'Se inicializaron las tablas y columnas para campos dinámicos de encargos.')
    } catch (error) {}

    try {
        db.exec("ALTER TABLE estadoEncargo ADD COLUMN usuario_asignado TEXT;")
    } catch (error) {}

    try {
        db.exec("ALTER TABLE estadoEncargo ADD COLUMN rol_asignado TEXT;")
    } catch (error) {}

    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS encargos_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `)
        db.exec(`INSERT OR IGNORE INTO encargos_settings (key, value) VALUES ('alcance_estados', 'global')`)
    } catch (error) {}

    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS encargos_history (
                id TEXT PRIMARY KEY,
                encargo_id TEXT NOT NULL,
                estado_anterior_id TEXT,
                estado_nuevo_id TEXT NOT NULL,
                usuario TEXT NOT NULL,
                fecha TEXT NOT NULL,
                FOREIGN KEY(encargo_id) REFERENCES encargos(id)
            );
        `)
    } catch (error) {
        logger.error('MIGRACION', 'Error creando la tabla encargos_history', error)
    }

    ipcMain.handle("get-encargo-history", (_, encargoId) => {
        try {
            const stmt = db.prepare(`
                SELECT h.*, 
                       e1.titulo as estado_anterior_titulo, e1.color as estado_anterior_color, e1.icon_data as estado_anterior_icon,
                       e2.titulo as estado_nuevo_titulo, e2.color as estado_nuevo_color, e2.icon_data as estado_nuevo_icon
                FROM encargos_history h
                LEFT JOIN estadoEncargo e1 ON h.estado_anterior_id = e1.id
                LEFT JOIN estadoEncargo e2 ON h.estado_nuevo_id = e2.id
                WHERE h.encargo_id = ?
                ORDER BY h.fecha DESC
            `);
            return { success: true, data: stmt.all(encargoId) };
        } catch (error) {
            logger.error('ENCARGOS', `Error al obtener el historial del encargo ${encargoId}`, error);
            return { success: false, error: error.message };
        }
    });
    // ------------------------------------------------

    ipcMain.handle("get-encargos-settings", () => {
        try {
            const settings = db.prepare("SELECT * FROM encargos_settings").all()
            return settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
        } catch (error) {
            return {}
        }
    })

    ipcMain.handle("save-encargos-settings", (_, key, value) => {
        try {
            db.prepare("INSERT OR REPLACE INTO encargos_settings (key, value) VALUES (?, ?)").run(key, value)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-encargos-campos", () => {
        try {
            return db.prepare("SELECT * FROM encargos_campos ORDER BY orden ASC").all()
        } catch (error) {
            logger.error('ENCARGOS', "Error al obtener campos dinámicos", error)
            return []
        }
    })

    ipcMain.handle("save-encargos-campos", (_, campos) => {
        try {
            const transaction = db.transaction(() => {
                db.prepare("DELETE FROM encargos_campos").run()
                const insert = db.prepare("INSERT INTO encargos_campos (id, label, type, options, required, orden) VALUES (?, ?, ?, ?, ?, ?)")
                campos.forEach((c, index) => {
                    insert.run(c.id || uuidv4(), c.label, c.type, c.options || '', c.required ? 1 : 0, index)
                })
            })
            transaction()
            logger.success('ENCARGOS', 'Formulario dinámico actualizado con éxito')
            return { success: true }
        } catch (error) {
            logger.error('ENCARGOS', "Error guardando campos dinámicos", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-encargos", () => {
        try {
            const stmt = db.prepare(`
                SELECT en.id,
                    en.encargo_numero, 
                    en.factura_numero, 
                    en.cliente_nombre, 
                    en.cliente_documento,
                    en.descripcion,
                    en.fecha_entrega, 
                    en.producto_cantidad,
                    en.titulo_personalizado,
                    en.producto_id,
                    en.custom_data,
                    es.titulo as estado_titulo, 
                    es.id as estado_id,
                    es.allow_calendar,
                    es.color as estado_color,
                    es.icon_data as icon,
                    p.ref_name as producto_nombre,
                    vm.prefijo 
                FROM encargos en
                LEFT JOIN estadoEncargo es ON en.estado_id = es.id
                LEFT JOIN producto p ON en.producto_id = p.id
                LEFT JOIN ventasMaestro vm ON en.factura_id = vm.id
                WHERE en.status > 0
            `)
            return stmt.all()
        } catch (error) {
            logger.error('ENCARGOS', "Error al intentar obtener la lista de encargos", error)
            return []
        }
    })

    ipcMain.handle("add-encargo", (_, item) => {
        try {
            const id = uuidv4()
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1
            const usuarioActivo = global.currentUserSession?.nombre_completo || global.currentUserSession?.username || 'Sistema';

            let encargoNum = item.encargo_numero
            if (!encargoNum) {
                const maxRow = db.prepare('SELECT MAX(encargo_numero) as maxNum FROM encargos').get()
                encargoNum = (maxRow?.maxNum || 0) + 1
            }

            const transaction = db.transaction(() => {
                const stmt = db.prepare(`
                    INSERT INTO encargos (
                        id, factura_id, producto_id, estado_id, almacen_id, cliente_id,
                        cliente_nombre, cliente_documento, factura_numero, producto_cantidad,
                        titulo_personalizado, encargo_numero, fecha_entrega, descripcion,
                        custom_data, notificado, status, date_created
                    ) VALUES (
                        @id, @factura_id, @producto_id, @estado_id, @almacen_id, @cliente_id,
                        @cliente_nombre, @cliente_documento, @factura_numero, @producto_cantidad,
                        @titulo_personalizado, @encargo_numero, @fecha_entrega, @descripcion,
                        @custom_data, 0, @status, @date_created
                    )
                `)

                const info = stmt.run({
                    ...item,
                    id: id,
                    titulo_personalizado: item.titulo_personalizado || '',
                    custom_data: item.custom_data || '{}',
                    encargo_numero: encargoNum,
                    date_created: now,
                    status: status
                })

                if (item.estado_id) {
                    db.prepare(`
                        INSERT INTO encargos_history (id, encargo_id, estado_anterior_id, estado_nuevo_id, usuario, fecha)
                        VALUES (?, ?, NULL, ?, ?, ?)
                    `).run(uuidv4(), id, item.estado_id, usuarioActivo, now);
                }

                return info;
            });

            const info = transaction();

            logger.success('ENCARGOS', `Encargo N° ${encargoNum} creado exitosamente`, `Factura: ${item.factura_numero} | Cliente: ${item.cliente_nombre}`)
            return { success: true, id: id, changes: info.changes }

        } catch (error) {
            logger.error('ENCARGOS', "Error al intentar registrar un nuevo encargo", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-encargo", (_, item) => {
        try {
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1
            const usuarioActivo = item.modify_by || global.currentUserSession?.nombre_completo || global.currentUserSession?.username || 'Sistema';

            const transaction = db.transaction(() => {
                const currentEncargo = db.prepare("SELECT estado_id FROM encargos WHERE id = ?").get(item.id);
                const estadoAnteriorId = currentEncargo?.estado_id;

                const stmt = db.prepare(`
                    UPDATE encargos SET
                        fecha_entrega = @fecha_entrega,
                        estado_id = @estado_id,
                        descripcion = @descripcion,
                        titulo_personalizado = @titulo_personalizado,
                        custom_data = @custom_data,
                        notificado = 0,
                        date_modify = @date_modify,
                        modify_by = @modify_by
                    WHERE id = @id
                `)
                const info = stmt.run({
                    ...item,
                    titulo_personalizado: item.titulo_personalizado || '',
                    custom_data: item.custom_data || '{}',
                    date_modify: now,
                    modify_by: usuarioActivo,
                    status: status
                })

                if (estadoAnteriorId !== item.estado_id) {
                    db.prepare(`
                        INSERT INTO encargos_history (id, encargo_id, estado_anterior_id, estado_nuevo_id, usuario, fecha)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(uuidv4(), item.id, estadoAnteriorId, item.estado_id, usuarioActivo, now);
                }

                return info;
            });

            const info = transaction();

            logger.success('ENCARGOS', `Encargo actualizado con éxito`, `ID Encargo: ${item.id} | Nuevo Estado: ${item.estado_id}`)
            return { success: true, changes: info.changes }

        } catch (error) {
            logger.error('ENCARGOS', `Error al intentar actualizar el encargo (ID: ${item.id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-encargo", (_, item) => {
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`UPDATE encargos SET status = 0, date_modify = @date_modify, modify_by = @modify_by WHERE id = @id`)
            const info = stmt.run({ id: item, date_modify: now, modify_by: 'No user' })
            if (info.changes > 0) return { success: true, changes: info.changes };
            return { success: false, changes: 0, message: "Product ID not found." }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}