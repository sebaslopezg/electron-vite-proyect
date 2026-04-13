import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerCategoriaHandlers = () => {

    ipcMain.handle("get-categorias", () => {
        try {
            const stmt = db.prepare(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM producto WHERE categoria_id = c.id AND status = 1) as cant_productos
                FROM categoria c 
                WHERE c.status > 0
            `)
            return stmt.all()
        } catch (error) {
            console.error("Error al obtener categorias:", error)
            return []
        }
    })

    ipcMain.handle("add-categoria", (_, item) => {
        try {
            const id = uuidv4()
            const stmt = db.prepare(`
                INSERT INTO categoria (id, nombre, descripcion, sku_prefix, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, 1)
            `)
            const info = stmt.run({ ...item, id })
            return { success: true, id, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-categoria", (_, item) => {
        try {
            const stmt = db.prepare(`
                UPDATE categoria SET 
                    nombre = @nombre, 
                    descripcion = @descripcion, 
                    sku_prefix = @sku_prefix 
                WHERE id = @id
            `)
            const info = stmt.run(item)
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-categoria", (_, id) => {
        try {
            if (id === 'general') {
                return { success: false, error: "No se puede eliminar la categoría General." }
            }

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