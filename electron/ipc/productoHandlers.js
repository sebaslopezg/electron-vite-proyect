import { ipcMain } from "electron";
import { v4 as uuidv4 } from 'uuid';
import db from "../database/index.js";

export const registerProductoHandlers = () => {

  // 1. GET ALL PRODUCTS
  ipcMain.handle("get-productos", () => {
    try {
      // .all() returns an array of objects
      const stmt = db.prepare('SELECT * FROM producto WHERE status > 0')
      return stmt.all()
    } catch (error) {
      console.error("Error al intentar obtener productos:", error)
      return []
    }
  })

  // 2. ADD PRODUCT
  ipcMain.handle("add-producto", (event, item) => {
    try {
      const id = uuidv4()
      const now = new Date().toISOString()

      // "prepare" the query first
      const stmt = db.prepare(`
        INSERT INTO producto (
          id, ref_name, sku, allow_negative, stock, iva, 
          unidad_medida, descripcion, status, date_created, date_modify
        ) VALUES (
          @id, @ref_name, @sku, @allow_negative, @stock, @iva, 
          @unidad_medida, @descripcion, @status, @date_created, @date_modify
        )
      `);

      // "run" executes the query. We use an object with named parameters (@key)
      const info = stmt.run({
        ...item,
        id: id,
        date_created: now,
        date_modify: now,
        status: 1 // Default active
      })
      
      // 'info.changes' tells you how many rows were affected (should be 1)
      return { success: true, id: id, changes: info.changes }

    } catch (error) {
      console.error("Error adding product:", error)
      // Return the error message to the frontend so you can show a SweetAlert
      return { success: false, error: error.message }
    }
  })

  // 3. UPDATE PRODUCT
  ipcMain.handle("update-producto", (event, item) => {
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
  });

  // 4. DELETE PRODUCT
  ipcMain.handle("delete-producto", (event, item) => {
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

/* export function registerProductoHandlers() {

  ipcMain.handle("get-productos", async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM producto WHERE status > 0", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      })
    })
  })

  ipcMain.handle("add-producto", async (_, item) => {
    const { ref_name, sku } = item;
    const now = new Date().toISOString();
    const status = 1
    const id = uuidv4()
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO producto (
          id, 
          ref_name, 
          sku, status, 
          date_created, 
          date_modify
        )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ref_name, sku, status, now, now],
        function (err) {
          if (err) reject(err)
          else resolve({ id: this.lastID })
        }
      )
    })
  })

  ipcMain.handle("update-producto", async (_, item) => {
    const { id, ref_name, sku, status } = item;
    const date_modify = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run(
          `UPDATE producto SET ref_name=?, sku=?, status=?, date_modify=? WHERE id=?`,
          [ref_name, sku, status, date_modify, id],
          function (err) {
              if (err) reject(err);
              else resolve({ changes: this.changes });
          }
        )
    })
  })

  ipcMain.handle("delete-producto", async (_, id) => {
    const status = 0

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE producto SET status = ? WHERE id = ?`,
        [status, id],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      )
    })
  })
} */