import { ipcMain } from "electron";
import { v4 as uuidv4 } from 'uuid';

import db from "../database/index.js";

export function registerProductoHandlers() {

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
        `INSERT INTO producto (id, ref_name, sku, status, date_created, date_modify)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ref_name, sku, status, now, now],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
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
}