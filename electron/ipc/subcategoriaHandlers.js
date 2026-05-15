import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerSubcategoriaHandlers = () => {

    ipcMain.handle("get-subcategorias", () => {
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
            console.error("Error al obtener subcategorias:", error)
            return []
        }
    })

    ipcMain.handle("add-subcategoria", (_, item) => {
        const transaction = db.transaction((data) => {
            const id = uuidv4()
            
            // TRUCO: Usamos la primera categoría seleccionada para rellenar la columna legacy (o 'general' si falla)
            const legacyCategoriaId = data.categorias_ids && data.categorias_ids.length > 0 ? data.categorias_ids[0] : 'general';

            db.prepare(`
                INSERT INTO subcategoria (id, nombre, descripcion, sku_prefix, separador, categoria_id, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, @separador, @categoria_id, 1)
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId, id })

            // Guardamos las relaciones reales en la tabla intermedia
            if (data.categorias_ids && data.categorias_ids.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of data.categorias_ids) {
                    insertLink.run(id, catId)
                }
            }
            return id;
        });

        try {
            const id = transaction(item);
            return { success: true, id }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-subcategoria", (_, item) => {
        const transaction = db.transaction((data) => {
            
            // Replicamos el truco para las actualizaciones
            const legacyCategoriaId = data.categorias_ids && data.categorias_ids.length > 0 ? data.categorias_ids[0] : 'general';

            db.prepare(`
                UPDATE subcategoria SET 
                    nombre = @nombre, descripcion = @descripcion, 
                    sku_prefix = @sku_prefix, separador = @separador,
                    categoria_id = @categoria_id
                WHERE id = @id
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId })

            // Limpiamos y recreamos las relaciones en la tabla intermedia
            db.prepare(`DELETE FROM subcategoria_categoria WHERE subcategoria_id = ?`).run(data.id)
            
            if (data.categorias_ids && data.categorias_ids.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of data.categorias_ids) {
                    insertLink.run(data.id, catId)
                }
            }
        });

        try {
            transaction(item);
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-subcategoria", (_, id) => {
        try {
            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE subcategorias_ids_json LIKE '%' || ? || '%' AND status = 1").get(id)
            if (check.count > 0) {
                return { success: false, error: "No se puede eliminar una subcategoría que está siendo usada por productos activos." }
            }

            db.prepare("UPDATE subcategoria SET status = 0 WHERE id = ?").run(id)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}