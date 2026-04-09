import { useEffect, useState } from 'react';
import DataTableComponent from '../../components/DataTableComponent'
import ProductModal from '../../components/ProductoModal';

export const Servicios = () => {
    const [dataInTable, setDataInTable] = useState([])
    const [show, setShow] = useState(false);
    const [items, setItems] = useState([])

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const emptyForm = {
        ref_name: '',
        sku: '',
        stock: 0,
        unidad_medida: '',
        iva: 0,
        allow_negative: '',
        descripcion: '',
        precio: 0,
        status: 1,
        tipo: '',
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getServicios()
        setItems(data)
        setDataInTable(data)
    };

    useEffect(() => { load() }, [])

    const handleEdit = (item) => {
        setForm({
            ref_name: item.ref_name,
            sku: item.sku,
            stock: item.stock,
            unidad_medida: item.unidad_medida,
            iva: item.iva,
            allow_negative: item.allow_negative,
            descripcion: item.descripcion,
            precio: item.precio,
            status: item.status,
            tipo: item.tipo
        })
        setEditingId(item.id)
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
            load()
        }
    }

    const handleSubmit = async (e) => {

        e.preventDefault()
        if (editingId) {
            await window.api.updateProducto({ ...form, id: editingId })
            setEditingId(null)
        } else {
            await window.api.addProducto(form)
        }
        cleanForm()
        handleClose()
        load()
    }

    return (<>
        <DataTableComponent
            data={dataInTable}
            columns={[
                { data: 'ref_name', title: 'Nombre Referencia' },
                { data: 'sku', title: 'SKU' },
                { data: 'status', title: 'Estado' },
                { data: 'date_created', title: 'Fecha Creación' },
                { data: 'date_modify', title: 'Fecha Modificación' },
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
            customRenders={{
                status: (data, type, row) => {
                    const badgeClass = data === 1 ? 'bg-success' : 'bg-danger';
                    const statusName = data === 1 ? 'Activo' : 'Inactivo'
                    return `<span class="badge ${badgeClass}">${statusName}</span>`;
                },
                date_created: (data, type, row) => {
                    return new Date(data).toLocaleDateString('es-ES');
                },
                date_modify: (data, type, row) => {
                    return new Date(data).toLocaleDateString('es-ES');
                },
                sku: (data, type, row) => {
                    return `<strong>${data.toUpperCase()}</strong>`;
                }
            }}
        />
        <ProductModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
        />
    </>)
}