import db from "../index.js"

export const runV1ConfiguracionContable = () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS configuracionContable (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cuenta_caja TEXT,
        cuenta_cartera TEXT,
        cuenta_ingresos TEXT,
        cuenta_iva TEXT,
        cuenta_descuento TEXT
      );

      INSERT OR IGNORE INTO configuracionContable (id, cuenta_caja, cuenta_cartera, cuenta_ingresos, cuenta_iva, cuenta_descuento) 
      VALUES (1, '', '', '', '', '');
    `);
    console.log("Tabla Configuracion Contable inicializada.");
}

export const runV2ConfiguracionContable = () => {
  db.exec(`
    ALTER TABLE configuracionContable ADD COLUMN cuenta_proveedores TEXT;
    ALTER TABLE configuracionContable ADD COLUMN cuenta_iva_compras TEXT;
    ALTER TABLE configuracionContable ADD COLUMN cuenta_inventario TEXT;
  `)
  console.log("Tabla Configuracion Contable actualizada V2.");
}
