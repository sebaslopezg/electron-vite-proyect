import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

const ProductModal = ({
    show,
    handleClose,
    handleSubmit,
    form,
    setForm,
    editingId
}) => {

    const handleInputChange = (field, value) => {
        setForm({ ...form, [field]: value });
    };

    const handleTipoChange = (nuevoTipo) => {
        setForm({
            ...form,
            tipo: nuevoTipo,
            iva: nuevoTipo === "servicio" ? 0 : form.iva,
            stock: nuevoTipo === "servicio" ? 0 : form.stock,
            unidad_medida: nuevoTipo === "servicio" ? "un" : form.unidad_medida,
            allow_negative: nuevoTipo === "servicio" ? 0 : form.allow_negative
        });
    };

    const isService = form.tipo === "servicio";

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Producto' : 'Crear Producto'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="tipo">Tipo de producto</Form.Label>
                            <Form.Select
                                id='tipo'
                                value={form.tipo}
                                onChange={(e) => handleTipoChange(e.target.value)}
                            >
                                <option>Tipo de producto</option>
                                <option value="producto">Producto</option>
                                <option value="servicio">Servicio</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="skuCode">Código SKU</Form.Label>
                                <Form.Control
                                    id='skuCode'
                                    value={form.sku}
                                    onChange={(e) => handleInputChange('sku', e.target.value)}
                                    type="text"
                                    placeholder="SKU-001"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="nombre">Nombre</Form.Label>
                                <Form.Control
                                    id='nombre'
                                    value={form.ref_name}
                                    onChange={(e) => handleInputChange('ref_name', e.target.value)}
                                    type="text"
                                    placeholder="mi producto"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="precio">Precio</Form.Label>
                                <Form.Control
                                    id='precio'
                                    value={form.precio}
                                    onChange={(e) => handleInputChange('precio', e.target.value)}
                                    type="number"
                                    placeholder="Precio del producto"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="iva">IVA (%)</Form.Label>
                                <Form.Control
                                    id="iva"
                                    value={form.iva}
                                    onChange={(e) => handleInputChange('iva', e.target.value)}
                                    type="number"
                                    placeholder="Porcentaje de IVA"
                                    disabled={isService}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="initialStock">Stock inicial</Form.Label>
                                <Form.Control
                                    id='initialStock'
                                    value={form.stock}
                                    onChange={(e) => handleInputChange('stock', e.target.value)}
                                    type="number"
                                    placeholder="Cantidad inicial del producto"
                                    required
                                    disabled={isService}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="unidad_medida">Unidad de medida</Form.Label>
                                <Form.Select
                                    id='unidad_medida'
                                    value={form.unidad_medida}
                                    disabled={isService}
                                    onChange={(e) => handleInputChange('unidad_medida', e.target.value)}
                                >
                                    <option>Unidad de medida</option>
                                    <option value="un">Unidad</option>
                                    <option value="kg">Kilo Gramos (kg)</option>
                                    <option value="g">Gramos (g)</option>
                                    <option value="cajas">Cajas</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label></Form.Label>
                                <Form.Check
                                    checked={form.allow_negative === 1}
                                    onChange={(e) => handleInputChange('allow_negative', e.target.checked ? 1 : 0)}
                                    type="switch"
                                    id="custom-switch"
                                    label="Permitir negativos"
                                    disabled={isService}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="status">Estado</Form.Label>
                                <Form.Select
                                    id='status'
                                    value={form.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                >
                                    <option value="1">Activo</option>
                                    <option value="2">Inactivo</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col>
                            <Form.Group>
                                <Form.Label htmlFor="descripcion">Descripcion</Form.Label>
                                <Form.Control
                                    id='descripcion'
                                    value={form.descripcion}
                                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                                    as="textarea"
                                    rows={3}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    {editingId ? 'Actualizar' : 'Guardar'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ProductModal;