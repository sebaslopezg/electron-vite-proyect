import { useState, useEffect, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import SubcategoriaModal from './components/SubcategoriaModal'
import { SubcategoriaDetalles } from './components/SubcategoriaDetalles'
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

export const Subcategorias = ({ currentUser }) => {
    const [show, setShow] = useState(false)
    const [showDetalles, setShowDetalles] = useState(false)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)
    
    const handleCloseDetalles = () => setShowDetalles(false)
    const handleShowDetalles = () => setShowDetalles(true)

    const [activeUser, setActiveUser] = useState(currentUser)

    const [dataInTable, setDataInTable] = useState([])
    const [categorias, setCategorias] = useState([])
    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = { 
        nombre: '', 
        descripcion: '', 
        sku_prefix: '', 
        separador: '', 
        categorias_ids: []
    }
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [subcatSel, setSubcatSel] = useState(null)

    useEffect(() => {
        if (currentUser) {
            setActiveUser(currentUser)
        } else if (window.api && window.api.getCurrentUser) {
            window.api.getCurrentUser().then(res => {
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            })
        }
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        const u = activeUser || currentUser;
        if (!u) return false;
        if (u.permisos?.includes('ALL')) return true;
        return u.permisos?.includes(permissionKey);
    }

    const canCreate = hasPermission('subcategorias_crear');
    const canEditAction = hasPermission('subcategorias_editar');
    const canDeleteAction = hasPermission('subcategorias_eliminar');

    const load = async () => {
        const data = await productosService.getSubcategorias()
        const cats = await productosService.getCategorias()
        setDataInTable(data || [])
        setCategorias(cats?.filter(c => c.id !== 'general') || [])
        setReloadTable(prev => prev + 1)
    };

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { 
        load() 
        window.addEventListener('categorias-actualizadas', load)
        return () => window.removeEventListener('categorias-actualizadas', load)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result;
        const payload = { ...form, sku_prefix: (form.sku_prefix || '').toUpperCase() }

        if (editingId) {
            result = await productosService.updateSubcategoria({ ...payload, id: editingId })
        } else {
            result = await productosService.addSubcategoria(payload)
        }

        if (result && result.success) {
            Toast.fire({ icon: 'success', title: 'Subcategoría guardada correctamente' })
            cleanForm()
            handleClose()
            load()
            window.dispatchEvent(new CustomEvent('subcategorias-actualizadas'))
        } else {
            Toast.fire({ icon: 'error', title: result?.error || 'No se pudo guardar la subcategoría' })
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar Subcategoría?",
            text: "Los productos no se borrarán, pero perderán esta clasificación.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await productosService.deleteSubcategoria(id)
            if (res.success) {
                Toast.fire({ icon: 'success', title: 'Subcategoría eliminada' })
                load()
                window.dispatchEvent(new CustomEvent('subcategorias-actualizadas'))
            } else {
                Toast.fire({ icon: 'error', title: res.error || 'No se pudo eliminar' })
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
                    const catArray = item.categorias_ids ? item.categorias_ids.split(',').filter(id => id) : []

                    setForm({
                        nombre: item.nombre || '', 
                        descripcion: item.descripcion || '',
                        sku_prefix: item.sku_prefix || '', 
                        separador: item.separador || '',
                        categorias_ids: catArray
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
                    setSubcatSel(item)
                    handleShowDetalles()
                } catch(err) { console.error("Error leyendo datos para vista", err) }
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn) {
                e.preventDefault()
                handleDelete(delBtn.dataset.id)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    const dataColumns = useMemo(() => [
        { data: 'nombre', title: 'Subcategoría' },
        {
            data: 'categoria_nombre', 
            title: 'Categorías Vinculadas', 
            render: (data, type, row) => {
                if (!data) return '<span class="text-muted small">Ninguna</span>';
                const catsArray = data.split(' • ');
                const limit = 4;
                
                let html = catsArray.slice(0, limit).map(c => `<span class="badge bg-secondary text-light me-1 mb-1">${c}</span>`).join('');
                
                if (catsArray.length > limit) {
                    const hiddenCats = catsArray.slice(limit).join(', ');
                    const safeData = encodeURIComponent(JSON.stringify(row));
                    html += `<button type="button" class="btn btn-sm btn-light border py-0 px-2 me-1 mb-1 btn-view" data-alldata="${safeData}" title="${hiddenCats}">... +${catsArray.length - limit}</button>`;
                }
                return html;
            }
        },
        { 
            data: 'sku_prefix', title: 'Prefijo SKU',
            render: (data, type, row) => data ? `<code>${data}${row.separador || ''}</code>` : '<span class="text-muted">-</span>'
        },
        { data: 'cant_productos', title: 'Productos', className: 'text-center', render: (data) => `<span class="badge bg-secondary">${data || 0}</span>` },
        {
            data: null, title: 'Acciones', orderable: false, className: 'text-center',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                
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
                            <a class="dropdown-item btn-delete text-danger" href="#" data-id="${row.id}">
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
    ], [activeUser, currentUser])

    return <>
        {canCreate && (
            <div className="mb-3">
                <button className='btn btn-primary' onClick={() => { 
                        setEditingId(null)
                        cleanForm()
                        handleShow()
                    }}>
                    <i className="bi bi-plus-circle me-2"></i>Nueva Subcategoría
                </button>
            </div>
        )}

        <div ref={tableContainerRef} className="w-100">
            <CustomDataTable
                tableId="dt-productos-subcategorias"
                reloadKey={reloadTable}
                data={dataInTable}
                columns={dataColumns}
            />
        </div>

        <SubcategoriaModal
            show={show} 
            handleClose={handleClose} 
            handleSubmit={handleSubmit}
            form={form} 
            setForm={setForm} 
            editingId={editingId} 
            categorias={categorias}
        />

        <SubcategoriaDetalles 
            show={showDetalles}
            handleClose={handleCloseDetalles}
            subcategoriaData={subcatSel}
            categorias={categorias}
        />
    </>
}