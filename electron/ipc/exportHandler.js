import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { appDb } from '../database/index.js'
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    return user.permisos?.includes("ALL") || user.permisos?.includes(permission)
}

export const registerExportHandlers = () => {
    ipcMain.handle('export-db', async (_, params = {}) => {
        if (!checkPermission("exportar_datos")) return { success: false, message: "No posees privilegios para extraer copias de seguridad." }
        
        try {
            let filename = params.filename;
            let nombre = params.nombre;
            let formato = params.formato || 'db';

            if (!filename) {
                const activeProfile = appDb.prepare("SELECT filename, nombre FROM perfiles WHERE is_active = 1").get()
                filename = activeProfile ? activeProfile.filename : 'main.db'
                nombre = activeProfile ? activeProfile.nombre : 'data'
            }
            
            const safeName = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')
            const dbPath = path.join(app.getPath('userData'), 'app2', filename)

            if (!fs.existsSync(dbPath)) {
                throw new Error(`No se encontró la base de datos en: ${dbPath}`)
            }

            const extension = formato === 'json' ? 'json' : formato === 'sql' ? 'sql' : 'db';

            const { filePath } = await dialog.showSaveDialog({
                title: `Exportar Base de Datos (${formato.toUpperCase()})`,
                defaultPath: `respaldo_${safeName}_${new Date().toISOString().split('T')[0]}.${extension}`,
                filters: [{ name: `${extension.toUpperCase()} File`, extensions: [extension] }]
            })

            if (!filePath) {
                logger.info('SISTEMA', 'Exportación de base de datos cancelada por el usuario.');
                return { success: false, message: 'Exportación cancelada' }
            }

            if (formato === 'db') {
                fs.copyFileSync(dbPath, filePath)
            } 
            else {
                // Abrir la BD del perfil seleccionado en modo lectura
                const targetDb = new Database(dbPath, { readonly: true });
                const tables = targetDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

                if (formato === 'json') {
                    const dump = {};
                    for (const t of tables) {
                        dump[t.name] = targetDb.prepare(`SELECT * FROM ${t.name}`).all();
                    }
                    fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf8');
                } 
                else if (formato === 'sql') {
                    let sqlDump = `-- Respaldo SQL Generado Automáticamente\n-- Perfil: ${nombre}\n-- Fecha: ${new Date().toISOString()}\n\n`;
                    
                    for (const t of tables) {
                        const schema = targetDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(t.name);
                        sqlDump += `${schema.sql};\n\n`;
                        
                        const rows = targetDb.prepare(`SELECT * FROM ${t.name}`).all();
                        for (const row of rows) {
                            const cols = Object.keys(row).join(', ');
                            const vals = Object.values(row).map(v => {
                                if (v === null) return 'NULL';
                                if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                                return v;
                            }).join(', ');
                            sqlDump += `INSERT INTO ${t.name} (${cols}) VALUES (${vals});\n`;
                        }
                        sqlDump += '\n';
                    }
                    fs.writeFileSync(filePath, sqlDump, 'utf8');
                }

                targetDb.close();
            }
            
            logger.success('SISTEMA', `Copia de seguridad (${formato.toUpperCase()}) creada exitosamente`, `Destino: ${filePath}`)
            return { success: true, message: 'Base de datos exportada correctamente' }
            
        } catch (error) {
            logger.error('SISTEMA', "Error crítico al intentar exportar la base de datos", error)
            return { success: false, message: error.message }
        }
    })
}