import { useEffect, useState } from "react"
import { Button, Col, Modal, Row, Badge, Spinner } from "react-bootstrap"
import CustomDataTable from '../../../components/DataTableComponent'
import { productosService } from '../../../services/productosService'
import { formatCurrency } from '../../../utils/currencies'

export const CategoriaDetalles = ({ show, handleClose, categoriaData, appConfig }) => {
    const [productosAsociados, setProductosAsociados] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (show && categoriaData?.id) {
            const cargarProductos = async () => {
                setLoading(true)
                try {
                    const data = await productosService.getProductosPorCategoria(categoriaData.id)
                    setProductosAsociados(data || [])
                } catch (error) {
                    console.error("Error cargando productos:", error)
                    setProductosAsociados([])
                }
                setLoading(false)
            }
            cargarProductos()
        } else {
            setProductosAsociados([])
        }
    }, [show, categoriaData])

    if (!categoriaData) return null;

    const renderCurrency = (val) => formatCurrency(val, appConfig?.formato_numero || 'es-CO', appConfig?.moneda || 'COP')

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered scrollable className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="bi bi-tags me-2"></i>Detalles de Categoría
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <Row className="mb-4">
                    <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                            <div>
                                <h4 className="mb-0 fw-bold">{categoriaData.nombre}</h4>
                            </div>
                            <div className="text-end">
                                <span className="badge bg-secondary px-3 py-2">
                                    {categoriaData.cant_productos || 0} Asociados
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row className="mb-4">
                    <Col md={6}>
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Configuración SKU</h6>
                        <div className="bg-light p-3 rounded border">
                            <label className="d-block small text-muted mb-1">Prefijo Armado Automático</label>
                            {categoriaData.sku_prefix ? (
                                <code className="fs-5 bg-white px-2 py-1 rounded border text-dark">
                                    {categoriaData.sku_prefix}{categoriaData.separador || ''}
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
                                {categoriaData.descripcion || <span className="text-muted fst-italic">Sin descripción.</span>}
                            </p>
                        </div>
                    </Col>
                </Row>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary border-bottom pb-2">
                    <i className="bi bi-list-ul me-2"></i>Lista de Productos Asociados
                </h6>

                {loading ? (
                    <div className="text-center py-4 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Cargando catálogo...
                    </div>
                ) : (
                    <div className="w-100 mt-3">
                        <CustomDataTable
                            tableId={`dt-cat-detalles-${categoriaData.id}`}
                            key={categoriaData.id}
                            data={productosAsociados}
                            columns={[
                                {
                                    data: 'ref_name',
                                    title: 'Producto / Servicio',
                                    render: (data) => `<div class="text-dark">${data}</div>`
                                },
                                {
                                    data: 'sku',
                                    title: 'SKU',
                                    render: (data) => data ? `<strong>${data.toUpperCase()}</strong>` : '<span class="text-muted">-</span>'
                                },
                                {
                                    data: 'tipo',
                                    title: 'Tipo',
                                    className: 'text-center',
                                    render: (data) => `<span class="badge bg-${data === 'servicio' ? 'success' : 'primary'} text-uppercase" style="font-size: 0.65rem;">${data}</span>`
                                },
                                {
                                    data: 'stock',
                                    title: 'Stock',
                                    className: 'text-center',
                                    render: (data, type, row) => {
                                        if (row.tipo === 'servicio') return '<span class="text-muted">-</span>';
                                        return `<span class="fw-bold text-${data <= row.min_stock ? 'danger' : 'success'}">${data}</span>`;
                                    }
                                },
                                {
                                    data: 'precio',
                                    title: 'Precio',
                                    className: 'text-end pe-3 fw-medium',
                                    render: (data) => renderCurrency(data)
                                }
                            ]}
                        />
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    )
}