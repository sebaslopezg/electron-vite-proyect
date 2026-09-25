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

const saveConfigValue = (key, value) => {
    const exists = db.prepare("SELECT COUNT(*) as count FROM configuracion WHERE key = ?").get(key)
    if (exists.count > 0) {
        db.prepare("UPDATE configuracion SET value = ? WHERE key = ?").run(value, key)
    } else {
        db.prepare("INSERT INTO configuracion (key, value) VALUES (?, ?)").run(key, value)
    }
}

// Mapeo inverso para bloquear módulos de la Interfaz Gráfica
const SYNC_MAP = {
    'terceros': 'terceros',
    'producto': 'productos',
    'ventasMaestro': 'ventas',
    'ventasDetalle': 'ventas',
    'nota': 'ventas',
    'nota_item': 'ventas',
    'almacen_conf': 'ventas',
    'metodos_pago': 'ventas'
}

export const canModifyModule = (moduloLocal) => {
    try {
        const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
        if (!rulesRow) return true;
        const rules = JSON.parse(rulesRow.value);
        const webKey = SYNC_MAP[moduloLocal] || moduloLocal;
        return rules[webKey] !== 'web_to_desktop'; 
    } catch { return true; }
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

    ipcMain.handle('get-sync-rules', () => {
        try {
            const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
            return rulesRow ? JSON.parse(rulesRow.value) : {}
        } catch (error) {
            return {}
        }
    })

    ipcMain.handle('save-sync-config', async (_, data) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' }
        try {
            let { syncToken, syncUrl } = data
            if (syncUrl.endsWith('/')) syncUrl = syncUrl.slice(0, -1)

            const response = await axios.get(`${syncUrl}/api/sync/config`, {
                headers: { 'x-sync-token': syncToken }
            });

            if (response.status !== 200 || !response.data?.success) {
                throw new Error("Conexión rechazada por el servidor web. Verifica tus credenciales.");
            }

            const rules = response.data.modules || {};

            saveConfigValue('sync_token', syncToken);
            saveConfigValue('sync_url', syncUrl);
            saveConfigValue('sync_rules', JSON.stringify(rules));

            logger.success('SYNC', "Configuración y permisos obtenidos exitosamente de la nube.")
            return { success: true, rules }
        } catch (error) {
            logger.error('SYNC', "Error al vincular la configuración", error)
            return { success: false, error: error.message || "No se pudo contactar con el servidor web." }
        }
    })

    ipcMain.handle('get-sync-history', () => {
        if (!checkPermission("configuracion_general")) return [];
        try {
            return db.prepare("SELECT * FROM system_logs WHERE tipo = 'SYNC' ORDER BY fecha DESC LIMIT 50").all()
        } catch (error) {
            logger.error('SYNC', "Error al obtener historial", error)
            return []
        }
    })

    ipcMain.handle('force-sync-now', async (event) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' }
        
        let accumulatedLogs = [];
        const sendProgress = (msg, type = 'info') => {
            const timeStr = new Date().toLocaleTimeString();
            const logEntry = { time: timeStr, text: msg, type };
            accumulatedLogs.push(logEntry);
            event.sender.send('sync-progress', logEntry);
        }

        try {
            sendProgress("Iniciando proceso de sincronización...", "info")
            logger.info('SYNC', "Iniciando proceso de sincronización manual...")

            // ==============================================
            // AUTO-REPARACIÓN AVANZADA DE BASE DE DATOS
            // ==============================================
            try {
                const tablesWithDates = ['terceros', 'producto', 'ventasMaestro', 'ventasDetalle', 'nota', 'nota_item', 'almacen_conf', 'metodos_pago'];
                for (const tbl of tablesWithDates) {
                    try { db.exec(`ALTER TABLE ${tbl} ADD COLUMN date_modify TEXT;`); } catch(e){}
                    try { db.exec(`ALTER TABLE ${tbl} ADD COLUMN date_created TEXT DEFAULT CURRENT_TIMESTAMP;`); } catch(e){}
                    try { db.prepare(`UPDATE ${tbl} SET date_modify = date_created WHERE date_modify IS NULL`).run(); } catch(e){}
                    
                    // Reparación de Desfases de Zona Horaria (Timezone Poisoning)
                    try { db.prepare(`UPDATE ${tbl} SET date_modify = datetime('now', 'localtime') WHERE date_modify > datetime('now', 'localtime')`).run(); } catch(e){}
                }
                try { db.prepare("UPDATE sync_log SET last_sync_time = datetime('now', 'localtime') WHERE last_sync_time > datetime('now', 'localtime')").run(); } catch(e){}
                
                sendProgress("Escaneo de integridad de esquema y fechas completado.", "success");
            } catch (e) {
                logger.warn('SYNC', 'Fallo leve en auto-reparación', e)
            }

            const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
            const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
            
            if (!tokenRow || !tokenRow.value) throw new Error('No hay token configurado.')
            if (!urlRow || !urlRow.value) throw new Error('No hay URL configurada.')

            const syncToken = tokenRow.value
            let syncUrl = urlRow.value
            if (syncUrl.endsWith('/')) syncUrl = syncUrl.slice(0, -1)

            const rules = rulesRow ? JSON.parse(rulesRow.value) : {}

            // Orden estricto para proteger Integridad Referencial (Foreign Keys)
            const modulesToSync = [
                { local: 'terceros', web: 'terceros' },
                { local: 'producto', web: 'productos' },
                
                // --- Grupo Ventas (Regla dependiente de 'ventas') ---
                { local: 'almacen_conf', web: 'configuracion', parentRule: 'ventas' },
                { local: 'metodos_pago', web: 'metodosPago', parentRule: 'ventas' },
                { local: 'ventasMaestro', web: 'ventasMaestro', parentRule: 'ventas' },
                { local: 'ventasDetalle', web: 'ventasDetalle', parentRule: 'ventas' },
                { local: 'nota', web: 'notasMaestro', parentRule: 'ventas' },
                { local: 'nota_item', web: 'notasDetalle', parentRule: 'ventas' }
            ] 
            
            let totalProcessed = 0
            let totalErrors = 0
            let allDetails = {}

            sendProgress(`Conectando con ${syncUrl}...`, "info")

            for (const mod of modulesToSync) {
                const localModulo = mod.local;
                const webModulo = mod.web;
                
                const ruleKey = mod.parentRule || webModulo;
                const moduleRule = rules[ruleKey] || 'desktop_to_web'

                if (moduleRule === 'disabled') {
                    sendProgress(`[${webModulo.toUpperCase()}] Omitido: Módulo aislado (Regla: disabled).`, "warning")
                    continue
                }

                let lastSyncRow = db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(localModulo)
                let lastSyncTime = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

                // ==============================================
                // REGLA: LA WEB MANDA (DESCARGA / PULL)
                // ==============================================
                if (moduleRule === 'web_to_desktop') {
                    sendProgress(`[${webModulo.toUpperCase()}] Descargando actualizaciones...`, "info")
                    
                    try {
                        const response = await axios.get(`${syncUrl}/api/sync/pull`, {
                            headers: { 'x-sync-token': syncToken },
                            params: { modulo: webModulo, last_sync_time: lastSyncTime }
                        });

                        if (response.status !== 200 || !response.data?.success) {
                            throw new Error(response.data?.message || "Error al descargar.");
                        }

                        const records = response.data.data || [];
                        if (records.length === 0) {
                            sendProgress(`[${webModulo.toUpperCase()}] Al día. No hay datos nuevos para descargar.`, "success");
                            continue;
                        }

                        sendProgress(`[${webModulo.toUpperCase()}] Guardando ${records.length} registros...`, "warning");

                        const stmtExists = db.prepare(`SELECT 1 FROM ${localModulo} WHERE id = ?`);
                        const validColumns = db.pragma(`table_info(${localModulo})`).map(c => c.name);
                        
                        db.transaction(() => {
                            for (const row of records) {
                                let inventarioData = null;
                                
                                if (localModulo === 'producto') {
                                    inventarioData = {
                                        producto_id: row.id,
                                        stock: row.stock !== undefined ? row.stock : 0,
                                        min_stock: row.min_stock !== undefined ? row.min_stock : 5,
                                        max_stock: row.max_stock !== undefined ? row.max_stock : 100
                                    };
                                    if (row.impuesto !== undefined) row.iva = row.impuesto;
                                    if (row.estado !== undefined) row.status = row.estado; 
                                    if (!row.categoria_id) row.categoria_id = 'general';
                                    if (!row.tipo) row.tipo = 'producto';
                                }

                                const cleanRow = {};
                                for (const key of Object.keys(row)) {
                                    if (validColumns.includes(key)) {
                                        cleanRow[key] = row[key];
                                    }
                                }

                                const keys = Object.keys(cleanRow);
                                const exists = stmtExists.get(cleanRow.id);

                                if (exists) {
                                    const sets = keys.filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
                                    if (sets.length > 0) db.prepare(`UPDATE ${localModulo} SET ${sets} WHERE id = @id`).run(cleanRow);
                                } else {
                                    const cols = keys.join(', ');
                                    const placeholders = keys.map(k => `@${k}`).join(', ');
                                    db.prepare(`INSERT INTO ${localModulo} (${cols}) VALUES (${placeholders})`).run(cleanRow);
                                }

                                if (inventarioData) {
                                    const invExists = db.prepare(`SELECT 1 FROM inventario_saldos WHERE producto_id = ?`).get(row.id);
                                    if (invExists) {
                                        db.prepare(`UPDATE inventario_saldos SET stock=@stock, min_stock=@min_stock, max_stock=@max_stock WHERE producto_id=@producto_id`).run(inventarioData);
                                    } else {
                                        db.prepare(`INSERT INTO inventario_saldos (producto_id, stock, min_stock, max_stock) VALUES (@producto_id, @stock, @min_stock, @max_stock)`).run(inventarioData);
                                    }
                                }
                            }
                        })();

                        let latestDate = lastSyncTime;
                        for (const row of records) {
                            const rowDate = row.date_modify || row.date_created;
                            if (rowDate && rowDate > latestDate) latestDate = rowDate;
                        }

                        const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(localModulo)
                        if (existsLog.count > 0) {
                            db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDate, localModulo)
                        } else {
                            db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(localModulo, latestDate)
                        }

                        totalProcessed += records.length;
                        sendProgress(`[${webModulo.toUpperCase()}] Descarga e inserción completada.`, "success");

                    } catch (netError) {
                        sendProgress(`[${webModulo.toUpperCase()}] ERROR DE DESCARGA: ${netError.message}`, "error")
                        totalErrors++;
                        allDetails[webModulo] = [netError.message];
                    }

                    continue; 
                }

                // ==============================================
                // REGLA: EL ESCRITORIO MANDA (SUBIDA / PUSH)
                // ==============================================
                sendProgress(`[${webModulo.toUpperCase()}] Consultando registros pendientes...`, "info")

                const batchSize = 100
                let offset = 0
                let hasMore = true
                let processedInModule = 0

                while (hasMore) {
                    let timeColumn = 'date_modify'
                    const tableInfo = db.pragma(`table_info(${localModulo})`)
                    if (!tableInfo.some(col => col.name === 'date_modify')) timeColumn = 'date_created'

                    let query = `SELECT * FROM ${localModulo} WHERE ${timeColumn} > ? ORDER BY ${timeColumn} ASC LIMIT ? OFFSET ?`;
                    if (localModulo === 'producto') {
                        query = `
                            SELECT p.*, IFNULL(i.stock, 0) as stock, IFNULL(i.min_stock, 5) as min_stock, IFNULL(i.max_stock, 100) as max_stock 
                            FROM producto p 
                            LEFT JOIN inventario_saldos i ON p.id = i.producto_id 
                            WHERE p.${timeColumn} > ? ORDER BY p.${timeColumn} ASC LIMIT ? OFFSET ?
                        `;
                    }

                    const rows = db.prepare(query).all(lastSyncTime, batchSize, offset)

                    if (rows.length === 0) {
                        hasMore = false
                        break
                    }

                    // --- TRADUCTOR DE ESQUEMAS: Escritorio -> Web ---
                    const mappedRows = rows.map(row => {
                        const newRow = { ...row };
                        
                        if (webModulo === 'ventasMaestro') {
                            if (newRow.total_factura !== undefined) newRow.total = newRow.total_factura;
                            if (newRow.status !== undefined) newRow.estado = newRow.status;
                        } 
                        else if (webModulo === 'ventasDetalle') {
                            if (newRow.maestro_id !== undefined) newRow.id_factura = newRow.maestro_id;
                            if (newRow.is_encargo !== undefined) newRow.isEncargo = newRow.is_encargo;
                            newRow.estado = newRow.status !== undefined ? newRow.status : 1;
                            newRow.tipo = newRow.tipo || 'producto';
                            newRow.iva = newRow.iva || 0;
                            newRow.descuento = newRow.descuento || 0;
                            newRow.subtotal = newRow.subtotal || newRow.total;
                        } 
                        else if (webModulo === 'productos') {
                            if (newRow.status !== undefined) newRow.estado = newRow.status;
                            if (newRow.iva !== undefined) newRow.impuesto = newRow.iva;
                        } 
                        else if (webModulo === 'terceros' || webModulo === 'metodosPago' || webModulo === 'notasMaestro' || webModulo === 'notasDetalle') {
                            if (newRow.status !== undefined) newRow.estado = newRow.status;
                        }

                        return newRow;
                    });

                    const payload = { [webModulo]: mappedRows }
                    sendProgress(`[${webModulo.toUpperCase()}] Enviando lote de ${mappedRows.length} registros...`, "warning")
                    
                    try {
                        const response = await axios.post(`${syncUrl}/api/sync/push`, payload, { 
                            headers: { 'Content-Type': 'application/json', 'x-sync-token': syncToken } 
                        })

                        if (response.status !== 200 || !response.data?.success) {
                            throw new Error(response.data?.message || response.statusText)
                        }

                        const moduleDetails = response.data.details?.[webModulo];
                        if (moduleDetails && moduleDetails.errors?.length > 0) {
                            const errorCount = moduleDetails.errors.length;
                            totalErrors += errorCount;
                            allDetails[webModulo] = moduleDetails.errors;
                            
                            sendProgress(`[${webModulo.toUpperCase()}] ADVERTENCIA: Se omitieron ${errorCount} registros por datos inválidos.`, "error")
                            logger.warn('SYNC', `Omisiones en ${webModulo}:`, moduleDetails.errors)
                        } else {
                            sendProgress(`[${webModulo.toUpperCase()}] Lote aceptado correctamente.`, "success")
                        }
                        
                        const latestDateInBatch = rows[rows.length - 1][timeColumn]
                        const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(localModulo)
                        if (existsLog.count > 0) {
                            db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDateInBatch, localModulo)
                        } else {
                            db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(localModulo, latestDateInBatch)
                        }

                        processedInModule += rows.length
                        totalProcessed += rows.length
                        offset += batchSize

                    } catch (netError) {
                        sendProgress(`[${webModulo.toUpperCase()}] ERROR DE RED: ${netError.message}`, "error")
                        throw netError
                    }
                }
                
                if (processedInModule === 0) {
                    sendProgress(`[${webModulo.toUpperCase()}] Al día. No hay datos nuevos para subir.`, "success")
                }
            }

            sendProgress(`¡Sincronización finalizada! Procesados: ${totalProcessed}. Errores/Advertencias: ${totalErrors}`, "success")
            
            const logId = uuidv4()
            const logMsg = `Sincronización finalizada. Registros procesados: ${totalProcessed}. Advertencias/Errores: ${totalErrors}.`;
            const finalDetails = JSON.stringify({ consoleLogs: accumulatedLogs, apiErrors: allDetails });
            
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(logId, 'SYNC', 'Sincronizador', logMsg, finalDetails);

            return { success: true, processed: totalProcessed, errors: totalErrors }

        } catch (error) {
            sendProgress(`ERROR CRÍTICO: ${error.message}`, "error")
            logger.error('SYNC', "Fallo crítico en el motor", error)
            
            const finalDetailsErr = JSON.stringify({ consoleLogs: accumulatedLogs, apiErrors: { system: error.message } });
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(uuidv4(), 'SYNC', 'Sincronizador', `Fallo crítico: ${error.message}`, finalDetailsErr);

            return { success: false, error: error.message }
        }
    })
}