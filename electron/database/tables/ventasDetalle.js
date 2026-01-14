import db from "../index.js"

export function createVentasDetalleTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventasDetalle (
      id TEXT PRIMARY KEY,
      maestro_id TEXT,
      id_producto TEXT,
      nombre_producto TEXT,
      referencia_producto TEXT,
      precio_producto REAL,
      cantidad_producto REAL,
      iva REAL,
      descuento REAL,
      subtotal REAL,
      total REAL,
      status INTEGER,
      date_created TEXT,
      FOREIGN KEY (maestro_id) REFERENCES ventasMaestro(id)
    )
  `)
}