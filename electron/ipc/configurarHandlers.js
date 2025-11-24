import { ipcMain } from "electron"

import db from "../database/index.js";

export const registerConfigurarHandlers = () => {

  ipcMain.handle("get-configuracion", async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM configurar`,
      (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  })

  ipcMain.handle("update-configuracion", async (_, item) => {

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
  })
}