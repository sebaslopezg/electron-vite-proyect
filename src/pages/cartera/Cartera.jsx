import { useState, useEffect, useRef } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'

export const Cartera = () => {
    const [carteraData, setCarteraData] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    
    const [abonoForm, setAbonoForm] = useState({
        valor: '',
        metodo_pago: 'Efectivo',
        observaciones: ''
    })

    const loadCartera = async () => {
        const data = await window.api.getCartera()
        setCarteraData(data || [])
    }

    useEffect(() => {
        loadCartera()
    }, [])

    const handleOpenModal = (factura) => {
        setFacturaSeleccionada(factura)
        setAbonoForm({
            valor: factura.saldo_pendiente, 
            metodo_pago: 'Efectivo',
            observaciones: 'Abono a deuda'
        })
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFacturaSeleccionada(null)
    }

    const handleChange = (e) => {
        setAbonoForm({ ...abonoForm, [e.target.name]: e.target.value })
    }

    const handleSubmitAbono = async (e) => {
        e.preventDefault()
        const valorAbono = parseFloat(abonoForm.valor)

        if (valorAbono <= 0) {
            return Swal.fire('Error', 'El valor a abonar debe ser mayor a 0', 'error')
        }
        if (valorAbono > facturaSeleccionada.saldo_pendiente) {
            return Swal.fire('Error', `El abono no puede superar la deuda actual ($${facturaSeleccionada.saldo_pendiente.toLocaleString('es-CO')})`, 'error')
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Abono?',
            text: `Se registrará un pago de $${valorAbono.toLocaleString('es-CO')} a la factura ${facturaSeleccionada.prefijo || ''}${facturaSeleccionada.numero_factura}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar pago',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            const payload = {
                maestro_id: facturaSeleccionada.id,
                valor: valorAbono,
                metodo_pago: abonoForm.metodo_pago,
                observaciones: abonoForm.observaciones
            }

            const response = await window.api.addAbono(payload)
            if (response.success) {
                Swal.fire('¡Éxito!', 'Abono registrado correctamente', 'success')
                handleCloseModal()
                loadCartera() 
            } else {
                Swal.fire('Error', response.error, 'error')
            }
        }
    }

    const tableContainerRef = useRef(null);
    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-pay-item');
            if (!btn) return;
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata));
                handleOpenModal(item);
            } catch(err) { console.error(err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, [carteraData]);

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary fw-bold"><i className="bi bi-wallet2 me-2"></i>Cuentas por Cobrar (Cartera)</h2>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-danger border-opacity-25 mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="text-secondary mb-1">Total Pendiente de Cobro</h5>
                    <p className="text-muted mb-0 small">Dinero en la calle por facturas a crédito</p>
                </div>
                <div className="fs-1 fw-bold text-danger">
                    ${carteraData.reduce((acc, curr) => acc + (curr.saldo_pendiente || 0), 0).toLocaleString('es-CO')}
                </div>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border">
                <div ref={tableContainerRef} className="w-100 overflow-hidden">
                    <DataTableComponent 
                        data={carteraData}
                        columns={[
                            { 
                                data: null, title: 'N° Factura',
                                render: (data, type, row) => `<strong>${row.prefijo || ''}${row.numero_factura}</strong>`
                            },
                            { data: 'nombre_cliente', title: 'Cliente' },
                            { data: 'documento_cliente', title: 'Doc / NIT' },
                            { 
                                data: 'date_created', title: 'Fecha Venta',
                                render: (data) => new Date(data).toLocaleDateString('es-CO')
                            },
                            { 
                                data: 'total_factura', title: 'Total Venta',
                                render: (data) => `$${parseFloat(data).toLocaleString('es-CO')}`
                            },
                            { 
                                data: 'saldo_pendiente', title: 'Deuda Pendiente',
                                render: (data) => `<strong class="text-danger fs-6">$${parseFloat(data).toLocaleString('es-CO')}</strong>`
                            },
                            {
                                data: null, title: 'Acciones', orderable: false,
                                render: function (data, type, row) {
                                    const safeData = encodeURIComponent(JSON.stringify(row));
                                    return `
                                        <button class="btn btn-sm btn-success text-white btn-pay-item" data-alldata="${safeData}" title="Registrar Pago">
                                            <i class="bi bi-cash-coin me-1"></i> Recibir Pago
                                        </button>
                                    `;
                                }
                            }
                        ]}
                    />
                </div>
            </div>

            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title className="fs-5">
                        <i className="bi bi-cash-coin me-2"></i>Registrar Abono
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitAbono}>
                    <Modal.Body>
                        {facturaSeleccionada && (
                            <>
                                <div className="alert alert-warning mb-4 border-warning">
                                    <h6 className="fw-bold mb-1">Cliente: {facturaSeleccionada.nombre_cliente}</h6>
                                    <div>Factura: {facturaSeleccionada.prefijo || ''}{facturaSeleccionada.numero_factura}</div>
                                    <hr className="my-2 border-warning" />
                                    <div className="fs-5 mt-2 text-danger">
                                        Deuda Actual: <strong>${facturaSeleccionada.saldo_pendiente.toLocaleString('es-CO')}</strong>
                                    </div>
                                </div>

                                <Row className="g-3">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Monto a Recibir ($)</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                size="lg"
                                                className="text-end fw-bold text-success fs-4 bg-light"
                                                name="valor" 
                                                min="1"
                                                max={facturaSeleccionada.saldo_pendiente}
                                                step="0.01"
                                                value={abonoForm.valor} 
                                                onChange={handleChange}
                                                required 
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Método de Pago</Form.Label>
                                            <Form.Select name="metodo_pago" value={abonoForm.metodo_pago} onChange={handleChange}>
                                                <option value="Efectivo">Efectivo</option>
                                                <option value="Transferencia">Transferencia Bancaria</option>
                                                <option value="Tarjeta">Tarjeta (Datafono)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Observaciones</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                name="observaciones" 
                                                value={abonoForm.observaciones} 
                                                onChange={handleChange} 
                                                placeholder="Ej. Transferencia Bancolombia #1234"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline-secondary" onClick={handleCloseModal}>Cancelar</Button>
                        <Button variant="success" type="submit" className="fw-bold px-4">
                            Guardar Pago
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    )
}