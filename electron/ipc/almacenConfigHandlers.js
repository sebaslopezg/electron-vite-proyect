import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'
import { logger } from "../utils/logger.js"

export const registerAlmacenConfigHandlers = () => {

    ipcMain.handle("getAll-almacenConf", () => {
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE status > 0")
            return stmt.all()
        } catch (error) {
            logger.error('CONFIGURACION', "Error al intentar obtener los datos del almacén", error)
            return []
        }
    })

    ipcMain.handle("getOne-almacenConf", (_, id) =>{
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE id = @id AND status > 0")
            const info = stmt.run({id:id})
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CONFIGURACION', `Error al intentar obtener la configuración (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-consecutivoFactura" ,(_, item) =>{
        try {
            const stmt = db.prepare(`UPDATE almacen_conf SET consecutivo = @consecutivo WHERE id = @id`)
            const info = stmt.run({...item})
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CONFIGURACION', "Error al actualizar el consecutivo de factura", error)
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
            
            logger.success('CONFIGURACION', 'La configuración del almacén fue actualizada correctamente', `Usuario: ${user}`);
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CONFIGURACION', "Error al actualizar la configuración principal del almacén", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-metodos-pago", () => {
        try {
            return db.prepare("SELECT * FROM metodos_pago ORDER BY nombre ASC").all();
        } catch (error) {
            logger.error('METODOS_PAGO', "Error obteniendo la lista de métodos de pago", error);
            return [];
        }
    });

    ipcMain.handle("add-metodo-pago", (_, nombre) => {
        try {
            const id = uuidv4()
            db.prepare("INSERT INTO metodos_pago (id, nombre) VALUES (?, ?)").run(id, nombre)
            logger.success('METODOS_PAGO', `Nuevo método de pago agregado: ${nombre}`);
            return { success: true, id, nombre }
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                logger.warning('METODOS_PAGO', `Intento de duplicar método de pago: ${nombre}`);
                return { success: false, error: 'Este método ya existe.' }
            }
            logger.error('METODOS_PAGO', `Error al agregar método de pago: ${nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-metodo-pago-cuenta", (_, { id, cuenta_id }) => {
        try {
            db.prepare("UPDATE metodos_pago SET cuenta_id = ? WHERE id = ?").run(cuenta_id, id)
            logger.info('METODOS_PAGO', `Cuenta contable vinculada al método de pago (ID: ${id})`);
            return { success: true }
        } catch (error) {
            logger.error('METODOS_PAGO', `Error actualizando cuenta del método de pago (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-metodo-pago", (_, id) => {
        try {
            db.prepare("DELETE FROM metodos_pago WHERE id = ?").run(id)
            logger.warning('METODOS_PAGO', `Método de pago eliminado de la base de datos (ID: ${id})`);
            return { success: true }
        } catch (error) {
            logger.error('METODOS_PAGO', `Error al intentar eliminar método de pago (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })
}