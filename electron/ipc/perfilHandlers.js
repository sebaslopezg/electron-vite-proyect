import { ipcMain, app } from "electron"
import { v4 as uuidv4 } from 'uuid'
import { appDb } from "../database/index.js"
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { logger } from "../utils/logger.js"

// Función auxiliar para formatear los bytes a KB/MB
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const registerPerfilHandlers = () => {

    ipcMain.handle("get-perfiles", () => {
        try {
            return appDb.prepare("SELECT * FROM perfiles ORDER BY date_created ASC").all()
        } catch (error) {
            logger.error('PERFILES', "Error al intentar obtener la lista de perfiles (Bases de datos)", error)
            return []
        }
    })

    ipcMain.handle("add-perfil", (_, data) => {
        try {
            const id = uuidv4()
            const safeName = data.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')
            const filename = `store_${safeName}_${Date.now()}.db`
            
            appDb.prepare(`
                INSERT INTO perfiles (id, nombre, filename, is_active, date_created) 
                VALUES (?, ?, ?, 0, ?)
            `).run(id, data.nombre, filename, new Date().toISOString())

            logger.success('PERFILES', `Nuevo perfil (empresa/sucursal) creado: ${data.nombre}`, `Archivo asignado: ${filename}`)
            return { success: true }
        } catch (error) {
            logger.error('PERFILES', `Error al intentar crear el perfil: ${data.nombre}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("switch-perfil", (_, id) => {
        try {
            const transaction = appDb.transaction(() => {
                appDb.prepare("UPDATE perfiles SET is_active = 0").run()
                appDb.prepare("UPDATE perfiles SET is_active = 1 WHERE id = ?").run(id)
            })
            transaction()

            logger.info('PERFILES', `Cambio de perfil activo (ID: ${id}). Reiniciando aplicación...`)
            
            app.relaunch()
            app.exit(0)
            return { success: true }
        } catch (error) {
            logger.error('PERFILES', `Error al intentar cambiar al perfil (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-perfil", (_, id) => {
        try {
            const perfil = appDb.prepare("SELECT * FROM perfiles WHERE id = ?").get(id)
            if (!perfil) return { success: false, error: "Perfil no encontrado" }

            if (perfil.filename === 'main.db') {
                logger.warning('PERFILES', "Intento denegado de eliminar el perfil principal del sistema (main.db).")
                return { success: false, error: "Seguridad: No se puede eliminar el perfil principal del sistema." }
            }
            if (perfil.is_active === 1) {
                logger.warning('PERFILES', `Intento denegado de eliminar un perfil en uso activo (${perfil.nombre}).`)
                return { success: false, error: "No se puede eliminar un perfil en uso." };
            }

            appDb.prepare("DELETE FROM perfiles WHERE id = ?").run(id)

            const dbPath = path.join(app.getPath("userData"), "app2", perfil.filename)
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

            logger.warning('PERFILES', `Perfil y base de datos eliminados definitivamente: ${perfil.nombre}`, `Archivo borrado: ${perfil.filename}`)
            return { success: true }
        } catch (error) {
            logger.error('PERFILES', `Error crítico al intentar eliminar el perfil (ID: ${id})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-perfil-stats", (_, filename) => {
        try {
            const dbPath = path.join(app.getPath("userData"), "app2", filename)
            
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: "El archivo físico de la base de datos no existe." }
            }

            const stats = fs.statSync(dbPath)
            const sizeFormatted = formatBytes(stats.size)

            const tempDb = new Database(dbPath, { readonly: true })
            
            const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
            
            const tableStats = tables.map(t => {
                const countRow = tempDb.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get()
                return {
                    name: t.name,
                    rows: countRow.count
                }
            })

            tempDb.close()

            return { 
                success: true, 
                size: sizeFormatted, 
                tables: tableStats 
            }
        } catch (error) {
            logger.error('PERFILES', `Error analizando las estadísticas de la base de datos (${filename})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-perfil-table-data", (_, { filename, tableName }) => {
        try {
            const dbPath = path.join(app.getPath("userData"), "app2", filename)
            
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: "El archivo de la base de datos no existe." }
            }

            const tempDb = new Database(dbPath, { readonly: true })
            
            const colInfo = tempDb.prepare(`PRAGMA table_info(${tableName})`).all()
            const columns = colInfo.map(c => c.name);
            
            const data = tempDb.prepare(`SELECT * FROM ${tableName} LIMIT 200`).all()
            
            tempDb.close()

            return { success: true, columns, data }
        } catch (error) {
            logger.error('PERFILES', `Error previsualizando datos de la tabla '${tableName}' en '${filename}'`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("clear-perfil-table-data", (_, { filename, tableName }) => {
        try {
            const dbPath = path.join(app.getPath("userData"), "app2", filename)
            
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: "El archivo de la base de datos no existe." }
            }

            const tempDb = new Database(dbPath)
            
            const clearTransaction = tempDb.transaction(() => {
                tempDb.prepare(`DELETE FROM ${tableName}`).run()
                
                try {
                    tempDb.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(tableName)
                } catch (e) {
                    logger.warning('PERFILES', `No se pudo reiniciar sqlite_sequence para la tabla '${tableName}'. (Puede que no sea autoincrementable)`, e.message)
                }
            })

            clearTransaction()
            tempDb.close()

            logger.warning('PERFILES', `Vaciado completo de tabla (TRUNCATE/DELETE) ejecutado exitosamente`, `Tabla: ${tableName} | Perfil: ${filename}`)
            return { success: true }
        } catch (error) {
            logger.error('PERFILES', `Error CRÍTICO al intentar vaciar la tabla '${tableName}' en '${filename}'`, error)
            return { success: false, error: error.message }
        }
    })
}