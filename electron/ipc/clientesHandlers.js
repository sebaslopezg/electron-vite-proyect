import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerClientesHandlers = () => {
    ipcMain.handle("get-clientes", () => {
        try {
            const stmt = db.prepare(`
                SELECT 
                    id, 
                    numero_documento as documento, 
                    (CASE WHEN tipo_persona = 'juridica' THEN razon_social ELSE nombres || ' ' || apellidos END) as nombre,
                    telefono, 
                    direccion 
                FROM terceros 
                WHERE es_cliente = 1 AND estado = 1
            `)
            return stmt.all()
        } catch (error) {
            logger.error('CLIENTES', "Error al intentar obtener la lista de clientes desde la tabla terceros", error)
            return []
        }
    })
}