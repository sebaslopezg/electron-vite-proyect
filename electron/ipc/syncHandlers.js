import { app, ipcMain } from "electron"
import db, { appDb } from "../database/index.js"
import { logger } from "../utils/logger.js"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import { realtimeSyncService } from "../services/realtimeSyncService.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const saveConfigValue = (key, value) => {
    const exists = db.prepare("SELECT COUNT(*) as count FROM configuracion WHERE key = ?").get(key)
    if (exists.count > 0) {
        db.prepare("UPDATE configuracion SET value = ? WHERE key = ?").run(value, key)
    } else {
        db.prepare("INSERT INTO configuracion (key, value) VALUES (?, ?)").run(key, value)
    }
}

const SYNC_MAP = {
    'terceros': 'terceros',
    'categoria': 'productos',
    'subcategoria': 'productos',
    'etiqueta': 'productos',
    'producto': 'productos',
    'inventario': 'inventario',
    'ventasMaestro': 'ventas',
    'ventasDetalle': 'ventas',
    'nota': 'ventas',
    'nota_item': 'ventas',
    'almacen_conf': 'ventas',
    'metodos_pago': 'ventas',
    'estadoEncargo': 'encargos_estados',
    'encargos': 'encargos',
    'encargos_config': 'encargos_config'
}

const WEB_TO_LOCAL_TABLE = {
    'terceros': 'terceros',
    'categorias': 'categoria',
    'subcategorias': 'subcategoria',
    'etiquetas': 'etiqueta',
    'productos': 'producto',
    'inventario': 'inventario',
    'configuracion': 'almacen_conf',
    'metodosPago': 'metodos_pago',
    'ventasMaestro': 'ventasMaestro',
    'ventasDetalle': 'ventasDetalle',
    'notasMaestro': 'nota',
    'notasDetalle': 'nota_item',
    'encargos_config': 'encargos_config',
    'encargos_estados': 'estadoEncargo',
    'encargos': 'encargos'
}

export const MODULES_TO_SYNC = [
    { local: 'terceros', web: 'terceros' },
    { local: 'categoria', web: 'categorias', parentRule: 'productos' },
    { local: 'subcategoria', web: 'subcategorias', parentRule: 'productos' },
    { local: 'etiqueta', web: 'etiquetas', parentRule: 'productos' },
    { local: 'producto', web: 'productos' },
    { local: 'inventario', web: 'inventario' },
    { local: 'almacen_conf', web: 'configuracion', parentRule: 'ventas' },
    { local: 'metodos_pago', web: 'metodosPago', parentRule: 'ventas' },
    { local: 'ventasMaestro', web: 'ventasMaestro', parentRule: 'ventas' },
    { local: 'ventasDetalle', web: 'ventasDetalle', parentRule: 'ventas' },
    { local: 'nota', web: 'notasMaestro', parentRule: 'ventas' },
    { local: 'nota_item', web: 'notasDetalle', parentRule: 'ventas' },
    { local: 'encargos_config', web: 'encargos_config', parentRule: 'encargos_config' },
    { local: 'estadoEncargo', web: 'encargos_estados', parentRule: 'encargos_estados' },
    { local: 'encargos', web: 'encargos', parentRule: 'encargos' }
]

export const canModifyModule = (moduloLocal) => {
    try {
        const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
        if (!rulesRow) return true
        const rules = JSON.parse(rulesRow.value)
        const webKey = SYNC_MAP[moduloLocal] || moduloLocal
        return rules[webKey] !== 'web_to_desktop'
    } catch { return true }
}

