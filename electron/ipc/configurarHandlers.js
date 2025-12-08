import { ipcMain } from "electron"

import db from "../database/index.js"

export const registerConfigurarHandlers = () => {


  ipcMain.handle("get-configuracion", () => {
    try {
      const stmt = db.prepare(`SELECT * FROM configurar`)
      return stmt.all()
    } catch (error) {
      console.error("Error al intentar obtener datos: ", error)
      return []
    }
  })

/*   ipcMain.handle("get-configuracion", async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM configurar`,
      (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }) */

  ipcMain.handle("update-configuracion", (_, item) => {
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      UPDATE configurar SET 
        value=@value, 
        date_modify=@date_modify
        WHERE key=@key
      `)
    const info = db.run({
      ...item,
      date_modify:now
    })
  })

/*   ipcMain.handle("update-configuracion", async (_, item) => {

    const  {key, value}  = item;
    const now = new Date().toISOString()

    return new Promise((resolve, reject) => {
        db.run(
          `UPDATE configurar SET value=?, date_modify=? WHERE key=?`,
          [value, now, key],
          function (err) {
              if (err) reject(err)
              else resolve({ changes: this.changes })
          }
        )
    })
  }) */
}