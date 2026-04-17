import { useEffect, useRef, useState } from "react"
import CustomDataTable from "../../components/DataTableComponent"
import { Button, Col, Form, Modal, Row } from "react-bootstrap"
import Swal from "sweetalert2"

export const Estados = () => {
    const [show, setShow] = useState(false)
    const [reloadTable, setReloadTable] = useState(0)

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        titulo: '',
        descripcion: '',
        color: '',
        allow_calendar: ''
    })
    const [editingId, setEditingId] = useState(null)

    const loadData = async () => {
        const data = await window.api.getEstados()
        setItems(data)
        setDataInTable(data)
    }

    const cleanForm = () => setForm({
        titulo: '',
        descripcion: '',
        color: '',
        allow_calendar: ''
    })

    useEffect(() => { loadData() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        let result;
        if (editingId) {
            result = await window.api.updateEstado({ ...form, id: editingId })
        } else {
            result = await window.api.addEstado(form)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Estado guardado', icon: 'success', timer: 1500 });
            cleanForm()
            handleClose()
            loadData()
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error');
        }
        cleanForm()
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar Estado?",
            text: "Todos los encargos que tengan este estado asignado quedarán con estado nulo.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await window.api.deleteEstado(id)
            if (res.success) {
                loadData()
            }
        }
    }

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
                        titulo: item.titulo || '',
                        descripcion: item.descripcion || '',
                        color: item.color || '#0d6efd',
                        allow_calendar: item.allow_calendar
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

    const tableContainerRef = useRef(null);

    return (<>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                Nuevo Estado
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <CustomDataTable
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    {
                        data: 'titulo',
                        title: 'Título',
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
                        data: 'allow_calendar',
                        title: 'Mostrar en calendario',
                        render: (data, type, row) => {
                            return `${data > '0' ? 'Si' : 'No'}`
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
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" title="Eliminar">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `;
                        }
                    }
                ]}
            />
        </div>

        <Modal show={show} onHide={handleClose} size="md" centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Estado' : 'Nuevo Estado'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="estadoForm">
                    <Row>
                        <Col md={9}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre del estado <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={form.titulo}
                                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                    type="text"
                                    required
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Color</Form.Label>
                                <Form.Control
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    title="Elige un color"
                                    className="w-100 form-control-color"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Col md={6} className="d-flex align-items-center">
                            <Form.Check
                                type="switch"
                                label="Mostrar en calendario"
                                checked={form.allow_calendar === 1 || form.allow_calendar === true}
                                onChange={(e) => setForm({ ...form, allow_calendar: e.target.checked ? 1 : 0 })}
                            />
                        </Col>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
                <Button variant="primary" type="submit" form="etiquetaForm" onClick={handleSubmit}>Guardar</Button>
            </Modal.Footer>
        </Modal>
    </>)
}