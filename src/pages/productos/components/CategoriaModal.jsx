import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'

export default function CategoriaModal({ show, handleClose, handleSubmit, form, setForm, editingId }) {
    
    const isGeneral = editingId === 'general';

    return (
        <Modal show={show} onHide={handleClose} size="md" centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? (isGeneral ? 'Ver Categoría' : 'Editar Categoría') : 'Nueva Categoría'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isGeneral && (
                    <div className="alert alert-info py-2">
                        <small>La categoría "General" es del sistema y no puede ser modificada.</small>
                    </div>
                )}
                
                <Form onSubmit={handleSubmit} id="categoriaForm">
                        <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    type="text"
                                    required
                                    disabled={isGeneral}
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Prefijo SKU</Form.Label>
                                <Form.Control
                                    value={form.sku_prefix}
                                    onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })}
                                    type="text"
                                    placeholder="Ej: ROP"
                                    disabled={isGeneral}
                                    maxLength={5}
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Separador</Form.Label>
                                <Form.Control
                                    value={form.separador}
                                    onChange={(e) => setForm({ ...form, separador: e.target.value })}
                                    type="text"
                                    placeholder="Ej: -"
                                    disabled={isGeneral}
                                    maxLength={2}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            disabled={isGeneral}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
                {!isGeneral && (
                    <Button variant="primary" type="submit" form="categoriaForm">
                        Guardar
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    )
}