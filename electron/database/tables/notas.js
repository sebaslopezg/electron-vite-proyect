import db from "../index.js"

export const createNotasTables = () => {
  try {
    // We use a single .exec() block for both tables and their indexes
    db.exec(`
      ---------------------------------------------------------
      -- 1. MASTER TABLE (Header: nota)
      ---------------------------------------------------------
      CREATE TABLE IF NOT EXISTS nota (
        id TEXT PRIMARY KEY,
        
        -- Basic Identification
        tipo_nota TEXT NOT NULL,       -- 'CREDITO' or 'DEBITO'
        prefijo TEXT,                  -- e.g., 'NC', 'ND'
        numero_nota INTEGER NOT NULL,  -- The consecutive number
        
        -- Relational Links (CRITICAL for DIAN)
        id_factura_origen TEXT NOT NULL,  -- Link to the original Venta (Sale) ID
        numero_factura_origen TEXT NOT NULL, -- Stored as text for easy UI display (e.g., 'F-1020')
        id_cliente TEXT NOT NULL,         -- Link to the client
        
        -- Accounting & DIAN Requirements
        motivo_dian TEXT NOT NULL,     -- The official reason (e.g., 'Devolución de parte de los bienes')
        observaciones TEXT,            -- Custom text typed by the cashier
        
        -- Financial Totals
        total_base REAL NOT NULL,
        total_iva REAL NOT NULL,
        total_final REAL NOT NULL,
        
        -- Audit & Status
        status INTEGER NOT NULL DEFAULT 1, -- 1: Active/Applied, 0: Annulled
        date_created TEXT NOT NULL,
        date_modify TEXT NOT NULL,
        modify_by TEXT NOT NULL,

        -- Foreign Keys ensure data integrity
        FOREIGN KEY(id_factura_origen) REFERENCES ventasMaestro(id),
        FOREIGN KEY(id_cliente) REFERENCES clientes(id)
      );

      -- Indexes for fast searching by consecutive number or related invoice
      CREATE UNIQUE INDEX IF NOT EXISTS idx_nota_numero ON nota(prefijo, numero_nota);
      CREATE INDEX IF NOT EXISTS idx_nota_factura ON nota(id_factura_origen);

      ---------------------------------------------------------
      -- 2. DETAIL TABLE (Line Items: nota_item)
      ---------------------------------------------------------
      CREATE TABLE IF NOT EXISTS nota_item (
        id TEXT PRIMARY KEY,
        
        -- Link to the Master Note
        id_nota TEXT NOT NULL,
        
        -- Product Information
        id_producto TEXT NOT NULL,
        nombre_producto TEXT NOT NULL, -- Stored as text to preserve history
        
        -- Financials (The amounts being returned/adjusted)
        cantidad REAL NOT NULL,        -- Quantity being returned
        precio_unitario REAL NOT NULL,
        iva_percent REAL NOT NULL,
        subtotal REAL NOT NULL,
        total REAL NOT NULL,
        
        -- Foreign Keys
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