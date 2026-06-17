const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined;

export const inventarioService = {
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion();
        } else {
            const response = await api.get('/configuracion');
            return response.data.data || response.data || [];
        }
    },

    getCategorias: async () => {
        if (isElectron()) {
            return await window.api.getCategorias();
        } else {
            const response = await api.get('/categorias');
            return response.data.data || response.data || [];
        }
    },

    getEtiquetas: async () => {
        if (isElectron()) {
            return await window.api.getEtiquetas();
        } else {
            const response = await api.get('/etiquetas');
            return response.data.data || response.data || [];
        }
    },

    getSubcategorias: async () => {
        if (isElectron()) {
            return await window.api.getSubcategorias();
        } else {
            const response = await api.get('/subcategorias');
            return response.data.data || response.data || [];
        }
    },

    setInventario: async (payload) => {
        if (isElectron()) {
            return await window.api.setInventario(payload);
        } else {
            try {
                const response = await api.post('/inventario/ajustar', {
                    productId: payload.id,
                    cantidad: payload.amount,
                    movimiento: payload.type.toUpperCase(),
                    operador: payload.usuario,
                    observaciones: payload.notes
                });
                
                return { 
                    success: true, 
                    stockAnterior: response.data.stockAnterior,
                    stockNuevo: response.data.stockNuevo
                };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.response?.data?.message || 'Error al guardar el ajuste de inventario' 
                };
            }
        }
    },

    getInventarioPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getInventarioPaginados(params);
        } else {
            const response = await api.get('/inventario/paginados', { params });
            const result = response.data;
            const rawData = result.data || [];

            const mappedData = rawData.map(p => ({
                id: p.id,
                ref_name: p.ref_name,
                sku: p.sku,
                sku_prefix: p.sku_prefix || '',
                separador: p.separador || '',
                stock: p.stock,
                precio: p.precio,
                min_stock: p.min_stock || 5
            }));

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData,
                totalStock: result.totalStock || 0
            };
        }
    },

    getInventarioHistoryPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getInventarioHistoryPaginados(params);
        } else {
            const response = await api.get('/inventario/historial', { params });
            const result = response.data;
            const rawData = result.data || [];

            const mappedData = rawData.map(h => ({
                id: h.id,
                fecha: h.createdAt,
                tipo_movimiento: h.type,
                cantidad: h.amount,
                stock_anterior: h.stockAnterior,
                stock_nuevo: h.stockNuevo,
                usuario: h.user?.username || h.userId || 'system',
                notes: h.notes || ''
            }));

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            };
        }
    }
};