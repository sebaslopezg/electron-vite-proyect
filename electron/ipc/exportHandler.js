import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { appDb } from '../database/index.js'

export const registerExportHandlers = () => {
    ipcMain.handle('export-db', async () => {
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

            if (!filePath) return { success: false, message: 'Exportación cancelada' }

            if (!fs.existsSync(dbPath)) {
                throw new Error(`No se encontró la base de datos en: ${dbPath}`)
            }

            fs.copyFileSync(dbPath, filePath)
            return { success: true, message: 'Base de datos exportada correctamente' }
            
        } catch (error) {
            return { success: false, message: error.message }
        }
    })
}