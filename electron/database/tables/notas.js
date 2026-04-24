import db from "../index.js"

export const createNotasTables = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS nota (
        id TEXT PRIMARY KEY,
        tipo_nota TEXT NOT NULL,
        prefijo TEXT,
        numero_nota INTEGER NOT NULL,
        id_factura_origen TEXT NOT NULL,
        numero_factura_origen TEXT NOT NULL,
        
        -- CAMBIOS AQUÍ: Guardamos los datos del cliente directamente (igual que en ventasMaestro)
        documento_cliente TEXT,
        nombre_cliente TEXT,
        
        motivo_dian TEXT NOT NULL,
        observaciones TEXT,
        total_base REAL NOT NULL,
        total_iva REAL NOT NULL,
        total_final REAL NOT NULL,
        status INTEGER NOT NULL DEFAULT 1,
        date_created TEXT NOT NULL,
        date_modify TEXT NOT NULL,
        modify_by TEXT NOT NULL,

        FOREIGN KEY(id_factura_origen) REFERENCES ventasMaestro(id)
        -- ELIMINAMOS la Foreign Key de clientes
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_nota_numero ON nota(prefijo, numero_nota);
      CREATE INDEX IF NOT EXISTS idx_nota_factura ON nota(id_factura_origen);

      CREATE TABLE IF NOT EXISTS nota_item (
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

      CREATE INDEX IF NOT EXISTS idx_notaitem_nota ON nota_item(id_nota);
    `);
    console.log("Tablas 'nota' y 'nota_item' creadas correctamente.");
  } catch (error) {
    console.error("Error creando tablas de Notas:", error);
  }
}