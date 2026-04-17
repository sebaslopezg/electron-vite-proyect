import db from "../index.js"

export function createVentasMaestroTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventasMaestro (
      id TEXT PRIMARY KEY,
      numero_factura INTEGER,
      prefijo TEXT,
      resolucion_dian TEXT,
      titulo_documento TEXT,
      
      nombre_almacen TEXT,
      nit_almacen TEXT,
      direccion_almacen TEXT,
      telefono_almacen TEXT,
      email_almacen TEXT,

      nombre_cliente TEXT,
      documento_cliente TEXT,
      telefono_cliente TEXT,
      direccion_cliente TEXT,
      email_cliente TEXT,

      footer TEXT,

      -- CAMPOS FINANCIEROS
      subtotal REAL,
      descuento REAL,
      iva REAL,
      total_factura REAL,
      total_recibido REAL,
      saldo_pendiente REAL,
      tipo_pago TEXT,    -- NUEVO CAMPO AÑADIDO
      metodo_pago TEXT,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)

  try {
      db.exec("ALTER TABLE ventasMaestro ADD COLUMN tipo_pago TEXT DEFAULT 'contado'");
  } catch (e) {
      console.log(`Error intentando actualizar tabla: ${e}`)
  }
}