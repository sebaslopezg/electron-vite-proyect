import { Modal, Button, Row, Col } from 'react-bootstrap'
import { useState, useEffect } from 'react'

export const ModalVerLog = ({ show, onHide, log }) => {
    const [fotoUsuario, setFotoUsuario] = useState(null)

    useEffect(() => {
        const fetchUserPhoto = async () => {
            if (show && log && log.usuario && log.usuario !== 'Sistema') {
                try {
                    const response = await window.api.getUsuariosFotos()
                    if (response.success && response.data) {
                        const userMatch = response.data.find(u => 
                            u.username === log.usuario || 
                            u.nombre_completo === log.usuario
                        )
                        if (userMatch && userMatch.foto_perfil) {
                            setFotoUsuario(userMatch.foto_perfil)
                        } else {
                            setFotoUsuario(null)
                        }
                    }
                } catch (error) {
                    console.error("Error al obtener la foto de perfil del log", error)
                }
            } else {
                setFotoUsuario(null)
            }
        }

        fetchUserPhoto()
    }, [show, log])

    if (!log) return null

    return <>
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton className="bg-light border-bottom">
                <Modal.Title className="fs-5">
                    <i className="bi bi-terminal-dash me-2 text-primary fs-4"></i>
                    Detalle del log
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <Row className="g-3">
                    <Col md={4}>
                        <span className="text-muted small d-block">Fecha y Hora</span>
                        <strong className="text-dark">{new Date(log.fecha).toLocaleString()}</strong>
                    </Col>
                    <Col md={4}>
                        <span className="text-muted small d-block">Autor de la Acción</span>
                        <div className="d-flex align-items-center mt-1">
                            {fotoUsuario ? (
                                <img 
                                    src={fotoUsuario} 
                                    alt="Perfil" 
                                    className="rounded-circle me-2 object-fit-cover shadow-sm border border-secondary border-opacity-25"
                                    style={{ width: '24px', height: '24px' }}
                                />
                            ) : (
                                <i className="bi bi-person-circle me-2 fs-5 text-secondary"></i>
                            )}
                            <span className="fw-bold text-secondary">
                                {log.usuario || 'Sistema'}
                            </span>
                        </div>
                    </Col>
                    <Col md={2}>
                        <span className="text-muted small d-block mb-1">Módulo</span>
                        <span className="badge bg-dark px-2 py-1">{log.modulo}</span>
                    </Col>
                    <Col md={2}>
                        <span className="text-muted small d-block mb-1">Severidad</span>
                        <span className={`badge bg-${log.tipo === 'ERROR' ? 'danger' : log.tipo === 'WARNING' ? 'warning text-dark' : log.tipo === 'SUCCESS' ? 'success' : 'info'} px-2 py-1 fw-bold`}>
                            {log.tipo}
                        </span>
                    </Col>
                    <Col md={12} className="mt-3 border-top pt-3">
                        <span className="text-muted small d-block mb-1 fw-bold">Mensaje</span>
                        <div className="alert alert-secondary py-2 border-0 bg-opacity-25 bg-secondary text-dark small fw-medium">
                            {log.mensaje}
                        </div>
                    </Col>
                    <Col md={12}>
                        <span className="text-muted small d-block mb-1 fw-bold">
                            Metadatos
                        </span>
                        <pre 
                            className="bg-dark text-info p-3 rounded font-monospace border border-secondary border-opacity-50 style-scroll" 
                            style={{ maxHeight: '220px', overflowY: 'auto', fontSize: '0.8rem' }}
                        >
                            {log.detalles ? log.detalles : '// Sin metadatos adicionales registrados.'}
                        </pre>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer className="bg-light border-top p-2">
                <Button variant="secondary" onClick={onHide}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}