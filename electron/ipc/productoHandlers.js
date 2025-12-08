import { ipcMain } from "electron";
import { v4 as uuidv4 } from 'uuid';
import db from "../database/index.js";

export const registerProductoHandlers = () => {

  ipcMain.handle("get-productos", () => {
    try {
      const stmt = db.prepare('SELECT * FROM producto WHERE status > 0')
      return stmt.all()
    } catch (error) {
      console.error("Error al intentar obtener productos:", error)
      return []
    }
  })

  ipcMain.handle("add-producto", (_, item) => {
    try {
      const id = uuidv4()
      const now = new Date().toISOString()
      const status = 1

      const stmt = db.prepare(`
        INSERT INTO producto (
          id, ref_name, sku, allow_negative, stock, iva, 
          unidad_medida, descripcion, status, date_created, date_modify
        ) VALUES (
          @id, @ref_name, @sku, @allow_negative, @stock, @iva, 
          @unidad_medida, @descripcion, @status, @date_created, @date_modify
        )
      `)

      const info = stmt.run({
        ...item,
        id: id,
        date_created: now,
        date_modify: now,
        status: status
      })
      
      return { success: true, id: id, changes: info.changes }

    } catch (error) {
      console.error("Error adding product:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("update-producto", (_, item) => {
    try {
      const now = new Date().toISOString()

      const stmt = db.prepare(`
        UPDATE producto SET
          ref_name = @ref_name,
          sku = @sku,
          allow_negative = @allow_negative,
          stock = @stock,
          iva = @iva,
          unidad_medida = @unidad_medida,
          descripcion = @descripcion,
          date_modify = @date_modify
        WHERE id = @id
      `)

      const info = stmt.run({ ...item, date_modify: now })

      return { success: true, changes: info.changes }

    } catch (error) {
      console.error("Error updating product:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("delete-producto", (_, item) => {
    try {
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        UPDATE producto
        SET 
          status = 0,
          date_modify = @date_modify,
          modify_by = @modify_by
        WHERE id = @id
      `)

      const info = stmt.run({
        id: item.id,
        date_modify: now,
        modify_by: item.modify_by || 'System'
      })

      if (info.changes > 0) {
        return { success: true, changes: info.changes };
      } else {
        return { success: false, changes: 0, message: "Product ID not found." };
      }

    } catch (error) {
      console.error("Error deleting product:", error)
      return { success: false, error: error.message }
    }
  })
}