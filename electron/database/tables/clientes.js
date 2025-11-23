import db from "../index.js"

export function createClientesTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      documento TEXT,
      telefono TEXT,
      direccion TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT
    )
  `)
}