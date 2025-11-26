import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

export const registerAlmacenConfigHandlers = () => {

    ipcMain.handle("getAll-almacenConf", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM almacen_conf", (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    })

    //para llamar solo una row
    ipcMain.handle("get-almacenConf", async (_, id) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM almacen_conf WHERE id = ? AND status > 0",
                [id],
                (err, row) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(row)
                    }
                }
            )
        })
    })

}