import db from "../index.js"
import { v4 as uuidv4 } from 'uuid'

export const runV1AlmacenConf = () => {
    db.exec(`
      CREATE TABLE almacen_conf (
        id TEXT PRIMARY KEY,
        nombre_almacen TEXT,
        nit_almacen TEXT,
        logo_almacen TEXT,
        direccion_almacen TEXT,
        telefono_almacen TEXT,
        email_almacen TEXT,
        prefijo TEXT,
        separador TEXT, 
        resolucionDian TEXT,
        nombreFactura TEXT,
        footer_factura TEXT,
        consecutivo INTEGER,
        consecutivo_nota INTEGER,
        consecutivo_nota_debito INTEGER,
        imprimir_logo_pos INTEGER,
        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      ); 
      
      CREATE TABLE metodos_pago (
        id TEXT PRIMARY KEY,
        nombre TEXT UNIQUE
      );
    `);

    const now = new Date().toISOString()
    const id = uuidv4()
    
    const insertStmt = db.prepare(`
        INSERT INTO almacen_conf (
            id, nombre_almacen, nit_almacen, logo_almacen, direccion_almacen, telefono_almacen,
            email_almacen, prefijo, separador, resolucionDian, nombreFactura, footer_factura,
            consecutivo, consecutivo_nota, consecutivo_nota_debito, imprimir_logo_pos,
            status, date_created, date_modify, modify_by
        ) VALUES (
            @id, @nombre_almacen, @nit_almacen, @logo_almacen, @direccion_almacen, @telefono_almacen,
            @email_almacen, @prefijo, @separador, @resolucionDian, @nombreFactura, @footer_factura,
            @consecutivo, @consecutivo_nota, @consecutivo_nota_debito, @imprimir_logo_pos,
            @status, @date_created, @date_modify, @modify_by
        )
    `);

    insertStmt.run({
        id, 
        nombre_almacen: 'Caedro', nit_almacen: '9001100', logo_almacen: '',
        direccion_almacen: 'Enrique Segoviano', telefono_almacen: '3106019954',
        email_almacen: '', prefijo: 'F', separador: '-', resolucionDian: 'Res DIAN',
        nombreFactura: 'Factura de venta', footer_factura: 'Gracias por su compra',
        consecutivo: 0, consecutivo_nota: 0, consecutivo_nota_debito: 0, imprimir_logo_pos: 0,
        status: 1, date_created: now, date_modify: now, modify_by: 'system'
    });

    const insertMetodo = db.prepare("INSERT INTO metodos_pago (id, nombre) VALUES (?, ?)");
    insertMetodo.run(uuidv4(), "Efectivo");
    insertMetodo.run(uuidv4(), "Datafono");
    insertMetodo.run(uuidv4(), "Transferencia Bancaria");
}