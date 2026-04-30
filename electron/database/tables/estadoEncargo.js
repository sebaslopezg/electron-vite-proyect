import db from "../index.js"

export function runV1EstadoEncargo() {
    db.exec(`
      CREATE TABLE estadoEncargo (
        id TEXT PRIMARY KEY,

        titulo TEXT,
        descripcion TEXT,
        color TEXT,
        allow_calendar INTEGER,
        icon_data TEXT,

        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      )
    `);

    db.prepare(`
        INSERT INTO estadoEncargo (id, titulo, descripcion, color, allow_calendar, icon_data, status) 
        VALUES ('pendiente', 'pendiente', 'Estado por defecto', '#df4949', 0, 'bi bi-three-dots', 1)
    `).run();

    console.log("Tabla Estado Encargo inicializada.");
}