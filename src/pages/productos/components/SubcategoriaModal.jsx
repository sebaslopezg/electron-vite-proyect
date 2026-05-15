import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import { Row, Col } from 'react-bootstrap'

export default function SubcategoriaModal({ show, handleClose, handleSubmit, form, setForm, editingId, categorias = [] }) {
    
    const selectedCatIds = form.categorias_ids || [];

    const addCategoriaRow = () => {
        setForm({ ...form, categorias_ids: [...selectedCatIds, ''] });
    }

    const removeCategoriaRow = (index) => {
        const newIds = [...selectedCatIds];
        newIds.splice(index, 1);
        setForm({ ...form, categorias_ids: newIds });
    }

    const updateCategoriaId = (index, value) => {
        const newIds = [...selectedCatIds];
        newIds[index] = value;
        setForm({ ...form, categorias_ids: newIds });
    }

    // Validamos que haya al menos una categoría y que ninguna esté en blanco
    const isFormValid = selectedCatIds.length > 0 && !selectedCatIds.includes('');

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Subcategoría' : 'Nueva Subcategoría'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="subcategoriaForm">
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre <span className="text-danger">*</span></Form.Label>
                        <Form.Control required type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                    </Form.Group>

                    {/* CAJA DINÁMICA DE CATEGORÍAS */}
                    <div className="bg-light p-3 border rounded mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="fw-bold m-0 text-primary">Categorías Vinculadas <span className="text-danger">*</span></Form.Label>
                            <Button variant="outline-primary" size="sm" onClick={addCategoriaRow}>
                                <i className="bi bi-plus-circle me-1"></i> Añadir Categoría
                            </Button>
                        </div>
                        
                        {selectedCatIds.length === 0 && (
                            <span className="text-muted small d-block mt-2">
                                <i className="bi bi-exclamation-triangle text-danger me-1"></i> 
                                No hay categorías asignadas. Añade al menos una.
                            </span>
                        )}
                        
                        {selectedCatIds.map((catId, index) => (
                            <Row key={index} className="mb-2 animate__animated animate__fadeIn">
                                <Col md={10}>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white text-muted">Vínculo {index + 1}</InputGroup.Text>
                                        <Form.Select 
                                            value={catId} 
                                            onChange={(e) => updateCategoriaId(index, e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccione una categoría...</option>
                                            {categorias.map(c => (
                                                <option 
                                                    key={c.id} 
                                                    value={c.id}
                                                    // Deshabilitamos la opción si ya fue elegida en otra fila
                                                    disabled={selectedCatIds.includes(c.id) && c.id !== catId}
                                                >
                                                    {c.nombre}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </InputGroup>
                                </Col>
                                <Col md={2}>
                                    <Button variant="outline-danger" size="sm" onClick={() => removeCategoriaRow(index)} className="w-100">
                                        <i className="bi bi-trash"></i>
                                    </Button>
                                </Col>
                            </Row>
                        ))}
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control as="textarea" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Prefijo para SKU</Form.Label>
                                <Form.Control type="text" placeholder="Ej: BL" value={form.sku_prefix} onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })} style={{ textTransform: 'uppercase' }} />
                                <Form.Text className="text-muted">Se concatenará al de la categoría.</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Separador SKU</Form.Label>
                                <Form.Control type="text" placeholder="Ej: -" value={form.separador} onChange={(e) => setForm({ ...form, separador: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                {/* El botón se habilita solo si hay categorías y ninguna está en "Seleccione..." */}
                <Button variant="primary" type="submit" form="subcategoriaForm" disabled={!isFormValid}>Guardar</Button>
            </Modal.Footer>
        </Modal>
    )
}