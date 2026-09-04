import { Button, Col, Form, FormGroup, Modal, Row, InputGroup, Table } from "react-bootstrap"
import { BuscadorFiltros } from '../../../components/BuscadorFiltros'

const iconosComunes = [
    "bi-tag-fill", "bi-check-circle", "bi-check-circle-fill", "bi-clock", "bi-clock-history",
    "bi-exclamation-triangle", "bi-exclamation-circle", "bi-x-circle", "bi-x-circle-fill",
    "bi-arrow-counterclockwise", "bi-trash", "bi-question-circle", "bi-three-dots",
    "bi-box", "bi-box-seam", "bi-truck", "bi-send", "bi-wallet2", "bi-cash",
    "bi-credit-card", "bi-cart-check", "bi-bag-check", "bi-hourglass-split", "bi-tools"
]

export const ModalFormEstado = ({
    show,
    handleClose,
    handleSubmit,
    editingId,
    form,
    setForm,
    alcancePolitica,
    usuariosForBuscador,
    newUserItem,
    setNewUserItem,
    isUserValid,
    handleAddAsignacion,
    asignacionesUsuarios,
    rolesForBuscador,
    newRoleItem,
    setNewRoleItem,
    isRoleValid,
    asignacionesRoles,
    updatePermiso,
    removeAsignacion
}) => {
    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>{editingId ? 'Editar Estado' : 'Nuevo Estado'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4" style={{ overflow: 'visible' }}>
                <Form onSubmit={handleSubmit} id="estadoForm">
                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Nombre del estado <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    value={form.titulo}
                                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                    type="text"
                                    required
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Color de la Etiqueta</Form.Label>
                                <Form.Control
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="w-100 form-control-color"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {alcancePolitica === 'usuario' && (
                        <div className="mb-4 p-3 bg-light border border-primary border-opacity-25 rounded shadow-sm">
                            <Form.Label className="fw-bold text-primary"><i className="bi bi-people-fill me-1"></i> Asignación de Usuarios</Form.Label>
                            <InputGroup className="mb-3">
                                <div className="flex-grow-1" style={{ position: 'relative', zIndex: 10 }}>
                                    <BuscadorFiltros 
                                        items={usuariosForBuscador}
                                        value={newUserItem}
                                        onChange={setNewUserItem}
                                        placeholder="Escribe para buscar o selecciona de la lista..."
                                    />
                                </div>
                                <Button variant="primary" type="button" onClick={() => handleAddAsignacion('usuario')} disabled={!isUserValid}>
                                    <i className="bi bi-plus-lg me-1"></i> Agregar
                                </Button>
                            </InputGroup>

                            {asignacionesUsuarios.length > 0 && (
                                <Table size="sm" bordered hover className="align-middle bg-white mb-0 mt-3">
                                    <thead className="table-light text-center small">
                                        <tr>
                                            <th className="text-start">Usuario</th>
                                            <th>Puede Asignar</th>
                                            <th>Puede Modificar</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {asignacionesUsuarios.map((u, i) => (
                                            <tr key={i}>
                                                <td className="fw-medium">
                                                    {u.foto ? (
                                                        <img src={u.foto} alt="Avatar" className="rounded-circle me-2 object-fit-cover" width="24" height="24" />
                                                    ) : (
                                                        <i className="bi bi-person-circle fs-5 me-2 text-secondary align-middle"></i>
                                                    )}
                                                    {u.nombre}
                                                </td>
                                                <td className="text-center">
                                                    <Form.Check type="switch" className="d-inline-block" checked={u.can_assign} onChange={(e) => updatePermiso(i, 'can_assign', e.target.checked, 'usuario')} />
                                                </td>
                                                <td className="text-center">
                                                    <Form.Check type="switch" className="d-inline-block" checked={u.can_modify} onChange={(e) => updatePermiso(i, 'can_modify', e.target.checked, 'usuario')} />
                                                </td>
                                                <td className="text-center">
                                                    <Button variant="link" className="text-danger p-0" onClick={() => removeAsignacion(i, 'usuario')}><i className="bi bi-trash3-fill"></i></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    )}

                    {alcancePolitica === 'rol' && (
                        <div className="mb-4 p-3 bg-light border border-info border-opacity-25 rounded shadow-sm">
                            <Form.Label className="fw-bold text-info"><i className="bi bi-shield-lock-fill me-1"></i> Asignación de Roles</Form.Label>
                            <InputGroup className="mb-3">
                                <div className="flex-grow-1" style={{ position: 'relative', zIndex: 10 }}>
                                    <BuscadorFiltros 
                                        items={rolesForBuscador}
                                        value={newRoleItem}
                                        onChange={setNewRoleItem}
                                        placeholder="Escribe para buscar o selecciona un rol..."
                                    />
                                </div>
                                <Button variant="info" type="button" className="text-white" onClick={() => handleAddAsignacion('rol')} disabled={!isRoleValid}>
                                    <i className="bi bi-plus-lg me-1"></i> Agregar
                                </Button>
                            </InputGroup>

                            {asignacionesRoles.length > 0 && (
                                <Table size="sm" bordered hover className="align-middle bg-white mb-0 mt-3">
                                    <thead className="table-light text-center small">
                                        <tr>
                                            <th className="text-start">Rol</th>
                                            <th>Puede Asignar</th>
                                            <th>Puede Modificar</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {asignacionesRoles.map((r, i) => (
                                            <tr key={i}>
                                                <td className="fw-medium text-uppercase"><i className="bi bi-shield-check me-2 text-info"></i>{r.nombre}</td>
                                                <td className="text-center">
                                                    <Form.Check type="switch" className="d-inline-block" checked={r.can_assign} onChange={(e) => updatePermiso(i, 'can_assign', e.target.checked, 'rol')} />
                                                </td>
                                                <td className="text-center">
                                                    <Form.Check type="switch" className="d-inline-block" checked={r.can_modify} onChange={(e) => updatePermiso(i, 'can_modify', e.target.checked, 'rol')} />
                                                </td>
                                                <td className="text-center">
                                                    <Button variant="link" className="text-danger p-0" onClick={() => removeAsignacion(i, 'rol')}><i className="bi bi-trash3-fill"></i></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    )}

                    <FormGroup className="mb-4">
                        <Form.Label className="fw-bold">Descripción o Instrucciones</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        />
                    </FormGroup>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Icono (Bootstrap Icons)</Form.Label>
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-circle border shadow-sm"
                                        style={{
                                            width: '45px', height: '45px', minWidth: '45px', fontSize: '1.4rem',
                                            backgroundColor: form.color || '#0d6efd', color: '#fff'
                                        }}
                                    >
                                        <i className={`bi ${form.icon_data.replace('bi ', '') || 'bi-tag-fill'}`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <Form.Control
                                            type="text"
                                            list="iconos-sugeridos"
                                            value={form.icon_data}
                                            onChange={(e) => setForm({ ...form, icon_data: e.target.value })}
                                        />
                                        <datalist id="iconos-sugeridos">
                                            {iconosComunes.map(i => <option key={i} value={i} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6} className="d-flex align-items-center mt-3 mt-md-0">
                            <div className="w-100 p-3 bg-light border rounded h-100 d-flex align-items-center">
                                <Form.Check
                                    disabled={editingId === 'pendiente'}
                                    type="switch"
                                    id="calendar-switch"
                                    label="Mostrar encargos en calendario"
                                    checked={form.allow_calendar === 1 || form.allow_calendar === true}
                                    onChange={(e) => setForm({ ...form, allow_calendar: e.target.checked ? 1 : 0 })}
                                    className="fw-medium text-dark m-0"
                                />
                            </div>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light border-top">
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
                <Button variant="primary" type="submit" form="estadoForm">
                    <i className="bi bi-save me-1"></i> Guardar Estado
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}