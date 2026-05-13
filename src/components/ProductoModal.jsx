import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import { Row, Col } from 'react-bootstrap'

export default function ProductModal({ show, handleClose, handleSubmit, form, setForm, editingId, categorias = [], subcategorias = [], etiquetas = [] }) {
    
    const getContrastText = (hexcolor) => {
        if (!hexcolor) return '#000000';
        const hex = hexcolor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    };

    const etiquetasFiltradas = etiquetas.filter(tag => {
        if (!tag.categorias_ids) return false;
        const catIds = tag.categorias_ids.split(',');
        return catIds.includes(form.categoria_id);
    });

    const selectedSubIds = form.subcategorias_ids || [];
    const selectedCategory = categorias.find(cat => cat.id === form.categoria_id);
    
    // --- LÓGICA DE CONCATENACIÓN PERFECTA ---
    let combinedPrefix = selectedCategory?.sku_prefix || '';
    let currentSeparator = selectedCategory?.separador || '';

    selectedSubIds.forEach(id => {
        const sub = subcategorias.find(s => s.id === id);
        if (sub && sub.sku_prefix) {
            if (combinedPrefix) {
                // Si ya existe un prefijo previo, agregamos el separador antes del nuevo
                combinedPrefix += `${currentSeparator}${sub.sku_prefix}`;
            } else {
                combinedPrefix = sub.sku_prefix;
            }
            // Actualizamos el separador actual para el siguiente ciclo o el final
            if (sub.separador !== undefined && sub.separador !== null) {
                currentSeparator = sub.separador;
            }
        }
    });
    // ----------------------------------------

    const handleTagToggle = (tagId) => {
        setForm(prev => {
            const current = prev.etiquetas || [];
            if (current.includes(tagId)) {
                return { ...prev, etiquetas: current.filter(id => id !== tagId) };
            } else {
                return { ...prev, etiquetas: [...current, tagId] };
            }
        });
    };

    const addSubcategoriaRow = () => {
        setForm({ ...form, subcategorias_ids: [...selectedSubIds, ''] });
    }

    const removeSubcategoriaRow = (index) => {
        const newIds = [...selectedSubIds];
        newIds.splice(index, 1);
        setForm({ ...form, subcategorias_ids: newIds });
    }

    const updateSubcategoriaId = (index, value) => {
        const newIds = [...selectedSubIds];
        newIds[index] = value;
        setForm({ ...form, subcategorias_ids: newIds });
    }

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Producto' : 'Crear Producto'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="productoForm">
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Tipo de producto</Form.Label>
                                <Form.Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                                    <option value="producto">Producto</option>
                                    <option value="servicio">Servicio</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Categoría Principal</Form.Label>
                                <Form.Select 
                                    value={form.categoria_id} 
                                    onChange={(e) => setForm({ ...form, categoria_id: e.target.value, subcategorias_ids: [] })}
                                >
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="bg-light p-3 border rounded mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="fw-bold m-0 text-primary">Subcategorías Anidadas</Form.Label>
                            <Button variant="outline-primary" size="sm" onClick={addSubcategoriaRow} disabled={!form.categoria_id}>
                                <i className="bi bi-plus-circle me-1"></i> Añadir Nivel
                            </Button>
                        </div>
                        {selectedSubIds.length === 0 && <span className="text-muted small">No hay subcategorías asignadas.</span>}
                        {selectedSubIds.map((subId, index) => (
                            <Row key={index} className="mb-2 animate__animated animate__fadeIn">
                                <Col md={10}>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white text-muted">Nivel {index + 1}</InputGroup.Text>
                                        <Form.Select 
                                            value={subId} 
                                            onChange={(e) => updateSubcategoriaId(index, e.target.value)}
                                        >
                                            <option value="">Seleccione subcategoría...</option>
                                            {subcategorias
                                                .filter(s => s.categoria_id === form.categoria_id)
                                                .map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.sku_prefix})</option>)
                                            }
                                        </Form.Select>
                                    </InputGroup>
                                </Col>
                                <Col md={2}>
                                    <Button variant="outline-danger" size="sm" onClick={() => removeSubcategoriaRow(index)} className="w-100">
                                        <i className="bi bi-trash"></i>
                                    </Button>
                                </Col>
                            </Row>
                        ))}
                    </div>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-primary">Código SKU Final</Form.Label>
                                <InputGroup>
                                    {combinedPrefix && (
                                        <InputGroup.Text className="bg-primary text-white border-primary fw-bold">
                                            {combinedPrefix}{currentSeparator}
                                        </InputGroup.Text>
                                    )}
                                    <Form.Control 
                                        value={form.sku} 
                                        onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                                        style={{ textTransform: 'uppercase' }} 
                                        placeholder="Código correlativo..."
                                    />
                                </InputGroup>
                                <Form.Text className="text-muted">
                                    El código resultante será: <strong>{combinedPrefix}{currentSeparator}{form.sku.toUpperCase()}</strong>
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Nombre</Form.Label>
                                <Form.Control value={form.ref_name} onChange={(e) => setForm({ ...form, ref_name: e.target.value })} required />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Precio</Form.Label>
                                <Form.Control type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>IVA (%)</Form.Label>
                                <Form.Control type="number" value={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>

                    {form.tipo === 'producto' && (
                        <div className="bg-light p-3 border rounded mb-3">
                            <h6 className="fw-bold mb-3 text-primary border-bottom pb-2">Control de Inventario y Encargos</h6>
                            
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small">Stock inicial</Form.Label>
                                        <Form.Control type="number" size="sm" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!editingId} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small">Stock Mínimo</Form.Label>
                                        <Form.Control type="number" size="sm" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small">Stock Máximo</Form.Label>
                                        <Form.Control type="number" size="sm" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="align-items-start">
                                <Col md={5}>
                                    <Form.Check 
                                        type="switch" 
                                        id="allow_negative"
                                        label="Permitir vender sin stock físico" 
                                        checked={form.allow_negative === 1 || form.allow_negative === true}
                                        onChange={(e) => setForm({ ...form, allow_negative: e.target.checked ? 1 : 0 })} 
                                    />
                                </Col>
                                <Col md={7}>
                                    <Form.Check 
                                        type="switch"
                                        id="allow_encargo"
                                        label="Permitir tomar encargos/pedidos"
                                        checked={form.allow_encargo === 1}
                                        onChange={(e) => setForm({ ...form, allow_encargo: e.target.checked ? 1 : 0 })}
                                    />
                                    {form.allow_encargo === 1 && (
                                        <Form.Check 
                                            className="ms-4 mt-2 text-muted small"
                                            type="checkbox"
                                            id="encargo_solo_sin_stock"
                                            label="Requerir agotamiento previo de stock físico"
                                            checked={form.encargo_solo_sin_stock === 1}
                                            onChange={(e) => setForm({ ...form, encargo_solo_sin_stock: e.target.checked ? 1 : 0 })}
                                        />
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Unidad de medida</Form.Label>
                                <Form.Select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}>
                                    <option value="Unidad">Unidad</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Litro">Litro</option>
                                    <option value="Caja">Caja</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Estado</Form.Label>
                                <Form.Select value={form.status} onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}>
                                    <option value={1}>Activo</option>
                                    <option value={2}>Inactivo</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {etiquetasFiltradas.length > 0 && (
                        <div className="mb-3 p-3 bg-light border rounded">
                            <Form.Label className="fw-bold d-block mb-2">Etiquetas de la Categoría</Form.Label>
                            <div className="d-flex flex-wrap gap-3">
                                {etiquetasFiltradas.map(tag => {
                                    const textColor = getContrastText(tag.color);
                                    
                                    return (
                                        <Form.Check 
                                            key={tag.id}
                                            type="checkbox"
                                            id={`tag-${tag.id}`}
                                            label={
                                                <span 
                                                    className="badge" 
                                                    style={{ backgroundColor: tag.color, color: textColor }} 
                                                >
                                                    {tag.nombre}
                                                </span>
                                            }
                                            checked={(form.etiquetas || []).includes(tag.id)}
                                            onChange={() => handleTagToggle(tag.id)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Descripcion</Form.Label>
                        <Form.Control as="textarea" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                    </Form.Group>

                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="productoForm">Guardar</Button>
            </Modal.Footer>
        </Modal>
    )
}