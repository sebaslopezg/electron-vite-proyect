import db from "../index.js"

export function createAlmacenConfTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS almacen_conf (
      id TEXT PRIMARY KEY,

      nombre_almacen TEXT,
      nit_almacen TEXT,
      logo_almacen TEXT,
      direccion_almacen TEXT,
      telefono_almacen TEXT,
      prefijo TEXT,
      resolucionDian TEXT,
      nombreFactura TEXT,
      footer_factura TEXT,
      consecutivo INTEGER,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}