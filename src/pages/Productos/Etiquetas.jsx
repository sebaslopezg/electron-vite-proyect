import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import CustomDataTable from '../../components/DataTableComponent'
import EtiquetaModal from './components/EtiquetaModal'
import { EtiquetaDetalles } from './components/EtiquetaDetalles'
import { productosService } from '../../services/productosService'

export const Etiquetas = ({ currentUser }) => {
    const [show, setShow] = useState(false)
    const [showDetalles, setShowDetalles] = useState(false)

    const [activeUser, setActiveUser] = useState(currentUser)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const handleCloseDetalles = () => setShowDetalles(false)
    const handleShowDetalles = () => setShowDetalles(true)

    const [dataInTable, setDataInTable] = useState([])
    const [categorias, setCategorias] = useState([])
    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = { 
        nombre: '', 
        descripcion: '', 
        color: '#0d6efd', 
        categorias: ['general'] 
    }
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [tagSel, setTagSel] = useState(null)

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

    const canCreate = hasPermission('etiquetas_crear');
    const canEditAction = hasPermission('etiquetas_editar');
    const canDeleteAction = hasPermission('etiquetas_eliminar');

    const loadData = useCallback(async () => {
        const [tagsData, catsData] = await Promise.all([
            productosService.getEtiquetas(),
            productosService.getCategorias()
        ]);
        setDataInTable(tagsData || [])
        setCategorias(catsData || [])
        setReloadTable(prev => prev + 1)
    }, [])

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { loadData() }, [loadData])
    useEffect(() => {
        const handleCategoriasActualizadas = () => loadData()
        window.addEventListener('categorias-actualizadas', handleCategoriasActualizadas)
        return () => window.removeEventListener('categorias-actualizadas', handleCategoriasActualizadas)
    }, [loadData])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result
        if (editingId) {
            result = await productosService.updateEtiqueta({ ...form, id: editingId })
        } else {
            result = await productosService.addEtiqueta(form)
        }

        if (result && result.success) {
            toast.success('Etiqueta guardada correctamente')
            cleanForm()
            handleClose()
            loadData()
            window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'))
        } else {
            toast.error(result?.error || 'No se pudo guardar la etiqueta')
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar Etiqueta?",
            text: "Se borrará de todos los productos que la tengan asignada.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await productosService.deleteEtiqueta(id)
            if (res.success) {
                toast.success('Etiqueta eliminada')
                loadData()
                window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'))
            } else {
                toast.error(res.error || 'Error al eliminar')
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
                    
                    const categoriasArray = item.categorias_ids ? item.categorias_ids.split(',') : ['general']

                    setForm({
                        nombre: item.nombre || '',
                        descripcion: item.descripcion || '',
                        color: item.color || '#0d6efd',
                        categorias: categoriasArray
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
                    setTagSel(item)
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

    const getTextColor = (hexColor) => {
        if (!hexColor) return '#ffffff';
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    const dataColumns = useMemo(() => [
        { 
            data: 'nombre', 
            title: 'Etiqueta (Tag)',
            render: (data, type, row) => {
                const color = row.color || '#6c757d';
                const textColor = getTextColor(color);
                return `<span class="badge shadow-sm" style="background-color: ${color}; color: ${textColor}; padding: 6px 12px; border-radius: 12px;"><i class="bi bi-tag-fill me-1"></i>${data}</span>`;
            }
        },
        { 
            data: 'descripcion', 
            title: 'Descripción',
            render: (data) => data || '<span class="text-muted">-</span>'
        },
        { 
            data: 'categorias_nombres', 
            title: 'Categorías Visibles',
            render: (data, type, row) => {
                if (!data) return '<span class="text-muted">-</span>';
                const catsArray = data.split(',').map(s => s.trim()).filter(Boolean);
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
                    <i className="bi bi-tags me-2"></i>Nueva Etiqueta
                </button>
            </div>
        )}

        <div ref={tableContainerRef} className="w-100">
            <CustomDataTable
                tableId="dt-productos-etiquetas"
                reloadKey={reloadTable}
                data={dataInTable}
                columns={dataColumns}
            />
        </div>

        <EtiquetaModal 
            show={show} 
            handleClose={handleClose} 
            handleSubmit={handleSubmit} 
            form={form} 
            setForm={setForm} 
            editingId={editingId} 
            categoriasDisponibles={categorias} 
        />

        <EtiquetaDetalles 
            show={showDetalles}
            handleClose={handleCloseDetalles}
            etiquetaData={tagSel}
            categoriasDisponibles={categorias}
        />
    </>
}