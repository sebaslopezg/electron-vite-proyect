import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import ProductModal from '../../components/ProductoModal';
import { formatCurrency } from '../../utils/currencies';

export const Servicios = () => {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

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
        etiquetas: []
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [categorias, setCategorias] = useState([])
    const [etiquetas, setEtiquetas] = useState([])

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const loadConfig = async () => {
        const configData = await window.api.getConfiguracion();
        const confAppRaw = configData.find(c => c.key === 'confApp');
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value);
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                });
            } catch(e) {}
        }
    };

    const renderCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda);
    };

    useEffect(() => {
        const loadExtras = async () => {
            const [cats, tags] = await Promise.all([
                window.api.getCategorias(),
                window.api.getEtiquetas()
            ]);
            setCategorias(cats || []);
            setEtiquetas(tags || []);
        }
        loadExtras();
        loadConfig();
        
        window.addEventListener('config-actualizada', loadConfig);
        return () => window.removeEventListener('config-actualizada', loadConfig);
    }, []);

    const cleanForm = () => setForm({ ...emptyForm })

    const handleSubmit = async (e) => {
        e.preventDefault()
        let result;
        if (editingId) {
            result = await window.api.updateProducto({ ...form, id: editingId })
        } else {
            result = await window.api.addProducto(form)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Servicio guardado correctamente', icon: 'success', timer: 1500 });
            cleanForm()
            handleClose()
            setReloadTable(prev => prev + 1)
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar el servicio', 'error');
        }
    }

    const handleEdit = (id) => {
        handleShow(); 
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar el registro?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        })

        if (result.isConfirmed) {
            await window.api.deleteProducto(id)
            setReloadTable(prev => prev + 1)
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
                    const tagsArray = item.etiquetas_ids ? item.etiquetas_ids.split(',').filter(id => id) : [];
                    
                    setForm({
                        ref_name: item.ref_name || '', sku: item.sku || '', stock: item.stock || 0,
                        unidad_medida: item.unidad_medida || 'Unidad', iva: item.iva || 0,
                        allow_negative: item.allow_negative || 0, descripcion: item.descripcion || '',
                        precio: item.precio || 0, status: item.status || 1, tipo: item.tipo || 'servicio',
                        categoria_id: item.categoria_id || 'general', etiquetas: tagsArray
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

    return (<>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                <i className="bi bi-plus-circle me-2"></i>Nuevo Servicio
            </button>
        </div>

        <div ref={tableContainerRef}>
            <CustomDataTable
                key={`servicios-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}`}
                reloadKey={reloadTable}
                ajaxData={(params) => window.api.getServiciosPaginados(params)}
                columns={[
                    { data: 'ref_name', title: 'Nombre Referencia' },
                    { 
                        data: 'sku', 
                        title: 'SKU', 
                        render: (data, type, row) => {
                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                            return data ? `<strong>${prefix}${data.toUpperCase()}</strong>` : '-';
                        } 
                    },
                    { data: 'status', title: 'Estado', render: (data) => `<span class="badge ${data === 1 ? 'bg-success' : 'bg-danger'}">${data === 1 ? 'Activo' : 'Inactivo'}</span>` },
                    { 
                        data: 'precio', 
                        title: 'Precio', 
                        render: (data) => renderCurrency(data) 
                    },
                    { data: 'date_created', title: 'Fecha Creación', render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero) },
                    { data: 'date_modify', title: 'Fecha Modificación', render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero) },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                            <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}">
                            <i class="bi bi-trash3"></i>
                            </button>
                            `;
                        }
                    }
                ]}
            />
        </div>
        
        <ProductModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
            categorias={categorias}
            etiquetas={etiquetas}
        />
    </>)
}