import db from "../index.js"

export const runV1Producto = () => {
    db.exec(`
      CREATE TABLE producto (
        id TEXT PRIMARY KEY,
        ref_name TEXT,
        sku TEXT,
        tipo TEXT,
        precio REAL,
        allow_negative INTEGER,
        stock REAL,
        
        min_stock REAL DEFAULT 5,
        max_stock REAL DEFAULT 100,
        categoria_id TEXT DEFAULT 'general',
        
        iva REAL,
        unidad_medida TEXT,
        descripcion TEXT,

        allow_encargo INTEGER DEFAULT 1,
        encargo_solo_sin_stock INTEGER DEFAULT 1,

        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT,

        FOREIGN KEY(categoria_id) REFERENCES categoria(id)
      );

      CREATE INDEX idx_producto_ref ON producto(ref_name);
      CREATE INDEX idx_producto_sku ON producto(sku);
    `)

    console.log("Tabla Producto inicializada.")
}