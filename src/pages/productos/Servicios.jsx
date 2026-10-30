import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import ProductModal from './components/ProductoModal'
import { ProductoDetalles } from './components/ProductoDetalles'
import { formatCurrency } from '../../utils/currencies'
import { productosService } from '../../services/productosService'

// Configuración global del Toast importado de SweetAlert2
const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const Servicios = ({ currentUser }) => {
    const [show, setShow] = useState(false)
    const [showDetalles, setShowDetalles] = useState(false)

    const [activeUser, setActiveUser] = useState(currentUser)
    const [isLoading, setIsLoading] = useState(true)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)
    
    const handleCloseDetalles = () => setShowDetalles(false)
    const handleShowDetalles = () => setShowDetalles(true)

    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = {
        ref_name: '',
        sku: '',
        stock: 0,
        unidad_medida: 'Unidad',
        iva: 0,
        allow_negative: 0,
        descripcion: '',
        precio: 0,
        status: 1,
        tipo: 'servicio',
        categoria_id: 'general',
        subcategorias_ids: [],
        etiquetas: []
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [prodSel, setProdSel] = useState(null)
    const [categorias, setCategorias] = useState([])
    const [subcategorias, setSubcategorias] = useState([])
    const [etiquetas, setEtiquetas] = useState([])

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })
    const [isSyncConfigured, setIsSyncConfigured] = useState(false)

    // === REGLAS DE SINCRONIZACIÓN WEB ===
    const syncRule = activeUser?.syncRules?.productos || 'desktop_to_web'
    const isReadOnly = (syncRule === 'web_to_desktop') || isSyncConfigured

    const hasPermission = (permissionKey) => {
        const u = activeUser || currentUser
        if (!u) return false
        if (u.permisos?.includes('ALL')) return true
        return u.permisos?.includes(permissionKey)
    }

    const canCreate = !isReadOnly && hasPermission('servicios_crear')
    const canEdit = !isReadOnly && hasPermission('servicios_editar')
    const canDelete = !isReadOnly && hasPermission('servicios_eliminar')

    const loadConfig = async () => {
        const configData = await productosService.getConfiguracion()

        const syncConfRaw = configData.find(c => c.key === 'syncConf')
        if (syncConfRaw) {
            try {
                const parsedSync = JSON.parse(syncConfRaw.value)
                if (parsedSync.negocio_id && parsedSync.token) {
                    setIsSyncConfigured(true)
                } else {
                    setIsSyncConfigured(false)
                }
            } catch(e) {}
        }

        const confAppRaw = configData.find(c => c.key === 'confApp')
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value)
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                })
            } catch(e) {}
        }
    }

    const renderCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
    }

    const loadExtras = useCallback(async () => {
        const [cats, tags, subcats] = await Promise.all([
            productosService.getCategorias(),
            productosService.getEtiquetas(),
            productosService.getSubcategorias()
        ])
        setCategorias(cats || [])
        setEtiquetas(tags || [])
        setSubcategorias(subcats || [])
    }, [])

    useEffect(() => {
        const initData = async () => {
            setIsLoading(true)
            
            if (currentUser) {
                setActiveUser(currentUser)
            } else if (window.api && window.api.getCurrentUser) {
                const res = await window.api.getCurrentUser()
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            }

            await Promise.all([
                loadExtras(),
                loadConfig()
            ])

            setIsLoading(false)
        }

        initData()
        
        window.addEventListener('config-actualizada', loadConfig)
        window.addEventListener('categorias-actualizadas', loadExtras)
        window.addEventListener('subcategorias-actualizadas', loadExtras)
        window.addEventListener('etiquetas-actualizadas', loadExtras)

        return () => {
            window.removeEventListener('config-actualizada', loadConfig)
            window.removeEventListener('categorias-actualizadas', loadExtras)
            window.removeEventListener('subcategorias-actualizadas', loadExtras)
            window.removeEventListener('etiquetas-actualizadas', loadExtras)
        }
    }, [currentUser, loadExtras])

    const cleanForm = () => setForm({ ...emptyForm })

    const handleSubmit = async (e, finalSkuArmado) => {
        e.preventDefault()
        if (isReadOnly) return

        const payload = { ...form }
        if (finalSkuArmado) payload.sku = finalSkuArmado

        let result
        if (editingId) {
            result = await productosService.updateProducto({ ...payload, id: editingId })
        } else {
            result = await productosService.addProducto(payload)
        }

        if (result && result.success) {
            // CAMBIADO: Usando Toast en vez de Swal normal
            Toast.fire({ icon: 'success', title: 'Servicio guardado correctamente' })
            cleanForm()
            handleClose()
            setReloadTable(prev => prev + 1)
        } else {
            // CAMBIADO: Usando Toast para el error
            Toast.fire({ icon: 'error', title: result?.error || 'No se pudo guardar el servicio' })
        }
    }

    const handleDelete = async (id) => {
        if (isReadOnly) return

        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar el registro?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        })

        if (result.isConfirmed) {
            const res = await productosService.deleteProducto(id)
            if (res.success) {
                setReloadTable(prev => prev + 1)
                // CAMBIADO: Usando Toast en vez de Swal normal
                Toast.fire({ icon: 'success', title: 'Servicio eliminado' })
            } else {
                // CAMBIADO: Usando Toast para el error
                Toast.fire({ icon: 'error', title: res?.error || 'Error al eliminar' })
            }
        }
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn && !isReadOnly) {
                e.preventDefault()
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    const tagsArray = item.etiquetas_ids ? item.etiquetas_ids.split(',').filter(id => id) : []
                    
                    let subcatIds = []
                    if (item.subcategorias_ids_json) {
                        try { subcatIds = JSON.parse(item.subcategorias_ids_json) } catch (e) {}
                    }

                    setForm({
                        ref_name: item.ref_name || '', 
                        sku: item.sku || '', 
                        stock: item.stock || 0,
                        unidad_medida: item.unidad_medida || 'Unidad', 
                        iva: item.iva || 0,
                        allow_negative: item.allow_negative || 0, 
                        descripcion: item.descripcion || '',
                        precio: item.precio || 0, 
                        status: item.status || 1, 
                        tipo: item.tipo || 'servicio',
                        categoria_id: item.categoria_id || 'general', 
                        subcategorias_ids: subcatIds,
                        etiquetas: tagsArray
                    })
                    setEditingId(item.id)
                    handleShow()
                } catch(err) { console.error("Error leyendo datos", err) }
            }

            const viewBtn = e.target.closest('.btn-view')
            if (viewBtn) {
                e.preventDefault()
                try {
                    const rawData = decodeURIComponent(viewBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    setProdSel(item)
                    handleShowDetalles()
                } catch(err) { console.error("Error leyendo datos para vista", err) }
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn && !isReadOnly) {
                e.preventDefault()
                handleDelete(delBtn.dataset.id)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [isLoading, isReadOnly])

    const dataColumns = useMemo(() => [
        { data: 'ref_name', title: 'Nombre Referencia' },
        { 
            data: 'sku', 
            title: 'SKU', 
            render: (data, type, row) => {
                if (!data) return '-'
                const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}`.toUpperCase() : ''
                const skuVal = String(data).toUpperCase()
                const fullSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view" data-alldata="${safeData}">${fullSku}</a>`
            } 
        },
        { 
            data: 'status', 
            title: 'Estado', 
            render: (data) => `<span class="badge ${data === 1 ? 'bg-success' : 'bg-danger'}">${data === 1 ? 'Activo' : 'Inactivo'}</span>` 
        },
        { 
            data: 'precio', 
            title: 'Precio', 
            render: (data) => renderCurrency(data) 
        },
        { 
            data: 'date_created', 
            title: 'Fecha Creación', 
            render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero) 
        },
        { 
            data: 'date_modify', 
            title: 'Fecha Modificación', 
            render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero) 
        },
        {
            data: null,
            title: 'Acciones',
            orderable: false,
            className: 'text-center',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))

                let menuItems = `
                    <li>
                        <a class="dropdown-item btn-view" href="#" data-alldata="${safeData}">
                            <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                        </a>
                    </li>
                `

                if (canEdit) {
                    menuItems += `
                        <li>
                            <a class="dropdown-item btn-edit" href="#" data-id="${row.id}" data-alldata="${safeData}">
                                <i class="bi bi-pencil me-2 text-secondary"></i> Editar
                            </a>
                        </li>
                    `
                }

                if (canDelete) {
                    if (canEdit) menuItems += `<li><hr class="dropdown-divider"></li>`
                    menuItems += `
                        <li>
                            <a class="dropdown-item btn-delete text-danger" href="#" data-id="${row.id}">
                                <i class="bi bi-trash3 me-2"></i> Eliminar
                            </a>
                        </li>
                    `
                }

                return `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu shadow-sm">
                            ${menuItems}
                        </ul>
                    </div>
                `
            }
        }
    ], [appConfig, activeUser, currentUser, isReadOnly, canEdit, canDelete])

    return <>
        <div className="position-relative" style={{ minHeight: isLoading ? '60vh' : 'auto' }}>
            
            {isLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white" style={{ zIndex: 10 }}>
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            )}

            <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.4s ease-in-out', pointerEvents: isLoading ? 'none' : 'auto' }}>
                
                {canCreate && (
                    <div className="mb-3">
                        <button className='btn btn-primary' onClick={() => {
                            setEditingId(null)
                            cleanForm()
                            handleShow()
                        }}>
                            <i className="bi bi-plus-circle me-2"></i>Nuevo Servicio
                        </button>
                    </div>
                )}

                <div ref={tableContainerRef}>
                    <CustomDataTable
                        tableId="dt-servicios-catalogo"
                        key={`servicios-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}-${isReadOnly}`}
                        reloadKey={reloadTable}
                        ajaxData={(params) => productosService.getServiciosPaginados(params)}
                        columns={dataColumns}
                    />
                </div>
            </div>
        </div>
        
        <ProductModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
            categorias={categorias}
            subcategorias={subcategorias}
            etiquetas={etiquetas}
        />

        <ProductoDetalles 
            show={showDetalles}
            handleClose={handleCloseDetalles}
            productoData={prodSel}
            appConfig={appConfig}
            subcategoriasDisponibles={subcategorias}
            etiquetasDisponibles={etiquetas}
        />
    </>
}