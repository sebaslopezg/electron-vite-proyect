import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"
import { logger } from "./logger.js"
import { runBootstrapOrRecoveryPull, triggerBackgroundPush } from "../ipc/syncHandlers.js"
import { realtimeSyncService } from "../services/realtimeSyncService.js"

const checkEncargosAlertas = (mainWindow) => {
    try {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000
        const hoyStr = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0]

        const encargosPendientes = db.prepare(`
            SELECT en.id, en.encargo_numero, en.titulo_personalizado, p.ref_name as producto_nombre, en.cliente_nombre, en.fecha_entrega 
            FROM encargos en
            LEFT JOIN producto p ON en.producto_id = p.id
            WHERE en.fecha_entrega != '' AND en.fecha_entrega IS NOT NULL
              AND en.fecha_entrega <= ? 
              AND en.notificado = 0 
              AND en.status > 0
        `).all(hoyStr)

        if (encargosPendientes.length > 0) {
            const insertNotif = db.prepare(`
                INSERT INTO notificaciones (id, titulo, mensaje, tipo, link, leida, date_created)
                VALUES (@id, @titulo, @mensaje, @tipo, @link, 0, @now)
            `)
            const updateEncargo = db.prepare('UPDATE encargos SET notificado = 1 WHERE id = ?')
            const now = new Date().toISOString()

            db.transaction(() => {
                for (const enc of encargosPendientes) {
                    const tituloProd = enc.titulo_personalizado || enc.producto_nombre || 'Pedido General'
                    const isVencido = enc.fecha_entrega < hoyStr;
                    
                    const titulo = isVencido ? '¡Encargo Vencido!' : 'Entrega para Hoy'
                    const mensaje = `El encargo #${enc.encargo_numero} (${tituloProd}) de ${enc.cliente_nombre} ${isVencido ? 'debía entregarse el ' + enc.fecha_entrega : 'debe entregarse el día de hoy'}.`
                    const tipo = isVencido ? 'warning' : 'warning'
                    
                    const linkUrl = `/encargos?ver_id=${enc.id}`

                    insertNotif.run({ id: uuidv4(), titulo, mensaje, tipo, link: linkUrl, now })
                    updateEncargo.run(enc.id);
                }
            })()

            if (mainWindow) {
                mainWindow.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));").catch(() => {})
            }
        }
    } catch (error) {
        logger.error('CRON', "Error en cron automático de encargos:", error)
    }
}

// Controladores de conexión para Pusher y Recovery
let isOnline = true

const handleNetworkChange = async () => {
    // Si la propiedad global navigator existiera aquí lo usaríamos, 
    // pero como estamos en Node.js, confiaremos en los eventos de Pusher
    // que ya configuramos en realtimeSyncService.js
    
    // NOTA: Como alternativa en el backend de Electron, el Recovery 
    // se maneja nativamente desde Pusher cuando lanza el evento 'connected' 
    // tras un 'unavailable'.
}

export const startBackgroundTasks = async (mainWindow) => {
    logger.info('CRON', 'Iniciando tareas en segundo plano...')

    checkEncargosAlertas(mainWindow)
    setInterval(() => checkEncargosAlertas(mainWindow), 60 * 60 * 1000)

    setTimeout(async () => {
        const tokenRow = db.prepare("SELECT value FROM configuracion WHERE key = 'sync_token'").get()
        if (tokenRow && tokenRow.value) {
            logger.info('SYNC', 'Iniciando Sincronización Bootstrap y Conexión en Tiempo Real...')
            
            await runBootstrapOrRecoveryPull()
            await triggerBackgroundPush()
            realtimeSyncService.init()
        }
    }, 5000)
}