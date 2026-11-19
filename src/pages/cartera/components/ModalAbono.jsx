import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form, InputGroup } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { formatCurrency, getCurrencySymbol } from '../../../utils/currencies'
import { carteraService } from '../../../services/carteraService'
import { ventasService } from '../../../services/ventasService'

export const ModalAbono = ({ show, onClose, factura, onSuccess, appConfig, currentUser }) => {
    const [paymentMethods, setPaymentMethods] = useState([])
    const [availableCredit, setAvailableCredit] = useState(0)
    const [useCreditBalance, setUseCreditBalance] = useState(false)
    const [creditAmountInput, setCreditAmountInput] = useState('')

    const [paymentForm, setPaymentForm] = useState({
        valor: '',
        metodo_pago: 'Efectivo',
        observaciones: ''
    })

    const formatMoney = (val) => formatCurrency(val || 0, appConfig.formato_numero, appConfig.moneda)

    useEffect(() => {
        const loadMethods = async () => {
            const methods = await ventasService.getMetodosPago()
            setPaymentMethods(methods || [])
        }
        loadMethods()
    }, [])

    useEffect(() => {
        let isMounted = true

        const initModalState = async () => {
            if (!show || !factura) return

            setUseCreditBalance(false)
            setCreditAmountInput('')
            setPaymentForm({
                valor: factura.saldo_pendiente,
                metodo_pago: paymentMethods.length > 0 ? paymentMethods[0].nombre : 'Efectivo',
                observaciones: ''
            })

            let freshCredit = Number(factura.cliente_saldo_favor) || 0

            if (factura.documento_cliente && window.api?.getClienteSaldo) {
                try {
                    const res = await window.api.getClienteSaldo({ documento: factura.documento_cliente })
                    if (res?.success && res.data) {
                        freshCredit = Number(res.data.saldo_favor) || 0
                    }
                } catch (err) {
                    console.error('Error fetching fresh client credit balance', err)
                }
            }

            if (isMounted) {
                setAvailableCredit(freshCredit)
            }
        }

        initModalState()
        return () => { isMounted = false }
    }, [show, factura, paymentMethods])

    if (!factura) return null

    const invoiceDebt = Math.max(0, Number(factura.saldo_pendiente) || 0)
    const maxUsableCredit = Math.min(availableCredit, invoiceDebt)
    const parsedCredit = parseFloat(creditAmountInput) || 0
    const effectiveCreditUsed = useCreditBalance
        ? Math.min(Math.max(0, parsedCredit), maxUsableCredit)
        : 0
    const remainingCreditAfter = Math.max(0, availableCredit - effectiveCreditUsed)
    const remainingDebtAfterCredit = Math.max(0, invoiceDebt - effectiveCreditUsed)

    const otherPaymentAmount = remainingDebtAfterCredit > 0
        ? Math.max(0, parseFloat(paymentForm.valor) || 0)
        : 0
    const totalPaymentAmount = effectiveCreditUsed + otherPaymentAmount
    const projectedInvoiceDebt = Math.max(0, invoiceDebt - totalPaymentAmount)

    const handleToggleCredit = (checked) => {
        setUseCreditBalance(checked)
        if (checked) {
            const defaultCredit = maxUsableCredit
            setCreditAmountInput(defaultCredit > 0 ? String(defaultCredit) : '0')
            const remaining = Math.max(0, invoiceDebt - defaultCredit)
            setPaymentForm(prev => ({ ...prev, valor: remaining > 0 ? remaining : 0 }))
        } else {
            setCreditAmountInput('')
            setPaymentForm(prev => ({ ...prev, valor: invoiceDebt }))
        }
    }

    const handleCreditChange = (rawVal) => {
        if (rawVal === '') {
            setCreditAmountInput('')
            return
        }
        const numericVal = parseFloat(rawVal)
        if (isNaN(numericVal) || numericVal < 0) return

        const clampedVal = Math.min(numericVal, maxUsableCredit)
        setCreditAmountInput(clampedVal === numericVal ? rawVal : String(clampedVal))

        const maxOther = Math.max(0, invoiceDebt - clampedVal)
        setPaymentForm(prev => {
            const currentOther = parseFloat(prev.valor) || 0
            return currentOther > maxOther ? { ...prev, valor: maxOther } : prev
        })
    }

    const handleChange = (e) => {
        setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value })
    }

    const handleSubmitPayment = async (e) => {
        e.preventDefault()

        if (currentUser && !currentUser.permisos?.includes('ALL') && !currentUser.permisos?.includes('cartera_abonar')) {
            return Swal.fire('Operación Cancelada', 'No posees privilegios de caja para asentar recaudos.', 'error')
        }

        if (totalPaymentAmount <= 0) {
            return Swal.fire('Error', 'El valor total a abonar debe ser mayor a 0', 'error')
        }

        if (totalPaymentAmount > invoiceDebt + 0.01) {
            return Swal.fire('Error', 'El total del abono no puede superar la deuda actual', 'error')
        }

        const summaryLines = []
        if (effectiveCreditUsed > 0) {
            summaryLines.push(`Saldo a Favor: <strong>${formatMoney(effectiveCreditUsed)}</strong>`)
        }
        if (otherPaymentAmount > 0) {
            summaryLines.push(`${paymentForm.metodo_pago}: <strong>${formatMoney(otherPaymentAmount)}</strong>`)
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Abono?',
            html: `
                <div>Se registrará un abono total de <strong>${formatMoney(totalPaymentAmount)}</strong> a la factura <strong>${factura.prefijo || ''}${factura.numero_factura}</strong>.</div>
                <div class="mt-2 small text-muted">${summaryLines.join(' | ')}</div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar pago',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            const payload = {
                maestro_id: factura.id,
                valor: otherPaymentAmount,
                saldo_favor_usado: effectiveCreditUsed,
                metodo_pago: otherPaymentAmount > 0 ? paymentForm.metodo_pago : 'Saldo a Favor',
                observaciones: paymentForm.observaciones
            }

            const response = await carteraService.crearAbono(payload)
            if (response.success) {
                window.dispatchEvent(new Event('factura-creada'))
                Swal.fire('¡Éxito!', 'Abono registrado correctamente', 'success')
                onSuccess()
                onClose()
            } else {
                Swal.fire('Error', response.error, 'error')
            }
        }
    }

    return <>
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-cash-coin me-2 text-primary"></i>Registrar Abono
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmitPayment}>
                <Modal.Body>
                    <div className="alert alert-secondary mb-3 border-secondary">
                        <h6 className="fw-bold mb-1">Cliente: {factura.nombre_cliente}</h6>
                        <div>Factura: {factura.prefijo || ''}{factura.numero_factura}</div>
                        <hr className="my-2 border-secondary" />
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="fs-5 text-danger">
                                Deuda Actual: <strong>{formatMoney(invoiceDebt)}</strong>
                            </span>
                            {availableCredit > 0 && (
                                <span className="badge border border-success text-success">
                                    Saldo a favor: {formatMoney(availableCredit)}
                                </span>
                            )}
                        </div>
                    </div>

                    {availableCredit > 0 && (
                        <div className="p-3 mb-3 border border-secondary rounded bg-secondary bg-opacity-10">
                            <Form.Check
                                type="switch"
                                id="modal-abono-credit-switch"
                                label={`Usar Saldo a Favor (${formatMoney(availableCredit)})`}
                                checked={useCreditBalance}
                                onChange={(e) => handleToggleCredit(e.target.checked)}
                            />

                            {useCreditBalance && (
                                <div className="mt-2">
                                    <Form.Label className="small mb-1">Monto de Saldo a Favor a aplicar</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text>
                                            {getCurrencySymbol(appConfig.moneda)}
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            min="0"
                                            max={maxUsableCredit}
                                            step="0.01"
                                            value={creditAmountInput}
                                            onChange={(e) => handleCreditChange(e.target.value)}
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => handleCreditChange(String(maxUsableCredit))}
                                        >
                                            Máx
                                        </Button>
                                    </InputGroup>
                                    <div className="d-flex justify-content-between small text-muted mt-1">
                                        <span>Saldo a favor restante del cliente:</span>
                                        <strong className="text-dark">{formatMoney(remainingCreditAfter)}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Row className="g-3">
                        {remainingDebtAfterCredit === 0 && effectiveCreditUsed > 0 ? (
                            <Col md={12}>
                                <div className="alert alert-info py-2 mb-0 small">
                                    <i className="bi bi-check-circle me-2"></i>
                                    La deuda queda cubierta totalmente con Saldo a Favor.
                                </div>
                            </Col>
                        ) : (
                            <>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">
                                            {effectiveCreditUsed > 0 ? 'Monto Adicional a Recibir (Opcional)' : 'Monto a Recibir'}
                                        </Form.Label>
                                        <Form.Control
                                            type="number"
                                            size="lg"
                                            className="text-end fw-bold text-success fs-4 bg-light"
                                            name="valor"
                                            min={effectiveCreditUsed > 0 ? '0' : '0.01'}
                                            max={remainingDebtAfterCredit}
                                            step="0.01"
                                            value={paymentForm.valor}
                                            onChange={handleChange}
                                            required={effectiveCreditUsed <= 0}
                                        />
                                        {effectiveCreditUsed > 0 && (
                                            <Form.Text className="text-muted">
                                                Máximo adicional para saldar la factura: {formatMoney(remainingDebtAfterCredit)}. Déjalo en 0 si solo deseas aplicar el saldo a favor.
                                            </Form.Text>
                                        )}
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">Método de Pago</Form.Label>
                                        <Form.Select name="metodo_pago" value={paymentForm.metodo_pago} onChange={handleChange}>
                                            {paymentMethods.length === 0 && <option value="Efectivo">Efectivo</option>}
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.nombre}>{m.nombre}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </>
                        )}

                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Observaciones</Form.Label>
                                <Form.Control type="text" name="observaciones" value={paymentForm.observaciones} onChange={handleChange} />
                            </Form.Group>
                        </Col>

                        {totalPaymentAmount > 0 && (
                            <Col md={12}>
                                <div className="p-2 bg-light border rounded small d-flex justify-content-between">
                                    <span>Total a abonar: <strong>{formatMoney(totalPaymentAmount)}</strong></span>
                                    <span>Deuda restante: <strong className={projectedInvoiceDebt > 0 ? 'text-danger' : 'text-success'}>{formatMoney(projectedInvoiceDebt)}</strong></span>
                                </div>
                            </Col>
                        )}
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" className="px-4" disabled={totalPaymentAmount <= 0}>
                        Abonar
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    </>
}