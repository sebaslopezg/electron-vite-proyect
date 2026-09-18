import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import CategoriaModal from './components/CategoriaModal'
import { CategoriaDetalles } from './components/CategoriaDetalles'
import { productosService } from '../../services/productosService'

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

export const Categorias = ({ currentUser }) => {
    const [show, setShow] = useState(false)
    const [showDetalles, setShowDetalles] = useState(false)

    const [activeUser, setActiveUser] = useState(currentUser)
    
    const [isLoading, setIsLoading] = useState(true)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const handleCloseDetalles = () => setShowDetalles(false)
    const handleShowDetalles = () => setShowDetalles(true)

    const [dataInTable, setDataInTable] = useState([])
    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = { nombre: '', descripcion: '', sku_prefix: '', separador: '' }
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [catSel, setCatSel] = useState(null)
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    const hasPermission = (permissionKey) => {
        const u = activeUser || currentUser;
        if (!u) return false;
        if (u.permisos?.includes('ALL')) return true;
        return u.permisos?.includes(permissionKey);
    }

    const canCreate = hasPermission('categorias_crear');
    const canEditAction = hasPermission('categorias_editar');
    const canDeleteAction = hasPermission('categorias_eliminar');

    const loadConfig = useCallback(async () => {
        const configData = await productosService.getConfiguracion()
        const confAppRaw = configData.find(c => c.key === 'confApp')
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value)
                setAppConfig({ moneda: parsed.moneda || 'COP', formato_numero: parsed.formato_numero || 'es-CO' })
            } catch(e) {}
        }
    }, [])

    const load = useCallback(async () => {
        const data = await productosService.getCategorias()
        setDataInTable(data || [])
        setReloadTable(prev => prev + 1)
    }, [])

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { 
        const initData = async () => {
            setIsLoading(true);
            
            if (currentUser) {
                setActiveUser(currentUser)
            } else if (window.api && window.api.getCurrentUser) {
                const res = await window.api.getCurrentUser()
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            }

            await Promise.all([
                load(),
                loadConfig()
            ])

            setIsLoading(false)
        }

        initData()
        
        window.addEventListener('config-actualizada', loadConfig)
        window.addEventListener('categorias-actualizadas', load)
        
        return () => {
            window.removeEventListener('config-actualizada', loadConfig)
            window.removeEventListener('categorias-actualizadas', load)
        }
    }, [currentUser, load, loadConfig])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result;
        const payload = { ...form, sku_prefix: form.sku_prefix.toUpperCase() }

        if (editingId) {
            result = await productosService.updateCategoria({ ...payload, id: editingId })
        } else {
            result = await productosService.addCategoria(payload)
        }

        if (result && result.success) {
            Toast.fire({ icon: 'success', title: 'Categoría guardada correctamente' })
            cleanForm()
            handleClose()
            load()
            window.dispatchEvent(new CustomEvent('categorias-actualizadas'))
        } else {
            Toast.fire({ icon: 'error', title: result?.error || 'No se pudo guardar la categoría' })
        }
    }

    const handleDelete = async (id) => {
        if (id === 'general') {
            return Toast.fire({ icon: 'error', title: 'La categoría General no se puede eliminar.' })
        }

        const result = await Swal.fire({
            title: "¿Eliminar Categoría?",
            text: "Los productos no se borrarán, pero perderán esta clasificación.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await productosService.deleteCategoria(id)
            if (res.success) {
                Toast.fire({ icon: 'success', title: 'Categoría eliminada' })
                load()
                window.dispatchEvent(new CustomEvent('categorias-actualizadas'))
            } else {
                Toast.fire({ icon: 'error', title: res.error || 'No se puede eliminar la categoría' })
            }
        }
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                e.preventDefault()
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    
                    setForm({
                        nombre: item.nombre || '',
                        descripcion: item.descripcion || '',
                        sku_prefix: item.sku_prefix || '',
                        separador: item.separador || ''
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
                    setCatSel(item)
                    handleShowDetalles()
                } catch(err) { console.error("Error leyendo datos para vista", err) }
            }

            const delBtn = e.target.closest('.btn-delete')
            if (delBtn && !delBtn.classList.contains('disabled')) {
                e.preventDefault()
                handleDelete(delBtn.dataset.id)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [isLoading])

    const dataColumns = useMemo(() => [
        { 
            data: 'nombre', 
            title: 'Categoría' 
        },
        { 
            data: 'sku_prefix', 
            title: 'Prefijo SKU',
            render: (data, type, row) => data ? `<code>${data}${row.separador || ''}</code>` : '<span class="text-muted">-</span>'
        },
        { 
            data: 'descripcion', 
            title: 'Descripción',
            render: (data) => data || '<span class="text-muted">-</span>'
        },
        { 
            data: 'cant_productos', 
            title: 'Productos Asociados',
            className: 'text-center',
            render: (data, type, row) => {
                const safeData = encodeURIComponent(JSON.stringify(row));
                return `
                    <button class="btn btn-sm btn-outline-secondary btn-view rounded-pill px-3 fw-bold" data-alldata="${safeData}" title="Ver Lista de Productos">
                        ${data || 0}
                    </button>
                `;
            }
        },
        {
            data: null,
            title: 'Acciones',
            orderable: false,
            className: 'text-center',
            render: function (data, type, row) {
                const isGeneral = row.id === 'general';
                const safeData = encodeURIComponent(JSON.stringify(row));
                
                let menuItems = `
                  <li>
                    <a class="dropdown-item btn-view" href="#" data-alldata="${safeData}">
                      <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                    </a>
                  </li>
                `;

                if (canEditAction) {
                  menuItems += `
                    <li>
                      <a class="dropdown-item btn-edit" href="#" data-alldata="${safeData}">
                        <i class="bi bi-pencil me-2 text-secondary"></i> Editar
                      </a>
                    </li>
                  `;
                }

                if (canDeleteAction) {
                  if (canEditAction) menuItems += `<li><hr class="dropdown-divider"></li>`;
                  menuItems += `
                    <li>
                      <a class="dropdown-item btn-delete text-danger ${isGeneral ? 'disabled' : ''}" href="#" data-id="${row.id}">
                        <i class="bi bi-trash3 me-2"></i> Eliminar
                      </a>
                    </li>
                  `;
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
    ], [appConfig, activeUser, currentUser])

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
                            <i className="bi bi-plus-circle me-2"></i>Nueva Categoría
                        </button>
                    </div>
                )}

                <div ref={tableContainerRef} className="w-100">
                    <CustomDataTable
                        tableId="dt-productos-categorias"
                        reloadKey={reloadTable}
                        data={dataInTable}
                        columns={dataColumns}
                    />
                </div>
            </div>
        </div>

        <CategoriaModal 
            show={show} 
            handleClose={handleClose} 
            handleSubmit={handleSubmit} 
            form={form} 
            setForm={setForm} 
            editingId={editingId} 
        />

        <CategoriaDetalles 
            show={showDetalles}
            handleClose={handleCloseDetalles}
            categoriaData={catSel}
            appConfig={appConfig}
        />
    </>
}