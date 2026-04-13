import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import EtiquetaModal from '../../components/EtiquetaModal'

export const Etiquetas = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [dataInTable, setDataInTable] = useState([])
    const [categorias, setCategorias] = useState([])

    const emptyForm = {
        nombre: '',
        descripcion: '',
        color: '#0d6efd', 
        categorias: ['general'] 
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)

    // Usamos useCallback para que el useEffect no de advertencias
    const loadData = useCallback(async () => {
        const [tagsData, catsData] = await Promise.all([
            window.api.getEtiquetas(),
            window.api.getCategorias()
        ]);
        setDataInTable(tagsData || [])
        setCategorias(catsData || [])
    }, []);

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { loadData() }, [loadData])

    // NUEVO EFECTO: Escuchar si las categorías cambian en la otra pestaña
    useEffect(() => {
        const handleCategoriasActualizadas = () => {
            loadData(); // Recargamos las etiquetas y categorías silenciosamente
        };
        window.addEventListener('categorias-actualizadas', handleCategoriasActualizadas);
        
        return () => {
            window.removeEventListener('categorias-actualizadas', handleCategoriasActualizadas);
        }
    }, [loadData])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let result;
        if (editingId) {
            result = await window.api.updateEtiqueta({ ...form, id: editingId })
        } else {
            result = await window.api.addEtiqueta(form)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Etiqueta guardada', icon: 'success', timer: 1500 });
            cleanForm()
            handleClose()
            loadData()
            
            // NUEVO: Avisar a la pestaña de Productos que las etiquetas cambiaron
            window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'));
            
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error');
        }
    }

    const handleEdit = (item) => {
        const categoriasArray = item.categorias_ids ? item.categorias_ids.split(',') : ['general'];

        setForm({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            color: item.color || '#0d6efd',
            categorias: categoriasArray
        })
        setEditingId(item.id)
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
            const res = await window.api.deleteEtiqueta(id)
            if (res.success) {
                loadData()
                // NUEVO: Avisar a la pestaña de Productos
                window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'));
            }
        }
    }

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                <i className="bi bi-tags me-2"></i>Nueva Etiqueta
            </button>
        </div>

        <DataTableComponent
            data={dataInTable}
            columns={[
                { 
                    data: 'nombre', 
                    title: 'Etiqueta',
                    render: (data, type, row) => {
                        // --- AÑADIMOS LA LÓGICA AQUÍ TAMBIÉN ---
                        let textColor = '#ffffff';
                        if (row.color) {
                            const hex = row.color.replace('#', '');
                            const r = parseInt(hex.substr(0, 2), 16);
                            const g = parseInt(hex.substr(2, 2), 16);
                            const b = parseInt(hex.substr(4, 2), 16);
                            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                            textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                        }
                        // ----------------------------------------
                        
                        return `
                            <span class="badge" style="background-color: ${row.color}; color: ${textColor}; font-size: 13px;">
                                <i class="bi bi-tag-fill me-1"></i> ${data}
                            </span>
                        `;
                    }
                },
                { data: 'descripcion', title: 'Descripción' },
                { 
                    data: 'categorias_nombres', 
                    title: 'Categorías Visibles',
                    render: (data) => data ? `<small class="text-muted">${data}</small>` : '-'
                },
                {
                    data: null,
                    title: 'Actions',
                    orderable: false,
                    render: function (data, type, row) {
                        return `
                            <button class="btn btn-sm btn-secondary me-2 btn-edit-${row.id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete-${row.id}">
                                <i class="bi bi-trash3"></i>
                            </button>
                        `;
                    }
                }
            ]}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShow={handleShow}
        />

        <EtiquetaModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
            categoriasDisponibles={categorias}
        />
    </>
}