import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'

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
    return <>
        <Modal show={show} onHide={handleClose} size="xl" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">{modalData.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                
                {modalData.type === 'producto' && (
                    <>
                        <div className="bg-light p-3 rounded mb-3 border">
                            <Row className="align-items-end">
                                <Col md={5}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold"><small>Categoría:</small></Form.Label>
                                        <Form.Select size="sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                            <option value="">Todas</option>
                                            {categoriasList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={5}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold"><small>Etiqueta:</small></Form.Label>
                                        <Form.Select size="sm" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                                            <option value="">Todas</option>
                                            {etiquetasList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Button variant="outline-secondary" size="sm" className="w-100" onClick={() => { setFilterCategory(''); setFilterTag(''); }} disabled={!filterCategory && !filterTag}>
                                        <i className="bi bi-x-circle me-1"></i>Limpiar
                                    </Button>
                                </Col>
                            </Row>
                        </div>

                        <div className="w-100 overflow-hidden">
                            <DataTableComponent
                                key={`prod-modal-${filterCategory}-${filterTag}-${appConfig.moneda}`}
                                ajaxData={(params) => {
                                    params.customCategory = filterCategory;
                                    params.customTag = filterTag;
                                    return window.api.getProductosPaginados(params); 
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
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}