import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import SubcategoriaModal from './components/SubcategoriaModal'

export const Subcategorias = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [dataInTable, setDataInTable] = useState([])
    const [categorias, setCategorias] = useState([])
    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = { nombre: '', descripcion: '', sku_prefix: '', separador: '', categoria_id: '' }
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getSubcategorias()
        const cats = await window.api.getCategorias()
        setDataInTable(data)
        setCategorias(cats.filter(c => c.id !== 'general'))
        setReloadTable(prev => prev + 1)
    };

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { load() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result;
        const payload = { ...form, sku_prefix: form.sku_prefix.toUpperCase() }

        if (editingId) {
            result = await window.api.updateSubcategoria({ ...payload, id: editingId })
        } else {
            result = await window.api.addSubcategoria(payload)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Subcategoría guardada', icon: 'success', timer: 1500 })
            cleanForm()
            handleClose()
            load()
            window.dispatchEvent(new CustomEvent('subcategorias-actualizadas'))
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error')
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
            const res = await window.api.deleteSubcategoria(id)
            if (res.success) {
                load()
                window.dispatchEvent(new CustomEvent('subcategorias-actualizadas'))
            } else {
                Swal.fire('No se puede eliminar', res.error, 'error')
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
                        nombre: item.nombre || '', descripcion: item.descripcion || '',
                        sku_prefix: item.sku_prefix || '', separador: item.separador || '',
                        categoria_id: item.categoria_id || ''
                    });
                    setEditingId(item.id)
                    handleShow()
                } catch(err) { console.error("Error", err) }
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn) handleDelete(delBtn.dataset.id)
        };

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => { setEditingId(null); cleanForm(); handleShow(); }}>
                <i className="bi bi-plus-circle me-2"></i>Nueva Subcategoría
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <CustomDataTable
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    { data: 'nombre', title: 'Subcategoría' },
                    { data: 'categoria_nombre', title: 'Categoría Padre', render: (data) => `<span class="badge bg-info text-dark">${data}</span>` },
                    { 
                        data: 'sku_prefix', title: 'Prefijo SKU',
                        render: (data, type, row) => data ? `<code>${data}${row.separador || ''}</code>` : '<span class="text-muted">-</span>'
                    },
                    { data: 'cant_productos', title: 'Productos', render: (data) => `<span class="badge bg-secondary">${data || 0}</span>` },
                    {
                        data: null, title: 'Acciones', orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" title="Eliminar"><i class="bi bi-trash3"></i></button>
                            `;
                        }
                    }
                ]}
            />
        </div>

        <SubcategoriaModal
            show={show} handleClose={handleClose} handleSubmit={handleSubmit}
            form={form} setForm={setForm} editingId={editingId} categorias={categorias}
        />
    </>
}