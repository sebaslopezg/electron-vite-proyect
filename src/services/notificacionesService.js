const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const notificacionesService = {
    getNotificaciones: async () => {
        if (isElectron() && window.api.getNotificaciones) {
            return await window.api.getNotificaciones()
        }
        return []
    },

    marcarLeida: async (id) => {
        if (isElectron() && window.api.marcarNotificacionLeida) {
            return await window.api.marcarNotificacionLeida(id)
        }
        return { success: false }
    },

    addNotificacion: async (payload) => {
        if (isElectron() && window.api.addNotificacion) {
            return await window.api.addNotificacion(payload)
        }
        return { success: false }
    },

    // ─── NUEVO MÉTODO ─────────────────────────────────────────────────────────
    deleteNotificacion: async (id) => {
        if (isElectron() && window.api.deleteNotificacion) {
            return await window.api.deleteNotificacion(id)
        }
        return { success: false }
    }
}