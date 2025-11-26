import db from "../index.js"

export function createProductoTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS producto (
      id TEXT PRIMARY KEY,
      ref_name TEXT,
      sku TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}