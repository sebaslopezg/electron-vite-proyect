import { Button, Col, Modal, Row, Badge } from "react-bootstrap"
import { formatCurrency } from '../../../utils/currencies'

export const ProductoDetalles = ({ show, handleClose, productoData, appConfig, subcategoriasDisponibles = [], etiquetasDisponibles = [] }) => {
    if (!productoData) return null

    const renderCurrency = (val) => formatCurrency(val, appConfig?.formato_numero || 'es-CO', appConfig?.moneda || 'COP')

    const prefix = productoData.sku_prefix ? `${productoData.sku_prefix}${productoData.separador || ''}`.toUpperCase() : ''
    const rawSku = String(productoData.sku || '').toUpperCase()
    const finalSku = rawSku.startsWith(prefix) ? rawSku : `${prefix}${rawSku}`

    let subcatsNombres = []
    if (productoData.subcategorias_ids_json) {
        try {
            const subIds = typeof productoData.subcategorias_ids_json === 'string' 
                ? JSON.parse(productoData.subcategorias_ids_json) 
                : productoData.subcategorias_ids_json
            
            if (Array.isArray(subIds) && subIds.length > 0) {
                subcatsNombres = subIds.map(id => {
                    const sub = subcategoriasDisponibles.find(s => s.id === id)
                    return sub ? sub.nombre : null
                }).filter(Boolean)
            }
        } catch (e) {
            console.error("Error parseando subcategorías", e)
        }
    }

    let etiquetasObjs = []
    if (productoData.etiquetas_ids) {
        const tagIds = String(productoData.etiquetas_ids).split(',').map(s => s.trim()).filter(Boolean)
        etiquetasObjs = tagIds.map(id => {
            return etiquetasDisponibles.find(t => t.id === id)
        }).filter(Boolean)
    }

    const getTextColor = (hexColor) => {
        if (!hexColor) return '#ffffff'
        const hex = hexColor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? '#000000' : '#ffffff'
    }

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className={`bi ${productoData.tipo === 'servicio' ? 'bi bi-briefcase' : 'bi-box-seam'} me-2 text-primary`}></i>
                    Detalles del {productoData.tipo === 'servicio' ? 'Servicio' : 'Producto'}
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

                        {subcatsNombres.length > 0 && (
                            <div className="mb-3">
                                <label className="d-block small text-muted mb-1">Subcategorías</label>
                                <div>
                                    {subcatsNombres.map((nombre, idx) => (
                                        <Badge key={idx} bg="secondary" className="me-1 mb-1 fw-normal">{nombre}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {etiquetasObjs.length > 0 && (
                            <div className="mb-3">
                                <label className="d-block small text-muted mb-1">Etiquetas (Tags)</label>
                                <div>
                                    {etiquetasObjs.map((tag, idx) => {
                                        const color = tag.color || '#6c757d'
                                        return (
                                            <span 
                                                key={idx} 
                                                className="badge shadow-sm me-1 mb-1" 
                                                style={{ backgroundColor: color, color: getTextColor(color), padding: '5px 10px', borderRadius: '12px' }}
                                            >
                                                <i className="bi bi-tag-fill me-1"></i>{tag.nombre}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

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
                                {productoData.descripcion || "El producto/servicio no posee descripción adicional."}
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
    </>
}