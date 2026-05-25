import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession;
    if (!user) return false;
    if (user.permisos?.includes("ALL")) return true;
    return user.permisos?.includes(permission);
}

export const registerCategoriaHandlers = () => {

    ipcMain.handle("get-categorias", () => {
        if (!checkPermission("productos_ver") && !checkPermission("categorias_gestionar") && !checkPermission("ventas_crear")) return [];
        try {
            const stmt = db.prepare(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM producto WHERE categoria_id = c.id AND status = 1) as cant_productos
                FROM categoria c 
                WHERE c.status > 0
            `)
            return stmt.all()
        } catch (error) {
            logger.error('CATEGORIAS', "Error al obtener la lista de categorías", error)
            return []
        }
    })

    ipcMain.handle("add-categoria", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado para agregar categorías estructurales." };
        }
        try {
            const id = uuidv4()
            const stmt = db.prepare(`
                INSERT INTO categoria (id, nombre, descripcion, sku_prefix, separador, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, @separador, 1)
            `)
            const info = stmt.run({ ...item, separador: item.separador || '', id })
            logger.success('CATEGORIAS', `Nueva categoría creada: ${item.nombre}`)
            return { success: true, id, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-categoria", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado para alterar esquemas de categorías." };
        }
        try {
            const stmt = db.prepare(`
                UPDATE categoria SET nombre = @nombre, descripcion = @descripcion, sku_prefix = @sku_prefix, separador = @separador WHERE id = @id
            `)
            const info = stmt.run({ ...item, separador: item.separador || '' })
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-categoria", (_, id) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado." };
        }
        try {
            if (id === 'general') return { success: false, error: "No se puede eliminar la categoría General." }

            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE categoria_id = ? AND status = 1").get(id)
            if (check.count > 0) {
                return { success: false, error: "No se puede eliminar una categoría que tiene productos asociados." }
            }

            const stmt = db.prepare("UPDATE categoria SET status = 0 WHERE id = ?")
            const info = stmt.run(id)
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}