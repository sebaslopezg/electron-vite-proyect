import db from "../index.js"

export function createEstadoEncargoTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estadoEncargo (
      id TEXT PRIMARY KEY,

      titulo TEXT,
      descripcion TEXT,
      color TEXT,
      allow_calendar INTEGER,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)
}