import { ipcMain } from "electron"
import { v4 as uuidv4 } from "uuid"
import { appDb } from "../database/index.js" 
import { logger } from "../utils/logger.js"

export const registerRolesHandlers = () => {
    
    appDb.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL UNIQUE,
            descripcion TEXT,
            permisos_json TEXT NOT NULL,
            is_system INTEGER DEFAULT 0,
            status INTEGER DEFAULT 1,
            date_created TEXT
        );
    `);

    const checkAdminRol = appDb.prepare("SELECT COUNT(*) as count FROM roles").get();
    if (checkAdminRol.count === 0) {
        appDb.prepare(`
            INSERT INTO roles (id, nombre, descripcion, permisos_json, is_system, status, date_created) 
            VALUES (?, ?, ?, ?, 1, 1, datetime('now'))
        `).run(uuidv4(), 'Administrador', 'Acceso total absoluto al sistema', '["ALL"]');
        logger.info('SISTEMA', 'Rol "Administrador" creado por defecto.');
    }

    ipcMain.handle("get-roles", () => {
        try {
            const stmt = appDb.prepare("SELECT * FROM roles WHERE status = 1 ORDER BY is_system DESC, nombre ASC")
            return { success: true, data: stmt.all() }
        } catch (error) {
            logger.error('ROLES', "Error al obtener la lista de roles", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("add-rol", async (_, rolData) => {
        try {
            const id = uuidv4()
            const permisosStr = JSON.stringify(rolData.permisos || [])

            const stmt = appDb.prepare(`
                INSERT INTO roles (id, nombre, descripcion, permisos_json, is_system, status, date_created) 
                VALUES (?, ?, ?, ?, 0, 1, datetime('now'))
            `)
            stmt.run(id, rolData.nombre.trim(), rolData.descripcion, permisosStr)
            
            logger.success('ROLES', `Nuevo rol creado: ${rolData.nombre}`);
            return { success: true, id }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: "Ya existe un rol con ese nombre." }
            }
            logger.error('ROLES', `Error creando rol: ${rolData.nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-rol", async (_, rolData) => {
        try {
            const rolActual = appDb.prepare("SELECT is_system FROM roles WHERE id = ?").get(rolData.id)
            if (rolActual && rolActual.is_system === 1) {
                return { success: false, error: "El rol del sistema no puede ser modificado." }
            }

            const permisosStr = JSON.stringify(rolData.permisos || [])
            const stmt = appDb.prepare(`
                UPDATE roles SET nombre = ?, descripcion = ?, permisos_json = ? WHERE id = ?
            `)
            stmt.run(rolData.nombre.trim(), rolData.descripcion, permisosStr, rolData.id)
            
            logger.success('ROLES', `Rol actualizado: ${rolData.nombre}`);
            return { success: true }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: "Ya existe un rol con ese nombre." }
            }
            logger.error('ROLES', `Error actualizando rol (ID: ${rolData.id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-rol", async (_, id) => {
        try {
            const rolActual = appDb.prepare("SELECT nombre, is_system FROM roles WHERE id = ?").get(id)
            if (rolActual && rolActual.is_system === 1) {
                return { success: false, error: "No se puede eliminar un rol nativo del sistema." }
            }

            const usersWithRole = appDb.prepare("SELECT COUNT(*) as count FROM usuarios WHERE rol = ? AND status = 1").get(rolActual.nombre)
            if (usersWithRole.count > 0) {
                return { success: false, error: `No puedes eliminar este rol porque hay ${usersWithRole.count} usuario(s) usándolo.` }
            }

            appDb.prepare("UPDATE roles SET status = 0 WHERE id = ?").run(id)
            logger.warning('ROLES', `Rol eliminado: ${rolActual.nombre}`);
            return { success: true }
        } catch (error) {
            logger.error('ROLES', `Error eliminando rol (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })
}