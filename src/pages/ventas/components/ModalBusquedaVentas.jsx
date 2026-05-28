import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'
import { BuscadorFiltros } from '../../../components/BuscadorFiltros'
import { ventasService } from '../../../services/ventasService'

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

    useEffect(() => {
        if (show && modalData.type === 'producto') {
            ventasService.getSubcategorias().then(subs => {
                setSubcategoriasTotales(subs || [])
            })
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

    return (
        <>
            <Modal show={show} onHide={handleLocalClose} size="xl" centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5">{modalData.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    
                    {modalData.type === 'producto' && (
                        <>
                            <div className="bg-light p-3 rounded mb-3 border" style={{ overflow: 'visible' }}>
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
                                            <i className="bi bi-x-circle me-1"></i>Limpiar
                                        </Button>
                                    </Col>
                                </Row>
                            </div>

                            <div className="w-100 overflow-hidden">
                                <DataTableComponent
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