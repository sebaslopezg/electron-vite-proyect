import { useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import EtiquetaModal from '../../components/EtiquetaModal'

export const Etiquetas = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

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

    const loadData = useCallback(async () => {
        const [tagsData, catsData] = await Promise.all([
            window.api.getEtiquetas(),
            window.api.getCategorias()
        ]);
        setDataInTable(tagsData || [])
        setCategorias(catsData || [])
        setReloadTable(prev => prev + 1)
    }, []);

    const cleanForm = () => setForm({ ...emptyForm })

    useEffect(() => { loadData() }, [loadData])
    useEffect(() => {
        const handleCategoriasActualizadas = () => loadData();
        window.addEventListener('categorias-actualizadas', handleCategoriasActualizadas);
        return () => window.removeEventListener('categorias-actualizadas', handleCategoriasActualizadas);
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
            
            window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'));
            
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error');
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
            const res = await window.api.deleteEtiqueta(id)
            if (res.success) {
                loadData()
                window.dispatchEvent(new CustomEvent('etiquetas-actualizadas'));
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
                    
                    const categoriasArray = item.categorias_ids ? item.categorias_ids.split(',') : ['general'];

                    setForm({
                        nombre: item.nombre || '',
                        descripcion: item.descripcion || '',
                        color: item.color || '#0d6efd',
                        categorias: categoriasArray
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
                <i className="bi bi-tags me-2"></i>Nueva Etiqueta
            </button>
        </div>

        <div className="table-responsive" ref={tableContainerRef}>
            <CustomDataTable
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    { 
                        data: 'nombre', 
                        title: 'Etiqueta',
                        render: (data, type, row) => {
                            let textColor = '#ffffff';
                            if (row.color) {
                                const hex = row.color.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                            }
                            
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
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" title="Eliminar">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `;
                        }
                    }
                ]}
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
    </>
}