import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'

export default function EtiquetaModal({
        show, 
        handleClose, 
        handleSubmit, 
        form, 
        setForm, 
        editingId, 
        categoriasDisponibles 
    }) {
    
    const handleCategoryToggle = (catId) => {
        setForm(prev => {
            const currentCats = prev.categorias || [];
            if (currentCats.includes(catId)) {
                if (catId === 'general' && currentCats.length === 1) return prev;
                return { ...prev, categorias: currentCats.filter(id => id !== catId) };
            } else {
                return { ...prev, categorias: [...currentCats, catId] };
            }
        });
    };

    return (
        <Modal show={show} onHide={handleClose} size="md" centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Etiqueta' : 'Nueva Etiqueta'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="etiquetaForm">
                    <Row>
                        <Col md={9}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre de la etiqueta <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    type="text"
                                    required
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Color</Form.Label>
                                <Form.Control
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    title="Elige un color"
                                    className="w-100 form-control-color"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        />
                    </Form.Group>

                    <hr />
                    <Form.Label className="fw-bold text-muted">Aparecerá en las siguientes Categorías:</Form.Label>
                    <div className="d-flex flex-wrap gap-3 mt-2 p-3 bg-light rounded border">
                        {categoriasDisponibles.map(cat => (
                            <Form.Check 
                                key={cat.id}
                                type="checkbox"
                                id={`cat-${cat.id}`}
                                label={cat.nombre}
                                checked={(form.categorias || []).includes(cat.id)}
                                onChange={() => handleCategoryToggle(cat.id)}
                                disabled={cat.id === 'general' && (form.categorias || []).length === 1}
                            />
                        ))}
                    </div>
                    <small className="text-muted mt-1 d-block">La etiqueta debe pertenecer al menos a una categoría (General por defecto).</small>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
                <Button variant="primary" type="submit" form="etiquetaForm">Guardar</Button>
            </Modal.Footer>
        </Modal>
    )
}