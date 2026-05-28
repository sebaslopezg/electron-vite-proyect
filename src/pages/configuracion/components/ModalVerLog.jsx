import { Modal, Button, Row, Col } from 'react-bootstrap'

export const ModalVerLog = ({ show, onHide, log }) => {
    if (!log) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton className="bg-light border-bottom">
                <Modal.Title className="h6 text-dark m-0">
                    Detalle del log
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <Row className="g-3">
                    <Col md={6}>
                        <span className="text-muted small d-block">Fecha y Hora</span>
                        <strong className="text-dark">{new Date(log.fecha).toLocaleString()}</strong>
                    </Col>
                    <Col md={3}>
                        <span className="text-muted small d-block">Módulo</span>
                        <span className="badge bg-dark px-2 py-1">{log.modulo}</span>
                    </Col>
                    <Col md={3}>
                        <span className="text-muted small d-block">Severidad</span>
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
    )
}