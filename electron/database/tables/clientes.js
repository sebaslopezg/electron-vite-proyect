import db from "../index.js"

export const createClientesTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      documento TEXT UNIQUE,
      telefono TEXT,
      direccion TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cliente on clientes(id);
  `)
}