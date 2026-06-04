const api = ''

const hasComprasAPI = () => typeof window !== 'undefined' && window.comprasAPI !== undefined
const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const comprasService = {
    getCompraDetalle: async (id) => {
        if (hasComprasAPI()) {
            return await window.comprasAPI.getCompraDetalle(id)
        } else {
            try {
                const response = await api.get(`/compras/${id}`)
                return { success: true, data: response.data.data || response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al recuperar el detalle de la compra' 
                }
            }
        }
    },

    getComprasPaginadas: async (params) => {
        if (hasComprasAPI()) {
            return await window.comprasAPI.getComprasPaginadas(params)
        } else {
            const response = await api.get('/compras/paginados', { params })
            const result = response.data
            const rawData = result.data || []

            const mappedData = rawData.map(c => ({
                id: c.id,
                date_created: c.date_created || c.createdAt,
                numero_factura: c.numero_factura || c.invoiceNumber,
                nombre_proveedor: c.nombre_proveedor || c.supplier?.razon_social || c.supplier?.nombre || '',
                documento_proveedor: c.documento_proveedor || c.supplier?.numero_documento || '',
                total_factura: c.total_factura || c.total || 0,
                estado: c.estado || 'pendiente'
            }))

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },

    crearCompra: async (payload) => {
        if (hasComprasAPI()) {
            return await window.comprasAPI.crearCompra(payload)
        } else {
            try {
                const response = await api.post('/compras', payload)
                return { success: true, ...response.data };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al asentar la factura de compra en el servidor' 
                }
            }
        }
    },

    getAllProductos: async () => {
        if (isElectron()) {
            return await window.api.getAllProductos()
        } else {
            const response = await api.get('/productos')
            return response.data.data || response.data || []
        }
    }
}