import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'

export const registerExportHandlers = () => {
    ipcMain.handle('export-db', async () => {
        const dbPath = path.join(app.getPath('userData'), 'app2', 'main.db');

        const { filePath } = await dialog.showSaveDialog({
            title: 'Exportar Base de Datos',
            defaultPath: 'respaldo_data.db',
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (!filePath) return { success: false, message: 'Cancelado' };

        try {
            if (!fs.existsSync(dbPath)) {
                throw new Error(`No se encontró la base de datos en: ${dbPath}`);
            }

            fs.copyFileSync(dbPath, filePath);
            return { success: true, message: 'Base de datos exportada correctamente' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    });
}

