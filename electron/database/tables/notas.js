import db from "../index.js"

export const runV1Notas = () => {
    db.exec(`
      CREATE TABLE nota (
        id TEXT PRIMARY KEY,
        tipo_nota TEXT NOT NULL,
        prefijo TEXT,
        numero_nota INTEGER NOT NULL,
        id_factura_origen TEXT NOT NULL,
        numero_factura_origen TEXT NOT NULL,
        
        documento_cliente TEXT,
        nombre_cliente TEXT,
        
        motivo_dian TEXT NOT NULL,
        observaciones TEXT,
        total_base REAL NOT NULL,
        total_iva REAL NOT NULL,
        total_final REAL NOT NULL,
        moneda TEXT DEFAULT 'COP',
        formato_numero TEXT DEFAULT 'es-CO',
        status INTEGER NOT NULL DEFAULT 1,
        date_created TEXT NOT NULL,
        date_modify TEXT NOT NULL,
        modify_by TEXT NOT NULL,

        FOREIGN KEY(id_factura_origen) REFERENCES ventasMaestro(id)
      );

      CREATE UNIQUE INDEX idx_nota_numero ON nota(prefijo, numero_nota);
      CREATE INDEX idx_nota_factura ON nota(id_factura_origen);

      CREATE TABLE nota_item (
        id TEXT PRIMARY KEY,
        id_nota TEXT NOT NULL,
        id_producto TEXT NOT NULL,
        nombre_producto TEXT NOT NULL,
        cantidad REAL NOT NULL,
        precio_unitario REAL NOT NULL,
        iva_percent REAL NOT NULL,
        subtotal REAL NOT NULL,
        total REAL NOT NULL,
        
        FOREIGN KEY(id_nota) REFERENCES nota(id) ON DELETE CASCADE,
        FOREIGN KEY(id_producto) REFERENCES producto(id)
      );

      CREATE INDEX idx_notaitem_nota ON nota_item(id_nota);
    `);

    console.log("Tablas 'nota' y 'nota_item' inicializadas.");
}