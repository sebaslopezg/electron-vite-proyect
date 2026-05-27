import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { appDb } from '../database/index.js'
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    return user.permisos?.includes("ALL") || user.permisos?.includes(permission)
}

export const registerExportHandlers = () => {
    ipcMain.handle('export-db', async () => {
        if (!checkPermission("exportar_datos")) return { success: false, message: "No posees privilegios para extraer copias de seguridad." }
        try {
            const activeProfile = appDb.prepare("SELECT filename, nombre FROM perfiles WHERE is_active = 1").get()
            
            const filename = activeProfile ? activeProfile.filename : 'main.db'
            
            const safeName = activeProfile ? activeProfile.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'data'
            const dbPath = path.join(app.getPath('userData'), 'app2', filename)

            const { filePath } = await dialog.showSaveDialog({
                title: 'Exportar Base de Datos',
                defaultPath: `respaldo_${safeName}_${new Date().toISOString().split('T')[0]}.db`,
                filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            })

            if (!filePath) {
                logger.info('SISTEMA', 'Exportación de base de datos (Backup) cancelada por el usuario en el cuadro de diálogo.');
                return { success: false, message: 'Exportación cancelada' }
            }

            if (!fs.existsSync(dbPath)) {
                throw new Error(`No se encontró la base de datos en: ${dbPath}`)
            }

            fs.copyFileSync(dbPath, filePath)
            
            logger.success('SISTEMA', `Copia de seguridad (Backup) creada exitosamente`, `Ruta de destino: ${filePath}`)
            return { success: true, message: 'Base de datos exportada correctamente' }
            
        } catch (error) {
            logger.error('SISTEMA', "Error crítico al intentar exportar o copiar la base de datos", error)
            return { success: false, message: error.message }
        }
    })
}