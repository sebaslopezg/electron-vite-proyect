import { useEffect, useRef, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button, Col, Form, FormGroup, Modal } from "react-bootstrap"
import Swal from "sweetalert2"

export const Encargos = () => {
    const [show, setShow] = useState(false)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        fecha_entrega: '',
        descripcion: '',
        id_estado: ''
    })
    const [editingId, setEditingId] = useState(null)
    const [estados, setEstados] = useState([])

    const tableContainerRef = useRef(null);

    const load = async () => {
        const data = await window.api.getEncargos()
        setItems(data)
        setDataInTable(data)
    }

    const loadSelectData = async () => {
        const data = await window.api.getEstados()
        console.log(data);

        setEstados(data)
    }

    const cleanForm = () => {
        setForm({ fecha_entrega: '', descripcion: '', id_estado: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log(form);

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
        loadSelectData()
    }, [])

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
                        fecha_entrega: item.fecha_entrega,
                        descripcion: item.descripcion,
                        id_estado: item.id_estado || 'pendiente'
                    });
                    setEditingId(item.id);
                    handleShow();
                } catch (err) { console.error("Error leyendo datos", err); }
            }

            const delBtn = e.target.closest('.btn-delete');
            if (delBtn) handleDelete(delBtn.dataset.id);
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    return (<>
        <div ref={tableContainerRef} className="w-100">
            <DataTableComponent
                data={dataInTable}
                columns={[
                    { data: 'numero_encargo', title: 'N° encargo' },
                    {
                        data: null,
                        title: 'N° Factura',
                        render: (data, type, row) => `${row.prefijo || ''}${row.numero_factura}`
                    },
                    { data: 'titulo', title: 'Estado' },
                    { data: 'nombre_cliente', title: 'Cliente' },
                    { data: 'documento_cliente', title: 'Documento cliente' },
                    {
                        data: 'fecha_entrega',
                        title: 'Fecha de entrega',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-warning me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}">
                                    Agendar
                                  </button>
                                `
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
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
                        <FormGroup>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Estado</Form.Label>
                                    <Form.Select value={form.id_estado} onChange={(e) => setForm({ ...form, id_estado: e.target.value })}>
                                        {estados.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
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