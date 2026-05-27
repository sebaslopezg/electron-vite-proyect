import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession;
    if (!user) return false;
    return user.permisos?.includes("ALL") || user.permisos?.includes(permission);
}

export const registerLogsHandlers = () => {
    ipcMain.handle("get-system-logs", (_, limit = 1000) => {
        if (!checkPermission("ver_logs")) return []
        try { return db.prepare(`SELECT * FROM system_logs ORDER BY fecha DESC LIMIT ?`).all(limit) } catch (error) { return [] }
    })

    ipcMain.handle("clear-system-logs", () => {
        if (!checkPermission("ver_logs")) return { success: false, error: "No autorizado" }
        try {
            db.prepare(`DELETE FROM system_logs`).run()
            logger.warning('SISTEMA', 'La tabla de logs del sistema fue vaciada por un administrador.')
            return { success: true }
        } catch (error) { return { success: false, error: error.message } }
    })
}