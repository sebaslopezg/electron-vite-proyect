import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

export const registerAlmacenConfigHandlers = () => {

    ipcMain.handle("getAll-almacenConf", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM almacen_conf WHERE status > 0", (err, rows) => {
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


    ipcMain.handle("update-almacenConf", async (_, item) => {
        const {
            id, 
            nombre_almacen, 
            logo_almacen, 
            direccion_almacen, 
            telefono_almacen,
            prefijo,
            resolucionDian,
            nombreFactura,
            footer_factura,
            consecutivo
        } = item;
        const date_modify = new Date().toISOString()
        const user = 'system'
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE almacen_conf SET 
                    nombre_almacen = ?,
                    nit_almacen = ?,
                    logo_almacen = ?,
                    direccion_almacen = ?,
                    telefono_almacen = ?,
                    prefijo = ?,
                    resolucionDian = ?,
                    nombreFactura = ?,
                    footer_factura = ?,
                    consecutivo = ?,
                    date_modify = ?,
                    modify_by = ?
                    WHERE id = ?`,
                [ 
                    nombre_almacen, 
                    logo_almacen, 
                    direccion_almacen, 
                    telefono_almacen,
                    prefijo,
                    resolucionDian,
                    nombreFactura,
                    footer_factura,
                    consecutivo,
                    date_modify,
                    user,
                    id,
                ],
                function (err) {
                    if (err) reject(err)
                    else resolve({ changes: this.changes })
                }
            )
        })
    })

}