import db from "../index.js"
import { v4 as uuidv4 } from 'uuid'

export const createAlmacenConfTable = () => {
  try {
    const conf = {
      nombre_almacen: 'Caedro',
      nit_almacen: '9001100',
      logo_almacen: '',
      direccion_almacen: 'Enrique Segoviano',
      telefono_almacen: '3106019954',
      email_almacen: '',
      prefijo: 'F',
      separador: '-', 
      resolucionDian: 'Res DIAN',
      nombreFactura: 'Factura de venta',
      footer_factura: 'Gracias por su compra',
      consecutivo: 0,
      consecutivo_nota: 0
    }

    const now = new Date().toISOString()
    const id = uuidv4()
    const status = 1
    const user = 'system'

    db.exec(`
      CREATE TABLE IF NOT EXISTS almacen_conf (
        id TEXT PRIMARY KEY,
        nombre_almacen TEXT,
        nit_almacen TEXT,
        logo_almacen TEXT,
        direccion_almacen TEXT,
        telefono_almacen TEXT,
        email_almacen TEXT, -- NUEVA COLUMNA AÑADIDA
        prefijo TEXT,
        separador TEXT, 
        resolucionDian TEXT,
        nombreFactura TEXT,
        footer_factura TEXT,
        consecutivo INTEGER,
        consecutivo_nota INTEGER,
        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      ); 
    `)

    try { db.exec("ALTER TABLE almacen_conf ADD COLUMN separador TEXT DEFAULT '-'"); } catch (e) {}
    try { db.exec("ALTER TABLE almacen_conf ADD COLUMN email_almacen TEXT DEFAULT ''"); } catch (e) {}

    const countStmt = db.prepare(`SELECT count(*) as count FROM almacen_conf`)
    const row = countStmt.get()

    if (row.count === 0) {
      const insertStmt = db.prepare(`
        INSERT INTO almacen_conf (
          id, nombre_almacen, nit_almacen, logo_almacen, direccion_almacen, 
          telefono_almacen, email_almacen, prefijo, separador, resolucionDian, nombreFactura, footer_factura, 
          consecutivo, consecutivo_nota, status, date_created, date_modify, modify_by
        )
        VALUES (
            @id, @nombre_almacen, @nit_almacen, @logo_almacen, @direccion_almacen, 
            @telefono_almacen, @email_almacen, @prefijo, @separador, @resolucionDian, @nombreFactura, @footer_factura, 
            @consecutivo, @consecutivo_nota, @status, @date_created, @date_modify, @modify_by
        )
      `)

      insertStmt.run({
          id,
          ...conf,
          status,
          date_created: now,
          date_modify: now,
          modify_by: user
      })
    }
  } catch (error) {
      console.error('Database initialization error in almacenConf:', error)
  }
}