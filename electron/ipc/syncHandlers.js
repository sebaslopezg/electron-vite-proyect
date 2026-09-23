import { ipcMain } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerSyncHandlers = () => {

    ipcMain.handle('get-sync-config', () => {
        if (!checkPermission("configuracion_general")) return null;
        try {
            const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
            
            return {
                syncToken: tokenRow ? tokenRow.value : '',
                syncUrl: urlRow ? urlRow.value : ''
            }
        } catch (error) {
            logger.error('SYNC', "Error al obtener la configuración de sincronización", error)
            return { syncToken: '', syncUrl: '' }
        }
    })

    ipcMain.handle('save-sync-config', (_, data) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' };
        try {
            const { syncToken, syncUrl } = data

            const existsToken = db.prepare("SELECT COUNT(*) as count FROM configuracion WHERE key = 'sync_token'").get()
            if (existsToken.count > 0) {
                db.prepare("UPDATE configuracion SET value = ? WHERE key = 'sync_token'").run(syncToken)
            } else {
                db.prepare("INSERT INTO configuracion (key, value) VALUES ('sync_token', ?)").run(syncToken)
            }

            const existsUrl = db.prepare("SELECT COUNT(*) as count FROM configuracion WHERE key = 'sync_url'").get()
            if (existsUrl.count > 0) {
                db.prepare("UPDATE configuracion SET value = ? WHERE key = 'sync_url'").run(syncUrl)
            } else {
                db.prepare("INSERT INTO configuracion (key, value) VALUES ('sync_url', ?)").run(syncUrl)
            }

            logger.success('SYNC', "Configuración de sincronización actualizada exitosamente.")
            return { success: true }
        } catch (error) {
            logger.error('SYNC', "Error al guardar la configuración", error)
            return { success: false, error: error.message }
        }
    })

    // NUEVO: Obtener historial de sincronizaciones
    ipcMain.handle('get-sync-history', () => {
        if (!checkPermission("configuracion_general")) return [];
        try {
            return db.prepare("SELECT * FROM system_logs WHERE tipo = 'SYNC' ORDER BY fecha DESC LIMIT 50").all()
        } catch (error) {
            logger.error('SYNC', "Error al obtener historial", error)
            return []
        }
    })

    // Motor de sincronización
    ipcMain.handle('force-sync-now', async (event) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' };
        
        // Función helper para enviar mensajes a la consola del frontend
        const sendProgress = (msg, type = 'info') => {
            event.sender.send('sync-progress', { text: msg, type })
        }

        try {
            sendProgress("Iniciando proceso de sincronización...", "info")
            logger.info('SYNC', "Iniciando proceso de sincronización manual...")

            const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
            
            if (!tokenRow || !tokenRow.value) throw new Error('No hay token configurado.')
            if (!urlRow || !urlRow.value) throw new Error('No hay URL configurada.')

            const syncToken = tokenRow.value
            let syncUrl = urlRow.value
            if (syncUrl.endsWith('/')) syncUrl = syncUrl.slice(0, -1)

            //const modulesToSync = ['terceros', 'producto', 'ventasMaestro', 'ventasDetalle'] 
            const modulesToSync = ['terceros', 'producto'] 
            let totalProcessed = 0;
            let totalErrors = 0;
            let allDetails = {};

            sendProgress(`Conectando con ${syncUrl}...`, "info")

            for (const modulo of modulesToSync) {
                sendProgress(`[${modulo.toUpperCase()}] Consultando registros pendientes...`, "info")

                let lastSyncRow = db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(modulo)
                let lastSyncTime = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

                const batchSize = 100
                let offset = 0
                let hasMore = true
                let processedInModule = 0;

                while (hasMore) {
                    let timeColumn = 'date_modify'
                    const tableInfo = db.pragma(`table_info(${modulo})`)
                    if (!tableInfo.some(col => col.name === 'date_modify')) timeColumn = 'date_created'

                    const rows = db.prepare(`SELECT * FROM ${modulo} WHERE ${timeColumn} > ? ORDER BY ${timeColumn} ASC LIMIT ? OFFSET ?`)
                                   .all(lastSyncTime, batchSize, offset)

                    if (rows.length === 0) {
                        hasMore = false
                        break
                    }

                    const payload = { [modulo]: rows }
                    sendProgress(`[${modulo.toUpperCase()}] Enviando lote de ${rows.length} registros...`, "warning")
                    
                    try {
                        const response = await axios.post(`${syncUrl}/api/sync/push`, payload, { 
                            headers: { 'Content-Type': 'application/json', 'x-sync-token': syncToken } 
                        })

                        if (response.status !== 200 || !response.data?.success) {
                            throw new Error(response.data?.message || response.statusText)
                        }

                        // Verificar si hubo errores internos en el módulo
                        const moduleDetails = response.data.details?.[modulo];
                        if (moduleDetails && moduleDetails.errors?.length > 0) {
                            const errorCount = moduleDetails.errors.length;
                            totalErrors += errorCount;
                            allDetails[modulo] = moduleDetails.errors;
                            
                            sendProgress(`[${modulo.toUpperCase()}] ADVERTENCIA: Se omitieron ${errorCount} registros por datos inválidos.`, "error")
                            logger.warn('SYNC', `Omisiones en ${modulo}:`, moduleDetails.errors)
                        } else {
                            sendProgress(`[${modulo.toUpperCase()}] Lote aceptado correctamente.`, "success")
                        }
                        
                        const latestDateInBatch = rows[rows.length - 1][timeColumn]
                        const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(modulo)
                        if (existsLog.count > 0) {
                            db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDateInBatch, modulo)
                        } else {
                            db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(modulo, latestDateInBatch)
                        }

                        processedInModule += rows.length
                        totalProcessed += rows.length
                        offset += batchSize

                    } catch (netError) {
                        sendProgress(`[${modulo.toUpperCase()}] ERROR DE RED: ${netError.message}`, "error")
                        throw netError // Cortar sincronización
                    }
                }
                
                if (processedInModule === 0) {
                    sendProgress(`[${modulo.toUpperCase()}] Al día. No hay datos nuevos.`, "success")
                }
            }

            sendProgress(`¡Sincronización finalizada! Procesados: ${totalProcessed}. Errores: ${totalErrors}`, "success")
            
            // Guardar log global en system_logs
            const logId = uuidv4();
            const logMsg = `Sincronización finalizada. Registros enviados: ${totalProcessed}. Errores devueltos: ${totalErrors}.`;
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(logId, 'SYNC', 'Sincronizador', logMsg, Object.keys(allDetails).length > 0 ? JSON.stringify(allDetails) : null);

            return { success: true, processed: totalProcessed, errors: totalErrors }

        } catch (error) {
            sendProgress(`ERROR CRÍTICO: ${error.message}`, "error")
            logger.error('SYNC', "Fallo crítico en el motor", error)
            
            // Guardar error en log
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(uuidv4(), 'SYNC', 'Sincronizador', `Fallo crítico: ${error.message}`, null);

            return { success: false, error: error.message }
        }
    })
}