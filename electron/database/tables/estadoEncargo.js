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
  const row = db.prepare('SELECT count(*) as count FROM estadoEncargo WHERE id = ?').get('pendiente');
  if (row.count === 0) {
    db.prepare(`
        INSERT INTO estadoEncargo (id, titulo, descripcion, color, allow_calendar, status) 
        VALUES ('pendiente', 'pendiente', 'Estado por defecto', '#df4949', '0', 1)
      `).run();
  }
}