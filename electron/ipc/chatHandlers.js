import { ipcMain } from "electron"
import axios from "axios"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { realtimeSyncService } from "../services/realtimeSyncService.js"

const getConfigValue = (key) => {
    try {
        const row = db.prepare("SELECT value FROM configuracion WHERE key = ?").get(key)
        return row ? row.value : null
    } catch {
        return null
    }
}

const getChatSyncContext = () => {
    const rawUrl = getConfigValue('sync_url')
    const syncUrl = rawUrl ? rawUrl.replace(/\/$/, '') : null
    const syncToken = getConfigValue('sync_token')
    const businessId = getConfigValue('sync_business_id')
    const shopId = getConfigValue('sync_shop_id')
    const currentUser = global.currentUserSession

    if (!syncUrl || !syncToken) {
        return null
    }

    const localUserId = currentUser?.id ? String(currentUser.id) : ''
    
    logger.info('CHAT_DEBUG', 'Headers enviados al Backend:', {
        syncToken: syncToken.substring(0, 15) + '...',
        businessId: businessId,
        shopId: shopId,
        localUserId: localUserId
    });

    if (!localUserId) {
        logger.error('CHAT_DEBUG', 'El UUID del usuario local está vacío. El servidor web devolverá 401.');
    }

    return {
        syncUrl,
        businessId,
        shopId,
        currentUser,
        headers: {
            'Content-Type': 'application/json',
            'x-sync-token': syncToken,
            'x-business-id': businessId || '',
            'x-shop-id': shopId || '',
            'x-local-user-id': localUserId
        }
    }
}

export const registerChatHandlers = () => {

    // A.1 Obtener lista de conversaciones
    ipcMain.handle('get-conversations', async () => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx) return { success: false, data: [] }

            // CORRECCIÓN AXIOS GET: Pasamos headers y params en el MISMO objeto de configuración
            const response = await axios.get(`${ctx.syncUrl}/api/chat/conversations`, {
                headers: ctx.headers,
                params: {
                    localUserId: ctx.currentUser?.id,
                    shopId: ctx.shopId
                }
            })

            return {
                success: true,
                data: response.data?.data || response.data || []
            }
        } catch (error) {
            // Hacemos el error más descriptivo
            const status = error.response?.status
            const msg = error.response?.data?.message || error.message
            logger.error('CHAT', `Error obteniendo conversaciones (Status: ${status || 'N/A'}): ${msg}`)
            return { success: false, data: [], error: msg }
        }
    })

    // A.2 Obtener mensajes de una conversación
    ipcMain.handle('get-chat-messages', async (_, conversationId) => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx || !conversationId) return { success: false, data: [] }

            // CORRECCIÓN AXIOS GET
            const response = await axios.get(`${ctx.syncUrl}/api/chat/conversations/${conversationId}/messages`, {
                headers: ctx.headers,
                params: {
                    localUserId: ctx.currentUser?.id,
                    shopId: ctx.shopId
                }
            })

            return {
                success: true,
                data: response.data?.data || response.data || []
            }
        } catch (error) {
            const status = error.response?.status
            const msg = error.response?.data?.message || error.message
            logger.error('CHAT', `Error obteniendo mensajes (Status: ${status || 'N/A'}): ${msg}`)
            return { success: false, data: [], error: msg }
        }
    })

    // A.3 Marcar conversación como leída
    ipcMain.handle('mark-chat-as-read', async (_, conversationId) => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx || !conversationId) return { success: false }

            // CORRECCIÓN AXIOS POST: (url, body, config)
            await axios.post(`${ctx.syncUrl}/api/chat/conversations/${conversationId}/read`, {
                localUserId: ctx.currentUser?.id,
                shopId: ctx.shopId
            }, {
                headers: ctx.headers
            })

            return { success: true }
        } catch (error) {
            logger.error('CHAT', `Error marcando chat como leído: ${error.message}`)
            return { success: false, error: error.message }
        }
    })

    // D. Enviar un nuevo mensaje vía REST
    ipcMain.handle('send-chat-message', async (_, payload) => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx) return { success: false, error: 'Sincronización no configurada' }

            const body = {
                conversationId: payload.conversationId,
                content: payload.content,
                senderId: ctx.currentUser?.id,
                senderName: ctx.currentUser?.nombre_completo || ctx.currentUser?.username,
                shopId: ctx.shopId
            }

            if (payload.recipientData) {
                body.recipientData = payload.recipientData
            }

            // CORRECCIÓN AXIOS POST
            const response = await axios.post(`${ctx.syncUrl}/api/chat/message`, body, {
                headers: ctx.headers
            })

            return {
                success: true,
                data: response.data?.data || response.data
            }
        } catch (error) {
            logger.error('CHAT', `Error enviando mensaje: ${error.message}`)
            return { success: false, error: error.message }
        }
    })

    // Obtener usuarios conectados actualmente en el canal presence
    ipcMain.handle('get-chat-online-users', () => {
        return {
            success: true,
            data: realtimeSyncService.getOnlineUsers()
        }
    })
}