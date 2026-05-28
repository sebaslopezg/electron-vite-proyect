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

export const registerSubcategoriaHandlers = () => {

    ipcMain.handle("get-subcategorias", () => {
        if (!checkPermission("productos_ver") && !checkPermission("categorias_gestionar")) return [];
        try {
            const stmt = db.prepare(`
                SELECT s.*, 
                    GROUP_CONCAT(c.nombre, ' • ') as categoria_nombre,
                    GROUP_CONCAT(sc.categoria_id, ',') as categorias_ids,
                    (SELECT COUNT(*) FROM producto WHERE subcategorias_ids_json LIKE '%' || s.id || '%' AND status = 1) as cant_productos
                FROM subcategoria s 
                LEFT JOIN subcategoria_categoria sc ON s.id = sc.subcategoria_id
                LEFT JOIN categoria c ON sc.categoria_id = c.id
                WHERE s.status > 0
                GROUP BY s.id
            `)
            return stmt.all()
        } catch (error) {
            logger.error('SUBCATEGORIAS', "Error al obtener la lista de subcategorías", error)
            return []
        }
    })

    ipcMain.handle("add-subcategoria", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado para registrar taxonomías." };
        }
        const transaction = db.transaction((data) => {
            const id = uuidv4()
            const legacyCategoriaId = data.categorias_ids && data.categorias_ids.length > 0 ? data.categorias_ids[0] : 'general'

            db.prepare(`
                INSERT INTO subcategoria (id, nombre, descripcion, sku_prefix, separador, categoria_id, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, @separador, @categoria_id, 1)
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId, id })

            if (data.categorias_ids && data.categorias_ids.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of data.categorias_ids) {
                    insertLink.run(id, catId)
                }
            }
            return id
        })

        try {
            const id = transaction(item);
            logger.success('SUBCATEGORIAS', `Nueva subcategoría creada: ${item.nombre}`)
            return { success: true, id }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al intentar crear subcategoría: ${item.nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-subcategoria", (_, item) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado para modificar taxonomías." };
        }
        const transaction = db.transaction((data) => {
            const legacyCategoriaId = data.categorias_ids && data.categorias_ids.length > 0 ? data.categorias_ids[0] : 'general'

            db.prepare(`
                UPDATE subcategoria SET 
                    nombre = @nombre, descripcion = @descripcion, 
                    sku_prefix = @sku_prefix, separador = @separador,
                    categoria_id = @categoria_id
                WHERE id = @id
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId })

            db.prepare(`DELETE FROM subcategoria_categoria WHERE subcategoria_id = ?`).run(data.id)
            
            if (data.categorias_ids && data.categorias_ids.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of data.categorias_ids) {
                    insertLink.run(data.id, catId)
                }
            }
        })

        try {
            transaction(item)
            logger.success('SUBCATEGORIAS', `Subcategoría modificada correctamente: ${item.nombre} (ID: ${item.id})`)
            return { success: true }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al actualizar la subcategoría ID: ${item?.id}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-subcategoria", (_, id) => {
        if (!checkPermission("categorias_gestionar")) {
            return { success: false, error: "No autorizado para eliminar taxonomías." };
        }
        try {
            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE subcategorias_ids_json LIKE '%' || ? || '%' AND status = 1").get(id)
            if (check.count > 0) {
                return { success: false, error: "No se puede eliminar una subcategoría que está siendo usada por productos activos." }
            }

            db.prepare("UPDATE subcategoria SET status = 0 WHERE id = ?").run(id)
            
            logger.success('SUBCATEGORIAS', `Subcategoría con ID ${id} desactivada del sistema lógicamente (Soft Delete)`)
            return { success: true }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al aplicar Soft Delete a la subcategoría ID: ${id}`, error)
            return { success: false, error: error.message }
        }
    })
}