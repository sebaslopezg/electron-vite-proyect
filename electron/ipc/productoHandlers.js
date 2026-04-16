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

  // Paginación del lado del servidor para Productos ---
  ipcMain.handle("get-productos-paginados", (_, dtParams) => {
    try {
      const limit = parseInt(dtParams.length, 10) || 10;
      const offset = parseInt(dtParams.start, 10) || 0;
      const searchValue = dtParams.search?.value || '';

      const orderColIndex = dtParams.order?.[0]?.column || 0;
      const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';
      
      const columnsMap = ['ref_name', 'sku', 'categoria_nombre', 'stock', 'precio', 'status'];
      
      let orderCol = columnsMap[orderColIndex] || 'date_created';
      if (orderCol === 'categoria_nombre') orderCol = 'c.nombre';
      else orderCol = `p.${orderCol}`;

      let baseQuery = `
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0 AND p.tipo = 'producto'
      `;
      
      let queryParams = [];

      if (searchValue) {
          baseQuery += " AND (p.ref_name LIKE ? OR p.sku LIKE ? OR c.nombre LIKE ?)";
          const likeParam = `%${searchValue}%`;
          queryParams.push(likeParam, likeParam, likeParam);
      }

      const totalRow = db.prepare("SELECT COUNT(*) as count FROM producto WHERE status > 0 AND tipo = 'producto'").get();
      const recordsTotal = totalRow.count;

      const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);
      const recordsFiltered = filteredRow.count;

      const dataQuery = `
        SELECT p.*,
               c.nombre as categoria_nombre,
               c.sku_prefix, c.separador, /* <--- AÑADE ESTA LÍNEA */
               (SELECT GROUP_CONCAT(pe.etiqueta_id, ',') FROM producto_etiqueta pe WHERE p.id = pe.producto_id) as etiquetas_ids
        ${baseQuery}
        ORDER BY ${orderCol} ${orderDir} 
        LIMIT ? OFFSET ?
      `;
      
      const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

      return {
          draw: dtParams.draw,
          recordsTotal: recordsTotal,
          recordsFiltered: recordsFiltered,
          data: data
      };
    } catch (error) {
        console.error("Error en paginación de productos: ", error);
        return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
    }
  });

  ipcMain.handle("get-servicios-paginados", (_, dtParams) => {
    try {
      const limit = parseInt(dtParams.length, 10) || 10;
      const offset = parseInt(dtParams.start, 10) || 0;
      const searchValue = dtParams.search?.value || '';

      const orderColIndex = dtParams.order?.[0]?.column || 0;
      const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';
            
      const columnsMap = ['ref_name', 'sku', 'status', 'date_created', 'date_modify'];
      let orderCol = columnsMap[orderColIndex] || 'date_created';
      orderCol = `p.${orderCol}`;

      let baseQuery = `
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0 AND p.tipo = 'servicio'
      `;
      let queryParams = [];

      if (searchValue) {
        baseQuery += " AND (p.ref_name LIKE ? OR p.sku LIKE ?)";
        const likeParam = `%${searchValue}%`;
        queryParams.push(likeParam, likeParam);
      }

      const totalRow = db.prepare("SELECT COUNT(*) as count FROM producto WHERE status > 0 AND tipo = 'servicio'").get();
      const recordsTotal = totalRow.count;

      const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);
      const recordsFiltered = filteredRow.count;

      const dataQuery = `
        SELECT p.*, c.sku_prefix, c.separador
        ${baseQuery}
        ORDER BY ${orderCol} ${orderDir} 
        LIMIT ? OFFSET ?
      `;
          
      const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

      return {
        draw: dtParams.draw,
        recordsTotal: recordsTotal,
        recordsFiltered: recordsFiltered,
        data: data
      };
    } catch (error) {
      console.error("Error en paginación de servicios: ", error);
      return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
    }
  });

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
      const stmt = db.prepare(`
        SELECT p.*, c.sku_prefix, c.separador 
        FROM producto p
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE p.status > 0
      `)
      return stmt.all()
    } catch (error) {
      console.error("Error getAllProductos:", error);
      return []
    }
  })

  ipcMain.handle("add-producto", (_, item) => {
    const transaction = db.transaction((data) => {
      const id = uuidv4()
      const now = new Date().toISOString()
      const status = data.status > 0 && data.status <= 2 ? data.status : 1

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