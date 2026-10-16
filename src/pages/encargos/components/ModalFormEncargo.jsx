import { Button, Form, InputGroup, Modal, Row, Col } from "react-bootstrap"

const safeParse = (str) => {
    if (!str) return []
    try { 
        const parsed = JSON.parse(str)
        return Array.isArray(parsed) ? parsed : [parsed]
    } catch { 
        return [{ id: str, nombre: str }]
    }
}

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
    estados,
    camposDinamicos,
    currentUser,
    alcancePolitica,
    initialEstadoId
}) => {
    
    const handleCustomChange = (label, value) => {
        setForm({
            ...form,
            custom_data: { ...form.custom_data, [label]: value }
        })
    }
    
    const isEncargoGeneral = !editingId || (editingId && !form.producto_id)
    const tieneDinamicos = camposDinamicos && camposDinamicos.length > 0

    const isGlobalAdmin = currentUser?.permisos?.includes('ALL')

    const originalStateObj = estados.find(e => String(e.id) === String(initialEstadoId))
    let canModifyOriginal = true

    if (editingId && originalStateObj && alcancePolitica !== 'global' && currentUser && !isGlobalAdmin) {
        if (alcancePolitica === 'usuario' && originalStateObj.usuario_asignado) {
            const arr = safeParse(originalStateObj.usuario_asignado)
            const isAssigned = arr.some(u => 
                String(u.id) === String(currentUser.id) || 
                (u.nombre || '').toLowerCase() === (currentUser.nombre_completo || '').toLowerCase() || 
                (u.nombre || '').toLowerCase() === (currentUser.username || '').toLowerCase()
            )
            canModifyOriginal = isAssigned
        } else if (alcancePolitica === 'rol' && originalStateObj.rol_asignado) {
            const arr = safeParse(originalStateObj.rol_asignado)
            const isAssigned = arr.some(r => 
                String(r.id) === String(currentUser.rol_id) || 
                (r.nombre || '').toLowerCase() === (currentUser.rol || '').toLowerCase()
            )
            canModifyOriginal = isAssigned
        }
    }

    const estadosPermitidos = estados.map(estado => {
        let disabled = false
        
        if (!isGlobalAdmin && alcancePolitica !== 'global') {
            if (alcancePolitica === 'usuario' && estado.usuario_asignado) {
                const assignedUsers = safeParse(estado.usuario_asignado)
                const isAssigned = assignedUsers.some(u => 
                    String(u.id) === String(currentUser?.id) || 
                    String(u.nombre || '').toLowerCase() === String(currentUser?.nombre_completo || '').toLowerCase() ||
                    String(u.nombre || '').toLowerCase() === String(currentUser?.username || '').toLowerCase()
                )
                if (!isAssigned) disabled = true

            } else if (alcancePolitica === 'rol' && estado.rol_asignado) {
                const assignedRoles = safeParse(estado.rol_asignado)
                const isAssigned = assignedRoles.some(r => 
                    String(r.id) === String(currentUser?.rol_id) || 
                    String(r.nombre || '').toLowerCase() === String(currentUser?.rol || '').toLowerCase()
                );
                if (!isAssigned) disabled = true;
            }
        }
        
        if (String(initialEstadoId) === String(estado.id)) {
            disabled = false
        }

        return { ...estado, disabled }
    })

    return <>
        <Modal show={show} onHide={handleClose} size={tieneDinamicos ? "lg" : "md"} centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className={`bi ${editingId ? 'bi-pencil' : 'bi-plus-circle'} me-2 text-primary`}></i>
                    {editingId ? 'Completar Encargo' : 'Nuevo Encargo'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="encargoForm">
                    <Row>
                        <Col md={tieneDinamicos ? 7 : 12} className={tieneDinamicos ? "border-end pe-4" : ""}>
                            {!editingId && (
                                <div className="bg-light p-3 border rounded mb-3">
                                    <Form.Group className="mb-2">
                                        <Form.Label className="fw-bold small mb-1">N° Factura Origen</Form.Label>
                                        <InputGroup size="sm">
                                            <Form.Control 
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
                                    <Form.Label htmlFor="titulo_personalizado" className="fw-bold small">Título del Encargo (Opcional)</Form.Label>
                                    <Form.Control
                                        id="titulo_personalizado"
                                        value={form.titulo_personalizado || ''}
                                        onChange={(e) => setForm({ ...form, titulo_personalizado: e.target.value })}
                                        type="text"
                                    />
                                    <Form.Text className="text-muted" style={{fontSize:'0.7rem'}}>
                                        Este nombre reemplazará el texto "Factura" en el calendario.
                                    </Form.Text>
                                </Form.Group>
                            ) : (
                                <div className="alert alert-secondary py-2 m-0 mb-3 small  border-secondary animate__animated animate__fadeIn">
                                    {form.producto_nombre}
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
                                    disabled={editingId && !canModifyOriginal}
                                >
                                    <option value="">Seleccione un estado...</option>
                                    {estadosPermitidos.map(e => (
                                        <option key={e.id} value={e.id} disabled={e.disabled}>
                                            {e.titulo} {e.disabled ? '(Acceso denegado)' : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                                {(editingId && !canModifyOriginal) && (
                                    <Form.Text className="text-danger" style={{fontSize:'0.7rem'}}>
                                        <i className="bi bi-lock-fill"></i> No tienes permisos para modificar este estado.
                                    </Form.Text>
                                )}
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="descripcion" className="fw-bold small">Instrucciones / Descripción</Form.Label>
                                <Form.Control
                                    id="descripcion"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    as="textarea"
                                    rows={3}
                                    required
                                />
                            </Form.Group>
                        </Col>

                        {tieneDinamicos && (
                            <Col md={5}>
                                <h6 className="fw-bold border-bottom pb-2 mb-3 card-title">Información Adicional</h6>
                                
                                {camposDinamicos?.map(campo => (
                                    <Form.Group className="mb-3" key={campo.id}>
                                        <Form.Label className="fw-bold small text-secondary">{campo.label} {campo.required === 1 && '*'}</Form.Label>
                                        
                                        {campo.type === 'select' ? (
                                            <Form.Select 
                                                size="sm" 
                                                value={form.custom_data?.[campo.label] || ''} 
                                                onChange={(e) => handleCustomChange(campo.label, e.target.value)} 
                                                required={campo.required === 1}
                                            >
                                                <option value="">Seleccione...</option>
                                                {campo.options?.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                                            </Form.Select>
                                        ) : (
                                            <Form.Control 
                                                size="sm" 
                                                type={campo.type} 
                                                value={form.custom_data?.[campo.label] || ''} 
                                                onChange={(e) => handleCustomChange(campo.label, e.target.value)} 
                                                required={campo.required === 1} 
                                            />
                                        )}
                                    </Form.Group>
                                ))}
                            </Col>
                        )}
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="encargoForm" disabled={editingId && !canModifyOriginal}>
                    {editingId ? 'Guardar Cambios' : 'Generar Encargo'}
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}