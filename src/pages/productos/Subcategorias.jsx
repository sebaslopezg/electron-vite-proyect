import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import SubcategoriaModal from './components/SubcategoriaModal'
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

export const Subcategorias = () => {
    const [show, setShow] = useState(false)
    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

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

    const load = async () => {
        const data = await productosService.getSubcategorias()
        const cats = await productosService.getCategorias()
        setDataInTable(data)
        setCategorias(cats.filter(c => c.id !== 'general'))
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
                try {
                    const item = JSON.parse(decodeURIComponent(editBtn.dataset.alldata))
                    setForm({
                        nombre: item.nombre || '', 
                        descripcion: item.descripcion || '',
                        sku_prefix: item.sku_prefix || '', 
                        separador: item.separador || '',
                        categorias_ids: item.categorias_ids ? item.categorias_ids.split(',') : []
                    })
                    setEditingId(item.id)
                    handleShow()
                } catch(err) { console.error("Error", err) }
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn) handleDelete(delBtn.dataset.id)
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => { 
                    setEditingId(null)
                    cleanForm()
                    handleShow()
                }}>
                <i className="bi bi-plus-circle me-2"></i>Nueva Subcategoría
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <CustomDataTable
                tableId="dt-productos-subcategorias"
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    { data: 'nombre', title: 'Subcategoría' },
                    {
                        data: 'categoria_nombre', 
                        title: 'Categorías Vinculadas', 
                        render: (data) => data ? data.split(' • ').map(c => `<span class="badge bg-secondary text-light me-1 mb-1">${c}</span>`).join('') : '<span class="text-muted small">Ninguna</span>' 
                    },
                    { 
                        data: 'sku_prefix', title: 'Prefijo SKU',
                        render: (data, type, row) => data ? `<code>${data}${row.separador || ''}</code>` : '<span class="text-muted">-</span>'
                    },
                    { data: 'cant_productos', title: 'Productos', render: (data) => `<span class="badge bg-secondary">${data || 0}</span>` },
                    {
                        data: null, title: 'Acciones', orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row))
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" title="Eliminar">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `
                        }
                    }
                ]}
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
    </>
}