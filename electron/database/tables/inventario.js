import db from "../index.js"

export const runV1Inventario = () => {
    db.exec(`
      CREATE TABLE inventario (
        id TEXT PRIMARY KEY,
        producto_id TEXT NOT NULL,
        tipo_movimiento TEXT NOT NULL,
        modulo_movimiento TEXT,
        cantidad REAL NOT NULL,
        stock_anterior REAL,
        stock_nuevo REAL,
        fecha TEXT NOT NULL,
        usuario TEXT,
        notas TEXT,
        FOREIGN KEY (producto_id) REFERENCES producto(id)
      );
      
      -- Create indexes for common queries
      CREATE INDEX idx_inventario_producto ON inventario(producto_id);
      CREATE INDEX idx_inventario_fecha ON inventario(fecha);
      CREATE INDEX idx_inventario_tipo ON inventario(tipo_movimiento);
    `);

    console.log("Tabla Inventario inicializada.");
}