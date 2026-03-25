import DataTable from "datatables.net-bs5";
import DT from 'datatables.net-bs5'
import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'
import DataTableComponent from '../components/DataTableComponent'

DataTable.use(DT)

export const Bitacoras = () => {
    const [show, setShow] = useState(false)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    //connect to DB
    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        titulo: '',
        descripcion: '',
        fecha: '',
    })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getBitacoras()
        setItems(data)
        setDataInTable(data)
    }

    const cleanForm = () => {
        setForm({ titulo: '', descripcion: '', fecha: '' })
    }

    useEffect(() => { load() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            if (editingId) {
                await window.api.updateBitacora({ ...form, id: editingId })
                Swal.fire("Actualizado", "Bitacora actualizada exitosamente", "success")
                setEditingId(null)
            } else {
                console.log(form);

                await window.api.addBitacora(form)
                Swal.fire("Guardado", "Bitacora creada exitosamente", "success")
            }

            setForm({ titulo: '', descripcion: '', fecha: '' })
            handleClose()
            load()
        } catch (error) {
            console.error('Error al guardar la bitacora:', error)
            Swal.fire({
                title: "Error",
                text: `Error al guardar la bitacora. Verifique que el Documento de identidad no exista ya. ${error.message || ''}`,
                icon: "error"
            })
        }
    }

    const handleEdit = (item) => {
        setForm({
            titulo: item.titulo,
            descripcion: item.descripcion,
            fecha: item.fecha
        })
        setEditingId(item.id)
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar la bitacora?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        });

        if (result.isConfirmed) {
            await window.api.deleteBitacora(id)
            load()
        }
    }
    return <>

        <div className="pagetitle">
            <h1>Bitacoras</h1>
        </div>

        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">

                <div className="row">
                    <div className="row">
                        <div className="col">
                            <button className='btn btn-primary' onClick={(e) => {
                                setEditingId(null)
                                cleanForm()
                                handleShow()
                            }}>Nuevo</button>
                        </div>
                    </div>
                </div>

                <DataTableComponent
                    data={dataInTable}
                    columns={[
                        { data: 'fecha', title: 'Fecha' },
                        { data: 'titulo', title: 'Título' },
                        { data: 'descripcion', title: 'Descripción' },
                        { data: 'date_created', title: 'Fecha Creación' },
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

        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Bitácora' : 'Crear Bitácora'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="fecha">Fecha</Form.Label>
                        <Form.Control
                            id='fecha'
                            value={form.fecha}
                            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                            type="date"
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor='titulo'>Título</Form.Label>
                        <Form.Control
                            id='titulo'
                            value={form.titulo}
                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                            type="text"
                            placeholder="Título de la bitácora"
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor='descripcion'>Descripción</Form.Label>
                        <Form.Control
                            id='descripcion'
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            type="text"
                            placeholder="Descripción de la bitácora"
                            required
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    {editingId ? 'Actualizar' : 'Guardar'}
                </Button>

            </Modal.Footer>
        </Modal>
    </>
}