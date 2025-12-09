import db from "../index.js"
import { v4 as uuidv4 } from 'uuid'

export const createAlmacenConfTable = () => {
  try{
    const conf = {
      nombre_almacen: 'Caedro',
      nit_almacen: '9001100',
      logo_almacen: '',
      direccion_almacen: 'Entique segoviano',
      telefono_almacen: '3106019954',
      prefijo: 'F',
      resolucionDian: 'res Dian',
      nombreFactura: 'Factura de venta',
      footer_factura: 'footer de la factura',
      consecutivo: 0,
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
        prefijo TEXT,
        resolucionDian TEXT,
        nombreFactura TEXT,
        footer_factura TEXT,
        consecutivo INTEGER,
        status INTEGER,
        date_created TEXT,
        date_modify TEXT,
        modify_by TEXT
      ); 
      -- Optional: Add an index if you frequently query by a unique name/nit
      CREATE UNIQUE INDEX IF NOT EXISTS idx_almacen_nit ON almacen_conf(nit_almacen);
    `)
    console.log("Table almacen_conf created or confirmed.")

    const countStmt = db.prepare(`SELECT count(*) as count FROM almacen_conf`)
    const row = countStmt.get()

    if (row.count === 0) {
      console.log("Table empty, inserting default configuration...")
                
      const insertStmt = db.prepare(`
        INSERT INTO almacen_conf (
          id, nombre_almacen, nit_almacen, logo_almacen, direccion_almacen, 
          telefono_almacen, prefijo, resolucionDian, nombreFactura, footer_factura, 
          consecutivo, status, date_created, date_modify, modify_by
        )
        VALUES (
            @id, @nombre_almacen, @nit_almacen, @logo_almacen, @direccion_almacen, 
            @telefono_almacen, @prefijo, @resolucionDian, @nombreFactura, @footer_factura, 
            @consecutivo, @status, @date_created, @date_modify, @modify_by
        )
      `)

      insertStmt.run({
          id,
          ...conf, // Spreads all properties from the 'conf' object
          status,
          date_created: now,
          date_modify: now,
          modify_by: user
      })
    } else {
      console.log("Configuration already exists. Skipping insert.")
    }

  } catch (error) {
      console.error('Database initialization error in almacenConf:', error)
  }
}