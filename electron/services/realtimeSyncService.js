import Pusher from "pusher-js"
import { app, BrowserWindow } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { upsertModuleRecords, triggerBackgroundPush, runBootstrapOrRecoveryPull } from "../ipc/syncHandlers.js"

const GLOBAL_MODULES = [
    'productos',
    'categorias',
    'subcategorias',
    'etiquetas',
    'terceros',
    'encargos_config',
    'encargos_estados'
]

const SHOP_SCOPED_MODULES = [
    'inventario',
    'configuracion',
    'metodosPago',
    'ventasMaestro',
    'ventasDetalle',
    'notasMaestro',
    'notasDetalle',
    'encargos'
]

class RealtimeSyncService {
    constructor() {
        this.pusher = null
        this.channel = null
        this.businessChannel = null
        this.socketId = null
        this.isConnected = false
        this.wasDisconnected = false
        this.businessId = null
        this.shopId = null
        this.onlineUsers = new Set()
    }

    getConfig(key) {
        try {
            const row = db.prepare("SELECT value FROM configuracion WHERE key = ?").get(key)
            return row ? row.value : null
        } catch {
            return null
        }
    }

    getSocketId() {
        return this.socketId
    }

    getOnlineUsers() {
        return Array.from(this.onlineUsers)
    }

