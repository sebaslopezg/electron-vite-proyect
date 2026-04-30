import db from "../index.js"

export function runV1VentasMaestro() {
    db.exec(`
      CREATE TABLE ventasMaestro (
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
        moneda TEXT,
        formato_numero TEXT,

        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      )
    `);

    console.log("Tabla Ventas Maestro inicializada.");
}