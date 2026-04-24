import { Button, Col, Modal, Row } from "react-bootstrap";

export const EncargoDetalles = ({ show, handleClose, encargoData }) => {
    return (
        <Modal show={show} onHide={handleClose} size="lg" centered className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-info-circle me-2"></i>Detalles del Encargo
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <Row className="mb-4">
                    <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                            <div>
                                <h5 className="mb-0 fw-bold">{encargoData.producto_nombre}</h5>
                                <small>Cantidad: {encargoData.producto_cantidad} unidades</small>
                            </div>
                            <div className="text-end">
                                <span className="badge rounded-pill px-3 py-2"
                                    style={{ backgroundColor: encargoData.estado_color || '#0d6efd' }}>
                                    <i className={`bi ${encargoData.icon} me-1`}></i>
                                    {encargoData.estado_titulo?.toUpperCase()}
                                </span>
                                <div className="mt-1 small">Entrega: {encargoData.fecha_entrega || 'Sin agendar'}</div>
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col md={6} className="border-end">
                        <h6 className="text-uppercase small fw-bold mb-3">Información del Cliente</h6>
                        <div className="mb-3">
                            <label className="d-block small">Nombre completo</label>
                            <span className="fw-medium">{encargoData.cliente_nombre}</span>
                        </div>
                        <div className="mb-3">
                            <label className="d-block small">Documento / NIT</label>
                            <span className="fw-medium">{encargoData.cliente_documento}</span>
                        </div>
                        <div>
                            <label className="d-block small">N° Factura Relacionada</label>
                            <span className="badge bg-light text-dark border">{encargoData.prefijo}-{encargoData.factura_numero}</span>
                        </div>
                    </Col>

                    <Col md={6} className="ps-md-4">
                        <h6 className="text-uppercase small fw-bold mb-3">Detalles Técnicos</h6>
                        <div className="bg-light p-3 rounded shadow-sm">
                            <label className="text-muted d-block small mb-1">Descripción del pedido</label>
                            <p className="mb-0" style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                {encargoData.descripcion || "Sin descripción adicional."}
                            </p>
                        </div>
                        <div className="mt-3">
                            <label className="d-block small">N° Del encargo</label>
                            <span className="badge bg-light text-dark border">#{encargoData.encargo_numero}</span>
                        </div>
                    </Col>
                </Row>
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="outline-secondary" onClick={handleClose}>
                    Cerrar
                </Button>
                <Button variant="primary" onClick={() => window.print()}>
                    <i className="bi bi-printer me-2"></i>Imprimir
                </Button>
            </Modal.Footer>
        </Modal>
    );
}