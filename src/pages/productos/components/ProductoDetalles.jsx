import { Button, Col, Modal, Row, Badge } from "react-bootstrap"
import { formatCurrency } from '../../../utils/currencies'

export const ProductoDetalles = ({ show, handleClose, productoData, appConfig }) => {
    if (!productoData) return null;

    const renderCurrency = (val) => formatCurrency(val, appConfig?.formato_numero || 'es-CO', appConfig?.moneda || 'COP')

    const prefix = productoData.sku_prefix ? `${productoData.sku_prefix}${productoData.separador || ''}`.toUpperCase() : '';
    const rawSku = String(productoData.sku || '').toUpperCase();
    const finalSku = rawSku.startsWith(prefix) ? rawSku : `${prefix}${rawSku}`;

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="bi bi-box-seam me-2"></i>Detalles del Producto
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <Row className="mb-4">
                    <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                            <div>
                                <h4 className="mb-0 fw-bold">{productoData.ref_name}</h4>
                                <div className="mt-1">
                                    <Badge bg={productoData.tipo === 'servicio' ? 'success' : 'primary'} className="me-2 text-uppercase">
                                        {productoData.tipo}
                                    </Badge>
                                    <span className="text-muted small">
                                        SKU: <strong className="text-dark">{finalSku || 'Sin SKU'}</strong>
                                    </span>
                                </div>
                            </div>
                            <div className="text-end">
                                <span className={`badge px-3 py-2 ${productoData.status === 1 ? 'bg-success' : 'bg-danger'}`}>
                                    {productoData.status === 1 ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col md={6} className="border-end">
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Información General</h6>
                        
                        <div className="mb-3">
                            <label className="d-block small text-muted">Categoría Principal</label>
                            <span className="fw-medium">{productoData.categoria_nombre || 'General'}</span>
                        </div>

                        <div className="mb-3">
                            <label className="d-block small text-muted">Precio Unitario</label>
                            <span className="fw-bold fs-5 text-success">{renderCurrency(productoData.precio)}</span>
                        </div>

                        <Row className="mb-3">
                            <Col xs={6}>
                                <label className="d-block small text-muted">IVA Aplicado</label>
                                <span className="fw-medium">{productoData.iva ? `${productoData.iva}%` : '0% (Exento)'}</span>
                            </Col>
                            <Col xs={6}>
                                <label className="d-block small text-muted">Unidad de Medida</label>
                                <span className="fw-medium text-capitalize">{productoData.unidad_medida || 'Unidad'}</span>
                            </Col>
                        </Row>

                        <div className="mb-3">
                            <label className="d-block small text-muted">Configuraciones Especiales</label>
                            <ul className="list-unstyled mt-2 small">
                                <li className="mb-1">
                                    <i className={`bi ${productoData.allow_encargo === 1 ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} me-2`}></i>
                                    {productoData.allow_encargo === 1 ? 'Admite Encargos' : 'No admite encargos'}
                                </li>
                                {productoData.allow_encargo === 1 && (
                                    <li className="mb-1 ps-4 text-muted">
                                        <i className="bi bi-arrow-return-right me-1"></i>
                                        {productoData.encargo_solo_sin_stock === 1 ? 'Requerir agotamiento previo de stock físico' : 'Se puede encargar en cualquier momento'}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </Col>

                    <Col md={6} className="ps-md-4">
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Estado de Inventario</h6>

                        {productoData.tipo === 'servicio' ? (
                            <div className="alert alert-info py-2 small">
                                <i className="bi bi-info-circle me-2"></i>
                                Este es un servicio, por lo que no maneja control de stock físico.
                            </div>
                        ) : (
                            <>
                                <div className="d-flex align-items-center mb-3 p-3 rounded bg-light border">
                                    <div className="me-3">
                                        <div className={`rounded-circle d-flex align-items-center justify-content-center text-white bg-${productoData.stock <= productoData.min_stock ? 'danger' : 'success'}`} style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                                            <i className={`bi bi-${productoData.stock <= productoData.min_stock ? 'exclamation-triangle' : 'check-lg'}`}></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="d-block small text-muted mb-0">Stock Físico Actual</label>
                                        <span className={`fw-bold fs-4 text-${productoData.stock <= productoData.min_stock ? 'danger' : 'dark'}`}>
                                            {productoData.stock}
                                        </span>
                                    </div>
                                </div>

                                <Row className="mb-4">
                                    <Col xs={6}>
                                        <label className="d-block small text-muted">Stock Mínimo (Alerta)</label>
                                        <span className="fw-medium">{productoData.min_stock}</span>
                                    </Col>
                                    <Col xs={6}>
                                        <label className="d-block small text-muted">Stock Máximo</label>
                                        <span className="fw-medium">{productoData.max_stock}</span>
                                    </Col>
                                </Row>

                                <div className="mb-3">
                                    <label className="d-block small text-muted">Venta en negativo</label>
                                    {productoData.allow_negative === 1 ? (
                                        <span className="badge bg-warning text-dark">PERMITIDA</span>
                                    ) : (
                                        <span className="badge bg-secondary">NO PERMITIDA</span>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <div className="bg-light p-3 rounded border mt-3">
                            <label className="text-muted fw-bold d-block small mb-1">Descripción / Notas</label>
                            <p className="mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                {productoData.descripcion || "El producto no posee descripción adicional."}
                            </p>
                        </div>
                    </Col>
                </Row>
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    )
}