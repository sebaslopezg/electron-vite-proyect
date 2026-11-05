import Pusher from "pusher-js"
import { app, BrowserWindow } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import axios from "axios"
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
        this.isApiOk = false
        this.isPusherConnected = false
        this.isChannelSubscribed = false
        this.isSubscribing = false
        this.isPinging = false
        this.lastErrorMsg = 'Conectando con la nube...'

        this.wasDisconnected = false
        this.businessId = null
        this.shopId = null
        this.onlineUsers = new Set()
        this.pingInterval = null
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

    updateAndBroadcastStatus(customError = '') {
        const syncUrl = this.getConfig('sync_url')?.replace(/\/$/, '')
        const syncToken = this.getConfig('sync_token')
        const isConfigured = Boolean(syncUrl && syncToken)

        if (!isConfigured) {
            this.isConnected = false
            this.lastErrorMsg = 'Sincronización no configurada'
            this.broadcastToWindows('sync-connection-status', {
                connected: false,
                state: 'unconfigured',
                error: this.lastErrorMsg,
                configured: false
            })
            return
        }

        const fullyConnected = Boolean(this.isApiOk && this.isPusherConnected && this.isChannelSubscribed)
        let stateName = 'connected'
        let errorMsg = ''

        if (!fullyConnected) {
            if (!this.isPusherConnected && !this.isApiOk) {
                stateName = 'offline'
                errorMsg = customError || 'Sin conexión a Internet o al servidor'
            } else if (!this.isPusherConnected) {
                stateName = 'ws_disconnected'
                errorMsg = customError || 'Sin conexión en tiempo real (Verifica tu Internet)'
            } else {
                stateName = 'server_down'
                errorMsg = customError || 'Servidor de la nube apagado o inaccesible'
            }
        }

        this.isConnected = fullyConnected
        this.lastErrorMsg = errorMsg

        this.broadcastToWindows('sync-connection-status', {
            connected: fullyConnected,
            state: stateName,
            error: errorMsg,
            configured: true
        })
    }

    subscribeChannels() {
        if (!this.pusher || !this.businessId || this.isSubscribing) return
        this.isSubscribing = true

        const presenceChannelName = `presence-business-${this.businessId}`
        const publicChannelName = `business-${this.businessId}`

        if (this.channel) {
            this.channel.unbind_all()
            this.pusher.unsubscribe(presenceChannelName)
            this.channel = null
        }
        if (this.businessChannel) {
            this.businessChannel.unbind_all()
            this.pusher.unsubscribe(publicChannelName)
            this.businessChannel = null
        }

        this.channel = this.pusher.subscribe(presenceChannelName)

        this.channel.bind('pusher:subscription_succeeded', (members) => {
            this.isSubscribing = false
            this.isChannelSubscribed = true
            logger.info('REALTIME_SYNC', `Suscrito exitosamente al canal ${presenceChannelName}`)

            this.onlineUsers.clear()
            if (members && typeof members.each === 'function') {
                members.each((member) => {
                    this.onlineUsers.add(String(member.id))
                })
            }
            this.broadcastToWindows('chat-online-users', this.getOnlineUsers())
            this.updateAndBroadcastStatus()
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
            this.isSubscribing = false
            this.isChannelSubscribed = false
            logger.error('REALTIME_SYNC', `Error de autorización en el canal ${presenceChannelName}`, err)
            this.updateAndBroadcastStatus('Servidor apagado o error de autorización')
        })

        this.channel.bind('sync-update', (payload) => {
            this.handleSyncUpdate(payload)
        })

        this.bindChatAndNotificationEvents(this.channel)

        this.businessChannel = this.pusher.subscribe(publicChannelName)
        this.bindChatAndNotificationEvents(this.businessChannel)
    }

    async checkServerConnection() {
        if (this.isPinging) return
        this.isPinging = true

        const syncUrl = this.getConfig('sync_url')?.replace(/\/$/, '')
        const syncToken = this.getConfig('sync_token')

        if (!syncUrl || !syncToken) {
            this.isApiOk = false
            this.updateAndBroadcastStatus('No configurado')
            this.isPinging = false
            return
        }

        try {
            const res = await axios.get(`${syncUrl}/api/sync/config`, {
                headers: { 'x-sync-token': syncToken },
                timeout: 4000
            })

            if (res.status === 200 && res.data?.success) {
                const wasApiDown = !this.isApiOk
                this.isApiOk = true

                if (this.pusher && this.isPusherConnected && !this.isChannelSubscribed && !this.isSubscribing) {
                    this.subscribeChannels()
                }

                if (wasApiDown && this.wasDisconnected) {
                    this.wasDisconnected = false
                    runBootstrapOrRecoveryPull().catch(() => {})
                    triggerBackgroundPush().catch(() => {})
                }

                this.updateAndBroadcastStatus()
            } else {
                this.isApiOk = false
                this.isChannelSubscribed = false
                this.updateAndBroadcastStatus(`Error Backend: ${res.status}`)
            }
        } catch (error) {
            if (this.isApiOk) {
                logger.warning('REALTIME_SYNC', `Servidor de sincronización inalcanzable: ${error.message}`)
            }
            this.isApiOk = false
            this.isChannelSubscribed = false
            this.wasDisconnected = true
            this.updateAndBroadcastStatus('Servidor de la nube apagado o inaccesible')
        } finally {
            this.isPinging = false
        }
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

            if (!syncUrl || !this.businessId || !keyToUse) {
                this.isApiOk = false
                this.isPusherConnected = false
                this.isChannelSubscribed = false
                this.updateAndBroadcastStatus('Faltan credenciales de sincronización')
                return
            }

            if (this.pusher || this.pingInterval) {
                this.disconnect(false)
            }

            this.updateAndBroadcastStatus('Conectando con la nube...')

            this.pusher = new Pusher(keyToUse, {
                cluster: clusterToUse,
                forceTLS: syncUrl.startsWith('https'),
                activityTimeout: 15000,
                pongTimeout: 6000,
                channelAuthorization: {
                    endpoint: `${syncUrl}/api/sync/pusher/auth`,
                    headers: {
                        'Authorization': `Bearer ${tokenToUse}`,
                        'x-sync-token': syncToken || '',
                        'x-local-user-id': global.currentUserSession?.id ? String(global.currentUserSession.id) : ''
                    }
                }
            })

            this.pusher.connection.bind('state_change', ({ current }) => {
                this.isPusherConnected = (current === 'connected')
                if (current !== 'connected') {
                    this.isChannelSubscribed = false
                    this.isSubscribing = false
                    this.wasDisconnected = true
                }
                this.updateAndBroadcastStatus()
            })

            this.pusher.connection.bind('connected', async () => {
                this.socketId = this.pusher.connection.socket_id
                this.isPusherConnected = true
                logger.success('REALTIME_SYNC', `Conectado a Pusher (Socket ID: ${this.socketId}) en entorno: ${app.isPackaged ? 'Producción' : 'Desarrollo'}`)

                if (!this.isChannelSubscribed && !this.isSubscribing) {
                    this.subscribeChannels()
                }
                this.checkServerConnection()
            })

            this.pusher.connection.bind('unavailable', () => {
                this.isPusherConnected = false
                this.isChannelSubscribed = false
                this.wasDisconnected = true
                logger.warning('REALTIME_SYNC', 'Sin conexión a internet. Entrando en modo Offline.')
                this.updateAndBroadcastStatus('Sin conexión a Internet')
            })

            this.subscribeChannels()
            this.checkServerConnection()

            this.pingInterval = setInterval(() => {
                this.checkServerConnection()
            }, 8000)

        } catch (error) {
            logger.error('REALTIME_SYNC', 'Error al inicializar RealtimeSyncService', error)
            this.updateAndBroadcastStatus('Error interno al iniciar sincronización')
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

    disconnect(emitBroadcast = true) {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }

        if (this.pusher) {
            if (this.businessId) {
                this.pusher.unsubscribe(`presence-business-${this.businessId}`)
                this.pusher.unsubscribe(`business-${this.businessId}`)
            }
            this.pusher.disconnect()
            this.pusher = null
        }

        this.channel = null
        this.businessChannel = null
        this.socketId = null
        this.isConnected = false
        this.isApiOk = false
        this.isPusherConnected = false
        this.isChannelSubscribed = false
        this.isSubscribing = false
        this.onlineUsers.clear()

        if (emitBroadcast) {
            this.updateAndBroadcastStatus('Sincronizador desvinculado')
        }
    }

    getSyncState() {
        const syncUrl = this.getConfig('sync_url')
        const syncToken = this.getConfig('sync_token')
        return {
            connected: Boolean(this.isApiOk && this.isPusherConnected && this.isChannelSubscribed),
            error: this.lastErrorMsg,
            configured: Boolean(syncUrl && syncToken)
        }
    }
}

export const realtimeSyncService = new RealtimeSyncService()