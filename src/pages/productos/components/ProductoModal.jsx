import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import { Row, Col, ListGroup } from 'react-bootstrap'

// --- COMPONENTE BUSCADOR REUTILIZABLE CON NAVEGACIÓN POR TECLADO ---
const BuscadorListas = ({ items, value, onChange, placeholder, disabled }) => {
    const [query, setQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1) // Rastrea la opción resaltada

    // Sincroniza el texto visible con la opción real seleccionada
    useEffect(() => {
        const selectedItem = items.find(i => i.id === value)
        if (selectedItem) {
            setQuery(`${selectedItem.nombre} ${selectedItem.sku_prefix ? `(${selectedItem.sku_prefix})` : ''}`)
        } else {
            setQuery('')
        }
    }, [value, items])

    // Filtra las opciones en tiempo real basándose en el texto escrito
    const filteredItems = items.filter(item => {
        const searchStr = query.toLowerCase()
        return item.nombre.toLowerCase().includes(searchStr) || 
               (item.sku_prefix && item.sku_prefix.toLowerCase().includes(searchStr))
    }).slice(0, 15)

    // Resetea el índice resaltado cada vez que cambia la búsqueda
    useEffect(() => {
        setActiveIndex(-1)
    }, [query])

    // Captura los eventos del teclado
    const handleKeyDown = (e) => {
        if (!showDropdown || filteredItems.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault() // Evita que el cursor se mueva al final del input
            setActiveIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev))
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault() // Evita que el cursor se mueva al inicio del input
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1))
        } 
        else if (e.key === 'Enter') {
            // Si hay un elemento resaltado, seleccionarlo y evitar enviar el formulario padre
            if (activeIndex >= 0 && activeIndex < filteredItems.length) {
                e.preventDefault()
                const selected = filteredItems[activeIndex]
                onChange(selected.id)
                setShowDropdown(false)
            }
        } 
        else if (e.key === 'Escape') {
            setShowDropdown(false)
            setActiveIndex(-1)
        }
    }

    return (
        <div style={{ position: 'relative' }}>
            <Form.Control
                size="sm"
                type="text"
                placeholder={placeholder}
                value={query}
                disabled={disabled}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setShowDropdown(true)
                    if (e.target.value === '') onChange('')
                }}
                onKeyDown={handleKeyDown} // <-- Escuchamos el teclado
                onFocus={() => { if (!disabled && items.length > 0) setShowDropdown(true) }}
                onBlur={() => {
                    setTimeout(() => {
                        setShowDropdown(false)
                        const selectedItem = items.find(i => i.id === value)
                        if (selectedItem) {
                            setQuery(`${selectedItem.nombre} ${selectedItem.sku_prefix ? `(${selectedItem.sku_prefix})` : ''}`)
                        } else {
                            setQuery('')
                        }
                    }, 200)
                }}
                autoComplete="off"
            />
            {showDropdown && filteredItems.length > 0 && !disabled && (
                <ListGroup 
                    className="position-absolute shadow border border-1 border-secondary" 
                    style={{ zIndex: 9999, maxHeight: '200px', overflowY: 'auto', top: '100%', left: 0, width: '100%', marginTop: '4px' }}
                >
                    {filteredItems.map((item, index) => (
                        <ListGroup.Item 
                            key={item.id} 
                            action 
                            active={index === activeIndex} // <-- Resaltado visual azul de Bootstrap
                            className="py-1 px-2 small border-bottom"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                onChange(item.id)
                                setShowDropdown(false)
                            }}
                        >
                            <strong className={index === activeIndex ? "text-white" : "text-primary"}>{item.nombre}</strong> <br/>
                            <span className={index === activeIndex ? "text-white-50" : "text-muted"}>
                                {item.sku_prefix ? `Prefijo: ${item.sku_prefix}` : 'Sin prefijo'}
                            </span>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
            {showDropdown && filteredItems.length === 0 && query !== '' && !disabled && (
                 <ListGroup className="position-absolute shadow w-100" style={{ zIndex: 9999, top: '100%', left: 0 }}>
                     <ListGroup.Item className="py-2 text-center text-muted small bg-white">Sin coincidencias.</ListGroup.Item>
                 </ListGroup>
            )}
        </div>
    )
}

export default function ProductModal(
    { 
        show, 
        handleClose, 
        handleSubmit, 
        form, 
        setForm, 
        editingId, 
        categorias = [], 
        subcategorias = [], 
        etiquetas = [] 
    }) {
    
    const getContrastText = (hexcolor) => {
        if (!hexcolor) return '#000000'
        const hex = hexcolor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? '#000000' : '#ffffff'
    };

    const etiquetasFiltradas = etiquetas.filter(tag => {
        if (!tag.categorias_ids) return false;
        const catIds = tag.categorias_ids.split(',')
        return catIds.includes(form.categoria_id)
    })

    const selectedSubIds = form.subcategorias_ids || []
    const selectedCategory = categorias.find(cat => cat.id === form.categoria_id)
    
    let combinedPrefix = selectedCategory?.sku_prefix || ''
    let currentSeparator = selectedCategory?.separador || ''

    selectedSubIds.forEach(id => {
        const sub = subcategorias.find(s => s.id === id)
        if (sub && sub.sku_prefix) {
            if (combinedPrefix) {
                combinedPrefix += (currentSeparator ? currentSeparator : '') + sub.sku_prefix
            } else {
                combinedPrefix = sub.sku_prefix
            }
            currentSeparator = sub.separador || ''
        }
    })

    const prefixString = `${combinedPrefix}${currentSeparator}`

    let displaySku = form.sku || ''
    if (displaySku.toUpperCase().startsWith(prefixString.toUpperCase()) && prefixString !== '') {
        displaySku = displaySku.substring(prefixString.length)
    }

    const handleLocalSubmit = (e) => {
        e.preventDefault()
        
        let finalSku = form.sku || ''
        
        if (displaySku === '') {
            finalSku = prefixString.toUpperCase()
        } 
        else if (!finalSku.toUpperCase().startsWith(prefixString.toUpperCase())) {
            finalSku = `${prefixString}${displaySku}`.toUpperCase()
        }
        
        handleSubmit(e, finalSku)
    }

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
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Producto' : 'Crear Producto'}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ overflowX: 'hidden', overflowY: 'visible' }}>
                <Form onSubmit={handleLocalSubmit} id="productoForm">
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Tipo de producto</Form.Label>
                                <Form.Select size="sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                                    <option value="producto">Producto (Físico)</option>
                                    <option value="servicio">Servicio (Intangible)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Categoría Principal <span className="text-danger">*</span></Form.Label>
                                <BuscadorListas 
                                    items={categorias}
                                    value={form.categoria_id}
                                    placeholder="Buscar categoría..."
                                    onChange={(val) => setForm({ 
                                        ...form, 
                                        categoria_id: val, 
                                        subcategorias_ids: [] 
                                    })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="bg-light p-3 border rounded mb-3" style={{ overflow: 'visible' }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="fw-bold m-0 text-primary">Subcategorías Anidadas</Form.Label>
                            <Button variant="outline-primary" size="sm" onClick={addSubcategoriaRow} disabled={!form.categoria_id}>
                                <i className="bi bi-plus-circle me-1"></i> Añadir Nivel
                            </Button>
                        </div>
                        {selectedSubIds.length === 0 && <span className="text-muted small">No hay subcategorías asignadas.</span>}
                        
                        {selectedSubIds.map((subId, index) => {
                            const subcatsValidas = subcategorias.filter(s => s.categorias_ids && s.categorias_ids.split(',').includes(form.categoria_id))
                            
                            return (
                                <Row key={index} className="mb-2 align-items-center" style={{ overflow: 'visible' }}>
                                    <Col md={10} style={{ overflow: 'visible' }}>
                                        <div className="d-flex align-items-center gap-2" style={{ overflow: 'visible' }}>
                                            <span className="badge bg-secondary">Nivel {index + 1}</span>
                                            <div className="flex-grow-1" style={{ overflow: 'visible' }}>
                                                <BuscadorListas 
                                                    items={subcatsValidas}
                                                    value={subId}
                                                    placeholder="Buscar subcategoría..."
                                                    onChange={(val) => updateSubcategoriaId(index, val)}
                                                />
                                            </div>
                                        </div>
                                    </Col>
                                    <Col md={2}>
                                        <Button variant="outline-danger" size="sm" onClick={() => removeSubcategoriaRow(index)} className="w-100">
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </Col>
                                </Row>
                            )
                        })}
                    </div>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-primary">Código SKU Final</Form.Label>
                                <InputGroup size="sm">
                                    {combinedPrefix && (
                                        <InputGroup.Text className="bg-primary text-white border-primary fw-bold px-2 py-1">
                                            {combinedPrefix}{currentSeparator}
                                        </InputGroup.Text>
                                    )}
                                    <Form.Control 
                                        value={displaySku} 
                                        onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                                        style={{ textTransform: 'uppercase' }} 
                                        placeholder="Código correlativo..."
                                    />
                                </InputGroup>
                                <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    El código resultante será: <strong className="text-dark">{prefixString}{displaySku?.toUpperCase()}</strong>
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Nombre Comercial <span className="text-danger">*</span></Form.Label>
                                <Form.Control size="sm" value={form.ref_name} onChange={(e) => setForm({ ...form, ref_name: e.target.value })} required />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Precio Unitario <span className="text-danger">*</span></Form.Label>
                                <Form.Control size="sm" type="number" min="0" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">IVA (%)</Form.Label>
                                <Form.Control size="sm" type="number" min="0" max="100" value={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>

                    {form.tipo === 'producto' && (
                        <div className="bg-light p-3 border rounded mb-3">
                            <h6 className="fw-bold mb-3 text-primary border-bottom pb-2">Control de Inventario y Encargos</h6>
                            
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary mb-1 fw-bold">Stock Inicial</Form.Label>
                                        <Form.Control type="number" size="sm" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!editingId} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary mb-1">Stock Mínimo (Alerta)</Form.Label>
                                        <Form.Control type="number" size="sm" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary mb-1">Stock Máximo</Form.Label>
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
                                            checked={form.encargo_solo_sin_stock === 0}
                                            onChange={(e) => setForm({ ...form, encargo_solo_sin_stock: e.target.checked ? 0 : 1 })}
                                        />
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Unidad de medida</Form.Label>
                                <Form.Select size="sm" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}>
                                    <option value="Unidad">Unidad</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Litro">Litro</option>
                                    <option value="Caja">Caja</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-secondary mb-1">Estado en Catálogo</Form.Label>
                                <Form.Select size="sm" value={form.status} onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}>
                                    <option value={1}>Activo (A la venta)</option>
                                    <option value={2}>Inactivo (Oculto)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {etiquetasFiltradas.length > 0 && (
                        <div className="mb-3 p-3 bg-light border rounded">
                            <Form.Label className="fw-bold d-block mb-2 text-primary">Etiquetas Especiales</Form.Label>
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
                                                    className="badge border" 
                                                    style={{ backgroundColor: tag.color, color: textColor, borderColor: 'rgba(0,0,0,0.1) !important' }} 
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
                        <Form.Label className="small fw-bold text-secondary mb-1">Descripción del producto</Form.Label>
                        <Form.Control size="sm" as="textarea" rows={2} placeholder="Opcional..." value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                    </Form.Group>

                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="success" type="submit" form="productoForm">
                    <i className="bi bi-save me-2"></i>Guardar Producto
                </Button>
            </Modal.Footer>
        </Modal>
    )
}