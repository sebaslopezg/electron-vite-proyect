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

      numero_factura INTEGER,
      cantidad_producto TEXT,

      numero_encargo INTEGER,
      fecha_entrega TEXT,
      descripcion TEXT,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}