import db from "../index.js"

export const createProductoTable = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS producto (
      id TEXT PRIMARY KEY,
      ref_name TEXT,
      sku TEXT,
      allow_negative INTEGER,
      stock REAL,
      iva REAL,
      unidad_medida TEXT,
      descripcion TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}