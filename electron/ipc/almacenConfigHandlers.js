import { ipcMain } from "electron"
import db from "../database/index.js"

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
            const info = stmt.run({
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
}