import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import CategoriaModal from './components/CategoriaModal'

export const Categorias = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [dataInTable, setDataInTable] = useState([])
    const [reloadTable, setReloadTable] = useState(0)

    const emptyForm = {
        nombre: '',
        descripcion: '',
        sku_prefix: '',
        separador: ''
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getCategorias()
        setDataInTable(data)
        setReloadTable(prev => prev + 1)
    };

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { load() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result;
        const payload = { ...form, sku_prefix: form.sku_prefix.toUpperCase() }

        if (editingId) {
            result = await window.api.updateCategoria({ ...payload, id: editingId })
        } else {
            result = await window.api.addCategoria(payload)
        }

        if (result && result.success) {
            Swal.fire({
                title: '¡Éxito!',
                text: 'Categoría guardada',
                icon: 'success',
                timer: 1500
            });
            cleanForm()
            handleClose()
            load()
            
            window.dispatchEvent(new CustomEvent('categorias-actualizadas'));
            
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error');
        }
    }

    const handleDelete = async (id) => {
        if (id === 'general') {
            return Swal.fire('Acción denegada', 'La categoría General no se puede eliminar.', 'info');
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
            const res = await window.api.deleteCategoria(id)
            if (res.success) {
                load()
                window.dispatchEvent(new CustomEvent('categorias-actualizadas'));
            } else {
                Swal.fire('No se puede eliminar', res.error, 'error')
            }
        }
    }

    const tableContainerRef = useRef(null);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata);
                    const item = JSON.parse(rawData);
                    
                    setForm({
                        nombre: item.nombre || '',
                        descripcion: item.descripcion || '',
                        sku_prefix: item.sku_prefix || '',
                        separador: item.separador || ''
                    });
                    setEditingId(item.id);
                    handleShow();
                } catch(err) { console.error("Error leyendo datos", err); }
            }
            
            const delBtn = e.target.closest('.btn-delete');
            if (delBtn) handleDelete(delBtn.dataset.id);
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                <i className="bi bi-plus-circle me-2"></i>Nueva Categoría
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <CustomDataTable
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    { data: 'nombre', title: 'Categoría' },
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
                        render: (data) => `<span class="badge bg-secondary">${data || 0}</span>`
                    },
                    {
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        render: function (data, type, row) {
                            const isGeneral = row.id === 'general';
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" ${isGeneral ? 'disabled' : ''} title="Eliminar">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `;
                        }
                    }
                ]}
            />
        </div>

        <CategoriaModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
        />
    </>
}