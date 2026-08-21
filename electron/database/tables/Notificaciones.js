import db from "../index.js"

export function runV1Notificaciones() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id TEXT PRIMARY KEY,
        titulo TEXT,
        mensaje TEXT,
        tipo TEXT, 
        link TEXT,
        leida INTEGER DEFAULT 0,
        date_created TEXT
      )
    `);

    console.log("Tabla Notificaciones inicializada.");
}