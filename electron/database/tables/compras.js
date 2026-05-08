import db from "../index.js"

export const runV1Compras = () => {
    // Tabla Maestra de Compras / Gastos
    db.exec(`
      CREATE TABLE IF NOT EXISTS comprasMaestro (
        id TEXT PRIMARY KEY,
        proveedor_id TEXT NOT NULL,
        documento_proveedor TEXT,
        nombre_proveedor TEXT,
        numero_factura TEXT NOT NULL,
        fecha_factura TEXT NOT NULL,
        fecha_vencimiento TEXT NOT NULL,
        concepto TEXT,
        subtotal REAL DEFAULT 0,
        descuento REAL DEFAULT 0,
        iva REAL DEFAULT 0,
        total_factura REAL DEFAULT 0,
        total_pagado REAL DEFAULT 0,
        saldo_pendiente REAL DEFAULT 0,
        estado TEXT DEFAULT 'pendiente',
        date_created TEXT,
        modify_by TEXT,
        FOREIGN KEY (proveedor_id) REFERENCES terceros(id)
      );
    `)

    // Tabla de Detalles
    db.exec(`
      CREATE TABLE IF NOT EXISTS comprasDetalle (
        id TEXT PRIMARY KEY,
        compra_id TEXT NOT NULL,
        cuenta_puc_id TEXT,
        producto_id TEXT,
        descripcion TEXT NOT NULL,
        cantidad REAL DEFAULT 1,
        precio_unitario REAL DEFAULT 0,
        iva_percent REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (compra_id) REFERENCES comprasMaestro(id),
        FOREIGN KEY (cuenta_puc_id) REFERENCES cuentasContables(id),
        FOREIGN KEY (producto_id) REFERENCES producto(id)
      );
    `)

    console.log("Tablas de Compras y Gastos inicializadas.")
}