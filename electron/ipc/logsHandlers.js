import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerLogsHandlers = () => {
    
    ipcMain.handle("get-system-logs", (_, limit = 1000) => {
        try {
            return db.prepare(`SELECT * FROM system_logs ORDER BY fecha DESC LIMIT ?`).all(limit)
        } catch (error) {
            console.error("Error obteniendo logs:", error)
            logger.error('SISTEMA', "Error obteniendo logs", error)
            return []
        }
    })

    ipcMain.handle("clear-system-logs", () => {
        try {
            db.prepare(`DELETE FROM system_logs`).run()
            logger.warning('SISTEMA', 'La tabla de logs del sistema fue vaciada por un administrador.')
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}