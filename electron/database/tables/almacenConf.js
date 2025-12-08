import db from "../index.js"
import { v4 as uuidv4 } from 'uuid'

export const createAlmacenConfTable = () => {

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

  // 1. Create the table
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
    )`,
    (err) => {
      if (err) {
        console.error('Error creating table:', err)
        return
      }

      // 2. CHECK IF DATA EXISTS
      db.get(`SELECT count(*) as count FROM almacen_conf`, (err, row) => {
        if (err) {
          console.error("Error checking table count", err);
          return;
        }

        // 3. Only insert if count is 0 (Table is empty)
        if (row.count === 0) {
          console.log("Table empty, inserting default configuration...");
          
          db.run(
            `INSERT INTO almacen_conf (
              id, nombre_almacen, nit_almacen, logo_almacen, direccion_almacen, 
              telefono_almacen, prefijo, resolucionDian, nombreFactura, footer_factura, 
              consecutivo, status, date_created, date_modify, modify_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              conf.nombre_almacen,
              conf.nit_almacen,
              conf.logo_almacen,
              conf.direccion_almacen,
              conf.telefono_almacen,
              conf.prefijo,
              conf.resolucionDian,
              conf.nombreFactura,
              conf.footer_factura,
              conf.consecutivo,
              status,
              now,
              now,
              user
            ],
            (err) => {
              if (err) console.error('Error inserting default row:', err)
              else console.log('Default configuration created successfully.');
            }
          )
        } else {
          console.log("Configuration already exists. Skipping insert.");
        }
      });
    }
  )
}