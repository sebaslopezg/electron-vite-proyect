import db from "../index.js"

export const runV1CuentasContables = () => {
    db.exec(`
      CREATE TABLE cuentasContables (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        naturaleza TEXT NOT NULL,
        es_auxiliar INTEGER NOT NULL,
        exige_tercero INTEGER NOT NULL DEFAULT 1,
        estado INTEGER DEFAULT 1,
        date_created TEXT,
        date_modify TEXT
      );

      CREATE INDEX idx_cuentas_tipo ON cuentasContables(tipo);
    `);

    console.log("Tabla Cuentas Contables (PUC) inicializada.");
}