const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined
const hasContaAPI = () => typeof window !== 'undefined' && window.contaAPI !== undefined

export const contabilidadService = {
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion()
        } else {
            const response = await api.get('/configuracion')
            return response.data.data || response.data || []
        }
    },

    getPucCuentas: async () => {
        if (isElectron()) {
            return await window.api.getPucCuentas?.() || []
        } else {
            const response = await api.get('/accounting/puc')
            return response.data.data || response.data || []
        }
    },

    getTerceros: async () => {
        if (isElectron()) {
            return await window.api.getTerceros?.() || []
        } else {
            const response = await api.get('/accounting/terceros')
            return response.data.data || response.data || []
        }
    },

    getComprobantes: async (params) => {
        if (isElectron()) {
            return await window.api.getComprobantes?.(params) || []
        } else {
            const response = await api.get('/accounting/comprobantes', { params })
            return response.data
        }
    },

    getPuc: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getPuc()
        } else {
            try {
                const response = await api.get('/accounting/puc')
                return { 
                    success: true, 
                    data: response.data.data || response.data || [] 
                }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al obtener el PUC' 
                }
            }
        }
    },

    eliminarCuenta: async (id) => {
        if (hasContaAPI()) {
            return await window.contaAPI.eliminarCuenta(id)
        } else {
            try {
                const response = await api.delete(`/accounting/puc/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar la cuenta contable' 
                }
            }
        }
    },

    getBalancePrueba: async (filtros) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getBalancePrueba(filtros);
        } else {
            try {
                const response = await api.get('/accounting/reports/balance-prueba', { params: filtros })
                return response.data
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error al compilar balance de prueba' }
            }
        }
    },

    getEstadoResultados: async (filtros) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getEstadoResultados(filtros)
        } else {
            try {
                const response = await api.get('/accounting/reports/estado-resultados', { params: filtros })
                return response.data
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error al compilar estado de resultados' }
            }
        }
    },

    getBalanceGeneral: async (filtros) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getBalanceGeneral(filtros)
        } else {
            try {
                const response = await api.get('/accounting/reports/balance-general', { params: filtros })
                return response.data
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error al compilar balance general' }
            }
        }
    },

    getTercerosPaginados: async (params) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getTercerosPaginados(params);
        } else {
            const response = await api.get('/accounting/terceros/paginados', { params })
            const result = response.data
            const rawData = result.data || []

            const mappedData = rawData.map(t => ({
                id: t.id,
                tipo_documento: t.tipo_documento,
                numero_documento: t.numero_documento,
                digito_verificacion: t.digito_verificacion || '',
                tipo_persona: t.tipo_persona,
                razon_social: t.razon_social || '',
                nombres: t.nombres || '',
                apellidos: t.apellidos || '',
                es_cliente: t.es_cliente ? 1 : 0,
                es_proveedor: t.es_proveedor ? 1 : 0,
                telefono: t.telefono || '',
                email: t.email || '',
                estado: t.estado ? 1 : 0
            }))

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },

    eliminarTercero: async (id) => {
        if (hasContaAPI()) {
            return await window.contaAPI.eliminarTercero(id)
        } else {
            try {
                const response = await api.delete(`/accounting/terceros/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar el tercero' 
                }
            }
        }
    },

    getCuentasAuxiliares: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getCuentasAuxiliares()
        } else {
            const response = await api.get('/accounting/cuentas-auxiliares')
            return response.data
        }
    },

    getConfigContable: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getConfigContable()
        } else {
            const response = await api.get('/accounting/config')
            return response.data
        }
    },

    getMetodosPago: async () => {
        if (isElectron()) {
            return await window.api.getMetodosPago()
        } else {
            const response = await api.get('/metodos-pago')
            return response.data.data || response.data || []
        }
    },

    updateConfigContable: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.updateConfigContable(payload)
        } else {
            try {
                const response = await api.post('/accounting/config', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar la parametrización contable' 
                }
            }
        }
    },

    updateMetodoPagoCuenta: async (payload) => {
        if (isElectron()) {
            return await window.api.updateMetodoPagoCuenta(payload)
        } else {
            try {
                const response = await api.put(`/metodos-pago/${payload.id}/cuenta`, { 
                    cuentaId: payload.cuenta_id 
                })
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo remapear el método de pago' 
                }
            }
        }
    },

    getComprobanteDetalle: async (id) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getComprobanteDetalle(id)
        } else {
            try {
                const response = await api.get(`/accounting/comprobantes/${id}`)
                return { success: true, data: response.data.data || response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al recuperar el detalle del asiento' 
                }
            }
        }
    },

    getComprobantesPaginados: async (params) => {
        if (hasContaAPI()) {
            return await window.contaAPI.getComprobantesPaginados(params)
        } else {
            const response = await api.get('/accounting/comprobantes/paginados', { params })
            const result = response.data
            const rawData = result.data || []

            const mappedData = rawData.map(c => ({
                id: c.id,
                numero_comprobante: c.numero_comprobante,
                fecha: c.fecha || c.createdAt,
                concepto: c.concepto,
                documento_referencia: c.documento_referencia || '-',
                total: c.total || 0,
                estado: c.estado ? 1 : 0
            }))

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },

    getCuentasAuxiliares: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getCuentasAuxiliares()
        } else {
            const response = await api.get('/accounting/cuentas-auxiliares')
            return { success: true, data: response.data.data || response.data || [] }
        }
    },

    getTerceros: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getTerceros()
        } else {
            const response = await api.get('/accounting/terceros')
            return { success: true, data: response.data.data || response.data || [] }
        }
    },

    crearTercero: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.crearTercero(payload)
        } else {
            try {
                const response = await api.post('/accounting/terceros', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar el tercero en la nube' 
                }
            }
        }
    },

    actualizarTercero: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.actualizarTercero(payload)
        } else {
            try {
                const response = await api.put(`/accounting/terceros/${payload.id}`, payload)
                return { success: true, ...response.data };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar el tercero en el servidor' 
                }
            }
        }
    },

    crearCuenta: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.crearCuenta(payload)
        } else {
            try {
                const response = await api.post('/accounting/puc', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al crear la cuenta contable en la nube' 
                }
            }
        }
    },

    actualizarCuenta: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.actualizarCuenta(payload)
        } else {
            try {
                const response = await api.put(`/accounting/puc/${payload.id}`, payload)
                return { success: true, ...response.data };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar la cuenta contable' 
                }
            }
        }
    },

    getCuentasAuxiliares: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getCuentasAuxiliares()
        } else {
            const response = await api.get('/accounting/cuentas-auxiliares')
            return { success: true, data: response.data.data || response.data || [] }
        }
    },

    getTerceros: async () => {
        if (hasContaAPI()) {
            return await window.contaAPI.getTerceros()
        } else {
            const response = await api.get('/accounting/terceros')
            return { success: true, data: response.data.data || response.data || [] }
        }
    },

    crearComprobante: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.crearComprobante(payload)
        } else {
            try {
                const response = await api.post('/accounting/comprobantes', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al asentar el comprobante en la nube' 
                }
            }
        }
    },

    actualizarComprobante: async (payload) => {
        if (hasContaAPI()) {
            return await window.contaAPI.actualizarComprobante(payload)
        } else {
            try {
                const response = await api.put(`/accounting/comprobantes/${payload.id}`, payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar el comprobante' 
                }
            }
        }
    }
}