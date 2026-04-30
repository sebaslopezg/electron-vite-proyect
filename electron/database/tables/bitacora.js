import db from "../index.js"

export const runV1Bitacora = () => {
    db.exec(`
      CREATE TABLE bitacora (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        fecha TEXT NOT NULL,
        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      );
    `);

    console.log("Tabla Bitácora inicializada.");
}