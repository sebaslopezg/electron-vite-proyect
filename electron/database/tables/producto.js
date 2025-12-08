import db from "../index.js"

export const createProductoTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS producto (
      id TEXT PRIMARY KEY,
      ref_name TEXT,
      sku TEXT,
      allow_negative INTEGER,
      stock REAL,
      iva REAL,
      unidad_medida TEXT,
      descripcion TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    );
    -- Create indexes for fields you search by often!
    CREATE INDEX IF NOT EXISTS idx_producto_id ON producto(id);
    CREATE INDEX IF NOT EXISTS idx_producto_ref ON producto(ref_name);
    CREATE INDEX IF NOT EXISTS idx_producto_sku ON producto(sku);
  `)
}