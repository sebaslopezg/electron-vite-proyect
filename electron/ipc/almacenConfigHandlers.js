import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerAlmacenConfigHandlers = () => {

    try {
        db.exec("ALTER TABLE metodos_pago ADD COLUMN status INTEGER DEFAULT 1;");
        logger.info('SISTEMA', 'Migración exitosa: Columna "status" inyectada en la tabla metodos_pago.');
    } catch (error) {}

    ipcMain.handle("getAll-almacenConf", () => {
        try {
            const stmt = db.prepare("SELECT * FROM almacen_conf WHERE status > 0")
            return stmt.all()
        } catch (error) {
            logger.error('CONFIGURACION', "Error al intentar obtener los datos del almacén", error)
            return []
        }
    })

    ipcMain.handle("update-almacenConf", (_, item) => {
        if (!checkPermission("ventas_configurar")) {
            return { success: false, error: "No autorizado para modificar los datos fiscales y resoluciones del almacén." }
        }
        try {
            const now = new Date().toISOString()
            const user = global.currentUserSession?.username || 'system'

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
            
            logger.success('CONFIGURACION', 'La configuración del almacén fue actualizada correctamente')
            return { success: true, changes: info.changes }
        } catch (error) {
            logger.error('CONFIGURACION', "Error al actualizar la configuración principal del almacén", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-metodos-pago", () => {
        try {
            return db.prepare("SELECT * FROM metodos_pago WHERE status > 0 ORDER BY nombre ASC").all()
        } catch (error) {
            logger.error('METODOS_PAGO', "Error obteniendo la lista de métodos de pago", error)
            return []
        }
    });

    ipcMain.handle("add-metodo-pago", (_, nombre) => {
        if (!checkPermission("ventas_configurar")) {
            return { success: false, error: "No autorizado." }
        }
        try {
            const id = uuidv4()
            db.prepare("INSERT INTO metodos_pago (id, nombre, status) VALUES (?, ?, 1)").run(id, nombre)
            logger.success('METODOS_PAGO', `Nuevo método de pago agregado: ${nombre}`)
            return { success: true, id, nombre }
        } catch (error) {
            logger.error('METODOS_PAGO', `Error al intentar agregar el método de pago: ${nombre}`, error)
            if (error.message.includes('UNIQUE')) {
                return { success: false, error: 'Este método ya existe.' }
            }
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-metodo-pago-cuenta", (_, { id, cuenta_id }) => {
        if (!checkPermission("ventas_configurar")) {
            return { success: false, error: "No autorizado." };
        }
        try {
            db.prepare("UPDATE metodos_pago SET cuenta_id = ? WHERE id = ?").run(cuenta_id, id)
            logger.success('METODOS_PAGO', `Vínculo de cuenta contable actualizado para el método ID: ${id}`)
            return { success: true }
        } catch (error) {
            logger.error('METODOS_PAGO', `Error al actualizar cuenta contable en método ID: ${id}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-metodo-pago", (_, id) => {
        if (!checkPermission("ventas_configurar")) {
            return { success: false, error: "No autorizado." }
        }
        try {
            db.prepare("UPDATE metodos_pago SET status = 0 WHERE id = ?").run(id)
            logger.success('METODOS_PAGO', `Método de pago con ID ${id} fue eliminado lógicamente (Soft Delete)`)
            return { success: true }
        } catch (error) {
            logger.error('METODOS_PAGO', `Error al aplicar Soft Delete al método de pago ID: ${id}`, error)
            return { success: false, error: error.message }
        }
    })
}