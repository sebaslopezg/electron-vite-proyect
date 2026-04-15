import db from "../index.js"

export function createEncargosTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS encargos (
      id TEXT PRIMARY KEY,

      id_factura TEXT,
      numero_factura TEXT,
      id_producto TEXT,
      numero_encargo INTEGER,
      fecha_entrega TEXT,
      estado_encargo TEXT,
      
      nombre_almacen TEXT,
      nombre_cliente TEXT,
      documento_cliente TEXT,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}