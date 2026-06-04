import { useEffect, useRef, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button, Col, Form, FormGroup, Modal } from "react-bootstrap"
import Swal from "sweetalert2"
import { EncargoDetalles } from "./components/EncargoDetalles"
import { encargosService } from "../../services/encargosService"

export const Encargos = () => {
    const [show, setShow] = useState(false)
    const [showInfo, setShowInfo] = useState(false)

    const handleClose = () => setShow(false) || setShowInfo(false)
    const handleShow = () => setShow(true)
    const handleShowInfo = () => setShowInfo(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    const [form, setForm] = useState({
        fecha_entrega: '',
        descripcion: '',
        estado_id: ''
    })
    const [editingId, setEditingId] = useState(null)
    const [estados, setEstados] = useState([])
    const [encargoSel, setEncargoSel] = useState([])

    const tableContainerRef = useRef(null)

    const load = async () => {
        const data = await encargosService.getEncargos()
        setItems(data)
        setDataInTable(data)
    }

    const loadSelectData = async () => {
        const data = await encargosService.getEstados()
        setEstados(data)
    }

    const cleanForm = () => {
        setForm({ fecha_entrega: '', descripcion: '', estado_id: '' })
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        
        const result = await encargosService.updateEncargo({ ...form, id: editingId })

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Encargo agendado correctamente', icon: 'success', timer: 1500 })
            cleanForm()
            handleClose()
            load()
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar el producto', 'error')
        }
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
    }

    const handleInfo = (item) => {
        console.log(item)
        setEncargoSel(item)
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar el registro?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        });

        if (result.isConfirmed) {
            await encargosService.deleteEncargo(id)
            load()
        }
    }

    useEffect(() => {
        load()
        loadSelectData()
    }, [])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    setForm({
                        fecha_entrega: item.fecha_entrega || '',
                        descripcion: item.descripcion || '',
                        estado_id: item.estado_id || 'pendiente'
                    });
                    setEditingId(item.id)
                    handleShow()
                } catch (err) { console.error("Error leyendo datos", err) }
            }

            const infoBtn = e.target.closest('.btn-info')
            if (infoBtn) {
                const rawData = decodeURIComponent(infoBtn.dataset.alldata)
                const item = JSON.parse(rawData)
                handleInfo(item)
                handleShowInfo()
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return <>
        <div ref={tableContainerRef} className="w-100">
            <DataTableComponent
                tableId="dt-encargos-maestro"
                data={dataInTable}
                columns={[
                    { data: 'encargo_numero', title: 'N° encargo' },
                    { data: 'factura_numero', title: 'N° Factura' },
                    {
                        data: 'estado_titulo',
                        title: 'Estado',
                        render: (data, type, row) => {
                            let textColor = '#ffffff';
                            if (row.estado_color) {
                                const hex = row.estado_color.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                            }

                            return `
                                <span class="badge" style="background-color: ${row.estado_color}; color: ${textColor}; font-size: 13px;">
                                    <i class="${row.icon || 'bi bi-tag-fill'} me-1"></i> ${data}
                                </span>
                            `
                        }
                    },
                    { data: 'cliente_nombre', title: 'Cliente' },
                    { data: 'cliente_documento', title: 'Documento cliente' },
                    {
                        data: 'fecha_entrega',
                        title: 'Fecha de entrega',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                            ${row.fecha_entrega ? data : `<button class="btn btn-sm btn-warning me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}">
                                    Agendar
                                  </button>`}
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
                                <button class="btn btn-sm btn-info me-2 btn-info" data-id="${row.id}" data-alldata="${safeData}" title="Ver Detalles">
                                    <i class="bi bi-eye"></i>
                                </button>
                            `
                        }
                    }
                ]}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShow={handleShow}
                customRenders={{
                    date_created: (data) => new Date(data).toLocaleDateString('es-ES'),
                    date_modify: (data) => new Date(data).toLocaleDateString('es-ES')
                }}
            />
            <Modal show={show} onHide={handleClose} size="md" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Completar encargo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit} id="encargoForm">
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="fecha_entrega">Fecha</Form.Label>
                            <Form.Control
                                id="fecha_entrega"
                                value={form.fecha_entrega}
                                onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })}
                                type="date"
                                placeholder="DD/MM/AAAA"
                                required
                                autoFocus
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="descripcion">Descripción</Form.Label>
                            <Form.Control
                                id="descripcion"
                                value={form.descripcion}
                                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                as="textarea"
                                rows={3}
                                placeholder="Agregar descripción"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="estado_select">Estado</Form.Label>
                            <Form.Select 
                                id="estado_select"
                                value={form.estado_id} 
                                onChange={(e) => setForm({ ...form, estado_id: e.target.value })}
                            >
                                <option value="">Seleccione un estado...</option>
                                {estados.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" form="encargoForm">
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
            <EncargoDetalles
                show={showInfo}
                handleClose={handleClose}
                encargoData={encargoSel}
            />
        </div>
    </>
}