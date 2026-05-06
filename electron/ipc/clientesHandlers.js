import { ipcMain } from "electron"
import db from "../database/index.js"

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
            `);
            return stmt.all();
        } catch (error) {
            console.error("Error al intentar obtener clientes desde terceros: ", error)
            return []
        }
    })
}