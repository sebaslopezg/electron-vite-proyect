import { ipcMain } from "electron"
import db from "../database/index.js"
//import { v4 as uuidv4 } from 'uuid'

export const registerAlmacenConfigHandlers = () => {

    ipcMain.handle("getAll-almacenConf", () => {
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE status > 0")
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener datos: ", error)
            return []
        }
    })

/*     ipcMain.handle("getAll-almacenConf", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM almacen_conf WHERE status > 0", (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }) */

    //para llamar solo una row (revisar si puede funcionar)
    ipcMain.handle("getOne-almacenConf", (_, id) =>{
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE id = @id AND status > 0")
            const info = stmt.run({id:id})
            return { success: true, changes: info.changes }
        } catch (error) {
            
        }
    })

    ipcMain.handle("update-consecutivoFactura" ,(_, item) =>{
        try {
            const stmt = db.prepare(`UPDATE almacen_conf SET consecutivo = @consecutivo, WHERE id = @id`)
            const info = db.run({...item})
            return { success: true, changes: info.changes }
        } catch (error) {
            console.error("Error al intentar actualizar datos: ", error)
            return { success: false, error: error.message }
        }
    })

/*     ipcMain.handle("update-consecutivoFactura", async (_, item) => {
        const {consecutivo, id} = item
        return new Promise((resolve, reject) => {
            db.run(`UPDATE almacen_conf SET consecutivo = ?, WHERE id = ?`,
                [consecutivo,id],
                function (err) {
                    if (err) reject(err)
                    else resolve({ changes: this.changes })
                }
            )
        })
    }) */

    ipcMain.handle("update-almacenConf", (_, item) => {
        try {
            const now = new Date().toISOString()
            const user = 'system'

            const stmt = db.prepare(`
                UPDATE almacen_conf SET 
                    nombre_almacen = @nombre_almacen,
                    nit_almacen = @nit_almacen,
                    logo_almacen = @logo_almacen,
                    direccion_almacen = @direccion_almacen,
                    telefono_almacen = @telefono_almacen,
                    prefijo = @prefijo,
                    resolucionDian = @resolucionDian,
                    nombreFactura = @nombreFactura,
                    footer_factura = @footer_factura,
                    consecutivo = @consecutivo,
                    date_modify = @date_modify,
                    modify_by = @modify_by
                    WHERE id = @id
                `)
            const info = db.run({
                ...item,
                date_modify:now,
                modify_by:user
            })
            return { success: true, changes: info.changes }
        } catch (error) {
            console.error("Error al intentar actualizar datos: ", error)
            return { success: false, error: error.message }
        }
    })

/*     ipcMain.handle("update-almacenConf", async (_, item) => {
        const {
            id, 
            nombre_almacen, 
            nit_almacen,
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
                    nit_almacen,
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
    }) */

}