import { Button, Form, InputGroup, Modal } from "react-bootstrap"

export const ModalFormEncargo = ({
    show,
    handleClose,
    handleSubmit,
    editingId,
    form,
    setForm,
    busquedaFactura,
    setBusquedaFactura,
    handleSearchFactura,
    facturaOrigen,
    estados
}) => {
    
    const isEncargoGeneral = !editingId || (editingId && !form.producto_id)

    return <>
        <Modal show={show} onHide={handleClose} size="md" centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    {editingId ? 'Completar Encargo' : 'Nuevo Encargo'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="encargoForm">
                    
                    {!editingId && (
                        <div className="bg-light p-3 border rounded mb-3">
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-bold small mb-1">N° Factura Origen</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control 
                                        placeholder="Ej. F-10"
                                        value={busquedaFactura}
                                        onChange={e => setBusquedaFactura(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchFactura())}
                                    />
                                    <Button variant="primary" onClick={() => handleSearchFactura()}>
                                        <i className="bi bi-search"></i> Buscar
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                            
                            {facturaOrigen && (
                                <div className="alert alert-info py-2 m-0 small shadow-sm border-info animate__animated animate__fadeIn">
                                    <i className="bi bi-person me-1"></i> <strong>Cliente:</strong> {facturaOrigen.nombre_cliente}
                                </div>
                            )}
                        </div>
                    )}

                    {isEncargoGeneral ? (
                        <Form.Group className="mb-3 animate__animated animate__fadeIn">
                            <Form.Label htmlFor="titulo_personalizado" className="fw-bold small text-primary">Título del Encargo (Opcional)</Form.Label>
                            <Form.Control
                                id="titulo_personalizado"
                                value={form.titulo_personalizado || ''}
                                onChange={(e) => setForm({ ...form, titulo_personalizado: e.target.value })}
                                type="text"
                                placeholder="Ej: Pedido Especial Fiesta..."
                            />
                            <Form.Text className="text-muted" style={{fontSize:'0.7rem'}}>
                                Este nombre reemplazará el texto "Factura" en el calendario.
                            </Form.Text>
                        </Form.Group>
                    ) : (
                        <div className="alert alert-secondary py-2 m-0 mb-3 small shadow-sm border-secondary animate__animated animate__fadeIn">
                            <i className="bi bi-box-seam me-1"></i> <strong>Producto Asociado:</strong> {form.producto_nombre}
                        </div>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="fecha_entrega" className="fw-bold small">Fecha Promesa Entrega</Form.Label>
                        <Form.Control
                            id="fecha_entrega"
                            value={form.fecha_entrega}
                            onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })}
                            type="date"
                            placeholder="DD/MM/AAAA"
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="estado_select" className="fw-bold small">Estado del Encargo</Form.Label>
                        <Form.Select 
                            id="estado_select"
                            value={form.estado_id} 
                            onChange={(e) => setForm({ ...form, estado_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione un estado...</option>
                            {estados.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="descripcion" className="fw-bold small">Instrucciones / Descripción</Form.Label>
                        <Form.Control
                            id="descripcion"
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            as="textarea"
                            rows={3}
                            placeholder="Agregar información relevante para el encargo..."
                            required
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="encargoForm">
                    {editingId ? 'Guardar Cambios' : 'Generar Encargo'}
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}