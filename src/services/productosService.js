const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const productosService = {
    // ─── CATEGORÍAS ──────────────────────────────────────────
    getCategorias: async () => {
        if (isElectron()) {
            return await window.api.getCategorias()
        } else {
            const response = await api.get('/categorias')
            return response.data.data || response.data || []
        }
    },

    // ─── SUBCATEGORÍAS ───────────────────────────────────────
    getSubcategorias: async () => {
        if (isElectron()) {
            return await window.api.getSubcategorias()
        } else {
            const response = await api.get('/subcategorias')
            return response.data.data || response.data || []
        }
    },

    addSubcategoria: async (payload) => {
        if (isElectron()) {
            return await window.api.addSubcategoria(payload)
        } else {
            try {
                const response = await api.post('/subcategorias', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar la subcategoría en la nube' 
                }
            }
        }
    },

    updateSubcategoria: async (payload) => {
        if (isElectron()) {
            return await window.api.updateSubcategoria(payload)
        } else {
            try {
                const response = await api.put(`/subcategorias/${payload.id}`, payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar la subcategoría' 
                }
            }
        }
    },

    deleteSubcategoria: async (id) => {
        if (isElectron()) {
            return await window.api.deleteSubcategoria(id)
        } else {
            try {
                const response = await api.delete(`/subcategorias/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar la subcategoría' 
                }
            }
        }
    },
    // ─── CONFIGURACIÓN GLOBAL ────────────────────────────────
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion()
        } else {
            const response = await api.get('/configuracion')
            return response.data.data || response.data || []
        }
    },

    // ─── GESTIÓN DE ETIQUETAS ────────────────────────────────
    getEtiquetas: async () => {
        if (isElectron()) {
            return await window.api.getEtiquetas()
        } else {
            const response = await api.get('/etiquetas')
            return response.data.data || response.data || []
        }
    },

    // ─── MUTACIONES DE PRODUCTOS Y SERVICIOS ─────────────────
    addProducto: async (form) => {
        if (isElectron()) {
            return await window.api.addProducto(form)
        } else {
            try {
                const response = await api.post('/productos', form)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar en el servidor web' 
                }
            }
        }
    },

    updateProducto: async (form) => {
        if (isElectron()) {
            return await window.api.updateProducto(form)
        } else {
            try {
                const response = await api.put(`/productos/${form.id}`, form)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar el registro en la nube' 
                }
            }
        }
    },

    deleteProducto: async (id) => {
        if (isElectron()) {
            return await window.api.deleteProducto(id)
        } else {
            try {
                const response = await api.delete(`/productos/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar el registro' 
                }
            }
        }
    },

    // ─── PAGINACIÓN DE SERVICIOS ─────────────────────────────
    getServiciosPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getServiciosPaginados(params)
        } else {
            const response = await api.get('/productos/paginados', { params: { ...params, tipo: 'servicio' } })
            const result = response.data
            const rawData = result.data || []

            const mappedData = rawData.map(s => ({
                id: s.id,
                ref_name: s.ref_name,
                sku: s.sku,
                sku_prefix: s.sku_prefix || '',
                separador: s.separador || '',
                status: s.status,
                precio: s.precio,
                date_created: s.createdAt,
                date_modify: s.updatedAt,
                categoria_id: s.categoria_id,
                etiquetas_ids: s.etiquetas?.map(t => t.id).join(',') || ''
            }));

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },
    // ─── PAGINACIÓN DE PRODUCTOS FÍSICOS ─────────────────────
    getProductosPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getProductosPaginados(params)
        } else {
            const response = await api.get('/productos/paginados', { params: { ...params, tipo: 'producto' } })
            const result = response.data
            const rawData = result.data || []

            const mappedData = rawData.map(p => ({
                id: p.id,
                ref_name: p.ref_name,
                sku: p.sku,
                sku_prefix: p.sku_prefix || '',
                separador: p.separador || '',
                stock: p.stock,
                precio: p.precio,
                status: p.status,
                min_stock: p.min_stock,
                max_stock: p.max_stock,
                unidad_medida: p.unidad_medida,
                iva: p.iva,
                allow_negative: p.allow_negative,
                descripcion: p.descripcion,
                tipo: p.tipo,
                allow_encargo: p.allow_encargo !== undefined ? p.allow_encargo : 1,
                encargo_solo_sin_stock: p.encargo_solo_sin_stock !== undefined ? p.encargo_solo_sin_stock : 1,
                categoria_id: p.categoria_id,
                categoria_nombre: p.category?.nombre || 'General',
                subcategorias_ids_json: p.subcategorias_ids_json || JSON.stringify(p.subcategories?.map(s => s.id) || []),
                etiquetas_ids: p.etiquetas?.map(t => t.id).join(',') || ''
            }))

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },
    // ─── MUTACIONES DE ETIQUETAS ─────────────────────────────
    addEtiqueta: async (form) => {
        if (isElectron()) {
            return await window.api.addEtiqueta(form)
        } else {
            try {
                const response = await api.post('/etiquetas', form)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar la etiqueta en la nube' 
                }
            }
        }
    },

    updateEtiqueta: async (form) => {
        if (isElectron()) {
            return await window.api.updateEtiqueta(form)
        } else {
            try {
                const response = await api.put(`/etiquetas/${form.id}`, form)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar la etiqueta' 
                }
            }
        }
    },

    deleteEtiqueta: async (id) => {
        if (isElectron()) {
            return await window.api.deleteEtiqueta(id)
        } else {
            try {
                const response = await api.delete(`/etiquetas/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar la etiqueta' 
                }
            }
        }
    },
    // ─── MUTACIONES DE CATEGORÍAS ────────────────────────────
    addCategoria: async (payload) => {
        if (isElectron()) {
            return await window.api.addCategoria(payload)
        } else {
            try {
                const response = await api.post('/categorias', payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar la categoría en la nube' 
                }
            }
        }
    },

    updateCategoria: async (payload) => {
        if (isElectron()) {
            return await window.api.updateCategoria(payload)
        } else {
            try {
                const response = await api.put(`/categorias/${payload.id}`, payload)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al actualizar la categoría' 
                }
            }
        }
    },

    deleteCategoria: async (id) => {
        if (isElectron()) {
            return await window.api.deleteCategoria(id)
        } else {
            try {
                const response = await api.delete(`/categorias/${id}`)
                return { success: true, ...response.data }
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'No se pudo eliminar la categoría' 
                }
            }
        }
    }
}