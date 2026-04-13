import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerProductoHandlers = () => {

  ipcMain.handle("get-productos", () => {
    try {
      // NUEVO: Agregamos GROUP_CONCAT para traer las etiquetas asociadas
      const stmt = db.prepare(`
        SELECT p.*,
               c.nombre as categoria_nombre,
               GROUP_CONCAT(pe.etiqueta_id, ',') as etiquetas_ids
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        LEFT JOIN producto_etiqueta pe ON p.id = pe.producto_id
        WHERE p.status > 0 AND p.tipo = 'producto'
        GROUP BY p.id
      `)
      return stmt.all()
    } catch (error) {
      console.error("Error al intentar obtener productos:", error)
      return []
    }
  })

  ipcMain.handle("get-servicios", () => {
    try {
      const stmt = db.prepare(`SELECT * FROM producto WHERE status > 0 AND tipo = 'servicio'`)
      return stmt.all()
    } catch (error) {
      return []
    }
  })

  ipcMain.handle("get-allProductos", () => {
    try {
      const stmt = db.prepare(`SELECT * FROM producto WHERE status > 0`)
      return stmt.all()
    } catch (error) {
      return []
    }
  })

  ipcMain.handle("add-producto", (_, item) => {
    const transaction = db.transaction((data) => {
      const id = uuidv4()
      const now = new Date().toISOString()
      const status = data.status > 0 && data.status <= 2 ? data.status : 1

      // 1. Insertar el Producto con los nuevos campos de stock y categoría
      db.prepare(`
        INSERT INTO producto (
          id, ref_name, sku, precio, tipo, allow_negative, stock, 
          min_stock, max_stock, categoria_id, iva, unidad_medida, descripcion, 
          status, date_created, date_modify
        ) VALUES (
          @id, @ref_name, @sku, @precio, @tipo, @allow_negative, @stock, 
          @min_stock, @max_stock, @categoria_id, @iva, @unidad_medida, @descripcion, 
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
        categoria_id: data.categoria_id || 'general'
      })

      // 2. Insertar las Etiquetas asociadas
      if (data.etiquetas && data.etiquetas.length > 0) {
        const insertTag = db.prepare(`INSERT INTO producto_etiqueta (producto_id, etiqueta_id) VALUES (?, ?)`)
        for (const tagId of data.etiquetas) {
          insertTag.run(id, tagId)
        }
      }

      // 3. Registrar el Stock Inicial en el Inventario (si es mayor a 0)
      if (data.stock > 0) {
        db.prepare(`
          INSERT INTO inventario (
            id, producto_id, tipo_movimiento, modulo_movimiento, 
            cantidad, stock_anterior, stock_nuevo, fecha, usuario, notas
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), id, 'ingreso', 'creacion_producto', 
          data.stock, 0, data.stock, now, 'system', 'Stock inicial al crear producto'
        );
      }

      return id;
    });

    try {
      const id = transaction(item)
      return { success: true, id }
    } catch (error) {
      console.error("Error adding product:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("update-producto", (_, item) => {
    const transaction = db.transaction((data) => {
      const now = new Date().toISOString()
      const status = data.status > 0 && data.status <= 2 ? data.status : 1
      
      // 1. Actualizar datos del producto
      db.prepare(`
        UPDATE producto SET
          ref_name = @ref_name, sku = @sku, precio = @precio, tipo = @tipo,
          allow_negative = @allow_negative, stock = @stock, 
          min_stock = @min_stock, max_stock = @max_stock, categoria_id = @categoria_id,
          iva = @iva, unidad_medida = @unidad_medida, descripcion = @descripcion,
          date_modify = @date_modify, status = @status
        WHERE id = @id
      `).run({
        ...data,
        date_modify: now,
        status,
        min_stock: data.min_stock || 5,
        max_stock: data.max_stock || 100,
        categoria_id: data.categoria_id || 'general'
      })

      // 2. Limpiar etiquetas viejas y registrar las nuevas
      db.prepare(`DELETE FROM producto_etiqueta WHERE producto_id = ?`).run(data.id)
      if (data.etiquetas && data.etiquetas.length > 0) {
        const insertTag = db.prepare(`INSERT INTO producto_etiqueta (producto_id, etiqueta_id) VALUES (?, ?)`)
        for (const tagId of data.etiquetas) {
          insertTag.run(data.id, tagId)
        }
      }
    });

    try {
      transaction(item)
      return { success: true }
    } catch (error) {
      console.error("Error updating product:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("delete-producto", (_, item) => {
    try {
      const now = new Date().toISOString();
      const info = db.prepare(`
        UPDATE producto SET status = 0, date_modify = ?, modify_by = ? WHERE id = ?
      `).run(now, 'No user', item)

      return { success: info.changes > 0, changes: info.changes }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}