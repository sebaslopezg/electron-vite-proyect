const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const carteraService = {
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion()
        } else {
            const response = await api.get('/configuracion')
            return response.data.data || response.data || []
        }
    },

    getAllConfAlmacen: async () => {
        if (isElectron()) {
            return await window.api.getAllConfAlmacen()
        } else {
            const response = await api.get('/configuracion/almacen')
            return response.data.data || response.data || []
        }
    },

    getCuentasPorCobrarPaginadas: async (params) => {
        if (isElectron()) {
            return await window.api.getCarteraPaginada(params)
        } else {
            const response = await api.get('/cartera/cuentas-por-cobrar', { params })
            return response.data
        }
    },

    getHistorialAbonosPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getAbonosPaginados(params)
        } else {
            const response = await api.get('/cartera/historial-abonos', { params })
            return response.data;
        }
    },

    crearAbono: async (payload) => {
        if (isElectron()) {
            return await window.api.addAbono(payload)
        } else {
            try {
                const response = await api.post('/cartera/abonos', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al procesar el abono en el servidor' 
                }
            }
        }
    }
}