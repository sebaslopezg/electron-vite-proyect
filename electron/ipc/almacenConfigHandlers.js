import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

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

    ipcMain.handle("getOne-almacenConf", (_, id) =>{
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE id = @id AND status > 0")
            const info = stmt.run({id:id})
            return { success: true, changes: info.changes }
        } catch (error) {}
    })

    ipcMain.handle("update-consecutivoFactura" ,(_, item) =>{
        try {
            const stmt = db.prepare(`UPDATE almacen_conf SET consecutivo = @consecutivo WHERE id = @id`)
            const info = stmt.run({...item})
            return { success: true, changes: info.changes }
        } catch (error) {
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
                    email_almacen = @email_almacen,
                    prefijo = @prefijo,
                    separador = @separador, 
                    resolucionDian = @resolucionDian,
                    nombreFactura = @nombreFactura,
                    footer_factura = @footer_factura,
                    consecutivo = @consecutivo,
                    consecutivo_nota = @consecutivo_nota,
                    consecutivo_nota_debito = @consecutivo_nota_debito,
                    imprimir_logo_pos = @imprimir_logo_pos,
                    date_modify = @date_modify,
                    modify_by = @modify_by
                    WHERE id = @id
                `)
            const info = stmt.run({
                ...item,
                separador: item.separador || '', 
                email_almacen: item.email_almacen || '',
                imprimir_logo_pos: item.imprimir_logo_pos ? 1 : 0, 
                date_modify: now,
                modify_by: user
            })
            return { success: true, changes: info.changes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-metodos-pago", () => {
        try {
            return db.prepare("SELECT * FROM metodos_pago ORDER BY nombre ASC").all();
        } catch (error) {
            console.error("Error obteniendo métodos de pago:", error);
            return [];
        }
    });

    ipcMain.handle("add-metodo-pago", (_, nombre) => {
        try {
            const id = uuidv4()
            db.prepare("INSERT INTO metodos_pago (id, nombre) VALUES (?, ?)").run(id, nombre)
            return { success: true, id, nombre }
        } catch (error) {
            if (error.message.includes('UNIQUE')) return { success: false, error: 'Este método ya existe.' }
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-metodo-pago-cuenta", (_, { id, cuenta_id }) => {
        try {
            db.prepare("UPDATE metodos_pago SET cuenta_id = ? WHERE id = ?").run(cuenta_id, id)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-metodo-pago", (_, id) => {
        try {
            db.prepare("DELETE FROM metodos_pago WHERE id = ?").run(id)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}