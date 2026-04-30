import db from "../index.js"

export const runV1Clientes = () => {
    db.exec(`
      CREATE TABLE clientes (
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
    `);
  console.log("Tabla Clientes inicializada.");
}