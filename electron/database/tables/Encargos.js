import db from "../index.js"

export function createEncargosTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS encargos (
      id TEXT PRIMARY KEY,

      factura_id TEXT,
      producto_id TEXT,
      estado_id TEXT,
      almacen_id TEXT,
      cliente_id TEXT,

      cliente_nombre TEXT,
      cliente_documento TEXT,

      factura_numero INTEGER,
      producto_cantidad REAL,

      encargo_numero INTEGER,
      fecha_entrega TEXT,
      descripcion TEXT,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}