import { useEffect, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"

export const Encargos = () => {
    const [show, setShow] = useState(false)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        documento: '',
        nombre: '',
        telefono: '',
        direccion: ''
    })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getEncargos()
        console.log(data);

        setItems(data)
        setDataInTable(data)
    }

    const cleanForm = () => {
        setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            if (editingId) {
                await window.api.updateCliente({ ...form, id: editingId })
                Swal.fire("Actualizado", "Cliente actualizado exitosamente", "success")
                setEditingId(null)
            } else {
                await window.api.addCliente(form)
                Swal.fire("Guardado", "Cliente creado exitosamente", "success")
            }

            setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
            handleClose()
            load()
        } catch (error) {
            console.error('Error al guardar el cliente:', error)
            Swal.fire({
                title: "Error",
                text: `Error al guardar el cliente. Verifique que el Documento de identidad no exista ya. ${error.message || ''}`,
                icon: "error"
            })
        }
    }

    const handleEdit = (item) => {
        setForm({
            documento: item.documento,
            nombre: item.nombre,
            telefono: item.telefono,
            direccion: item.direccion
        })
        setEditingId(item.id)
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar el registro?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        });

        if (result.isConfirmed) {
            await window.api.deleteBitacora(id)
            load()
        }
    }

    useEffect(() => {
        load()
    }, [])

    return (<>
        <div className="pagetitle">
            <h1>Encargos</h1>
        </div>
        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">
                <DataTableComponent
                    data={dataInTable}
                    columns={[
                        { data: 'numero_encargo', title: 'N° encargo' },
                        {
                            data: null,
                            title: 'N° Factura',
                            render: (data, type, row) => `${row.prefijo || ''}${row.numero_factura}`
                        },
                        { data: 'estado_encargo', title: 'Estado' },
                        { data: 'nombre_cliente', title: 'Cliente' },
                        { data: 'documento_cliente', title: 'Documento cliente' },
                        {
                            data: 'fecha_entrega',
                            title: 'Fecha de entrega',
                            orderable: false,
                            render: function (data, type, row) {
                                return `
                                <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
                                    Agendar
                                  </button>
                                `
                            }
                        },
                        {
                            data: null,
                            title: 'Actions',
                            orderable: false,
                            render: function (data, type, row) {
                                return `
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
                        date_created: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES');
                        },
                        // Only show date_modify if needed, else remove
                        date_modify: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES');
                        }
                    }}
                />
            </div>
        </div>
    </>)
}