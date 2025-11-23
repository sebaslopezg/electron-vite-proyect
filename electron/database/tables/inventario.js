import db from "../index.js"

export function createInventarioTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventario (
      id TEXT PRIMARY KEY,
      ref_name TEXT,
      sku TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT
    )
  `)
}