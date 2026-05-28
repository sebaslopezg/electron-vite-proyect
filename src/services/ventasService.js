const api = ''

const isElectron = () => typeof window !== 'undefined' && window.api !== undefined

export const ventasService = {
    getProductos: async () => {
        if (isElectron()) {
            return await window.api.getAllProductos()
        } else {
            const response = await api.get('/productos/all')
            return response.data.data || response.data || []
        }
    },

    getClientes: async () => {
        if (isElectron()) {
            return await window.api.getClientes()
        } else {
            const response = await api.get('/clientes/all')
            return response.data.data || response.data || []
        }
    },

    createVenta: async (ventaData) => {
        if (isElectron()) {
            return await window.api.createVenta(ventaData)
        } else {
            try {
                const response = await api.post('/ventas', ventaData)
                return { success: true, ...response.data }
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error en la web' }
            }
        }
    },
    // ─── CONFIGURACIÓN DEL ALMACÉN ───────────────────────────
    updateConfiguracion: async (form) => {
        if (isElectron()) {
            return await window.api.updateConfAlmacen(form);
        } else {
            const response = await api.put('/shop-config', form);
            return response.data;
        }
    },

    // ─── MÉTODOS DE PAGO ─────────────────────────────────────
    getMetodosPago: async () => {
        if (isElectron()) {
            return await window.api.getMetodosPago();
        } else {
            const response = await api.get('/shop-config/payment-methods');
            return response.data.data || response.data || [];
        }
    },

    addMetodoPago: async (nombre) => {
        if (isElectron()) {
            return await window.api.addMetodoPago(nombre);
        } else {
            try {
                const response = await api.post('/shop-config/payment-methods', { nombre });
                return { success: true, ...response.data };
            } catch (error) {
                return { success: false, error: error.response?.data?.message || 'Error en la web' };
            }
        }
    },

    deleteMetodoPago: async (id) => {
        if (isElectron()) {
            return await window.api.deleteMetodoPago(id);
        } else {
            const response = await api.delete(`/shop-config/payment-methods/${id}`);
            return response.data;
        }
    },
    // ─── CONFIGURACIÓN GLOBAL ────────────────────────────────
    getConfiguracion: async () => {
        if (isElectron()) {
            return await window.api.getConfiguracion();
        } else {
            const response = await api.get('/configuracion');
            return response.data.data || response.data || [];
        }
    },

    // ─── GESTIÓN DE NOTAS CRÉDITO / DÉBITO ───────────────────
    getNotas: async () => {
        if (isElectron()) {
            return await window.api.getNotas();
        } else {
            const response = await api.get('/notas');
            const notas = response.data.data || response.data || [];
            
            return notas.map(n => ({
                id: n.id,
                prefijo: n.prefix,
                numero_nota: n.noteNumber,
                type_nota: n.noteType,
                tipo_nota: n.noteType,
                numero_factura: n.originalInvoiceNum,
                numero_factura_origen: n.originalInvoiceNum,
                date_created: n.createdAt,
                motivo_dian: n.dianReason,
                total_final: n.finalTotal
            }));
        }
    },

    getNotaDetalle: async (id) => {
        if (isElectron()) {
            return await window.api.getNotaDetalle(id);
        } else {
            try {
                const response = await api.get(`/notas/${id}/detalle`);
                const resData = response.data;

                const mappedItems = (resData.data || resData.detalles || []).map(item => ({
                    id: item.id,
                    nombre_producto: item.productName,
                    cantidad_producto: item.quantity,
                    precio_producto: item.unitPrice,
                    iva: item.vatPercent,
                    total: item.total
                }));

                return {
                    success: true,
                    data: mappedItems,
                    configuracion: resData.configuracion || null
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ─── BÚSQUEDA DE FACTURAS PARA NOTAS ─────────────────────
    searchFactura: async (numero) => {
        if (isElectron()) {
            return await window.api.searchFactura(numero);
        } else {
            try {
                const response = await api.get(`/sales/buscar/${numero}`);
                return {
                    success: true,
                    maestro: response.data.maestro,
                    detalles: response.data.detalles || []
                };
            } catch (error) {
                return {
                    success: false,
                    message: error.response?.data?.message || 'Factura no encontrada en la plataforma web'
                };
            }
        }
    },

    // ─── CREACIÓN DE NUEVA NOTA ──────────────────────────────
    addNota: async (payload) => {
        if (isElectron()) {
            return await window.api.addNota(payload);
        } else {
            try {
                const response = await api.post('/notas', payload);
                return { success: true, ...response.data };
            } catch (error) {
                return {
                    success: false,
                    error: error.response?.data?.message || 'Error al intentar guardar la nota en la nube'
                };
            }
        }
    },

    // ─── PAGINACIÓN HISTÓRICA DE VENTAS ──────────────────────
    getFacturasPaginadas: async (params) => {
        if (isElectron()) {
            return await window.api.getFacturasPaginadas(params)
        } else {
            const response = await api.get('/sales', { params })
            const result = response.data

            const rawData = result.data || []
            
            const mappedData = rawData.map(f => ({
                id: f.id,
                date_created: f.createdAt,
                numero_factura: f.invoiceNumber,
                prefijo: f.prefix,
                separador: f.separador || '-',
                documento_cliente: f.customerDocument,
                nombre_cliente: f.customerName,
                tipo_pago: f.paymentType,
                total_recibido: f.amountPaid,
                saldo_pendiente: f.balance,
                total_factura: f.total,
                notas_aplicadas: f.notes?.map(n => n.noteType).join(' y ') || null
            }))

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },

    getDetalleFactura: async (id) => {
        if (isElectron()) {
            return await window.api.getDetalle(id)
        } else {
            try {
                const response = await api.get(`/sales/${id}/detalle`)
                const resData = response.data;

                const mappedItems = (resData.data || resData.detalles || []).map(d => ({
                    id: d.id,
                    id_producto: d.productId,
                    nombre_producto: d.productName,
                    cantidad_producto: d.quantity,
                    precio_producto: d.price,
                    iva: d.tax,
                    descuento: d.discount,
                    total: d.total
                }))

                return {
                    success: true,
                    data: mappedItems,
                    notes: resData.notes || [],
                    configuracion: resData.configuracion || null
                }
            } catch (error) {
                return { success: false, error: error.message }
            }
        }
    },

    // ─── REPORTES FINANCIEROS DE VENTAS ──────────────────────
    getReporteVentas: async ({ startDate, endDate }) => {
        if (isElectron()) {
            return await window.api.getReporteVentas({ startDate, endDate })
        } else {
            try {
                const response = await api.get('/sales/reporte', { params: { startDate, endDate } })
                const resData = response.data;
                const rawFacturas = resData.data || []

                const mappedFacturas = rawFacturas.map(f => ({
                    id: f.id,
                    date_created: f.createdAt,
                    numero_factura: f.invoiceNumber,
                    prefijo: f.prefix,
                    separador: f.separador || '-',
                    nombre_cliente: f.customerName || 'Cliente Mostrador',
                    tipo_pago: f.paymentType,
                    total_factura: f.total
                }))

                return {
                    success: true,
                    data: mappedFacturas,
                    configuracion: resData.configuracion || null
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.response?.data?.message || 'Error al compilar el reporte en la nube'
                }
            }
        }
    },
    // ─── CONSULTA DE SUBCATEGORÍAS ───────────────────────────
    getSubcategorias: async () => {
        if (isElectron()) {
            return await window.api.getSubcategorias();
        } else {
            const response = await api.get('/subcategorias');
            return response.data.data || response.data || [];
        }
    },

    // ─── BÚSQUEDA PAGINADA Y FILTRADA DE PRODUCTOS ───────────
    getProductosPaginados: async (params) => {
        if (isElectron()) {
            return await window.api.getProductosPaginados(params);
        } else {
            const response = await api.get('/productos', { params });
            const result = response.data;
            const rawData = result.data || [];

            const mappedData = rawData.map(p => ({
                id: p.id,
                ref_name: p.ref_name,
                sku: p.sku,
                sku_prefix: p.sku_prefix,
                separador: p.separador || '-',
                stock: p.stock,
                precio: p.precio,
                categoria_id: p.categoria_id,
                categoria_nombre: p.category?.nombre || 'General',
                min_stock: p.min_stock,
                tipo: p.tipo,
                allow_encargo: p.allow_encargo !== undefined ? p.allow_encargo : 1,
                encargo_solo_sin_stock: p.encargo_solo_sin_stock !== undefined ? p.encargo_solo_sin_stock : 1
            }));

            return {
                draw: result.draw || params.draw,
                recordsTotal: result.recordsTotal || mappedData.length,
                recordsFiltered: result.recordsFiltered || mappedData.length,
                data: mappedData
            }
        }
    },
    // ─── CONSULTAS DE CATÁLOGO COMPLETO ──────────────────────
    getAllProductos: async () => {
        if (isElectron()) {
            return await window.api.getAllProductos()
        } else {
            const response = await api.get('/productos/all')
            return response.data.data || response.data || []
        }
    },

    getCategorias: async () => {
        if (isElectron()) {
            return await window.api.getCategorias()
        } else {
            const response = await api.get('/categorias')
            return response.data.data || response.data || []
        }
    },

    getEtiquetas: async () => {
        if (isElectron()) {
            return await window.api.getEtiquetas()
        } else {
            const response = await api.get('/etiquetas')
            return response.data.data || response.data || []
        }
    },
    // ─── CONFIGURACIÓN ESTRUCTURAL DEL ALMACÉN ───────────────
    getAllConfAlmacen: async () => {
        if (isElectron()) {
            return await window.api.getAllConfAlmacen()
        } else {
            const response = await api.get('/shop-config/all')
            const data = response.data.data || response.data || {}
            return Array.isArray(data) ? data : [data]
        }
    }
}