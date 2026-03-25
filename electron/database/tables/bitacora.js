import db from "../index.js"

export const createBitacoraTable = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS bitacora (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            fecha TEXT NOT NULL,
            status INTEGER,
            date_created TEXT,
            date_modify TEXT,
            modify_by TEXT
        );
    `)
}
