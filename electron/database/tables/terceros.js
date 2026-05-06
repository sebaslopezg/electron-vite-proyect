import db from "../index.js"

export const runV1Terceros = () => {
    db.exec(`
      CREATE TABLE terceros (
        id TEXT PRIMARY KEY,
        tipo_documento TEXT NOT NULL,
        numero_documento TEXT NOT NULL UNIQUE,
        digito_verificacion TEXT,
        
        tipo_persona TEXT NOT NULL,
        razon_social TEXT,
        nombres TEXT,
        apellidos TEXT,
        
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        ciudad_id TEXT,
        
        es_cliente INTEGER DEFAULT 0,
        es_proveedor INTEGER DEFAULT 0,
        estado INTEGER DEFAULT 1,
        
        date_created TEXT,
        date_modify TEXT
      );

      CREATE INDEX idx_terceros_doc ON terceros(numero_documento);
    `);

    console.log("Tabla Terceros inicializada.");
}