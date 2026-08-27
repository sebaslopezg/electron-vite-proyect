import { Modal, Button, Row, Col, Badge } from 'react-bootstrap'

export const ModalDetalleTercero = ({ show, handleClose, terceroData }) => {
    if (!terceroData) return null;

    const isJuridica = terceroData.tipo_persona === 'juridica';
    const nombreCompleto = isJuridica ? terceroData.razon_social : `${terceroData.nombres || ''} ${terceroData.apellidos || ''}`.trim();

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className={`bi ${isJuridica ? 'bi-building' : 'bi-person'} me-2`}></i>
                    Detalles del {terceroData.es_cliente === 1 && terceroData.es_proveedor === 0 ? 'Cliente' : 'Tercero'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <Row className="mb-4">
                    <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                            <div>
                                <h4 className="mb-0 fw-bold">{nombreCompleto}</h4>
                                <div className="mt-1 text-muted">
                                    <span className="fw-medium text-dark">
                                        {terceroData.tipo_documento} {terceroData.numero_documento}
                                        {terceroData.digito_verificacion ? `-${terceroData.digito_verificacion}` : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="text-end">
                                <Badge bg={terceroData.estado === 1 ? 'success' : 'danger'} className="px-3 py-2 shadow-sm">
                                    {terceroData.estado === 1 ? 'ACTIVO' : 'INACTIVO'}
                                </Badge>
                            </div>
                        </div>
                    </Col>
                </Row>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Información General</h6>
                <Row className="mb-4 bg-light p-3 rounded border mx-0">
                    <Col md={6} className="mb-3 mb-md-0">
                        <label className="d-block small text-muted mb-1">Tipo de Persona</label>
                        <span className="fw-medium text-capitalize">{isJuridica ? 'Jurídica (Empresa)' : 'Natural (Individuo)'}</span>
                    </Col>
                    <Col md={6}>
                        <label className="d-block small text-muted mb-1">Roles Asignados</label>
                        <div>
                            {terceroData.es_cliente === 1 && <Badge bg="info" className="me-1 shadow-sm">Cliente</Badge>}
                            {terceroData.es_proveedor === 1 && <Badge bg="warning" text="dark" className="me-1 shadow-sm">Proveedor</Badge>}
                            {terceroData.es_cliente !== 1 && terceroData.es_proveedor !== 1 && <span className="text-muted small">Sin roles</span>}
                        </div>
                    </Col>
                </Row>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary border-bottom pb-2">Datos de Contacto</h6>
                <Row className="mb-3">
                    <Col md={6}>
                        <label className="d-block small text-muted mb-1"><i className="bi bi-telephone me-1"></i>Teléfono</label>
                        <span className="fw-medium">{terceroData.telefono || <span className="text-muted fst-italic">No registrado</span>}</span>
                    </Col>
                    <Col md={6}>
                        <label className="d-block small text-muted mb-1"><i className="bi bi-envelope me-1"></i>Email</label>
                        <span className="fw-medium">{terceroData.email || <span className="text-muted fst-italic">No registrado</span>}</span>
                    </Col>
                </Row>
                <Row>
                    <Col md={12}>
                        <label className="d-block small text-muted mb-1"><i className="bi bi-geo-alt me-1"></i>Dirección</label>
                        <span className="fw-medium">{terceroData.direccion || <span className="text-muted fst-italic">No registrada</span>}</span>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    </>
}