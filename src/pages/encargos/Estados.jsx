import { useEffect, useRef, useState } from "react"
import CustomDataTable from "../../components/DataTableComponent"
import { 
    Button, 
    Col, 
    Form, 
    FormGroup, 
    Modal, 
    Row,
    InputGroup,
    Table
} from "react-bootstrap"
import Swal from "sweetalert2"
import { encargosService } from "../../services/encargosService"

// Función auxiliar para parsear JSON de forma segura
const safeParse = (str) => {
    if (!str) return [];
    try { 
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [{ nombre: str, can_assign: true, can_modify: true }];
    } catch { 
        return [{ nombre: str, can_assign: true, can_modify: true }]; 
    }
}

export const Estados = () => {
    const [show, setShow] = useState(false)
    const [reloadTable, setReloadTable] = useState(0)
    
    const [alcancePolitica, setAlcancePolitica] = useState('global')

    // Listas globales de DB (Blindadas para que siempre sean Arrays)
    const [usuariosDB, setUsuariosDB] = useState([])
    const [rolesDB, setRolesDB] = useState([])

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    
    const [form, setForm] = useState({
        titulo: '',
        descripcion: '',
        color: '#0d6efd',
        allow_calendar: 0,
        icon_data: 'bi-tag-fill',
    })

    // Estados para las listas dinámicas de permisos
    const [asignacionesUsuarios, setAsignacionesUsuarios] = useState([])
    const [asignacionesRoles, setAsignacionesRoles] = useState([])
    
    // Inputs temporales para agregar a las listas
    const [newUserItem, setNewUserItem] = useState('')
    const [newRoleItem, setNewRoleItem] = useState('')

    const [editingId, setEditingId] = useState(null)

    const iconosComunes = [
        "bi-tag-fill", "bi-check-circle", "bi-check-circle-fill", "bi-clock", "bi-clock-history",
        "bi-exclamation-triangle", "bi-exclamation-circle", "bi-x-circle", "bi-x-circle-fill",
        "bi-arrow-counterclockwise", "bi-trash", "bi-question-circle", "bi-three-dots",
        "bi-box", "bi-box-seam", "bi-truck", "bi-send", "bi-wallet2", "bi-cash",
        "bi-credit-card", "bi-cart-check", "bi-bag-check", "bi-hourglass-split", "bi-tools"
    ]

    const loadData = async () => {
        // Cargar los estados
        const data = await encargosService.getEstados()
        setItems(Array.isArray(data) ? data : [])
        setDataInTable(Array.isArray(data) ? data : [])
        
        // Cargar la configuración corregida
        try {
            const settings = await window.api.getEncargosSettings()
            if (settings && settings.alcance_estados) {
                setAlcancePolitica(settings.alcance_estados)
            }
        } catch (error) {}

        // Cargar Catálogos BLINDADOS
        try {
            if (window.api.getUsuarios) {
                const users = await window.api.getUsuarios()
                // Evitamos que falle si devuelve un objeto en vez de arreglo
                if (users?.success && Array.isArray(users?.data)) setUsuariosDB(users.data)
                else if (Array.isArray(users)) setUsuariosDB(users)
                else setUsuariosDB([])
            }
            if (window.api.getRoles) {
                const roles = await window.api.getRoles()
                if (roles?.success && Array.isArray(roles?.data)) setRolesDB(roles.data)
                else if (Array.isArray(roles)) setRolesDB(roles)
                else setRolesDB([])
            }
        } catch (e) { 
            console.error("No se pudieron cargar catálogos", e) 
            setUsuariosDB([])
            setRolesDB([])
        }

        setReloadTable(prev => prev + 1)
    }

    const cleanForm = () => {
        setForm({
            titulo: '',
            descripcion: '',
            color: '#0d6efd',
            allow_calendar: 0,
            icon_data: 'bi-tag-fill',
        })
        setAsignacionesUsuarios([])
        setAsignacionesRoles([])
        setNewUserItem('')
        setNewRoleItem('')
    }

    useEffect(() => { 
        loadData();
        window.addEventListener('configuracion-estados-actualizada', loadData);
        return () => window.removeEventListener('configuracion-estados-actualizada', loadData);
    }, [])

    const handleAddAsignacion = (tipo) => {
        if (tipo === 'usuario' && newUserItem.trim()) {
            const nombreUser = newUserItem.trim();
            if (asignacionesUsuarios.some(u => u.nombre.toLowerCase() === nombreUser.toLowerCase())) {
                return Swal.fire('Aviso', 'Este usuario ya está en la lista', 'info');
            }
            
            // Buscar si el usuario existe en DB para traer su foto
            const userObj = usuariosDB.find(u => u.nombre === nombreUser || u.usuario === nombreUser) || {};
            
            setAsignacionesUsuarios([...asignacionesUsuarios, {
                nombre: nombreUser,
                foto: userObj.foto || userObj.avatar || null,
                can_assign: true,
                can_modify: true
            }]);
            setNewUserItem('');

        } else if (tipo === 'rol' && newRoleItem.trim()) {
            const nombreRol = newRoleItem.trim().toUpperCase();
            if (asignacionesRoles.some(r => r.nombre === nombreRol)) {
                return Swal.fire('Aviso', 'Este rol ya está en la lista', 'info');
            }
            
            setAsignacionesRoles([...asignacionesRoles, {
                nombre: nombreRol,
                can_assign: true,
                can_modify: true
            }]);
            setNewRoleItem('');
        }
    }

    const updatePermiso = (index, campo, valor, tipo) => {
        if (tipo === 'usuario') {
            const nuevas = [...asignacionesUsuarios];
            nuevas[index][campo] = valor;
            setAsignacionesUsuarios(nuevas);
        } else {
            const nuevas = [...asignacionesRoles];
            nuevas[index][campo] = valor;
            setAsignacionesRoles(nuevas);
        }
    }

    const removeAsignacion = (index, tipo) => {
        if (tipo === 'usuario') {
            const nuevas = [...asignacionesUsuarios];
            nuevas.splice(index, 1);
            setAsignacionesUsuarios(nuevas);
        } else {
            const nuevas = [...asignacionesRoles];
            nuevas.splice(index, 1);
            setAsignacionesRoles(nuevas);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        let result;
        
        const cleanIcon = form.icon_data.trim().replace(/^bi\s+/, '');
        
        // Convertimos las asignaciones a string JSON para guardarlas en la base de datos
        const payload = { 
            ...form, 
            icon_data: cleanIcon,
            usuario_asignado: alcancePolitica === 'usuario' ? JSON.stringify(asignacionesUsuarios) : '',
            rol_asignado: alcancePolitica === 'rol' ? JSON.stringify(asignacionesRoles) : ''
        };

        if (editingId) {
            result = await encargosService.updateEstado({ ...payload, id: editingId })
        } else {
            result = await encargosService.addEstado(payload)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Estado guardado', icon: 'success', timer: 1500 })
            cleanForm()
            handleClose()
            loadData()
            
            window.dispatchEvent(new CustomEvent('estados-actualizados'))
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error')
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar Estado?",
            text: "Todos los encargos que tengan este estado asignado quedarán con estado nulo.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await encargosService.deleteEstado(id)
            if (res.success) {
                loadData()
                window.dispatchEvent(new CustomEvent('estados-actualizados'))
            }
        }
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)

                    setForm({
                        titulo: item.titulo || '',
                        descripcion: item.descripcion || '',
                        color: item.color || '#0d6efd',
                        allow_calendar: item.allow_calendar ? 1 : 0,
                        icon_data: item.icon_data || 'bi-tag-fill',
                    })

                    setAsignacionesUsuarios(safeParse(item.usuario_asignado))
                    setAsignacionesRoles(safeParse(item.rol_asignado))

                    setEditingId(item.id)
                    handleShow()
                } catch (err) { console.error("Error leyendo datos", err) }
            }

            const delBtn = e.target.closest('.btn-delete')
            if (delBtn) handleDelete(delBtn.dataset.id)
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                Nuevo Estado
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <CustomDataTable
                tableId="dt-encargos-estados"
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    {
                        data: 'titulo',
                        title: 'Título',
                        render: (data, type, row) => {
                            let textColor = '#ffffff';
                            if (row.color) {
                                const hex = row.color.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                            }
                            
                            const iconClass = row.icon_data && row.icon_data.startsWith('bi-') 
                                ? `bi ${row.icon_data}` 
                                : (row.icon_data || 'bi bi-tag-fill');

                            return `
                                <span class="badge" style="background-color: ${row.color || '#6c757d'}; color: ${textColor}; font-size: 13px;">
                                    <i class="${iconClass} me-1"></i> ${data}
                                </span>
                            `;
                        }
                    },
                    { data: 'descripcion', title: 'Descripción' },
                    {
                        data: null,
                        title: 'Accesibilidad',
                        render: (data, type, row) => {
                            if (alcancePolitica === 'usuario' && row.usuario_asignado) {
                                const arr = safeParse(row.usuario_asignado);
                                const names = arr.map(u => u.nombre).join(', ');
                                return `<span class="text-primary fw-bold" title="${names}"><i class="bi bi-people-fill me-1"></i> ${arr.length} Usuario(s)</span>`;
                            }
                            if (alcancePolitica === 'rol' && row.rol_asignado) {
                                const arr = safeParse(row.rol_asignado);
                                const names = arr.map(r => r.nombre).join(', ');
                                return `<span class="text-info fw-bold" title="${names}"><i class="bi bi-shield-lock-fill me-1"></i> ${arr.length} Rol(es)</span>`;
                            }
                            return `<span class="text-success fw-bold"><i class="bi bi-globe me-1"></i> Global</span>`;
                        }
                    },
                    {
                        data: 'allow_calendar',
                        title: 'En calendario',
                        render: (data) => `${Number(data) > 0 ? 'Si' : 'No'}`
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" title="Eliminar">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `;
                        }
                    }
                ]}
            />
        </div>

        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>{editingId ? 'Editar Estado' : 'Nuevo Estado'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
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

                    {/* CONFIGURACIÓN DE PERMISOS POR USUARIO */}
                    {alcancePolitica === 'usuario' && (
                        <div className="mb-4 p-3 bg-light border border-primary border-opacity-25 rounded shadow-sm">
                            <Form.Label className="fw-bold text-primary"><i className="bi bi-people-fill me-1"></i> Asignación de Usuarios</Form.Label>
                            <InputGroup className="mb-3">
                                <Form.Control 
                                    list="usuarios-list"
                                    placeholder="Escribe o selecciona un usuario..." 
                                    value={newUserItem} 
                                    onChange={(e) => setNewUserItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAsignacion('usuario'))}
                                />
                                <datalist id="usuarios-list">
                                    {usuariosDB.map(u => <option key={u.id} value={u.nombre || u.usuario} />)}
                                </datalist>
                                <Button variant="primary" onClick={() => handleAddAsignacion('usuario')}>
                                    <i className="bi bi-plus-lg me-1"></i> Agregar
                                </Button>
                            </InputGroup>

                            {asignacionesUsuarios.length > 0 && (
                                <Table size="sm" bordered hover className="align-middle bg-white mb-0">
                                    <thead className="table-light text-center small">
                                        <tr>
                                            <th className="text-start">Usuario</th>
                                            <th>Puede Asignar este estado</th>
                                            <th>Puede Modificar este estado</th>
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

                    {/* CONFIGURACIÓN DE PERMISOS POR ROL */}
                    {alcancePolitica === 'rol' && (
                        <div className="mb-4 p-3 bg-light border border-info border-opacity-25 rounded shadow-sm">
                            <Form.Label className="fw-bold text-info"><i className="bi bi-shield-lock-fill me-1"></i> Asignación de Roles</Form.Label>
                            <InputGroup className="mb-3">
                                <Form.Control 
                                    list="roles-list"
                                    placeholder="Escribe o selecciona un rol..." 
                                    value={newRoleItem} 
                                    onChange={(e) => setNewRoleItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAsignacion('rol'))}
                                />
                                <datalist id="roles-list">
                                    {rolesDB.map(r => <option key={r.id} value={r.nombre} />)}
                                </datalist>
                                <Button variant="info" className="text-white" onClick={() => handleAddAsignacion('rol')}>
                                    <i className="bi bi-plus-lg me-1"></i> Agregar
                                </Button>
                            </InputGroup>

                            {asignacionesRoles.length > 0 && (
                                <Table size="sm" bordered hover className="align-middle bg-white mb-0">
                                    <thead className="table-light text-center small">
                                        <tr>
                                            <th className="text-start">Rol</th>
                                            <th>Puede Asignar este estado</th>
                                            <th>Puede Modificar este estado</th>
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