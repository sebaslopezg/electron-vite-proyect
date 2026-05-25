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

export const registerEtiquetaHandlers = () => {

    ipcMain.handle("get-etiquetas", () => {
        if (!checkPermission("productos_ver") && !checkPermission("categorias_gestionar") && !checkPermission("ventas_crear")) return [];
        try {
            const stmt = db.prepare(`
                SELECT e.*, 
                       GROUP_CONCAT(c.nombre, ', ') as categorias_nombres,
                       GROUP_CONCAT(c.id, ',') as categorias_ids
                FROM etiqueta e
                LEFT JOIN etiqueta_categoria ec ON e.id = ec.etiqueta_id
                LEFT JOIN categoria c ON ec.categoria_id = c.id
                WHERE e.status > 0
                GROUP BY e.id
            `)
            return stmt.all()
        } catch (error) {
            logger.error('ETIQUETAS', "Error al obtener la lista de etiquetas", error)
            return []
        }
    })

    ipcMain.handle("add-etiqueta", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado." };
        }
        const transaction = db.transaction((data) => {
            const id = uuidv4()
            db.prepare(`INSERT INTO etiqueta (id, nombre, descripcion, color, status) VALUES (@id, @nombre, @descripcion, @color, 1)`).run({ ...data, id })

            const insertRelacion = db.prepare(`INSERT INTO etiqueta_categoria (etiqueta_id, categoria_id) VALUES (?, ?)`)
            const categorias = data.categorias && data.categorias.length > 0 ? data.categorias : ['general']
            for (const catId of categorias) {
                insertRelacion.run(id, catId)
            }
            return id
        })

        try {
            const id = transaction(item)
            return { success: true, id }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-etiqueta", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado." };
        }
        const transaction = db.transaction((data) => {
            db.prepare(`UPDATE etiqueta SET nombre = @nombre, descripcion = @descripcion, color = @color WHERE id = @id`).run(data)
            db.prepare(`DELETE FROM etiqueta_categoria WHERE etiqueta_id = ?`).run(data.id)

            const insertRelacion = db.prepare(`INSERT INTO etiqueta_categoria (etiqueta_id, categoria_id) VALUES (?, ?)`)
            const categorias = data.categorias && data.categorias.length > 0 ? data.categorias : ['general']
            for (const catId of categorias) {
                insertRelacion.run(data.id, catId)
            }
        });

        try {
            transaction(item)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-etiqueta", (_, id) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado." };
        }
        try {
            const stmt = db.prepare("UPDATE etiqueta SET status = 0 WHERE id = ?")
            const info = stmt.run(id)
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}