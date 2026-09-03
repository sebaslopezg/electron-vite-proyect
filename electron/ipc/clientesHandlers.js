import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerClientesHandlers = () => {
    ipcMain.handle("get-clientes", () => {
        if (!checkPermission("clientes_ver") && !checkPermission("ventas_crear")) {
            return []
        }
        
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