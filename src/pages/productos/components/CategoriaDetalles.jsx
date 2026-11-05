import { useEffect, useState } from "react"
import { Modal, Row, Col, Spinner } from "react-bootstrap"
import CustomDataTable from '../../../components/DataTableComponent'
import { productosService } from '../../../services/productosService'
import { formatCurrency } from '../../../utils/currencies'

export const CategoriaDetalles = ({ show, handleClose, categoriaData, appConfig }) => {
    const [productosAsociados, setProductosAsociados] = useState([])
    const [subcategoriasAsociadas, setSubcategoriasAsociadas] = useState([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('productos')

    useEffect(() => {
        if (show && categoriaData?.id) {
            const cargarDatos = async () => {
                setLoading(true)
                try {
                    const dataProductos = await productosService.getProductosPorCategoria(categoriaData.id)
                    setProductosAsociados(dataProductos || [])

                    const dataSubcat = await productosService.getSubcategoriasPorCategoria(categoriaData.id)
                    setSubcategoriasAsociadas(dataSubcat || [])
                } catch (error) {
                    console.error("Error cargando detalles de categoría:", error)
                    setProductosAsociados([])
                    setSubcategoriasAsociadas([])
                }
                setLoading(false)
            }
            cargarDatos()
            setActiveTab('productos')
        } else {
            setProductosAsociados([])
            setSubcategoriasAsociadas([])
        }
    }, [show, categoriaData])

    if (!categoriaData) return null;

    const renderCurrency = (val) => formatCurrency(val, appConfig?.formato_numero || 'es-CO', appConfig?.moneda || 'COP')

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered scrollable className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="bi bi-diagram-2 me-1 text-primary"></i>Detalles de Categoría
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0">
                {/* General Information Header */}
                <div className="p-4 border-bottom bg-white">
                    <Row className="mb-4">
                        <Col md={12}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 className="mb-0 fw-bold">{categoriaData.nombre}</h4>
                                </div>
                                <div className="text-end">
                                    <span className="badge bg-secondary px-3 py-2 me-2" title="Productos vinculados">
                                        <i className="bi bi-box-seam me-1"></i> {productosAsociados.length} Productos
                                    </span>
                                    <span className="badge bg-secondary px-3 py-2" title="Subcategorías vinculadas">
                                        <i className="bi bi-diagram-3 me-1"></i> {subcategoriasAsociadas.length} Subcategorías
                                    </span>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <h6 className="text-uppercase small fw-bold mb-2 text-secondary">Configuración SKU</h6>
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
                        <Col md={8}>
                            <h6 className="text-uppercase small fw-bold mb-2 text-secondary mb-2">Descripción</h6>
                            <div className="bg-light p-3 rounded border">
                                <p className="mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                    {categoriaData.descripcion || <span className="text-muted fst-italic">Sin descripción.</span>}
                                </p>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Styled Tab System */}
                <div className="p-4 bg-light" style={{ minHeight: '400px' }}>
                    {loading ? (
                        <div className="text-center py-5 text-muted">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Cargando datos de la categoría...
                        </div>
                    ) : (
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button 
                                            className={`nav-link ${activeTab === 'productos' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('productos')}
                                            type="button" 
                                            role="tab"
                                        >
                                            <i className="bi bi-box-seam me-1"></i> Productos Asociados ({productosAsociados.length})
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button 
                                            className={`nav-link ${activeTab === 'subcategorias' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('subcategorias')}
                                            type="button" 
                                            role="tab"
                                        >
                                            <i className="bi bi-diagram-3 me-1"></i> Subcategorías Anidadas ({subcategoriasAsociadas.length})
                                        </button>
                                    </li>
                                </ul>

                                <div className="tab-content pt-4 animate__animated animate__fadeIn">
                                    {/* PESTAÑA: PRODUCTOS */}
                                    {activeTab === 'productos' && (
                                        <CustomDataTable
                                            tableId={`dt-cat-prod-${categoriaData.id}`}
                                            key={`tab-prod-${categoriaData.id}`}
                                            data={productosAsociados}
                                            columns={[
                                                {
                                                    data: 'ref_name',
                                                    title: 'Producto / Servicio',
                                                    render: (data) => `<div class="text-dark fw-medium">${data}</div>`
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
                                                        if (row.tipo === 'servicio') return '<span class="badge bg-secondary">-</span>';
                                                        const umbral = row.min_stock !== undefined ? row.min_stock : 5;
                                                        return `<span class="badge ${data <= umbral ? 'bg-danger' : 'bg-success'}">${data}</span>`;
                                                    }
                                                },
                                                {
                                                    data: 'precio',
                                                    title: 'Precio',
                                                    className: 'text-end pe-3',
                                                    render: (data) => renderCurrency(data)
                                                }
                                            ]}
                                        />
                                        
                                    )}

                                    {/* PESTAÑA: SUBCATEGORÍAS */}
                                    {activeTab === 'subcategorias' && (
                                        <CustomDataTable
                                            tableId={`dt-cat-subcat-${categoriaData.id}`}
                                            key={`tab-subcat-${categoriaData.id}`}
                                            data={subcategoriasAsociadas}
                                            columns={[
                                                {
                                                    data: 'nombre',
                                                    title: 'Nombre de Subcategoría',
                                                    render: (data) => `<div class="text-dark">${data}</div>`
                                                },
                                                {
                                                    data: 'sku_prefix',
                                                    title: 'Prefijo (Heredado)',
                                                    render: (data, type, row) => data ? `<code>${data}${row.separador || ''}</code>` : '<span class="text-muted">-</span>'
                                                },
                                                {
                                                    data: 'cant_productos',
                                                    title: 'Productos Asociados',
                                                    className: 'text-center',
                                                    render: (data) => `${data || 0}`
                                                }
                                            ]}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    )
}