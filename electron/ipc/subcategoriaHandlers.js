import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { triggerBackgroundPush } from "./syncHandlers.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerSubcategoriaHandlers = () => {

    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS subcategoria_categoria (
                subcategoria_id TEXT NOT NULL,
                categoria_id TEXT NOT NULL
            );
        `)
        db.exec(`
            INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id)
            SELECT s.id, s.categoria_id
            FROM subcategoria s
            WHERE s.categoria_id IS NOT NULL
              AND TRIM(s.categoria_id) != ''
              AND NOT EXISTS (
                  SELECT 1 FROM subcategoria_categoria sc WHERE sc.subcategoria_id = s.id
              );
        `)
    } catch (e) {
        logger.error('SUBCATEGORIAS', "Error verificando tabla puente subcategoria_categoria", e)
    }

    ipcMain.handle("get-subcategorias", () => {
        if (
            !checkPermission("subcategorias_ver") &&
            !checkPermission("productos_ver") &&
            !checkPermission("productos_crear") &&
            !checkPermission("productos_editar") &&
            !checkPermission("servicios_ver") &&
            !checkPermission("servicios_crear") &&
            !checkPermission("servicios_editar") &&
            !checkPermission("ventas_crear")
        ) return []

        try {
            const categoriasActivas = db.prepare("SELECT id, nombre FROM categoria WHERE status > 0").all()
            const catMap = new Map(categoriasActivas.map(c => [String(c.id).trim(), c.nombre]))

            const stmt = db.prepare(`
                SELECT s.*, 
                    GROUP_CONCAT(sc.categoria_id, ',') as pivot_categorias_ids,
                    (SELECT COUNT(*) FROM producto WHERE subcategorias_ids_json LIKE '%' || s.id || '%' AND status = 1) as cant_productos
                FROM subcategoria s 
                LEFT JOIN subcategoria_categoria sc ON s.id = sc.subcategoria_id
                WHERE s.status > 0
                GROUP BY s.id
            `)
            const rows = stmt.all()

            return rows.map(row => {
                const idsSet = new Set()

                if (row.pivot_categorias_ids) {
                    String(row.pivot_categorias_ids)
                        .split(',')
                        .map(id => id.trim())
                        .filter(Boolean)
                        .forEach(id => idsSet.add(id))
                }

                if (row.categorias_ids) {
                    const raw = String(row.categorias_ids).trim()
                    if (raw.startsWith('[')) {
                        try {
                            JSON.parse(raw).map(id => String(id).trim()).filter(Boolean).forEach(id => idsSet.add(id))
                        } catch (e) {}
                    } else {
                        raw.split(',').map(id => id.trim()).filter(Boolean).forEach(id => idsSet.add(id))
                    }
                }

                if (row.categorias_ids_json) {
                    try {
                        JSON.parse(row.categorias_ids_json).map(id => String(id).trim()).filter(Boolean).forEach(id => idsSet.add(id))
                    } catch (e) {}
                }

                if (row.categoria_id && String(row.categoria_id).trim() !== '') {
                    const legacyId = String(row.categoria_id).trim()
                    if (idsSet.size === 0 || legacyId !== 'general') {
                        idsSet.add(legacyId)
                    }
                }

                const validIds = Array.from(idsSet)
                const categoriaNombre = validIds
                    .map(id => catMap.get(id))
                    .filter(Boolean)
                    .join(' • ')

                delete row.pivot_categorias_ids

                return {
                    ...row,
                    categorias_ids: validIds.join(','),
                    categoria_nombre: categoriaNombre
                }
            })
        } catch (error) {
            logger.error('SUBCATEGORIAS', "Error al obtener la lista de subcategorías", error)
            return []
        }
    })

    ipcMain.handle("add-subcategoria", (_, item) => {
        if (!checkPermission("subcategorias_crear")) {
            return { success: false, error: "No autorizado para registrar nuevas subcategorías." }
        }
        const transaction = db.transaction((data) => {
            const id = uuidv4()
            const categoriasArray = Array.isArray(data.categorias_ids)
                ? data.categorias_ids.filter(Boolean)
                : (typeof data.categorias_ids === 'string' && data.categorias_ids.trim() !== ''
                    ? data.categorias_ids.split(',').map(s => s.trim()).filter(Boolean)
                    : (data.categoria_id ? [data.categoria_id] : []))

            const legacyCategoriaId = categoriasArray.length > 0 ? categoriasArray[0] : 'general'

            db.prepare(`
                INSERT INTO subcategoria (id, nombre, descripcion, sku_prefix, separador, categoria_id, status) 
                VALUES (@id, @nombre, @descripcion, @sku_prefix, @separador, @categoria_id, 1)
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId, id })

            if (categoriasArray.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of categoriasArray) {
                    insertLink.run(id, catId)
                }
            }
            return id
        })

        try {
            const id = transaction(item)
            logger.success('SUBCATEGORIAS', `Nueva subcategoría creada: ${item.nombre}`)
            
            triggerBackgroundPush('subcategoria').catch(e => logger.error('SYNC', 'Error en push background (subcategoria)', e))

            return { success: true, id }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al intentar crear subcategoría: ${item.nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-subcategoria", (_, item) => {
        if (!checkPermission("subcategorias_editar")) {
            return { success: false, error: "No autorizado para modificar subcategorías." }
        }
        const transaction = db.transaction((data) => {
            const categoriasArray = Array.isArray(data.categorias_ids)
                ? data.categorias_ids.filter(Boolean)
                : (typeof data.categorias_ids === 'string' && data.categorias_ids.trim() !== ''
                    ? data.categorias_ids.split(',').map(s => s.trim()).filter(Boolean)
                    : (data.categoria_id ? [data.categoria_id] : []))

            const legacyCategoriaId = categoriasArray.length > 0 ? categoriasArray[0] : 'general'

            db.prepare(`
                UPDATE subcategoria SET 
                    nombre = @nombre, descripcion = @descripcion, 
                    sku_prefix = @sku_prefix, separador = @separador,
                    categoria_id = @categoria_id
                WHERE id = @id
            `).run({ ...data, separador: data.separador || '', categoria_id: legacyCategoriaId })

            db.prepare(`DELETE FROM subcategoria_categoria WHERE subcategoria_id = ?`).run(data.id)
            
            if (categoriasArray.length > 0) {
                const insertLink = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                for (const catId of categoriasArray) {
                    insertLink.run(data.id, catId)
                }
            }
        })

        try {
            transaction(item)
            logger.success('SUBCATEGORIAS', `Subcategoría modificada correctamente: ${item.nombre} (ID: ${item.id})`)

            triggerBackgroundPush('subcategoria').catch(e => logger.error('SYNC', 'Error en push background (subcategoria)', e))

            return { success: true }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al actualizar la subcategoría ID: ${item?.id}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-subcategoria", (_, id) => {
        if (!checkPermission("subcategorias_eliminar")) {
            return { success: false, error: "No autorizado para eliminar subcategorías." }
        }
        try {
            const check = db.prepare("SELECT COUNT(*) as count FROM producto WHERE subcategorias_ids_json LIKE '%' || ? || '%' AND status = 1").get(id)
            if (check.count > 0) {
                return { success: false, error: "No se puede eliminar una subcategoría que está siendo usada por productos activos." }
            }

            db.prepare("UPDATE subcategoria SET status = 0 WHERE id = ?").run(id)
            
            logger.success('SUBCATEGORIAS', `Subcategoría con ID ${id} desactivada del sistema lógicamente (Soft Delete)`)

            triggerBackgroundPush('subcategoria').catch(e => logger.error('SYNC', 'Error en push background (subcategoria)', e))

            return { success: true }
        } catch (error) {
            logger.error('SUBCATEGORIAS', `Error al aplicar Soft Delete a la subcategoría ID: ${id}`, error)
            return { success: false, error: error.message }
        }
    })
}