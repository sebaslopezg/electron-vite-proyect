import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { formatCurrency } from '../../../utils/currencies'

export const ModalAbono = ({ show, onClose, factura, onSuccess, appConfig }) => {
    const [abonoForm, setAbonoForm] = useState({
        valor: '',
        metodo_pago: 'Efectivo',
        observaciones: ''
    })
    
    useEffect(() => {
        if (factura) {
            setAbonoForm({
                valor: factura.saldo_pendiente, 
                metodo_pago: 'Efectivo',
                observaciones: 'Abono a deuda'
            })
        }
    }, [factura])

    const handleChange = (e) => {
        setAbonoForm({ ...abonoForm, [e.target.name]: e.target.value })
    }

    const handleSubmitAbono = async (e) => {
        e.preventDefault()
        const valorAbono = parseFloat(abonoForm.valor)

        if (valorAbono <= 0) return Swal.fire('Error', 'El valor a abonar debe ser mayor a 0', 'error')
        if (valorAbono > factura.saldo_pendiente) {
            return Swal.fire('Error', `El abono no puede superar la deuda actual`, 'error')
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Abono?',
            text: `Se registrará un pago de ${formatCurrency(valorAbono, appConfig.formato_numero, appConfig.moneda)} a la factura ${factura.prefijo || ''}${factura.numero_factura}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar pago',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            const payload = {
                maestro_id: factura.id,
                valor: valorAbono,
                metodo_pago: abonoForm.metodo_pago,
                observaciones: abonoForm.observaciones
            }

            const response = await window.api.addAbono(payload)
            if (response.success) {
                Swal.fire('¡Éxito!', 'Abono registrado correctamente', 'success')
                onSuccess()
                onClose()
            } else {
                Swal.fire('Error', response.error, 'error')
            }
        }
    }

    if (!factura) return null;

    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="fs-5">
                    <i className="bi bi-cash-coin me-2"></i>Registrar Abono
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmitAbono}>
                <Modal.Body>
                    <div className="alert alert-warning mb-4 border-warning">
                        <h6 className="fw-bold mb-1">Cliente: {factura.nombre_cliente}</h6>
                        <div>Factura: {factura.prefijo || ''}{factura.numero_factura}</div>
                        <hr className="my-2 border-warning" />
                        <div className="fs-5 mt-2 text-danger">
                            Deuda Actual: <strong>{formatCurrency(factura.saldo_pendiente, appConfig.formato_numero, appConfig.moneda)}</strong>
                        </div>
                    </div>

                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Monto a Recibir</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    size="lg"
                                    className="text-end fw-bold text-success fs-4 bg-light"
                                    name="valor" 
                                    min="1"
                                    max={factura.saldo_pendiente}
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
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="success" type="submit" className="fw-bold px-4">
                        Guardar Pago
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}