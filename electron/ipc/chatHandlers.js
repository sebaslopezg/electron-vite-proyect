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

    ipcMain.handle('get-conversations', async () => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx) return { success: false, data: [], error: 'Sincronización no configurada' }

            const response = await axios.get(`${ctx.syncUrl}/api/chat/conversations`, {
                headers: ctx.headers,
                params: {
                    localUserId: ctx.currentUser?.id,
                    shopId: ctx.shopId
                },
                timeout: 5000 // Importante poner timeout para que falle rápido si el servidor está apagado
            })

            return {
                success: true,
                data: response.data?.data || response.data || []
            }
        } catch (error) {
            const status = error.response?.status
            const msg = error.response?.data?.message || error.message
            logger.error('CHAT', `Error obteniendo conversaciones (Status: ${status || 'N/A'}): ${msg}`)
            // ES CRÍTICO DEVOLVER EXPRESAMENTE ÉXITO: FALSO PARA QUE EL FRONTEND LO SEPA
            return { success: false, error: msg } 
        }
    })

    ipcMain.handle('get-chat-messages', async (_, conversationId) => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx || !conversationId) return { success: false, data: [], error: 'Sin contexto' }

            const response = await axios.get(`${ctx.syncUrl}/api/chat/conversations/${conversationId}/messages`, {
                headers: ctx.headers,
                params: {
                    localUserId: ctx.currentUser?.id,
                    shopId: ctx.shopId
                },
                timeout: 5000
            })

            return {
                success: true,
                data: response.data?.data || response.data || []
            }
        } catch (error) {
            const status = error.response?.status
            const msg = error.response?.data?.message || error.message
            logger.error('CHAT', `Error obteniendo mensajes (Status: ${status || 'N/A'}): ${msg}`)
            return { success: false, error: msg }
        }
    })

    ipcMain.handle('mark-chat-as-read', async (_, conversationId) => {
        try {
            const ctx = getChatSyncContext()
            if (!ctx || !conversationId) return { success: false }

            await axios.post(`${ctx.syncUrl}/api/chat/conversations/${conversationId}/read`, {
                localUserId: ctx.currentUser?.id,
                shopId: ctx.shopId
            }, {
                headers: ctx.headers,
                timeout: 5000
            })

            return { success: true }
        } catch (error) {
            logger.error('CHAT', `Error marcando chat como leído: ${error.message}`)
            return { success: false, error: error.message }
        }
    })

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

            const response = await axios.post(`${ctx.syncUrl}/api/chat/message`, body, {
                headers: ctx.headers,
                timeout: 5000
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

    ipcMain.handle('get-chat-online-users', () => {
        return {
            success: true,
            data: realtimeSyncService.getOnlineUsers()
        }
    })
}