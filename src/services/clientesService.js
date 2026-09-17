const api = ''

const isElectronConta = () => typeof window !== 'undefined' && window.contaAPI !== undefined
const isElectronAuth = () => typeof window !== 'undefined' && window.api !== undefined

export const clientesService = {
    getCurrentUser: async () => {
        if (isElectronAuth()) {
            return await window.api.getCurrentUser()
        } else {
            try {
                const response = await api.get('/auth/me')
                return { success: true, data: response.data }
            } catch (error) {
                return { success: false, error: 'Usuario no autenticado' }
            }
        }
    },

    getClientesPaginados: async (params) => {
        if (isElectronConta()) {
            return await window.contaAPI.getTercerosPaginados({ ...params, soloClientes: true })
        } else {
            try {
                const response = await api.get('/terceros/paginados', { params: { ...params, soloClientes: true } })
                const result = response.data
                const rawData = result.data || []
                
                return {
                    draw: result.draw || params.draw,
                    recordsTotal: result.recordsTotal || rawData.length,
                    recordsFiltered: result.recordsFiltered || rawData.length,
                    data: rawData
                }
            } catch (error) {
                console.error("Error al obtener clientes paginados:", error);
                return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
            }
        }
    },

    eliminarTercero: async (id) => {
        if (isElectronConta()) {
            return await window.contaAPI.eliminarTercero(id)
        } else {
            try {
                const response = await api.delete(`/terceros/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al eliminar el cliente' 
                }
            }
        }
    }
}