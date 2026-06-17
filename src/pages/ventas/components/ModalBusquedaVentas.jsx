import { useState, useEffect, useMemo } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'
import { BuscadorFiltros } from '../../../components/BuscadorFiltros'
import { ventasService } from '../../../services/ventasService'
import { formatCurrency } from '../../../utils/currencies'

export const ModalBusquedaVentas = ({
    show,
    handleClose,
    modalData,
    filterCategory,
    setFilterCategory,
    filterTag,
    setFilterTag,
    categoriasList,
    etiquetasList,
    appConfig,
    clientes
}) => {
    const [subcategoriasTotales, setSubcategoriasTotales] = useState([])
    const [subcategoriasFiltradas, setSubcategoriasFiltradas] = useState([])
    const [filterSubcategory, setFilterSubcategory] = useState('')
    
    const [activeTab, setActiveTab] = useState('productos')

    useEffect(() => {
        if (show && modalData.type === 'producto') {
            ventasService.getSubcategorias().then(subs => {
                setSubcategoriasTotales(subs || [])
            })
            setActiveTab('productos')
        }
    }, [show, modalData.type])

    useEffect(() => {
        if (!filterCategory) {
            setSubcategoriasFiltradas([])
            setFilterSubcategory('')
        } else {
            const filtradas = subcategoriasTotales.filter(sub => {
                const ids = sub.categorias_ids ? sub.categorias_ids.split(',') : []
                return ids.includes(filterCategory)
            })
            setSubcategoriasFiltradas(filtradas)
            setFilterSubcategory('')
        }
    }, [filterCategory, subcategoriasTotales])

    const handleLocalClose = () => {
        setFilterSubcategory('')
        handleClose()
    }

    const renderCurrency = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda)

    const columnasServicios = useMemo(() => [
        { data: 'ref_name', title: 'Nombre Referencia' },
        { 
            data: 'sku', 
            title: 'SKU',
            render: (data, type, row) => {
                if (!data) return '-';
                const prefix = row.cat_prefix ? `${row.cat_prefix}${row.cat_separador || ''}`.toUpperCase() : '';
                const skuVal = String(data).toUpperCase();
                const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`;
                return `<strong>${finalSku}</strong>`;
            }
        },
        { 
            data: 'precio', 
            title: 'Precio',
            render: (data, type, row) => renderCurrency(row.precio) 
        },
        {
            data: null,
            title: 'Agregar',
            orderable: false,
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `
                    <button class="btn btn-sm btn-success btn-select-product me-1 mb-1" data-alldata="${safeData}" data-force-encargo="0">
                        <i class="bi bi-plus-circle me-1"></i> Agregar Servicio
                    </button>
                `
            }
        }
    ], [appConfig])

    return (
        <>
            <Modal show={show} onHide={handleLocalClose} size="xl" centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5">{modalData.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    
                    {modalData.type === 'producto' && (
                        <>
                            <ul className="nav nav-tabs nav-tabs-bordered mb-3" role="tablist">
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'productos' ? 'active text-primary' : 'text-secondary'}`}
                                        onClick={() => setActiveTab('productos')}
                                    >
                                        Productos
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'servicios' ? 'active text-primary' : 'text-secondary'}`}
                                        onClick={() => setActiveTab('servicios')}
                                    >
                                        Servicios
                                    </button>
                                </li>
                            </ul>

                            <div className="bg-light p-3 rounded mb-3 border animate__animated animate__fadeIn" style={{ overflow: 'visible' }}>
                                <Row className="g-3 align-items-end" style={{ overflow: 'visible' }}>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary"><small>Categoría:</small></Form.Label>
                                            <BuscadorFiltros 
                                                items={categoriasList}
                                                value={filterCategory}
                                                onChange={setFilterCategory}
                                                placeholder="Todas las categorías..."
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={3} style={{ overflow: 'visible' }}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary"><small>Subcategoría:</small></Form.Label>
                                            <BuscadorFiltros 
                                                items={subcategoriasFiltradas}
                                                value={filterSubcategory}
                                                onChange={setFilterSubcategory}
                                                placeholder={filterCategory ? "Todas las subcategorías..." : "Selecciona categoría primero"}
                                                disabled={!filterCategory}
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary"><small>Etiqueta:</small></Form.Label>
                                            <Form.Select size="sm" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                                                <option value="">Todas</option>
                                                {etiquetasList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    
                                    <Col md={3}>
                                        <Button 
                                            variant="outline-secondary" size="sm" className="w-100" 
                                            onClick={() => { setFilterCategory(''); setFilterSubcategory(''); setFilterTag(''); }} 
                                            disabled={!filterCategory && !filterSubcategory && !filterTag}
                                        >
                                            <i className="bi bi-x-circle me-1"></i>Limpiar Filtros
                                        </Button>
                                    </Col>
                                </Row>
                            </div>

                            <div className="tab-content w-100 overflow-hidden">
                                {activeTab === 'productos' && (
                                    <div className="animate__animated animate__fadeIn">
                                        <DataTableComponent
                                            tableId="dt-modal-busqueda-productos"
                                            key={`prod-modal-${filterCategory}-${filterSubcategory}-${filterTag}-${appConfig.moneda}`}
                                            ajaxData={(params) => {
                                                params.customCategory = filterCategory;
                                                params.customSubcategory = filterSubcategory;
                                                params.customTag = filterTag;
                                                return ventasService.getProductosPaginados(params);
                                            }}
                                            columns={modalData.columns}
                                        />
                                    </div>
                                )}
                                
                                {activeTab === 'servicios' && (
                                    <div className="animate__animated animate__fadeIn">
                                        <DataTableComponent
                                            tableId="dt-modal-busqueda-servicios"
                                            key={`serv-modal-${filterCategory}-${filterSubcategory}-${filterTag}-${appConfig.moneda}`}
                                            ajaxData={(params) => {
                                                params.customCategory = filterCategory;
                                                params.customSubcategory = filterSubcategory;
                                                params.customTag = filterTag;
                                                return window.api.getServiciosPaginados(params);
                                            }}
                                            columns={columnasServicios}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {modalData.type === 'cliente' && (
                        <div className="w-100 overflow-hidden">
                            <DataTableComponent
                                key={modalData.type}
                                data={clientes}
                                columns={modalData.columns}
                            />
                        </div>
                    )}

                </Modal.Body>
                <Modal.Footer className="bg-light border-top pt-2 pb-2 d-flex justify-content-end">
                    <Button variant="secondary" size="sm" onClick={handleLocalClose}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}