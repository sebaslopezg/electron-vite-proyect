import { Button, Col, Modal, Row, Badge, ListGroup } from "react-bootstrap"

export const SubcategoriaDetalles = ({ show, handleClose, subcategoriaData, categorias }) => {
    if (!subcategoriaData) return null;

    const linkedCatIds = subcategoriaData.categorias_ids ? subcategoriaData.categorias_ids.split(',') : []
    const categoriasVinculadas = linkedCatIds.map(id => {
        const cat = categorias.find(c => c.id === id)
        return cat || { id, nombre: 'Categoría Desconocida / Eliminada' }
    })

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="bi bi-diagram-2 me-2"></i>Detalles de Subcategoría
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <Row className="mb-4">
                    <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                            <div>
                                <h4 className="mb-0 fw-bold">{subcategoriaData.nombre}</h4>
                            </div>
                            <div className="text-end">
                                <span className="badge bg-secondary px-3 py-2">
                                    {subcategoriaData.cant_productos || 0} Productos
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row className="mb-4">
                    <Col md={6}>
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Configuración SKU</h6>
                        <div className="bg-light p-3 rounded border">
                            <label className="d-block small text-muted mb-1">Prefijo de Subcategoría</label>
                            {subcategoriaData.sku_prefix ? (
                                <code className="fs-5 bg-white px-2 py-1 rounded border text-dark">
                                    {subcategoriaData.sku_prefix}{subcategoriaData.separador || ''}
                                </code>
                            ) : (
                                <span className="text-muted fst-italic">No tiene prefijo configurado</span>
                            )}
                        </div>
                    </Col>
                    <Col md={6}>
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Descripción</h6>
                        <div className="bg-light p-3 rounded border h-100">
                            <p className="mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                {subcategoriaData.descripcion || <span className="text-muted fst-italic">Sin descripción.</span>}
                            </p>
                        </div>
                    </Col>
                </Row>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary border-bottom pb-2">
                    <i className="bi bi-link-45deg me-2"></i>Categorías Vinculadas
                </h6>

                {categoriasVinculadas.length === 0 ? (
                    <div className="alert alert-light border text-center py-4 text-muted small">
                        Esta subcategoría no está vinculada a ninguna categoría.
                    </div>
                ) : (
                    <ListGroup variant="flush" className="border rounded shadow-sm">
                        {categoriasVinculadas.map((cat, index) => (
                            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center py-3">
                                <div>
                                    <span className="fw-medium text-dark">{cat.nombre}</span>
                                </div>
                                <Badge bg="light" text="secondary" className="border">
                                    Vínculo {index + 1}
                                </Badge>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}