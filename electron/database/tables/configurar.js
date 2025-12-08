import db from "../index.js"

export const createConfigurarTable = () => {
  const now = new Date().toISOString()

  const confAlmacen = {
    key:'confAlmacen',
    nombre: 'Caedro',
    nit: '',
    logo: '',
    direccion: '',
    telefono: '',
    prefijo:'F',
    resolucionDian:'',
    nombreFactura:'Factura de Venta',
    footer:'Esta factura de venta es de ejemplo'
  }

  const value = JSON.stringify(confAlmacen)

  db.exec(`
    CREATE TABLE IF NOT EXISTS configurar (
      key TEXT PRIMARY KEY,
      value TEXT,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )`, 
    (err) => {
      if (err) {
        console.error('Error creating table:', err)
        return
      }

      // Insert default row after table is created
      db.exec(
        `INSERT OR IGNORE INTO configurar (key,value, date_created, date_modify)
        VALUES (?, ?, ?, ?)`,
        [confAlmacen.key, value, now, now],
        (err) => {
          if (err) console.error('Error inserting default row:', err)
        }
      )
    }
  )
}