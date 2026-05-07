import db from "../index.js"

export const runV1Comprobantes = () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id TEXT PRIMARY KEY,
        numero_comprobante INTEGER,
        fecha TEXT NOT NULL,
        concepto TEXT NOT NULL,
        documento_referencia TEXT,
        estado INTEGER DEFAULT 1,
        date_created TEXT,
        modify_by TEXT
      );
    `)
    console.log("Tabla Comprobantes inicializada.");
}