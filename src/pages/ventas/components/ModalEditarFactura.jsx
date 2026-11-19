import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, InputGroup } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { ventasService } from '../../../services/ventasService'

const formatDateForInput = (rawDate) => {
    if (!rawDate) return ''

    const dateStr = String(rawDate).trim()
    const sqliteMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/)
    if (sqliteMatch && !dateStr.endsWith('Z')) {
        return `${sqliteMatch[1]}T${sqliteMatch[2]}`
    }

    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return ''

    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    const hours = String(parsed.getHours()).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const ModalEditarFactura = ({ show, handleClose, factura, onSuccess }) => {
    const [invoiceDate, setInvoiceDate] = useState('')
    const [notes, setNotes] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (show && factura) {
            setInvoiceDate(formatDateForInput(factura.date_created))
            setNotes(factura.observaciones || '')
            setPassword('')
            setShowPassword(false)
            setErrorMsg('')
            setIsSubmitting(false)
        }
    }, [show, factura])

    if (!factura) return null

    const invoiceLabel = `${factura.prefijo || ''}${factura.separador || ''}${factura.numero_factura}`

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMsg('')

        if (!invoiceDate) {
            setErrorMsg('Debes especificar una fecha y hora válida.')
            return
        }

        if (!password.trim()) {
            setErrorMsg('Debes ingresar tu contraseña para guardar los cambios.')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await ventasService.updateFactura({
                facturaId: factura.id,
                date_created: invoiceDate,
                observaciones: notes,
                password
            })

            if (response.success) {
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    icon: 'success',
                    title: `Factura ${invoiceLabel} actualizada`,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                })
                window.dispatchEvent(new CustomEvent('factura-creada'))
                onSuccess?.()
                handleClose()
            } else {
                setErrorMsg(response.error || 'No se pudo actualizar la factura.')
                setPassword('')
            }
        } catch (err) {
            console.error('Error submitting invoice update', err)
            setErrorMsg('Ocurrió un error inesperado al actualizar la factura.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal show={show} onHide={isSubmitting ? undefined : handleClose} centered backdrop="static">
            <Modal.Header closeButton={!isSubmitting} className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-pencil-square me-2 text-primary"></i>
                    Editar Factura {invoiceLabel}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="p-2 mb-3 bg-light border rounded small">
                        <div><strong>Factura:</strong> {invoiceLabel}</div>
                        <div><strong>Cliente:</strong> {factura.nombre_cliente}</div>
                    </div>

                    {errorMsg && (
                        <Alert variant="danger" className="py-2 small">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {errorMsg}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small">Fecha y Hora de la Factura</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small">Observaciones</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones de la factura..."
                            disabled={isSubmitting}
                        />
                    </Form.Group>

                    <Form.Group className="mb-1 border-top pt-3">
                        <Form.Label>
                            Contraseña de confirmación
                        </Form.Label>
                        <InputGroup>
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña actual"
                                autoComplete="current-password"
                                disabled={isSubmitting}
                                required
                            />
                            <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                disabled={isSubmitting}
                                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </Button>
                        </InputGroup>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting || !password.trim() || !invoiceDate}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Verificando...
                            </>
                        ) : (
                            <>
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}