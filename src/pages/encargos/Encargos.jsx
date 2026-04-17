import { useEffect, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button, Form, FormGroup, Modal } from "react-bootstrap"
import Swal from "sweetalert2"

export const Encargos = () => {
    const [show, setShow] = useState(false)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        fecha_entrega: '',
        estado_encargo: '',
        descripcion: ''
    })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getEncargosPendientes()
        setItems(data)
        setDataInTable(data)
    }

    const cleanForm = () => {
        setForm({ fecha_entrega: '', estado_encargo: '', descripcion: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const result = await window.api.updateEncargo({ ...form, id: editingId })

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Encargo agendado correctamente', icon: 'success', timer: 1500 });
            cleanForm()
            handleClose()
            load()
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar el producto', 'error');
        }
    }

    const handleEdit = (item) => {
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
            await window.api.deleteEncargo(id)
            load()
        }
    }

    useEffect(() => {
        load()
    }, [])

    return (<>
        <div className="w-100">
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
            <Modal show={show} onHide={handleClose} size="md" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Completar encargo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={(e) => {
                        e.preventDefault()
                        handleSave()
                    }}>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="cantidad">Fecha</Form.Label>
                            <Form.Control
                                id="fecha_entrega"
                                value={form.fecha_entrega}
                                onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value, estado_encargo: 'agendado' })}
                                type="date"
                                placeholder="DD/MM/AAAA"
                                required
                                autoFocus
                            />
                        </Form.Group>
                        <FormGroup>
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                id="descripcion"
                                value={form.descripcion}
                                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                as="textarea"
                                rows={3}
                                placeholder="Agregar descripción"
                                required
                                autoFocus
                            />
                        </FormGroup>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    </>)
}