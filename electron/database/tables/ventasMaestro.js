import db from "../index.js"

export function createVentasMaestroTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventasMaestro (
      id TEXT PRIMARY KEY,
      numero_factura INTEGER,
      prefijo TEXT,
      separador TEXT,
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
      total_recibido_original REAL,
      saldo_pendiente_original REAL,
      tipo_pago TEXT,
      metodo_pago TEXT,

      status INTEGER,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `)

  // Migraciones
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN tipo_pago TEXT DEFAULT 'contado'"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN separador TEXT DEFAULT '-'"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN resolucion_dian TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN titulo_documento TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN nombre_almacen TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN nit_almacen TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN direccion_almacen TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN telefono_almacen TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN email_almacen TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN footer TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN total_recibido_original REAL DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN saldo_pendiente_original REAL DEFAULT 0"); } catch (e) {}
}