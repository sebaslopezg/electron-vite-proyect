import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import axios from "axios" // <-- Asegúrate de tener axios instalado

// Función genérica para validar permisos (opcional si lo deseas restringir)
const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerSyncHandlers = () => {

    // 1. Obtener la configuración actual (para cargar el token)
    ipcMain.handle('get-sync-config', () => {
        if (!checkPermission("configuracion_general")) return null;
        try {
            const row = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            return row ? row.value : ''
        } catch (error) {
            logger.error('SYNC', "Error al obtener el token de sincronización", error)
            return ''
        }
    })

    // 2. Guardar la configuración (el token)
    ipcMain.handle('save-sync-config', (_, token) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' };
        try {
            const exists = db.prepare("SELECT COUNT(*) as count FROM configuracion WHERE key = 'sync_token'").get()
            if (exists.count > 0) {
                db.prepare("UPDATE configuracion SET value = ? WHERE key = 'sync_token'").run(token)
            } else {
                db.prepare("INSERT INTO configuracion (key, value) VALUES ('sync_token', ?)").run(token)
            }
            logger.success('SYNC', "Token de sincronización actualizado exitosamente.")
            return { success: true }
        } catch (error) {
            logger.error('SYNC', "Error al guardar el token de sincronización", error)
            return { success: false, error: error.message }
        }
    })

    // 3. Motor de sincronización principal (Delta Sync + Paginación)
    ipcMain.handle('force-sync-now', async () => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' };
        
        try {
            logger.info('SYNC', "Iniciando proceso de sincronización manual...")

            // 1. Verificar si hay token
            const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            if (!tokenRow || !tokenRow.value) {
                return { success: false, error: 'No hay token de sincronización configurado.' }
            }
            const syncToken = tokenRow.value

            // Define la URL base de tu servidor web (cámbiala según tu entorno: local o producción)
            const WEB_API_URL = 'http://localhost:5000' // Ajusta al puerto de tu backend web

            // MODULOS A SINCRONIZAR
            const modulesToSync = ['terceros', 'producto', 'ventasMaestro', 'ventasDetalle'] 
            let totalProcessed = 0;

            for (const modulo of modulesToSync) {
                logger.info('SYNC', `Sincronizando módulo: ${modulo}...`)

                // Obtener fecha de última sincronización
                let lastSyncRow = db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(modulo)
                let lastSyncTime = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

                const batchSize = 100
                let offset = 0
                let hasMore = true

                while (hasMore) {
                    // Consulta con Delta Sync (usando date_modify o equivalente)
                    let timeColumn = 'date_modify'
                    
                    // Ajustes de columnas de tiempo según la tabla (Si no tienen date_modify, usar date_created)
                    const tableInfo = db.pragma(`table_info(${modulo})`)
                    if (!tableInfo.some(col => col.name === 'date_modify')) {
                        timeColumn = 'date_created'
                    }

                    const rows = db.prepare(`SELECT * FROM ${modulo} WHERE ${timeColumn} > ? ORDER BY ${timeColumn} ASC LIMIT ? OFFSET ?`)
                                   .all(lastSyncTime, batchSize, offset)

                    if (rows.length === 0) {
                        hasMore = false
                        break
                    }

                    // Construir el Payload
                    const payload = {
                        [modulo]: rows
                    }
                    
                    logger.info('SYNC', `Enviando ${rows.length} registros del módulo ${modulo} a la nube...`)
                    
                    // --- INICIO DE LA LLAMADA REAL A LA API WEB ---
                    const response = await axios.post(`${WEB_API_URL}/api/sync/push`, payload, { 
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-sync-token': syncToken 
                        } 
                    })

                    if (response.status !== 200 || !response.data?.success) {
                        throw new Error(`El servidor web rechazó el lote: ${response.data?.message || response.statusText}`)
                    }

                    logger.info('SYNC', `Lote de ${rows.length} registros del módulo ${modulo} aceptado por la nube.`)
                    // --- FIN DE LA LLAMADA REAL A LA API WEB ---
                    
                    // Actualizar last_sync_time con el registro más reciente de este lote
                    const latestDateInBatch = rows[rows.length - 1][timeColumn]
                    
                    const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(modulo)
                    if (existsLog.count > 0) {
                        db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDateInBatch, modulo)
                    } else {
                        db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(modulo, latestDateInBatch)
                    }

                    totalProcessed += rows.length
                    offset += batchSize
                }
            }

            logger.success('SYNC', `Sincronización manual completada. Total procesado: ${totalProcessed} registros.`)
            return { success: true, processed: totalProcessed }

        } catch (error) {
            logger.error('SYNC', "Fallo crítico en el motor de sincronización", error)
            return { success: false, error: error.message }
        }
    })
}