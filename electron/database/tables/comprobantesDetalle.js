import db from "../index.js"

export const runV1ComprobantesDetalle = () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS comprobantesDetalle (
        id TEXT PRIMARY KEY,
        comprobante_id TEXT NOT NULL,
        cuenta_id TEXT NOT NULL,
        tercero_id TEXT,
        descripcion_linea TEXT,
        debito REAL DEFAULT 0,
        credito REAL DEFAULT 0,
        FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id),
        FOREIGN KEY (cuenta_id) REFERENCES cuentasContables(id),
        FOREIGN KEY (tercero_id) REFERENCES terceros(id)
      );
    `)
    console.log("Tabla Comprobantes Detalle inicializada.")
}