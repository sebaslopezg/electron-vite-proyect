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

export const registerProductoHandlers = () => {

  const processProductPrefixes = (data) => {
    return data.map(p => {
        let fullPrefix = p.cat_prefix || ''
        let finalSeparator = p.cat_separador || ''
        
        const subIds = p.subcategorias_ids_json ? JSON.parse(p.subcategorias_ids_json) : []
        
        if (subIds.length > 0) {
            const placeholders = subIds.map(() => '?').join(',')
            const subs = db.prepare(`SELECT id, sku_prefix, separador FROM subcategoria WHERE id IN (${placeholders})`).all(...subIds)
            
            subIds.forEach(id => {
                const s = subs.find(sub => sub.id === id)
                if (s && s.sku_prefix) {
                    if (fullPrefix) {
                        fullPrefix += (finalSeparator ? finalSeparator : '') + s.sku_prefix
                    } else {
                        fullPrefix = s.sku_prefix
                    }
                    finalSeparator = s.separador || ''
                }
            })
        }

        return { ...p, sku_prefix: fullPrefix, separador: finalSeparator }
    })
  }

  ipcMain.handle("get-productos", () => {
    if (!checkPermission("productos_ver")) return [];
    try {
      const stmt = db.prepare(`
        SELECT p.*,
          c.nombre as categoria_nombre,
          c.sku_prefix as cat_prefix,
          c.separador as cat_separador,
          GROUP_CONCAT(pe.etiqueta_id, ',') as etiquetas_ids
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        LEFT JOIN producto_etiqueta pe ON p.id = pe.producto_id
        WHERE p.status > 0 p.tipo = 'producto'
        GROUP BY p.id
      `)
      const data = stmt.all();
      return processProductPrefixes(data);
    } catch (error) {
      logger.error('PRODUCTOS', "Error al intentar obtener la lista completa de productos", error)
      return []
    }
  })

  ipcMain.handle("get-productos-paginados", (_, dtParams) => {
    if (!checkPermission("productos_ver")) {
        return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [], error: "No autorizado" };
    }
    try {
      const limit = parseInt(dtParams.length, 10) || 10
      const offset = parseInt(dtParams.start, 10) || 0
      const searchValue = dtParams.search?.value || ''

      const orderColIndex = dtParams.order?.[0]?.column || 0
      const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'
      
      const columnsMap = ['ref_name', 'sku', 'categoria_nombre', 'stock', 'precio', 'status']
      
      let orderCol = columnsMap[orderColIndex] || 'date_created'
      if (orderCol === 'categoria_nombre') orderCol = 'c.nombre'
      else orderCol = `p.${orderCol}`

      const customCategory = dtParams.customCategory
      const customSubcategory = dtParams.customSubcategory
      const customTag = dtParams.customTag

      let baseQuery = `
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0 AND p.tipo = 'producto'
      `
      
      let queryParams = []

      if (customCategory) {
          baseQuery += " AND p.categoria_id = ?"
          queryParams.push(customCategory)
      }

      if (customSubcategory) {
          baseQuery += " AND p.subcategorias_ids_json LIKE ?"
          queryParams.push(`%${customSubcategory}%`)
      }

      if (customTag) {
          baseQuery += " AND EXISTS (SELECT 1 FROM producto_etiqueta pe WHERE pe.producto_id = p.id AND pe.etiqueta_id = ?)"
          queryParams.push(customTag)
      }

      if (searchValue) {
        baseQuery += " AND (p.ref_name LIKE ? OR p.sku LIKE ? OR c.nombre LIKE ?)"
        const likeParam = `%${searchValue}%`
        queryParams.push(likeParam, likeParam, likeParam)
      }

      const totalRow = db.prepare("SELECT COUNT(*) as count FROM producto WHERE status > 0 AND tipo = 'producto'").get()
      const recordsTotal = totalRow.count

      const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)
      const recordsFiltered = filteredRow.count

      const dataQuery = `
        SELECT p.*,
               c.nombre as categoria_nombre,
               c.sku_prefix as cat_prefix, c.separador as cat_separador,
               (SELECT GROUP_CONCAT(pe.etiqueta_id, ',') FROM producto_etiqueta pe WHERE p.id = pe.producto_id) as etiquetas_ids
        ${baseQuery}
        ORDER BY ${orderCol} ${orderDir} 
        LIMIT ? OFFSET ?
      `
      
      const data = db.prepare(dataQuery).all(...queryParams, limit, offset)
      const processedData = processProductPrefixes(data)

      return {
          draw: dtParams.draw,
          recordsTotal: recordsTotal,
          recordsFiltered: recordsFiltered,
          data: processedData
      }
    } catch (error) {
        logger.error('PRODUCTOS', "Error en paginación y búsqueda del catálogo de productos", error)
        return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
    }
  })

  ipcMain.handle("get-servicios-paginados", (_, dtParams) => {
    if (!checkPermission("productos_ver")) {
        return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [], error: "No autorizado" };
    }
    try {
      const limit = parseInt(dtParams.length, 10) || 10
      const offset = parseInt(dtParams.start, 10) || 0
      const searchValue = dtParams.search?.value || ''

      const orderColIndex = dtParams.order?.[0]?.column || 0
      const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'
            
      const columnsMap = ['ref_name', 'sku', 'status', 'date_created', 'date_modify']
      let orderCol = columnsMap[orderColIndex] || 'date_created'
      orderCol = `p.${orderCol}`

      let baseQuery = `
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0 AND p.tipo = 'servicio'
      `
      let queryParams = []

      if (searchValue) {
        baseQuery += " AND (p.ref_name LIKE ? OR p.sku LIKE ?)"
        const likeParam = `%${searchValue}%`
        queryParams.push(likeParam, likeParam)
      }

      const totalRow = db.prepare("SELECT COUNT(*) as count FROM producto WHERE status > 0 AND tipo = 'servicio'").get()
      const recordsTotal = totalRow.count

      const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)
      const recordsFiltered = filteredRow.count

      const dataQuery = `
        SELECT p.*, c.sku_prefix as cat_prefix, c.separador as cat_separador
        ${baseQuery}
        ORDER BY ${orderCol} ${orderDir} 
        LIMIT ? OFFSET ?
      `
          
      const data = db.prepare(dataQuery).all(...queryParams, limit, offset)
      const processedData = processProductPrefixes(data)

      return {
        draw: dtParams.draw,
        recordsTotal: recordsTotal,
        recordsFiltered: recordsFiltered,
        data: processedData
      }
    } catch (error) {
      logger.error('SERVICIOS', "Error en paginación y búsqueda del catálogo de servicios", error)
      return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
    }
  })

  ipcMain.handle("get-servicios", () => {
    if (!checkPermission("productos_ver")) return [];
    try {
      const stmt = db.prepare(`SELECT * FROM producto WHERE status > 0 AND tipo = 'servicio'`)
      return stmt.all()
    } catch (error) {
      logger.error('SERVICIOS', "Error obteniendo la lista completa de servicios", error)
      return []
    }
  })

  ipcMain.handle("get-allProductos", () => {
    if (!checkPermission("productos_ver") && !checkPermission("ventas_crear")) return [];
    try {
      const stmt = db.prepare(`
        SELECT p.*, c.sku_prefix as cat_prefix, c.separador as cat_separador
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0
      `)
      const data = stmt.all()
      return processProductPrefixes(data)
    } catch (error) {
      logger.error('PRODUCTOS', "Error obteniendo el listado unificado (Productos + Services)", error)
      return []
    }
  })

  ipcMain.handle("add-producto", (_, item) => {
    if (!checkPermission("productos_gestionar")) {
        return { success: false, error: "No tienes los permisos requeridos para registrar nuevos ítems en el catálogo." };
    }
    const transaction = db.transaction((data) => {
      const id = uuidv4()
      const now = new Date().toISOString()
      const status = data.status > 0 && data.status <= 2 ? data.status : 1

      db.prepare(`
        INSERT INTO producto (
          id, ref_name, sku, precio, tipo, allow_negative, stock, 
          min_stock, max_stock, categoria_id, subcategorias_ids_json, iva, unidad_medida, descripcion, 
          allow_encargo, encargo_solo_sin_stock,
          status, date_created, date_modify
        ) VALUES (
          @id, @ref_name, @sku, @precio, @tipo, @allow_negative, @stock, 
          @min_stock, @max_stock, @categoria_id, @subcategorias_ids_json, @iva, @unidad_medida, @descripcion, 
          @allow_encargo, @encargo_solo_sin_stock,
          @status, @date_created, @date_modify
        )
      `).run({
        ...data,
        id,
        date_created: now,
        date_modify: now,
        status,
        min_stock: data.min_stock || 5,
        max_stock: data.max_stock || 100,
        categoria_id: data.categoria_id || 'general',
        subcategorias_ids_json: JSON.stringify(data.subcategorias_ids || []),
        allow_encargo: data.allow_encargo !== undefined ? data.allow_encargo : 1,
        encargo_solo_sin_stock: data.encargo_solo_sin_stock !== undefined ? data.encargo_solo_sin_stock : 1
      })

      if (data.etiquetas && data.etiquetas.length > 0) {
        const insertTag = db.prepare(`INSERT INTO producto_etiqueta (producto_id, etiqueta_id) VALUES (?, ?)`)
        for (const tagId of data.etiquetas) {
          insertTag.run(id, tagId)
        }
      }

      if (data.stock > 0) {
        db.prepare(`
          INSERT INTO inventario (
            id, producto_id, tipo_movimiento, modulo_movimiento, 
            cantidad, stock_anterior, stock_nuevo, fecha, usuario, notas
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), id, 'ingreso', 'creacion_producto', 
          data.stock, 0, data.stock, now, global.currentUserSession?.username || 'system', 'Stock inicial al crear producto'
        )
      }

      return id
    })

    try {
      const id = transaction(item)
      logger.success('PRODUCTOS', `Nuevo ${item.tipo || 'producto'} creado: ${item.ref_name}`)
      return { success: true, id }
    } catch (error) {
      logger.error('PRODUCTOS', `Error al intentar crear el producto: ${item.ref_name}`, error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("update-producto", (_, item) => {
    if (!checkPermission("productos_gestionar")) {
        return { success: false, error: "No tienes los permisos requeridos para actualizar registros de este catálogo." };
    }
    const transaction = db.transaction((data) => {
      const now = new Date().toISOString()
      const status = data.status > 0 && data.status <= 2 ? data.status : 1
      
      db.prepare(`
        UPDATE producto SET
          ref_name = @ref_name, sku = @sku, precio = @precio, tipo = @tipo,
          allow_negative = @allow_negative, stock = @stock, 
          min_stock = @min_stock, max_stock = @max_stock, categoria_id = @categoria_id,
          subcategorias_ids_json = @subcategorias_ids_json,
          iva = @iva, unidad_medida = @unidad_medida, descripcion = @descripcion,
          allow_encargo = @allow_encargo, encargo_solo_sin_stock = @encargo_solo_sin_stock,
          date_modify = @date_modify, status = @status
        WHERE id = @id
      `).run({
        ...data,
        date_modify: now,
        status,
        min_stock: data.min_stock || 5,
        max_stock: data.max_stock || 100,
        categoria_id: data.categoria_id || 'general',
        subcategorias_ids_json: JSON.stringify(data.subcategorias_ids || []),
        allow_encargo: data.allow_encargo !== undefined ? data.allow_encargo : 1,
        encargo_solo_sin_stock: data.encargo_solo_sin_stock !== undefined ? data.encargo_solo_sin_stock : 1
      })

      db.prepare(`DELETE FROM producto_etiqueta WHERE producto_id = ?`).run(data.id)
      if (data.etiquetas && data.etiquetas.length > 0) {
        const insertTag = db.prepare(`INSERT INTO producto_etiqueta (producto_id, etiqueta_id) VALUES (?, ?)`)
        for (const tagId of data.etiquetas) {
          insertTag.run(data.id, tagId)
        }
      }
    })

    try {
      transaction(item)
      logger.success('PRODUCTOS', `Producto actualizado: ${item.ref_name}`)
      return { success: true }
    } catch (error) {
      logger.error('PRODUCTOS', `Error al intentar actualizar el producto (ID: ${item.id})`, error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("delete-producto", (_, item) => {
    if (!checkPermission("productos_gestionar")) {
        return { success: false, error: "No tienes los privilegios requeridos para eliminar registros del inventario." };
    }
    try {
      const now = new Date().toISOString()
      const user = global.currentUserSession?.username || 'system'
      const info = db.prepare(`
        UPDATE producto SET status = 0, date_modify = ?, modify_by = ? WHERE id = ?
      `).run(now, user, item)

      return { success: true, changes: info.changes }
    } catch (error) {
      logger.error('PRODUCTOS', `Error al intentar eliminar el producto (ID: ${item})`, error)
      return { success: false, error: error.message }
    }
  })
}