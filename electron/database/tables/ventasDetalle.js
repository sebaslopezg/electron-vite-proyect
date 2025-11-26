import db from "../index.js"

export function createVentasDetalleTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS ventasDetalle (
      id TEXT PRIMARY KEY,

      id_producto TEXT,
      nombre_producto TEXT,
      referencia_producto TEXT,
      precio_producto REAL,
      cantidad_producto INTEGER,
      
      iva REAL,
      descuento REAL,
      subtotal REAL,
      total REAL,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}