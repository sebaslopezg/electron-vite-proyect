import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerSubcategoriaHandlers = () => {

    ipcMain.handle("get-subcategorias", () => {
        try {
            const stmt = db.prepare(`
                SELECT s.*, 
                    c.nombre as categoria_nombre,
                    (SELECT COUNT(*) FROM producto WHERE subcategoria_id = s.id AND status = 1) as cant_productos
                FROM subcategoria s 
                LEFT JOIN categoria c ON s.categoria_id = c.id
                WHERE s.status > 0
            `)
            return stmt.all()
        } catch (error) {
            console.error("Error al obtener subcategorias:", error)
            return []
        }
    })

    ipcMain.handle("add-subcategoria", (_, item) => {
        try {
            const id = uuidv4()
            const stmt = db.prepare(`
                INSERT INTO subcategoria (id, nombre, descripcion, sku_prefix, separador, categoria_id, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, @separador, @categoria_id, 1)
            `)
            const info = stmt.run({ ...item, separador: item.separador || '', id })
            return { success: true, id, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-subcategoria", (_, item) => {
        try {
            const stmt = db.prepare(`
                UPDATE subcategoria SET 
                    nombre = @nombre, descripcion = @descripcion, 
                    sku_prefix = @sku_prefix, separador = @separador, categoria_id = @categoria_id
                WHERE id = @id
            `)
            const info = stmt.run({ ...item, separador: item.separador || '' })
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-subcategoria", (_, id) => {
        try {
            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE subcategoria_id = ? AND status = 1").get(id)
            if (check.count > 0) {
                return { success: false, error: "No se puede eliminar una subcategoría que tiene productos asociados." }
            }

            const stmt = db.prepare("UPDATE subcategoria SET status = 0 WHERE id = ?")
            const info = stmt.run(id)
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}