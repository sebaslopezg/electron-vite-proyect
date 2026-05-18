import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

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
            logger.error('CATEGORIAS', "Error al obtener la lista de categorías", error)
            return []
        }
    })

    ipcMain.handle("add-categoria", (_, item) => {
        try {
            const id = uuidv4()
            const stmt = db.prepare(`
                INSERT INTO categoria (
                    id, 
                    nombre, 
                    descripcion, 
                    sku_prefix, 
                    separador, 
                    status
                ) 
                VALUES (
                    @id, 
                    @nombre, 
                    @descripcion, 
                    @sku_prefix, 
                    @separador, 
                    1
                )
            `)
            const info = stmt.run({ ...item, separador: item.separador || '', id })
            logger.success('CATEGORIAS', `Nueva categoría creada: ${item.nombre}`)
            return { success: true, id, changes: info.changes }
        } catch (error) {
            logger.error('CATEGORIAS', `Error al intentar crear la categoría: ${item.nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-categoria", (_, item) => {
        try {
            const stmt = db.prepare(`
                UPDATE categoria SET 
                    nombre = @nombre, 
                    descripcion = @descripcion, 
                    sku_prefix = @sku_prefix,
                    separador = @separador
                WHERE id = @id
            `)
            const info = stmt.run({ ...item, separador: item.separador || '' })
            logger.success('CATEGORIAS', `Categoría actualizada: ${item.nombre} (ID: ${item.id})`)
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CATEGORIAS', `Error al intentar actualizar la categoría (ID: ${item.id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-categoria", (_, id) => {
        try {
            if (id === 'general') {
                logger.warning('CATEGORIAS', "Intento denegado de eliminar la categoría General del sistema.")
                return { success: false, error: "No se puede eliminar la categoría General." }
            }

            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE categoria_id = ? AND status = 1").get(id)
            if (check.count > 0) {
                logger.warning('CATEGORIAS', `Intento de eliminar categoría en uso (ID: ${id}). Contiene ${check.count} productos activos.`)
                return { success: false, error: "No se puede eliminar una categoría que tiene productos asociados." }
            }

            const stmt = db.prepare("UPDATE categoria SET status = 0 WHERE id = ?")
            const info = stmt.run(id)
            logger.info('CATEGORIAS', `Categoría enviada a la papelera (Soft delete) (ID: ${id})`)
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CATEGORIAS', `Error al intentar eliminar la categoría (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })
}