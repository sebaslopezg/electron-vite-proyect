import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerEncargosHandlers = () => {
    
    try {
        db.exec("ALTER TABLE encargos ADD COLUMN titulo_personalizado TEXT;");
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
        `);
        db.exec("ALTER TABLE encargos ADD COLUMN custom_data TEXT;");
        logger.info('MIGRACION', 'Se inicializaron las tablas y columnas para campos dinámicos de encargos.');
    } catch (error) {}

    ipcMain.handle("get-encargos-campos", () => {
        try {
            return db.prepare("SELECT * FROM encargos_campos ORDER BY orden ASC").all();
        } catch (error) {
            logger.error('ENCARGOS', "Error al obtener campos dinámicos", error);
            return [];
        }
    });

    ipcMain.handle("save-encargos-campos", (_, campos) => {
        try {
            const transaction = db.transaction(() => {
                db.prepare("DELETE FROM encargos_campos").run();
                const insert = db.prepare("INSERT INTO encargos_campos (id, label, type, options, required, orden) VALUES (?, ?, ?, ?, ?, ?)");
                campos.forEach((c, index) => {
                    insert.run(c.id || uuidv4(), c.label, c.type, c.options || '', c.required ? 1 : 0, index);
                });
            });
            transaction();
            logger.success('ENCARGOS', 'Formulario dinámico actualizado con éxito');
            return { success: true };
        } catch (error) {
            logger.error('ENCARGOS', "Error guardando campos dinámicos", error);
            return { success: false, error: error.message };
        }
    });

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

            let encargoNum = item.encargo_numero
            if (!encargoNum) {
                const maxRow = db.prepare('SELECT MAX(encargo_numero) as maxNum FROM encargos').get()
                encargoNum = (maxRow?.maxNum || 0) + 1
            }

            const stmt = db.prepare(`
                INSERT INTO encargos (
                    id, factura_id, producto_id, estado_id, almacen_id, cliente_id,
                    cliente_nombre, cliente_documento, factura_numero, producto_cantidad,
                    titulo_personalizado, encargo_numero, fecha_entrega, descripcion,
                    custom_data, status, date_created
                ) VALUES (
                    @id, @factura_id, @producto_id, @estado_id, @almacen_id, @cliente_id,
                    @cliente_nombre, @cliente_documento, @factura_numero, @producto_cantidad,
                    @titulo_personalizado, @encargo_numero, @fecha_entrega, @descripcion,
                    @custom_data, @status, @date_created
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
            const stmt = db.prepare(`
                UPDATE encargos SET
                    fecha_entrega = @fecha_entrega,
                    estado_id = @estado_id,
                    descripcion = @descripcion,
                    titulo_personalizado = @titulo_personalizado,
                    custom_data = @custom_data,
                    date_modify = @date_modify,
                    modify_by = @modify_by
                WHERE id = @id
            `)
            const info = stmt.run({
                ...item,
                titulo_personalizado: item.titulo_personalizado || '',
                custom_data: item.custom_data || '{}',
                date_modify: now,
                modify_by: item.modify_by || "system",
                status: status
            })

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