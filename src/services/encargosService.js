const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const encargosService = {
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion()
        } else {
            const response = await api.get('/configuracion')
            return response.data.data || response.data || []
        }
    },

    getEncargos: async () => {
        if (isElectron()) {
            return await window.api.getEncargos()
        } else {
            const response = await api.get('/encargos')
            const data = response.data.data || response.data || []

            return data.map(e => ({
                id: e.id,
                encargo_numero: e.orderNumber,
                factura_id: e.invoiceId,
                factura_numero: e.invoiceNumber,
                producto_id: e.productId,
                producto_nombre: e.productName || e.product?.ref_name || 'Producto',
                producto_cantidad: e.quantity,
                cliente_nombre: e.customerName,
                cliente_documento: e.customerDocument,
                fecha_entrega: e.deliveryDate || '', 
                descripcion: e.description || '',
                estado_id: e.statusId || '',
                estado_titulo: e.status?.titulo || e.status?.nombre || 'Pendiente',
                estado_color: e.status?.color || '#6c757d',
                icon: e.status?.icon_data || 'bi bi-tag-fill',
                allow_calendar: e.status?.allow_calendar ?? (e.status?.allowCalendar ? 1 : 0),
                date_created: e.createdAt,
                date_modify: e.updatedAt
            }))
        }
    },

    updateEncargo: async (payload) => {
        if (isElectron()) {
            return await window.api.updateProducto ? window.api.updateEncargo(payload) : window.api.updateEncargo(payload);
        } else {
            try {
                const response = await api.put(`/encargos/${payload.id}`, payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error al actualizar el encargo' }
            }
        }
    },

    deleteEncargo: async (id) => {
        if (isElectron()) {
            return await window.api.deleteEncargo(id)
        } else {
            try {
                const response = await api.delete(`/encargos/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error al eliminar el encargo' }
            }
        }
    },

    updateEstadoEncargo: async (id, estadoId) => {
        if (isElectron()) {
            return await window.api.updateEstadoEncargo(id, estadoId)
        } else {
            try {
                const response = await api.put(`/encargos/${id}/estado`, { estadoId })
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo actualizar el estado' 
                }
            }
        }
    },

    getEstadosEncargo: async () => {
        if (isElectron()) {
            return await window.api.getEstadosEncargo()
        } else {
            const response = await api.get('/encargos/estados')
            return response.data.data || response.data || []
        }
    },

    getEstados: async () => {
        if (isElectron()) {
            return await window.api.getEstados()
        } else {
            const response = await api.get('/encargos/estados')
            return response.data.data || response.data || []
        }
    },

    addEstado: async (payload) => {
        if (isElectron()) {
            return await window.api.addEstado(payload)
        } else {
            try {
                const response = await api.post('/encargos/estados', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar el estado en el servidor web' 
                }
            }
        }
    },

    updateEstado: async (payload) => {
        if (isElectron()) {
            return await window.api.updateEstado(payload)
        } else {
            try {
                const response = await api.put(`/encargos/estados/${payload.id}`, payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar el estado en la nube' 
                }
            }
        }
    },

    deleteEstado: async (id) => {
        if (isElectron()) {
            return await window.api.deleteEstado(id)
        } else {
            try {
                const response = await api.delete(`/encargos/estados/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar el estado' 
                }
            }
        }
    }
}