    broadcastToWindows(channel, data) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data)
            }
        })
    }

    init({ pusherKey, pusherCluster, businessId, shopId, authToken } = {}) {
        try {
            const syncUrl = this.getConfig('sync_url')?.replace(/\/$/, '')
            const syncToken = this.getConfig('sync_token')
            
            this.businessId = businessId || this.getConfig('sync_business_id')
            this.shopId = shopId || this.getConfig('sync_shop_id')

            const keyToUse = pusherKey || this.getConfig('pusher_key')
            const clusterToUse = pusherCluster || this.getConfig('pusher_cluster') || 'mt1'
            const tokenToUse = authToken || global.currentUserSession?.token || syncToken

            let missingCredentials = false
            if (!syncUrl) { logger.warning('REALTIME_SYNC', 'Conexión pausada: Falta la URL de Sincronización en la configuración local.'); missingCredentials = true; }
            if (!this.businessId) { logger.warning('REALTIME_SYNC', 'Conexión pausada: Falta el Business ID (Debes vincular la caja web).'); missingCredentials = true; }
            if (!keyToUse) { logger.warning('REALTIME_SYNC', 'Conexión pausada: Falta Pusher Key en tu base de datos.'); missingCredentials = true; }

            if (missingCredentials) return

            if (this.pusher) {
                this.disconnect()
            }

            this.pusher = new Pusher(keyToUse, {
                cluster: clusterToUse,
                forceTLS: syncUrl.startsWith('https'),
                channelAuthorization: {
                    endpoint: `${syncUrl}/api/sync/pusher/auth`,
                    headers: {
                        'Authorization': `Bearer ${tokenToUse}`,
                        'x-sync-token': syncToken || '',
                        'x-local-user-id': global.currentUserSession?.id ? String(global.currentUserSession.id) : ''
                    }
                }
            })

            this.pusher.connection.bind('connected', async () => {
                this.socketId = this.pusher.connection.socket_id
                this.isConnected = true
                logger.success('REALTIME_SYNC', `Conectado a Pusher (Socket ID: ${this.socketId}) en entorno: ${app.isPackaged ? 'Producción' : 'Desarrollo'}`)

                if (this.wasDisconnected) {
                    this.wasDisconnected = false
                    logger.info('REALTIME_SYNC', 'Conexión recuperada. Ejecutando sincronización de recuperación (Pull + Push)...')
                    await runBootstrapOrRecoveryPull()
                    await triggerBackgroundPush()
                }
            })

            this.pusher.connection.bind('unavailable', () => {
                this.isConnected = false
                this.wasDisconnected = true
                logger.warning('REALTIME_SYNC', 'Sin conexión a internet. Entrando en modo Offline.')
            })

            this.pusher.connection.bind('disconnected', () => {
                this.isConnected = false
            })

            // 1. Canal Presence (Sincronización + Presencia + Chat)
            const presenceChannelName = `presence-business-${this.businessId}`
            this.channel = this.pusher.subscribe(presenceChannelName)

            this.channel.bind('pusher:subscription_succeeded', (members) => {
                logger.info('REALTIME_SYNC', `Suscrito exitosamente al canal ${presenceChannelName}`)
                this.onlineUsers.clear()
                if (members && typeof members.each === 'function') {
                    members.each((member) => {
                        this.onlineUsers.add(String(member.id))
                    })
                }
                this.broadcastToWindows('chat-online-users', this.getOnlineUsers())
            })

            this.channel.bind('pusher:member_added', (member) => {
                if (member?.id) {
                    this.onlineUsers.add(String(member.id))
                    this.broadcastToWindows('chat-online-users', this.getOnlineUsers())
                }
            })

            this.channel.bind('pusher:member_removed', (member) => {
                if (member?.id) {
                    this.onlineUsers.delete(String(member.id))
                    this.broadcastToWindows('chat-online-users', this.getOnlineUsers())
                }
            })

            this.channel.bind('pusher:subscription_error', (err) => {
                logger.error('REALTIME_SYNC', `Error de autorización en el canal ${presenceChannelName}`, err)
            })

            this.channel.bind('sync-update', (payload) => {
                this.handleSyncUpdate(payload)
            })

            // Eventos de Chat y Notificaciones en el canal Presence
            this.bindChatAndNotificationEvents(this.channel)

            // 2. Canal Público/Global de Negocio (business-${businessId})
            const publicChannelName = `business-${this.businessId}`
            this.businessChannel = this.pusher.subscribe(publicChannelName)
            this.bindChatAndNotificationEvents(this.businessChannel)

        } catch (error) {
            logger.error('REALTIME_SYNC', 'Error al inicializar RealtimeSyncService', error)
        }
    }

    bindChatAndNotificationEvents(channelInstance) {
        if (!channelInstance) return

        channelInstance.bind('new-message', (data) => {
            this.broadcastToWindows('chat-event', {
                type: 'new-message',
                data
            })
        })

        channelInstance.bind('messages-read', (data) => {
            this.broadcastToWindows('chat-event', {
                type: 'messages-read',
                data
            })
        })

        channelInstance.bind('new-notification', (data) => {
            this.broadcastToWindows('notification-event', data)
        })
    }

    handleSyncUpdate(payload) {
        if (!payload || payload.type !== 'sync_update' || !payload.modules) return

        if (payload.socket_id && this.socketId && payload.socket_id === this.socketId) {
            return
        }

        const incomingShopId = payload.shopId
        const modules = payload.modules
        let updatedAnyModule = false

        for (const [webModulo, records] of Object.entries(modules)) {
            if (!Array.isArray(records) || records.length === 0) continue

            const isGlobal = GLOBAL_MODULES.includes(webModulo)
            const isShopScoped = SHOP_SCOPED_MODULES.includes(webModulo)

            if (isShopScoped && this.shopId && incomingShopId && String(incomingShopId) !== String(this.shopId)) {
                continue
            }

            if (!isGlobal && !isShopScoped) {
                continue
            }

            try {
                const processed = upsertModuleRecords(webModulo, records, { isRealtime: true })
                if (processed > 0) {
                    updatedAnyModule = true
                    logger.info('REALTIME_SYNC', `[${webModulo.toUpperCase()}] ${processed} registro(s) sincronizados en tiempo real.`)
                }
            } catch (err) {
                logger.error('REALTIME_SYNC', `Error aplicando Upsert en tiempo real para ${webModulo}`, err)
            }
        }

        if (updatedAnyModule) {
            this.broadcastToWindows('realtime-sync-applied', {
                modules: Object.keys(modules),
                timestamp: new Date().toISOString()
            })
        }
    }

    disconnect() {
        if (this.pusher) {
            if (this.businessId) {
                this.pusher.unsubscribe(`presence-business-${this.businessId}`)
                this.pusher.unsubscribe(`business-${this.businessId}`)
            }
            this.pusher.disconnect()
            this.pusher = null
            this.channel = null
            this.businessChannel = null
            this.socketId = null
            this.isConnected = false
            this.onlineUsers.clear()
        }
    }
}

export const realtimeSyncService = new RealtimeSyncService()