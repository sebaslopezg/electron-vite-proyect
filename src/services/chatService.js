export const chatService = {
    getConversations: async () => {
        try {
            if (!window.api || !window.api.getConversations) return []
            const response = await window.api.getConversations()
            return response?.success ? (response.data || []) : []
        } catch (e) { 
            return []
        }
    },
    getMessages: async (conversationId) => {
        try {
            if (!window.api || !window.api.getChatMessages) return []
            const response = await window.api.getChatMessages(conversationId)
            return response?.success ? (response.data || []) : []
        } catch (e) { 
            return [];
        }
    },
    markAsRead: async (conversationId) => {
        try {
            if (!window.api || !window.api.markChatAsRead) return false
            const response = await window.api.markChatAsRead(conversationId)
            return response?.success || false
        } catch (e) {
            return false
        }
    },
    sendMessage: async (conversationId, content, recipientData = null) => {
        try {
            if (!window.api || !window.api.sendChatMessage) return null
            const payload = { conversationId, content, recipientData }
            const response = await window.api.sendChatMessage(payload)
            return response?.success ? response.data : null
        } catch (e) { 
            return null
        }
    }
}