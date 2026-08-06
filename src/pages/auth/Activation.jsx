import { useState } from 'react'
import { Card, Form, Button, Col, InputGroup } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const Activation = ({ hardwareId, onActivationSuccess }) => {
    const [key, setKey] = useState('')
    const [loading, setLoading] = useState(false)
    
    // Mostrar diagnóstico si el ID es genérico (falló HWID real)
    const [showDebug, setShowDebug] = useState(() => hardwareId?.includes('GEN-HWID'))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!key.trim()) return

        setLoading(true)
        const res = await window.api.activateApp(key.trim())
        setLoading(false)

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Software Activado!',
                text: 'Gracias por adquirir una licencia legal de Caedro ERP.',
                confirmButtonColor: '#0d6efd'
            }).then(() => {
                onActivationSuccess()
            })
        } else {
            setShowDebug(true) // Mostrar el botón de diagnóstico si la clave falla
            Swal.fire('Error de Validación', res.error || 'Clave inválida', 'error')
        }
    }

    const copiarHwid = () => {
        navigator.clipboard.writeText(hardwareId)
        Swal.fire({ toast: true, position: 'bottom-end', title: '¡ID Copiado!', icon: 'success', showConfirmButton: false, timer: 2000 })
    }

    const verDiagnostico = async () => {
        try {
            const data = await window.api.getHwidDebug()
            const logsHtml = data.logs.map(log => `<div>${log}</div>`).join('<br/>')
            
            Swal.fire({
                title: 'Diagnóstico de Hardware',
                html: `<div style="text-align: left; font-size: 0.85rem; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 5px; max-height: 250px; overflow-y: auto;">
                        <strong>HWID Calculado:</strong> ${data.hwid}<br/><br/>
                        <strong>Traza de ejecución:</strong><br/>
                        ${logsHtml}
                       </div>`,
                width: '600px',
                confirmButtonText: 'Cerrar'
            })
        } catch (error) {
            Swal.fire('Error', 'No se pudo obtener el diagnóstico.', 'error')
        }
    }

    return (
        <main className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
            <div className="container">
                <div className="row justify-content-center">
                    <Col lg={5} md={7}>
                        <Card className="shadow border-0 rounded-3">
                            <Card.Body className="p-4 text-center">
                                <div className="mb-3 text-primary">
                                    <i className="bi bi-shield-lock-fill" style={{ fontSize: '3.5rem' }}></i>
                                </div>
                                <h4 className="fw-bold text-dark mb-1">Activación de Licencia</h4>
                                <p className="text-muted small">Este equipo no cuenta con un registro de activación vigente.</p>
                                
                                <div className="bg-white border rounded p-3 mb-4 text-start">
                                    <Form.Label className="small fw-bold text-secondary mb-1">ID de Hardware de este Equipo:</Form.Label>
                                    <InputGroup size="sm">
                                        <Form.Control readOnly value={hardwareId} className="bg-light font-monospace text-center small text-danger fw-bold" />
                                        <Button variant="outline-secondary" onClick={copiarHwid}>
                                            <i className="bi bi-clipboard"></i> Copiar
                                        </Button>
                                    </InputGroup>
                                    <Form.Text className="text-muted text-center d-block mt-2">
                                        <small>Envía este código a tu proveedor para recibir tu clave.</small>
                                    </Form.Text>
                                </div>

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3 text-start">
                                        <Form.Label className="small fw-bold text-secondary">Introduce tu clave de activación:</Form.Label>
                                        <Form.Control 
                                            type="text"
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            className="text-center fw-bold font-monospace text-uppercase"
                                            value={key}
                                            onChange={(e) => setKey(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                    <Button variant="primary" type="submit" className="w-100 fw-bold" disabled={loading}>
                                        {loading ? 'Validando...' : 'Activar mi Licencia'}
                                    </Button>
                                </Form>

                                {showDebug && (
                                    <div className="mt-4 animate__animated animate__fadeIn">
                                        <Button variant="link" size="sm" className="text-muted text-decoration-none" onClick={verDiagnostico}>
                                            <i className="bi bi-bug me-1"></i> Ver log de diagnóstico
                                        </Button>
                                    </div>
                                )}

                            </Card.Body>
                        </Card>
                    </Col>
                </div>
            </div>
        </main>
    )
}