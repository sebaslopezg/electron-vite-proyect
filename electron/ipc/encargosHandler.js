import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { canModifyModule, triggerBackgroundPush } from "./syncHandlers.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession;
    if (!user) return false;
    if (user.permisos?.includes("ALL")) return true;
    return user.permisos?.includes(permission);
}

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
        if (!checkPermission("encargos_ver")) return { success: false, error: "No autorizado." }
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
            `)
            return { success: true, data: stmt.all(encargoId) }
        } catch (error) {
            logger.error('ENCARGOS', `Error al obtener el historial del encargo ${encargoId}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-encargos-settings", () => {
        try {
            const settings = db.prepare("SELECT * FROM encargos_settings").all()
            return settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
        } catch (error) {
            return {}
        }
    })

    ipcMain.handle("save-encargos-settings", (_, key, value) => {
        if (!checkPermission("encargos_config_estados")) {
            return { success: false, error: "No autorizado para configurar el alcance de estados." }
        }
        if (!canModifyModule('encargos_config')) {
            return { success: false, error: "La configuración está bloqueada localmente. La nube controla estos ajustes." }
        }
        try {
            db.prepare("INSERT OR REPLACE INTO encargos_settings (key, value) VALUES (?, ?)").run(key, value)
            
            triggerBackgroundPush('encargos_config').catch(e => logger.error('SYNC', 'Error en push background (encargos_config)', e))

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
        if (!checkPermission("encargos_config_campos")) {
            return { success: false, error: "No autorizado para modificar campos dinámicos." }
        }
        if (!canModifyModule('encargos_config')) {
            return { success: false, error: "Los campos dinámicos están bloqueados localmente. La nube controla estos ajustes." }
        }
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

            triggerBackgroundPush('encargos_config').catch(e => logger.error('SYNC', 'Error en push background (encargos_config)', e))

            return { success: true }
        } catch (error) {
            logger.error('ENCARGOS', "Error guardando campos dinámicos", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-encargos", () => {
        if (!checkPermission("encargos_ver")) return []
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
                    vm.prefijo,
                    t.telefono as cliente_telefono
                FROM encargos en
                LEFT JOIN estadoEncargo es ON en.estado_id = es.id
                LEFT JOIN producto p ON en.producto_id = p.id
                LEFT JOIN ventasMaestro vm ON en.factura_id = vm.id
                LEFT JOIN terceros t ON en.cliente_documento = t.numero_documento
                WHERE en.status > 0
            `)
            return stmt.all()
        } catch (error) {
            logger.error('ENCARGOS', "Error al intentar obtener la lista de encargos", error)
            return []
        }
    })

    ipcMain.handle("add-encargo", (_, item) => {
        if (!checkPermission("encargos_crear")) {
            return { success: false, error: "No autorizado para registrar nuevos encargos." }
        }
        if (!canModifyModule('encargos')) {
            return { success: false, error: "La creación de encargos está bloqueada localmente." }
        }
        try {
            const id = uuidv4()
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1
            const usuarioActivo = global.currentUserSession?.nombre_completo || global.currentUserSession?.username || 'Sistema'

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
                    `).run(uuidv4(), id, item.estado_id, usuarioActivo, now)
                }

                return info
            })

            const info = transaction()

            logger.success('ENCARGOS', `Encargo N° ${encargoNum} creado exitosamente`, `Factura: ${item.factura_numero} | Cliente: ${item.cliente_nombre}`)
            
            triggerBackgroundPush('encargos').catch(e => logger.error('SYNC', 'Error en push background (encargos)', e))

            return { success: true, id: id, changes: info.changes }

        } catch (error) {
            logger.error('ENCARGOS', "Error al intentar registrar un nuevo encargo", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-encargo", (_, item) => {
        if (!checkPermission("encargos_editar")) {
            return { success: false, error: "No autorizado para modificar encargos." }
        }
        if (!canModifyModule('encargos')) {
            return { success: false, error: "La edición de encargos está bloqueada localmente." }
        }
        try {
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1
            const usuarioActivoId = global.currentUserSession?.id || null
            const usuarioActivoRol = global.currentUserSession?.rol || null 
            const usuarioActivoStr = item.modify_by || global.currentUserSession?.nombre_completo || global.currentUserSession?.username || 'Sistema'

            return db.transaction(() => {
                const currentEncargo = db.prepare("SELECT estado_id FROM encargos WHERE id = ?").get(item.id)
                if (!currentEncargo) throw new Error("Encargo no encontrado localmente.")
                const estadoAnteriorId = currentEncargo.estado_id

                if (item.estado_id && item.estado_id !== estadoAnteriorId) {
                    const targetState = db.prepare("SELECT * FROM estadoEncargo WHERE id = ?").get(item.estado_id)
                    if (!targetState) throw new Error('El estado al que intentas mover el encargo no existe.')

                    const alcanceSetting = db.prepare("SELECT value FROM encargos_settings WHERE key = 'alcance_estados'").get()
                    const alcance = alcanceSetting?.value || 'global'

                    const isGlobalAdmin = global.currentUserSession?.permisos?.includes('ALL')

                    if (!isGlobalAdmin && alcance !== 'global') {
                        if (alcance === 'usuario') {
                            const assignedUser = targetState.usuario_asignado
                            if (assignedUser && assignedUser.trim() !== '') {
                                try {
                                    const parsedUsers = JSON.parse(assignedUser)
                                    const userExists = parsedUsers.some(u => u.nombre === global.currentUserSession?.nombre_completo || u.nombre === global.currentUserSession?.username)
                                    if(!userExists) {
                                         throw new Error(`Acceso denegado: No estás asignado para usar el estado "${targetState.titulo}".`)
                                    }
                                } catch(e) {
                                    if(e.message.includes('Acceso denegado')) throw e;
                                    if(assignedUser !== usuarioActivoId && assignedUser !== global.currentUserSession?.username && assignedUser !== global.currentUserSession?.nombre_completo) {
                                        throw new Error(`Acceso denegado: Solo los usuarios asignados pueden mover el encargo al estado "${targetState.titulo}".`)
                                    }
                                }
                            }
                        } else if (alcance === 'rol') {
                            const assignedRole = targetState.rol_asignado
                            if (assignedRole && assignedRole.trim() !== '') {
                                 try {
                                    const parsedRoles = JSON.parse(assignedRole)
                                    const roleExists = parsedRoles.some(r => r.nombre === usuarioActivoRol)
                                    if(!roleExists) {
                                        throw new Error(`Acceso denegado: No tienes el rol necesario para mover el encargo al estado "${targetState.titulo}".`)
                                    }
                                 } catch (e) {
                                     if(e.message.includes('Acceso denegado')) throw e;
                                     if(assignedRole !== usuarioActivoRol) {
                                        throw new Error(`Acceso denegado: No tienes el rol necesario para mover el encargo al estado "${targetState.titulo}".`)
                                     }
                                 }
                            }
                        }
                    }
                }

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
                    modify_by: usuarioActivoStr,
                    status: status
                })

                if (estadoAnteriorId !== item.estado_id) {
                    db.prepare(`
                        INSERT INTO encargos_history (id, encargo_id, estado_anterior_id, estado_nuevo_id, usuario, fecha)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(uuidv4(), item.id, estadoAnteriorId, item.estado_id, usuarioActivoStr, now)
                }

                logger.success('ENCARGOS', `Encargo actualizado con éxito`, `ID Encargo: ${item.id} | Nuevo Estado: ${item.estado_id}`)
                
                triggerBackgroundPush('encargos').catch(e => logger.error('SYNC', 'Error en push background (encargos)', e))

                return { success: true, changes: info.changes }
            })() 

        } catch (error) {
            logger.error('ENCARGOS', `Error al intentar actualizar el encargo (ID: ${item.id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-encargo", (_, item) => {
        if (!checkPermission("encargos_eliminar")) {
            return { success: false, error: "No autorizado para eliminar encargos." }
        }
        if (!canModifyModule('encargos')) {
            return { success: false, error: "La eliminación de encargos está bloqueada localmente." }
        }
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`UPDATE encargos SET status = 0, date_modify = @date_modify, modify_by = @modify_by WHERE id = @id`)
            const info = stmt.run({ id: item, date_modify: now, modify_by: 'No user' })
            if (info.changes > 0) {
                triggerBackgroundPush('encargos').catch(e => logger.error('SYNC', 'Error en push background (encargos)', e))
                return { success: true, changes: info.changes }
            }
            return { success: false, changes: 0, message: "Product ID not found." }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}