export const upsertModuleRecords = (webModulo, records, { isRealtime = false } = {}) => {
    if (!Array.isArray(records) || records.length === 0) return 0

    const localModulo = WEB_TO_LOCAL_TABLE[webModulo] || webModulo

    if (localModulo === 'encargos_config') {
        const configData = records[0]
        if (configData) {
            if (configData.settings_json) {
                try {
                    const parsedSettings = JSON.parse(configData.settings_json)
                    Object.keys(parsedSettings).forEach(key => {
                        db.prepare("INSERT OR REPLACE INTO encargos_settings (key, value) VALUES (?, ?)").run(key, parsedSettings[key])
                    })
                } catch(e) {}
            }
            if (configData.campos_json) {
                try {
                    const parsedCampos = JSON.parse(configData.campos_json)
                    db.transaction(() => {
                        db.prepare("DELETE FROM encargos_campos").run()
                        const insert = db.prepare("INSERT INTO encargos_campos (id, label, type, options, required, orden) VALUES (?, ?, ?, ?, ?, ?)")
                        parsedCampos.forEach((c, index) => {
                            insert.run(c.id || uuidv4(), c.label, c.type, c.options || '', c.required ? 1 : 0, index)
                        })
                    })()
                } catch(e) {}
            }
        }
        return 1
    }

    const stmtExists = db.prepare(`SELECT 1 FROM ${localModulo} WHERE id = ?`)
    const validColumns = db.pragma(`table_info(${localModulo})`).map(c => c.name)
    if (validColumns.length === 0) return 0

    let lastSyncRow = db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(localModulo)
    let latestDate = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

    db.transaction(() => {
        db.exec('PRAGMA foreign_keys = OFF;')

        if (!isRealtime && (localModulo === 'estadoEncargo' || webModulo === 'encargos_estados')) {
            try { db.prepare(`UPDATE estadoEncargo SET status = 0`).run() } catch(e){}
        }

        for (const rawRow of records) {
            const row = { ...rawRow }
            let inventarioData = null
            let tagsData = null
            let subcatCatData = null
            let etiquetaCatData = null
            
            const rowStatus = row.estado !== undefined ? Number(row.estado) : (row.status !== undefined ? Number(row.status) : 1)
            
            // --- 1. PROCESAMIENTO DE BORRADO LÓGICO Y ELIMINACIONES RÁPIDAS ---
            const isDeleted = rowStatus === 0 || (localModulo === 'producto' && rowStatus === 2)
            
            if (isDeleted) {
                if (localModulo === 'producto') {
                    db.prepare(`DELETE FROM producto_etiqueta WHERE producto_id = ?`).run(row.id)
                    db.prepare(`DELETE FROM inventario_saldos WHERE producto_id = ?`).run(row.id)
                    try { db.prepare(`UPDATE ${localModulo} SET status = 0 WHERE id = ?`).run(row.id) } catch(e){}
                } else if (localModulo === 'subcategoria') {
                    try { db.prepare(`DELETE FROM subcategoria_categoria WHERE subcategoria_id = ?`).run(row.id) } catch(e){}
                    try { db.prepare(`UPDATE ${localModulo} SET status = 0 WHERE id = ?`).run(row.id) } catch(e){}
                } else if (localModulo === 'etiqueta') {
                    try { db.prepare(`DELETE FROM etiqueta_categoria WHERE etiqueta_id = ?`).run(row.id) } catch(e){}
                    try { db.prepare(`UPDATE ${localModulo} SET status = 0 WHERE id = ?`).run(row.id) } catch(e){}
                } else if (localModulo === 'estadoEncargo' || localModulo === 'encargos') {
                    try { db.prepare(`UPDATE ${localModulo} SET status = 0 WHERE id = ?`).run(row.id) } catch(e){}
                } else {
                    try { db.prepare(`UPDATE ${localModulo} SET status = 0 WHERE id = ?`).run(row.id) } catch(e){}
                }

                const deleteDate = row.date_modify || row.date_created || row.fecha
                if (deleteDate && deleteDate > latestDate) latestDate = deleteDate

                continue
            }

            // --- 2. PREPARACIÓN DE DATOS RELACIONALES (Solo si no es borrado) ---
            if (localModulo === 'producto') {
                if (row.categoriaId !== undefined) row.categoria_id = row.categoriaId
                if (row.name !== undefined && !row.ref_name) row.ref_name = row.name
                if (row.price !== undefined && row.precio === undefined) row.precio = row.price

                if (row.stock !== undefined || row.min_stock !== undefined || row.max_stock !== undefined) {
                    inventarioData = {
                        producto_id: row.id,
                        stock: row.stock !== undefined ? row.stock : 0,
                        min_stock: row.min_stock !== undefined ? row.min_stock : 5,
                        max_stock: row.max_stock !== undefined ? row.max_stock : 100
                    }
                }
                
                if (row.impuesto !== undefined) row.iva = row.impuesto
                row.status = rowStatus
                if (row.categoria_id === undefined && !db.prepare(`SELECT 1 FROM ${localModulo} WHERE id = ?`).get(row.id)) row.categoria_id = 'general'
                if (row.tipo === undefined && !db.prepare(`SELECT 1 FROM ${localModulo} WHERE id = ?`).get(row.id)) row.tipo = 'producto'

                let subRaw = row.subcategorias_ids_json !== undefined ? row.subcategorias_ids_json : row.subcategoriasIdsJson
                if (subRaw !== undefined) {
                    row.subcategorias_ids_json = typeof subRaw === 'string' ? subRaw : JSON.stringify(subRaw)
                } else if (row.subcategorias_ids && Array.isArray(row.subcategorias_ids)) {
                    row.subcategorias_ids_json = JSON.stringify(row.subcategorias_ids)
                }

                let tagsRaw = row.etiquetas_ids !== undefined ? row.etiquetas_ids : (row.etiquetasIds !== undefined ? row.etiquetasIds : row.etiquetas)
                if (tagsRaw !== undefined) {
                    if (typeof tagsRaw === 'string' && tagsRaw.trim() !== '') {
                        tagsData = tagsRaw.split(',').map(id => id.trim()).filter(Boolean)
                    } else if (Array.isArray(tagsRaw)) {
                        tagsData = tagsRaw
                    } else {
                         tagsData = []
                    }
                }

                delete row.stock
                delete row.min_stock
                delete row.max_stock

            } else if (localModulo === 'subcategoria') {
                row.status = rowStatus
                let catsRaw = row.categorias_ids !== undefined ? row.categorias_ids : row.categoriasIds
                if (catsRaw !== undefined) {
                    if (typeof catsRaw === 'string' && catsRaw.trim() !== '') {
                        subcatCatData = catsRaw.split(',').map(id => id.trim()).filter(Boolean)
                    } else if (Array.isArray(catsRaw)) {
                        subcatCatData = catsRaw
                    } else {
                        subcatCatData = []
                    }

                    if (subcatCatData && subcatCatData.length > 0) {
                        row.categoria_id = subcatCatData[0]
                        row.categorias_ids = subcatCatData.join(',')
                    } else {
                        row.categoria_id = 'general'
                    }
                }

            } else if (localModulo === 'etiqueta') {
                row.status = rowStatus
                let catsRaw = row.categorias_ids !== undefined ? row.categorias_ids : (row.categoriasIds !== undefined ? row.categoriasIds : row.categorias)
                if (catsRaw !== undefined) {
                    if (typeof catsRaw === 'string' && catsRaw.trim() !== '') {
                        etiquetaCatData = catsRaw.split(',').map(id => id.trim()).filter(Boolean)
                    } else if (Array.isArray(catsRaw)) {
                        etiquetaCatData = catsRaw
                    } else {
                        etiquetaCatData = []
                    }
                }
            } else {
                row.status = rowStatus
            }

            // --- 3. CONSTRUCCIÓN DINÁMICA DE LA CONSULTA (Parche Parcial) ---
            const cleanRow = {}
            for (const key of Object.keys(row)) {
                if (validColumns.includes(key) && row[key] !== undefined) {
                    cleanRow[key] = row[key]
                }
            }

            if (!cleanRow.id) continue

            const exists = stmtExists.get(cleanRow.id)
            const keys = Object.keys(cleanRow)

            if (exists) {
                const sets = keys.filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ')
                if (sets.length > 0) {
                    db.prepare(`UPDATE ${localModulo} SET ${sets} WHERE id = @id`).run(cleanRow)
                }
            } else {
                const cols = keys.join(', ')
                const placeholders = keys.map(k => `@${k}`).join(', ')
                db.prepare(`INSERT INTO ${localModulo} (${cols}) VALUES (${placeholders})`).run(cleanRow)
            }

            // --- 4. ACTUALIZACIÓN DE RELACIONES Y TABLAS ANEXAS ---
            if (tagsData !== null) {
                db.prepare(`DELETE FROM producto_etiqueta WHERE producto_id = ?`).run(row.id)
                if (cleanRow.status === 1) {
                    const insertTag = db.prepare(`INSERT INTO producto_etiqueta (producto_id, etiqueta_id) VALUES (?, ?)`)
                    for (const tagId of tagsData) insertTag.run(row.id, tagId)
                }
            }
            if (subcatCatData !== null) {
                db.prepare(`DELETE FROM subcategoria_categoria WHERE subcategoria_id = ?`).run(row.id)
                if (cleanRow.status === 1) {
                    const insertSubcatCat = db.prepare(`INSERT INTO subcategoria_categoria (subcategoria_id, categoria_id) VALUES (?, ?)`)
                    for (const catId of subcatCatData) insertSubcatCat.run(row.id, catId)
                }
            }
            if (etiquetaCatData !== null) {
                db.prepare(`DELETE FROM etiqueta_categoria WHERE etiqueta_id = ?`).run(row.id)
                if (cleanRow.status === 1) {
                    const insertEtiqCat = db.prepare(`INSERT INTO etiqueta_categoria (etiqueta_id, categoria_id) VALUES (?, ?)`)
                    for (const catId of etiquetaCatData) insertEtiqCat.run(row.id, catId)
                }
            }

            if (inventarioData) {
                const invExists = db.prepare(`SELECT 1 FROM inventario_saldos WHERE producto_id = ?`).get(row.id)
                if (invExists) {
                    db.prepare(`UPDATE inventario_saldos SET min_stock=@min_stock, max_stock=@max_stock WHERE producto_id=@producto_id`).run({
                        producto_id: inventarioData.producto_id,
                        min_stock: inventarioData.min_stock,
                        max_stock: inventarioData.max_stock
                    })
                } else {
                    db.prepare(`INSERT INTO inventario_saldos (producto_id, stock, min_stock, max_stock) VALUES (@producto_id, @stock, @min_stock, @max_stock)`).run(inventarioData)
                    if (inventarioData.stock > 0) {
                        db.prepare(`
                            INSERT INTO inventario (id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, stock_anterior, stock_nuevo, fecha, usuario, notas) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            uuidv4(), inventarioData.producto_id, 'ingreso', 'sincronizacion_inicial', 
                            inventarioData.stock, 0, inventarioData.stock, new Date().toISOString(), 'system', 'Stock inicial recuperado de la nube'
                        )
                    }
                }
            }

            const rowDate = (localModulo === 'inventario' && row.fecha) ? row.fecha : (row.date_modify || row.date_created)
            if (rowDate && rowDate > latestDate) latestDate = rowDate
        }
        
        db.exec('PRAGMA foreign_keys = ON;')
    })()

    const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(localModulo)
    if (existsLog.count > 0) {
        db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDate, localModulo)
    } else {
        db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(localModulo, latestDate)
    }

    return records.length
}

export const triggerBackgroundPush = async (specificLocalModulo = null) => {
    try {
        const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
        const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
        const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
        if (!tokenRow?.value || !urlRow?.value) return

        const syncToken = tokenRow.value
        const syncUrl = urlRow.value.replace(/\/$/, '')
        const rules = rulesRow ? JSON.parse(rulesRow.value) : {}

        const targetModules = specificLocalModulo 
            ? MODULES_TO_SYNC.filter(m => m.local === specificLocalModulo)
            : MODULES_TO_SYNC

        for (const mod of targetModules) {
            const localModulo = mod.local
            const webModulo = mod.web
            if (localModulo === 'encargos_config') continue

            const ruleKey = mod.parentRule || webModulo
            const moduleRule = rules[ruleKey] || 'desktop_to_web'
            if (moduleRule !== 'desktop_to_web') continue

            const lastSyncRow = db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(localModulo)
            const lastSyncTime = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

            let timeColumn = 'date_modify'
            if (localModulo === 'inventario') timeColumn = 'fecha'
            else if (localModulo === 'ventasDetalle') timeColumn = 'date_created'
            else {
                const tableInfo = db.pragma(`table_info(${localModulo})`)
                if (!tableInfo.some(col => col.name === 'date_modify')) timeColumn = 'date_created'
            }

            let query = `SELECT * FROM ${localModulo} WHERE ${timeColumn} > ? ORDER BY ${timeColumn} ASC LIMIT 100`
            if (localModulo === 'producto') {
                query = `
                    SELECT p.*, IFNULL(i.stock, 0) as stock, IFNULL(i.min_stock, 5) as min_stock, IFNULL(i.max_stock, 100) as max_stock 
                    FROM producto p 
                    LEFT JOIN inventario_saldos i ON p.id = i.producto_id 
                    WHERE p.${timeColumn} > ? ORDER BY p.${timeColumn} ASC LIMIT 100
                `
            }

            const rows = db.prepare(query).all(lastSyncTime)
            if (rows.length === 0) continue

            const mappedRows = rows.map(row => mapDesktopRowToWeb(row, webModulo, localModulo))
            const payload = { [webModulo]: mappedRows }

            if (webModulo === 'encargos') {
                payload.usuarios_locales = appDb.prepare("SELECT id, username, nombre_completo, status FROM usuarios").all()
                payload.roles_locales = appDb.prepare("SELECT id, nombre FROM roles").all()
            }

            const headers = {
                'Content-Type': 'application/json',
                'x-sync-token': syncToken
            }
            if (realtimeSyncService.getSocketId()) {
                headers['x-socket-id'] = realtimeSyncService.getSocketId()
            }

            const response = await axios.post(`${syncUrl}/api/sync/push`, payload, { headers })
            if (response.status === 200 && response.data?.success) {
                const latestDateInBatch = rows[rows.length - 1][timeColumn]
                const existsLog = db.prepare("SELECT COUNT(*) as count FROM sync_log WHERE modulo = ?").get(localModulo)
                if (existsLog.count > 0) {
                    db.prepare("UPDATE sync_log SET last_sync_time = ?, status = 'success' WHERE modulo = ?").run(latestDateInBatch, localModulo)
                } else {
                    db.prepare("INSERT INTO sync_log (modulo, last_sync_time, status) VALUES (?, ?, 'success')").run(localModulo, latestDateInBatch)
                }
            }
        }
    } catch (error) {
        logger.warning('BACKGROUND_PUSH', `Push pendiente pospuesto (posible modo offline): ${error.message}`)
    }
}

export const runBootstrapOrRecoveryPull = async () => {
    try {
        const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
        const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
        const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
        if (!tokenRow?.value || !urlRow?.value) return

        const syncToken = tokenRow.value
        const syncUrl = urlRow.value.replace(/\/$/, '')
        let rules = rulesRow ? JSON.parse(rulesRow.value) : {}

        try {
            const confRes = await axios.get(`${syncUrl}/api/sync/config`, { headers: { 'x-sync-token': syncToken } })
            if (confRes.status === 200 && confRes.data?.success) {
                rules = confRes.data.modules || rules
                saveConfigValue('sync_rules', JSON.stringify(rules))
                
                if (confRes.data.businessId) saveConfigValue('sync_business_id', confRes.data.businessId)
                if (confRes.data.shopId) saveConfigValue('sync_shop_id', confRes.data.shopId)
                
                // NUEVO: Guardamos la config de Pusher que el backend web nos envía dinámicamente
                if (confRes.data.pusherConfig) {
                    saveConfigValue('pusher_key', confRes.data.pusherConfig.key)
                    saveConfigValue('pusher_cluster', confRes.data.pusherConfig.cluster)
                }
            }
        } catch(e) {
            logger.warning('BOOTSTRAP', `No se pudo actualizar la configuración desde la nube. Usando caché local: ${e.message}`)
        }

        const localPusherKey = db.prepare("SELECT value FROM configuracion WHERE key = 'pusher_key'").get()?.value;
        if (!localPusherKey) {
            logger.warning('REALTIME_SYNC', 'Faltan credenciales (pusher_key) en SQLite. Sincroniza desde ajustes primero.');
        }

        for (const mod of MODULES_TO_SYNC) {
            const localModulo = mod.local
            const webModulo = mod.web
            const ruleKey = mod.parentRule || webModulo
            let fallbackRule = (webModulo === 'encargos_config' || webModulo === 'encargos_estados') ? 'web_to_desktop' : 'desktop_to_web'
            const moduleRule = rules[ruleKey] || fallbackRule

            if (moduleRule !== 'web_to_desktop') continue

            let lastSyncRow = localModulo !== 'encargos_config'
                ? db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(localModulo)
                : null
            let lastSyncTime = lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00'

            const response = await axios.get(`${syncUrl}/api/sync/pull`, {
                headers: { 'x-sync-token': syncToken },
                params: { modulo: webModulo, last_sync_time: lastSyncTime }
            })

            if (response.status === 200 && response.data?.success) {
                const records = response.data.data || []
                if (records.length > 0) {
                    upsertModuleRecords(webModulo, records, { isRealtime: false })
                }
            }
        }
    } catch (error) {
        logger.warning('BOOTSTRAP_PULL', `No se pudo completar el Pull de arranque/recuperación: ${error.message}`)
    }
}

const mapDesktopRowToWeb = (row, webModulo, localModulo) => {
    let newRow = { ...row }
    if (webModulo === 'ventasMaestro') {
        if (newRow.total_factura !== undefined) newRow.total = newRow.total_factura
        if (newRow.status !== undefined) newRow.estado = newRow.status
    } else if (webModulo === 'ventasDetalle') {
        if (newRow.maestro_id !== undefined) newRow.id_factura = newRow.maestro_id
        if (newRow.is_encargo !== undefined) newRow.isEncargo = newRow.is_encargo
        newRow.estado = newRow.status !== undefined ? newRow.status : 1
        newRow.tipo = newRow.tipo || 'producto'
        newRow.iva = newRow.iva || 0
        newRow.descuento = newRow.descuento || 0
        newRow.subtotal = newRow.subtotal || newRow.total
    } else if (webModulo === 'productos') {
        if (newRow.status !== undefined) newRow.estado = newRow.status
        if (newRow.iva !== undefined) newRow.impuesto = newRow.iva
        const tags = db.prepare("SELECT etiqueta_id FROM producto_etiqueta WHERE producto_id = ?").all(newRow.id)
        newRow.etiquetas = tags.map(t => t.etiqueta_id)
        if (newRow.subcategorias_ids_json) {
            try { newRow.subcategorias_ids = JSON.parse(newRow.subcategorias_ids_json) } catch(e){ newRow.subcategorias_ids = [] }
        } else {
            newRow.subcategorias_ids = []
        }
        delete newRow.subcategorias_ids_json
    } else if (webModulo === 'subcategorias') {
        if (newRow.status !== undefined) newRow.estado = newRow.status
        const cats = db.prepare("SELECT categoria_id FROM subcategoria_categoria WHERE subcategoria_id = ?").all(newRow.id)
        newRow.categorias_ids = cats.map(c => c.categoria_id)
    } else if (webModulo === 'etiquetas') {
        if (newRow.status !== undefined) newRow.estado = newRow.status
        const cats = db.prepare("SELECT categoria_id FROM etiqueta_categoria WHERE etiqueta_id = ?").all(newRow.id)
        newRow.categorias = cats.map(c => c.categoria_id)
    } else if (webModulo === 'inventario') {
        newRow.date_created = newRow.fecha 
    } else if (webModulo === 'estadoEncargo' || localModulo === 'encargos_estados') {
        if (newRow.status !== undefined) newRow.estado = newRow.status
    } else if (webModulo === 'encargos') {
        newRow = {
            id: row.id,
            estado_id: row.estado_id,
            producto_id: row.producto_id,
            factura_id: row.factura_id,
            cliente_id: row.cliente_id,
            cliente_nombre: row.cliente_nombre,
            cliente_documento: row.cliente_documento,
            factura_numero: row.factura_numero,
            producto_cantidad: row.producto_cantidad,
            encargo_numero: row.encargo_numero,
            fecha_entrega: row.fecha_entrega,
            descripcion: row.descripcion,
            titulo_personalizado: row.titulo_personalizado,
            custom_data: row.custom_data,
            status: row.status
        }
    } else if (['terceros', 'metodosPago', 'notasMaestro', 'notasDetalle', 'categorias'].includes(webModulo)) {
        if (newRow.status !== undefined) newRow.estado = newRow.status
    }
    return newRow
}

export const registerSyncHandlers = () => {

    ipcMain.handle('get-sync-config', () => {
        if (!checkPermission("configuracion_general")) return null
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
            })

            if (response.status !== 200 || !response.data?.success) {
                throw new Error("Conexión rechazada por el servidor web. Verifica tus credenciales.")
            }

            const rules = response.data.modules || {}

            saveConfigValue('sync_token', syncToken)
            saveConfigValue('sync_url', syncUrl)
            saveConfigValue('sync_rules', JSON.stringify(rules))

            if (response.data.businessId) saveConfigValue('sync_business_id', response.data.businessId)
            if (response.data.shopId) saveConfigValue('sync_shop_id', response.data.shopId)

            // NUEVO: Guardamos la config de Pusher que el backend nos responde al guardar
            let envPusherKey = null
            let envPusherCluster = null
            if (response.data.pusherConfig) {
                envPusherKey = response.data.pusherConfig.key
                envPusherCluster = response.data.pusherConfig.cluster
                saveConfigValue('pusher_key', envPusherKey)
                saveConfigValue('pusher_cluster', envPusherCluster)
            }

            realtimeSyncService.init({
                businessId: response.data.businessId,
                shopId: response.data.shopId,
                pusherKey: envPusherKey,
                pusherCluster: envPusherCluster
            })

            logger.success('SYNC', "Configuración y permisos obtenidos exitosamente de la nube.")
            return { success: true, rules }
        } catch (error) {
            logger.error('SYNC', "Error al vincular la configuración", error)
            return { success: false, error: error.message || "No se pudo contactar con el servidor web." }
        }
    })

    ipcMain.handle('get-sync-history', () => {
        if (!checkPermission("configuracion_general")) return []
        try {
            return db.prepare("SELECT * FROM system_logs WHERE tipo = 'SYNC' ORDER BY fecha DESC LIMIT 50").all()
        } catch (error) {
            logger.error('SYNC', "Error al obtener historial", error)
            return []
        }
    })

    ipcMain.handle('force-sync-now', async (event, args) => {
        if (!checkPermission("configuracion_general")) return { success: false, error: 'No autorizado' }
        
        const isFullPull = args && args.isFullPull === true ? true : false
        let accumulatedLogs = []
        
        const sendProgress = (msg, type = 'info') => {
            const timeStr = new Date().toLocaleTimeString()
            const logEntry = { time: timeStr, text: msg, type }
            accumulatedLogs.push(logEntry)
            event.sender.send('sync-progress', logEntry)
        }

        try {
            sendProgress(isFullPull ? "Iniciando proceso de FULL SYNC..." : "Iniciando proceso de sincronización...", "info")
            logger.info('SYNC', isFullPull ? "Iniciando proceso de sincronización completa (FULL PULL)..." : "Iniciando proceso de sincronización manual...")

            if (isFullPull) {
                try {
                    db.prepare(`UPDATE sync_log SET last_sync_time = '1970-01-01 00:00:00' WHERE modulo IN ('categoria', 'subcategoria', 'etiqueta', 'producto', 'inventario', 'estadoEncargo', 'encargos')`).run()
                    const catalogTables = ['categoria', 'subcategoria', 'etiqueta', 'producto', 'estadoEncargo', 'encargos']
                    for (const t of catalogTables) {
                        try { db.exec(`UPDATE ${t} SET date_modify = datetime('now', 'localtime')`) } catch(e){}
                    }
                    try { db.exec(`DELETE FROM inventario_saldos`) } catch(e){}
                    sendProgress("Sincronización forzosa. Limpiando caché de fechas...", "warning")
                } catch (e) {
                    logger.warning('SYNC', 'No se pudo forzar el Full PULL', e)
                }
            }

            const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
            const urlRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_url'").get()
            const rulesRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_rules'").get()
            
            if (!tokenRow || !tokenRow.value) throw new Error('No hay token configurado.')
            if (!urlRow || !urlRow.value) throw new Error('No hay URL configurada.')

            const syncToken = tokenRow.value
            let syncUrl = urlRow.value.replace(/\/$/, '')
            let rules = rulesRow ? JSON.parse(rulesRow.value) : {}

            try {
                sendProgress("Verificando permisos y reglas en la nube...", "info")
                const confRes = await axios.get(`${syncUrl}/api/sync/config`, { headers: { 'x-sync-token': syncToken } })
                if (confRes.status === 200 && confRes.data?.success) {
                    rules = confRes.data.modules || rules
                    saveConfigValue('sync_rules', JSON.stringify(rules))
                    if (confRes.data.businessId) saveConfigValue('sync_business_id', confRes.data.businessId)
                    if (confRes.data.shopId) saveConfigValue('sync_shop_id', confRes.data.shopId)
                }
            } catch (e) {
                sendProgress("No se pudieron actualizar las reglas. Usando caché local.", "warning")
            }

            let totalProcessed = 0
            let totalErrors = 0
            let allDetails = {}

            sendProgress(`Conectando con ${syncUrl}...`, "info")

            for (const mod of MODULES_TO_SYNC) {
                const localModulo = mod.local
                const webModulo = mod.web
                const ruleKey = mod.parentRule || webModulo
                let fallbackRule = (webModulo === 'encargos_config' || webModulo === 'encargos_estados') ? 'web_to_desktop' : 'desktop_to_web'
                const moduleRule = rules[ruleKey] || fallbackRule

                if (moduleRule === 'disabled') {
                    sendProgress(`[${webModulo.toUpperCase()}] Omitido: Módulo aislado (Regla: disabled).`, "warning")
                    continue
                }

                let lastSyncRow = localModulo !== 'encargos_config'
                    ? db.prepare("SELECT last_sync_time FROM sync_log WHERE modulo = ?").get(localModulo)
                    : null

                let lastSyncTime = (isFullPull && ['categoria', 'subcategoria', 'etiqueta', 'producto', 'inventario', 'estadoEncargo', 'encargos'].includes(localModulo)) 
                    ? '1970-01-01 00:00:00' 
                    : (lastSyncRow ? lastSyncRow.last_sync_time : '1970-01-01 00:00:00')

                if (moduleRule === 'web_to_desktop') {
                    sendProgress(`[${webModulo.toUpperCase()}] Descargando actualizaciones...`, "info")
                    try {
                        const response = await axios.get(`${syncUrl}/api/sync/pull`, {
                            headers: { 'x-sync-token': syncToken },
                            params: { modulo: webModulo, last_sync_time: lastSyncTime }
                        })

                        if (response.status !== 200 || !response.data?.success) {
                            throw new Error(response.data?.message || "Error al descargar.")
                        }

                        const records = response.data.data || []
                        if (records.length === 0) {
                            sendProgress(`[${webModulo.toUpperCase()}] Al día. No hay datos nuevos para descargar.`, "success")
                            continue
                        }

                        sendProgress(`[${webModulo.toUpperCase()}] Guardando ${records.length} registros...`, "warning")
                        const count = upsertModuleRecords(webModulo, records, { isRealtime: false })
                        totalProcessed += count
                        sendProgress(`[${webModulo.toUpperCase()}] Descarga e inserción completada.`, "success")
                    } catch (netError) {
                        try { db.exec('PRAGMA foreign_keys = ON;') } catch(e) {}
                        sendProgress(`[${webModulo.toUpperCase()}] ERROR DE DESCARGA: ${netError.message}`, "error")
                        totalErrors++
                        allDetails[webModulo] = [netError.message]
                    }
                    continue
                }

                if (localModulo === 'encargos_config') continue

                sendProgress(`[${webModulo.toUpperCase()}] Consultando registros pendientes...`, "info")

                const batchSize = 100
                let offset = 0
                let hasMore = true
                let processedInModule = 0

                while (hasMore) {
                    let timeColumn = 'date_modify'
                    if (localModulo === 'inventario') timeColumn = 'fecha'
                    else if (localModulo === 'ventasDetalle') timeColumn = 'date_created'
                    else {
                        const tableInfo = db.pragma(`table_info(${localModulo})`)
                        if (!tableInfo.some(col => col.name === 'date_modify')) timeColumn = 'date_created'
                    }

                    let query = `SELECT * FROM ${localModulo} WHERE ${timeColumn} > ? ORDER BY ${timeColumn} ASC LIMIT ? OFFSET ?`
                    if (localModulo === 'producto') {
                        query = `
                            SELECT p.*, IFNULL(i.stock, 0) as stock, IFNULL(i.min_stock, 5) as min_stock, IFNULL(i.max_stock, 100) as max_stock 
                            FROM producto p 
                            LEFT JOIN inventario_saldos i ON p.id = i.producto_id 
                            WHERE p.${timeColumn} > ? ORDER BY p.${timeColumn} ASC LIMIT ? OFFSET ?
                        `
                    }

                    const rows = db.prepare(query).all(lastSyncTime, batchSize, offset)
                    if (rows.length === 0) {
                        hasMore = false
                        break
                    }

                    const mappedRows = rows.map(row => mapDesktopRowToWeb(row, webModulo, localModulo))
                    let payload = { [webModulo]: mappedRows }

                    if (webModulo === 'encargos') {
                        const usuariosArr = appDb.prepare("SELECT id, username, nombre_completo, status FROM usuarios").all()
                        const rolesArr = appDb.prepare("SELECT id, nombre FROM roles").all()
                        payload.usuarios_locales = usuariosArr
                        payload.roles_locales = rolesArr
                        sendProgress(`[${webModulo.toUpperCase()}] Enviando lote de ${mappedRows.length} encargos (con ${usuariosArr.length} usuarios y ${rolesArr.length} roles)...`, "warning")
                    } else {
                        sendProgress(`[${webModulo.toUpperCase()}] Enviando lote de ${mappedRows.length} registros...`, "warning")
                    }
                    
                    try {
                        const headers = { 'Content-Type': 'application/json', 'x-sync-token': syncToken }
                        if (realtimeSyncService.getSocketId()) {
                            headers['x-socket-id'] = realtimeSyncService.getSocketId()
                        }

                        const response = await axios.post(`${syncUrl}/api/sync/push`, payload, { headers })
                        if (response.status !== 200 || !response.data?.success) {
                            throw new Error(response.data?.message || response.statusText)
                        }

                        const moduleDetails = response.data.details?.[webModulo]
                        if (moduleDetails && moduleDetails.errors?.length > 0) {
                            const errorCount = moduleDetails.errors.length
                            totalErrors += errorCount
                            allDetails[webModulo] = moduleDetails.errors
                            sendProgress(`[${webModulo.toUpperCase()}] ADVERTENCIA: Se omitieron ${errorCount} registros por datos inválidos.`, "error")
                            logger.warning('SYNC', `Omisiones en ${webModulo}:`, moduleDetails.errors)
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
            const logMsg = `Registros procesados: ${totalProcessed}. Advertencias/Errores: ${totalErrors}.`
            const finalDetails = JSON.stringify({ consoleLogs: accumulatedLogs, apiErrors: allDetails })
            
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(logId, 'SYNC', 'Sincronizador', logMsg, finalDetails)

            return { success: true, processed: totalProcessed, errors: totalErrors }

        } catch (error) {
            sendProgress(`ERROR CRÍTICO: ${error.message}`, "error")
            logger.error('SYNC', "Fallo crítico en el motor", error)
            
            const finalDetailsErr = JSON.stringify({ consoleLogs: accumulatedLogs, apiErrors: { system: error.message } })
            db.prepare("INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))")
              .run(uuidv4(), 'SYNC', 'Sincronizador', `Fallo crítico: ${error.message}`, finalDetailsErr)

            return { success: false, error: error.message }
        }
    })
}