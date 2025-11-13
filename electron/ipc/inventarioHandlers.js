import { ipcMain } from "electron";
import db from "../database/index.js";

export function registerInventarioHandlers() {

  ipcMain.handle("get-inventario", async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM inventario WHERE status > 0", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle("add-inventario", async (_, item) => {
    const { ref_name, sku } = item;
    const now = new Date().toISOString();
    const status = 1;
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventario (ref_name, sku, status, date_created, date_modify)
         VALUES (?, ?, ?, ?, ?)`,
        [ref_name, sku, status, now, now],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  });

    ipcMain.handle("update-inventario", async (_, item) => {
    const { id, ref_name, sku, status } = item;
    const date_modify = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run(
        `UPDATE inventario SET ref_name=?, sku=?, status=?, date_modify=? WHERE id=?`,
        [ref_name, sku, status, date_modify, id],
        function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        }
        );
    });
    });

ipcMain.handle("delete-inventario", async (_, id) => {
  const status = 0;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE inventario SET status = ? WHERE id = ?`,
      [status, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}); 
}




// === CRUD IPC ===

// READ
/* ipcMain.handle("get-inventario", async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM inventario WHERE status > 0", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// CREATE
ipcMain.handle("add-inventario", async (_, item) => {
  const { ref_name, sku } = item;
  const now = new Date().toISOString();
  const status = 1;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO inventario (ref_name, sku, status, date_created, date_modify)
       VALUES (?, ?, ?, ?, ?)`,
      [ref_name, sku, status, now, now],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
});

// UPDATE
ipcMain.handle("update-inventario", async (_, item) => {
  const { id, ref_name, sku, status } = item;
  const date_modify = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE inventario SET ref_name=?, sku=?, status=?, date_modify=? WHERE id=?`,
      [ref_name, sku, status, date_modify, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
});

// DELETE (soft delete)
ipcMain.handle("delete-inventario", async (_, id) => {
  const status = 0;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE inventario SET status = ? WHERE id = ?`,
      [status, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}); */