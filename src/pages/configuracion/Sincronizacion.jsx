import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const Sincronizacion = ({ currentUser }) => {
    const [syncToken, setSyncToken] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            if (window.api) {
                const token = await window.api.getSyncConfig()
                if (token) setSyncToken(token)
            }
        }
        loadSettings()
    }, [])

    const handleSaveToken = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            if (window.api) {
                const res = await window.api.saveSyncConfig(syncToken)
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Guardado!',
                        text: 'El token de sincronización ha sido guardado correctamente.',
                        timer: 2000,
                        showConfirmButton: false
                    })
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar el token.', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleForceSync = async () => {
        if (!syncToken) {
            return Swal.fire('Atención', 'Debes configurar un Token de Sincronización primero.', 'warning')
        }

        setIsSyncing(true)
        try {
            if (window.api) {
                const res = await window.api.forceSyncNow()
                
                if (res.success) {
                    Swal.fire('Sincronización Completada', `Los datos han sido enviados a la nube exitosamente. Se procesaron ${res.processed} registros nuevos o modificados.`, 'success')
                } else {
                    Swal.fire('Error de Sincronización', res.error, 'error')
                }
            }
        } catch (error) {
            Swal.fire('Error de Sincronización', error.message || 'Error desconocido', 'error')
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="animation-fade-in">
            <Row>
                <Col md={8} lg={6}>
                    <Card className="border-secondary shadow-sm mb-4">
                        <Card.Header className="bg-light fw-bold text-primary border-bottom">
                            <i className="bi bi-link-45deg me-2"></i>
                            Conexión con Plataforma Web
                        </Card.Header>
                        <Card.Body>
                            <Alert variant="info" className="small">
                                <i className="bi bi-info-circle-fill me-2"></i>
                                Para conectar este sistema con tu plataforma en la nube, debes generar un <strong>Token de Sincronización</strong> desde el panel de administración web y pegarlo aquí.
                            </Alert>

                            <Form onSubmit={handleSaveToken}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Token de Sincronización (x-sync-token)</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Ej: eyJhbGciOiJIUzI1NiIsInR..."
                                        value={syncToken}
                                        onChange={(e) => setSyncToken(e.target.value)}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Mantén este token en secreto. Es tu llave de acceso a la nube.
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-flex justify-content-end">
                                    <Button variant="primary" type="submit" disabled={isSaving}>
                                        {isSaving ? (
                                            <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                                        ) : (
                                            <><i className="bi bi-save me-2"></i>Guardar Token</>
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>

                    <Card className="border-success shadow-sm">
                        <Card.Body className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="fw-bold mb-1 text-success">Forzar Sincronización Manual</h6>
                                <p className="small text-muted mb-0">Empuja los últimos cambios locales a la nube.</p>
                            </div>
                            <Button variant="outline-success" onClick={handleForceSync} disabled={isSyncing}>
                                {isSyncing ? (
                                    <><span className="spinner-border spinner-border-sm me-2" />Sincronizando...</>
                                ) : (
                                    <><i className="bi bi-cloud-arrow-up me-2"></i>Sincronizar Ahora</>
                                )}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}