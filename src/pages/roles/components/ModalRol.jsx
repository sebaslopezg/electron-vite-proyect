import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col, Card, Collapse } from 'react-bootstrap'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true, 
    position: 'bottom-end', 
    showConfirmButton: false, 
    timer: 4000, 
    timerProgressBar: true
})

const ESQUEMA_SEGURIDAD = [
    { id: 'mod_ventas', nombre: 'Ventas', icono: 'bi-receipt-cutoff', path: '/ventas', submodulos: [{ id: 'ventas_crear', label: 'Facturación (Vender en mostrador, gestionar clientes y apartados)' }, { id: 'ventas_historial', label: 'Ver Facturas (Historial de documentos)', permisos_hijos: [{ id: 'ventas_imprimir', label: 'Permitir re-imprimir tirillas o formatos de facturas' }] }, { id: 'reportes_ver', label: 'Reportes y Métricas financieras de ventas' }, { id: 'notas_gestionar', label: 'Gestión de Notas de Ajuste (Crédito y Débito)' }, { id: 'ventas_configurar', label: 'Configurar datos fiscales, resoluciones y métodos de pago' }] },
    { id: 'mod_productos', nombre: 'Productos y Servicios', icono: 'bi-box-seam', path: '/productos', submodulos: [{ id: 'productos_ver', label: 'Ver catálogo maestro de productos y servicios base' }, { id: 'productos_gestionar', label: 'Crear, actualizar o eliminar registros del catálogo' }, { id: 'categorias_gestionar', label: 'Administrar taxonomías (Categorías, Subcategorías y Etiquetas)' }] },
    { id: 'mod_inventario', nombre: 'Inventario (Kárdex)', icono: 'bi-clipboard-check', path: '/inventario', submodulos: [{ id: 'inventario_ver', label: 'Visualizar existencias y existencias mínimas de stock' }, { id: 'inventario_ajustar', label: 'Realizar ajustes manuales directos sobre el stock (+ / -)' }] },
    { id: 'mod_compras', nombre: 'Compras y Gastos', icono: 'bi-cart4', path: '/compras', submodulos: [{ id: 'compras_ver', label: 'Consultar el histórico y detalles de compras a proveedores' }, { id: 'compras_crear', label: 'Registrar nuevas facturas de compras o gastos contables' }] },
    { id: 'mod_clientes', nombre: 'Clientes y Terceros', icono: 'bi-people', path: '/clientes', submodulos: [{ id: 'clientes_ver', label: 'Visualizar el directorio de clientes generales' }, { id: 'clientes_crear', label: 'Registrar nuevos clientes de mostrador o empresas' }, { id: 'clientes_editar', label: 'Modificar perfiles de clientes y datos demográficos' }, { id: 'clientes_eliminar', label: 'Remover o desactivar clientes del sistema' }] },
    { id: 'mod_cartera', nombre: 'Cartera y Cobranzas', icono: 'bi-wallet2', path: '/cartera', submodulos: [{ id: 'cartera_ver', label: 'Consultar reportes de cuentas por cobrar y deudas activas' }, { id: 'cartera_abonos_ver', label: 'Acceso a ventana de Abonos Directos', permisos_hijos: [{ id: 'cartera_abonar', label: 'Permitir abonar (Registrar recaudos sobre saldos pendientes)' }] }, { id: 'cartera_historial_ver', label: 'Visualizar historial cronológico de abonos recibidos', permisos_hijos: [{ id: 'cartera_abono_imprimir', label: 'Permitir imprimir comprobantes de pago (POS / A4)' }] }] },
    { id: 'mod_encargos', nombre: 'Encargos y Apartados', icono: 'bi-calendar-event', path: '/encargos', submodulos: [{ id: 'encargos_ver', label: 'Consultar estados y agenda de pedidos pendientes' }, { id: 'encargos_gestionar', label: 'Actualizar flujos, despachar o anular encargos' }] },
    { id: 'mod_contabilidad', nombre: 'Contabilidad Integral (NIIF)', icono: 'bi-calculator-fill', path: '/contabilidad', submodulos: [{ id: 'puc_ver', label: 'Plan Único de Cuentas (Visualizar árbol PUC)', permisos_hijos: [{ id: 'puc_crear', label: 'Crear nuevas cuentas contables auxiliares' }, { id: 'puc_editar', label: 'Modificar nombres o parámetros de cuentas existentes' }, { id: 'puc_eliminar', label: 'Eliminar cuentas contables (Sin movimientos activos)' }] }, { id: 'terceros_ver', label: 'Directorio de Terceros (Ver Clientes/Proveedores globales)', permisos_hijos: [{ id: 'terceros_crear', label: 'Registrar nuevos terceros en el sistema' }, { id: 'terceros_editar', label: 'Modificar información fiscal o datos de terceros' }, { id: 'terceros_eliminar', label: 'Eliminar definitivamente terceros del directorio' }] }, { id: 'comprobantes_ver', label: 'Comprobantes (Habilita ver listado y detalles de asientos contables)', permisos_hijos: [{ id: 'comprobantes_crear', label: 'Crear asiento contable manual' }, { id: 'comprobantes_editar', label: 'Modificar/Corregir asientos contables existentes' }] }, { id: 'contabilidad_reportes_ver', label: 'Reportes Financieros NIIF (Balance General, PyG y Balance de Prueba)' }, { id: 'contabilidad_config_ver', label: 'Configuración Contable (Visualizar módulo de enlaces automáticos)', permisos_hijos: [{ id: 'config_cuentas_ventas', label: 'Asignar cuentas automáticas de ventas' }, { id: 'config_cuentas_compras', label: 'Asignar cuentas automáticas de compras y gastos' }, { id: 'config_metodos_pago', label: 'Asignar o mapear cuentas por métodos de pago' }] }] },
    { id: 'mod_usuarios', nombre: 'Usuarios del Sistema', icono: 'bi-person-badge', path: '/usuarios', submodulos: [{ id: 'usuarios_crear', label: 'Crear usuarios (Dar de alta nuevas cuentas de acceso)' }, { id: 'usuarios_editar', label: 'Modificar usuarios (Editar perfiles o restablecer claves)' }, { id: 'usuarios_eliminar', label: 'Eliminar usuarios (Dar de baja cuentas de empleados)' }] },
    { id: 'mod_roles', nombre: 'Roles y Privilegios', icono: 'bi-shield-lock', path: '/roles', submodulos: [{ id: 'roles_crear', label: 'Crear roles (Estructurar perfiles y nuevas matrices)' }, { id: 'roles_editar', label: 'Modificar roles (Actualizar políticas de acceso de perfiles)' }, { id: 'roles_eliminar', label: 'Eliminar roles (Remover perfiles sin usuarios asignados)' }] },
    
    { 
        id: 'mod_configuracion', 
        nombre: 'Configuración Global', 
        icono: 'bi-gear', 
        path: '/configuracion', 
        submodulos: [
            { id: 'configuracion_general', label: 'Configuración general (Datos de la app, logos y formatos)' },
            { id: 'ver_logs', label: 'Ver logs (Auditoría y registro de eventos del sistema)' },
            { 
                id: 'manejo_datos', 
                label: 'Manejo de datos (Gestión de perfiles de bases de datos)',
                permisos_hijos: [
                    { id: 'datos_perfiles_crear', label: 'Crear perfiles de datos' },
                    { id: 'datos_perfiles_cambiar', label: 'Cambiar de perfil' },
                    { id: 'datos_perfiles_eliminar', label: 'Eliminar perfiles' },
                    { id: 'datos_info_ver', label: 'Ver información de datos' },
                    { id: 'datos_tablas_ver', label: 'Ver contenido de tablas de datos' },
                    { id: 'datos_tablas_vaciar', label: '⚠️ Vaciar tablas de datos (Destructivo)' }
                ]
            },
            { id: 'importar_datos', label: 'Importar datos (CSV / SQL / Relacional)' },
            { id: 'exportar_datos', label: 'Exportar datos (Respaldos de seguridad)' }
        ] 
    }
]

export const ModalRol = ({ show, handleClose, editData, onSuccess }) => {
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [permisosSeleccionados, setPermisosSeleccionados] = useState([])
    const [modulosActivos, setModulosActivos] = useState({})
    const [defaultRoute, setDefaultRoute] = useState('/ventas')

    useEffect(() => {
        if (show) {
            if (editData) {
                setNombre(editData.nombre)
                setDescripcion(editData.descripcion || '')
                let parsed = []
                try { parsed = JSON.parse(editData.permisos_json) } catch (e) {}
                
                const tokenRuta = parsed.find(p => p.startsWith('START_PATH:'))
                if (tokenRuta) {
                    setDefaultRoute(tokenRuta.split(':')[1])
                } else {
                    setDefaultRoute('/ventas')
                }

                const filteredPermisos = parsed.filter(p => !p.startsWith('START_PATH:'))
                setPermisosSeleccionados(filteredPermisos)

                const dectectModulos = {}
                ESQUEMA_SEGURIDAD.forEach(mod => {
                    let tienePermisosActivos = mod.submodulos.some(sub => 
                        filteredPermisos.includes(sub.id) || (sub.permisos_hijos?.some(hijo => filteredPermisos.includes(hijo.id)))
                    )
                    if (mod.id === 'mod_contabilidad' && filteredPermisos.includes('contabilidad_ver')) tienePermisosActivos = true
                    if (mod.id === 'mod_usuarios' && filteredPermisos.includes('usuarios_ver')) tienePermisosActivos = true
                    if (mod.id === 'mod_roles' && filteredPermisos.includes('roles_ver')) tienePermisosActivos = true
                    if (mod.id === 'mod_configuracion' && filteredPermisos.includes('configuracion_sistema')) tienePermisosActivos = true

                    if (tienePermisosActivos) dectectModulos[mod.id] = true
                })
                setModulosActivos(dectectModulos)
            } else {
                setNombre('')
                setDescripcion('')
                setPermisosSeleccionados([])
                setModulosActivos({})
                setDefaultRoute('/ventas')
            }
        }
    }, [show, editData])

    const handleToggleModulo = (moduloId, submodulos) => {
        const estaActivo = !!modulosActivos[moduloId]
        setModulosActivos(prev => ({ ...prev, [moduloId]: !estaActivo }))

        if (estaActivo) {
            const idsALimpiar = [moduloId]
            if (moduloId === 'mod_contabilidad') idsALimpiar.push('contabilidad_ver')
            if (moduloId === 'mod_usuarios') idsALimpiar.push('usuarios_ver')
            if (moduloId === 'mod_roles') idsALimpiar.push('roles_ver')
            if (moduloId === 'mod_configuracion') idsALimpiar.push('configuracion_sistema')

            submodulos.forEach(sub => {
                idsALimpiar.push(sub.id)
                if (sub.permisos_hijos) sub.permisos_hijos.forEach(h => idsALimpiar.push(h.id))
            })
            setPermisosSeleccionados(prev => prev.filter(id => !idsALimpiar.includes(id)))
        }
    }

    const handleTogglePermiso = (permisoId, parentId = null) => {
        setPermisosSeleccionados(prev => {
            const existe = prev.includes(permisoId)
            let nuevoArreglo = existe ? prev.filter(id => id !== permisoId) : [...prev, permisoId]

            if (existe) {
                const submoduloPadre = ESQUEMA_SEGURIDAD.flatMap(m => m.submodulos).find(s => s.id === permisoId)
                if (submoduloPadre && submoduloPadre.permisos_hijos) {
                    const hijosIds = submoduloPadre.permisos_hijos.map(h => h.id)
                    nuevoArreglo = nuevoArreglo.filter(id => !hijosIds.includes(id))
                }
            } else if (parentId) {
                if (!nuevoArreglo.includes(parentId)) nuevoArreglo.push(parentId)
            }
            return nuevoArreglo
        })
    }

    const seleccionarTodoElSistema = () => {
        const todosLosIds = []
        const todosLosModulos = {}
        ESQUEMA_SEGURIDAD.forEach(mod => {
            todosLosModulos[mod.id] = true
            mod.submodulos.forEach(sub => {
                todosLosIds.push(sub.id)
                if (sub.permisos_hijos) sub.permisos_hijos.forEach(h => todosLosIds.push(h.id))
            })
        })
        setModulosActivos(todosLosModulos)
        setPermisosSeleccionados(todosLosIds)
    }

    const limpiarTodoElSistema = () => {
        setModulosActivos({})
        setPermisosSeleccionados([])
        setDefaultRoute('/ventas')
    }

    const handleFormSubmit = async (e) => {
        e.preventDefault()
        if (!nombre.trim()) return Toast.fire({ icon: 'error', title: 'Falta el nombre del rol.' })

        let permisosLimpios = permisosSeleccionados.filter(p => p !== 'contabilidad_ver' && p !== 'usuarios_ver' && p !== 'roles_ver' && p !== 'configuracion_sistema')

        const listaContabilidadCheckboxes = ['puc_ver', 'puc_crear', 'puc_editar', 'puc_eliminar', 'terceros_ver', 'terceros_crear', 'terceros_editar', 'terceros_eliminar', 'comprobantes_ver', 'comprobantes_crear', 'comprobantes_editar', 'contabilidad_reportes_ver', 'contabilidad_config_ver']
        if (permisosLimpios.some(p => listaContabilidadCheckboxes.includes(p)) || modulosActivos['mod_contabilidad']) permisosLimpios.push('contabilidad_ver')

        const listaUsuariosCheckboxes = ['usuarios_crear', 'usuarios_editar', 'usuarios_eliminar']
        if (permisosLimpios.some(p => listaUsuariosCheckboxes.includes(p)) || modulosActivos['mod_usuarios']) permisosLimpios.push('usuarios_ver')

        const listaRolesCheckboxes = ['roles_crear', 'roles_editar', 'roles_eliminar']
        if (permisosLimpios.some(p => listaRolesCheckboxes.includes(p)) || modulosActivos['mod_roles']) permisosLimpios.push('roles_ver')

        const listaConfigCheckboxes = ['configuracion_general', 'ver_logs', 'manejo_datos', 'datos_perfiles_crear', 'datos_perfiles_cambiar', 'datos_perfiles_eliminar', 'datos_info_ver', 'datos_tablas_ver', 'datos_tablas_vaciar', 'importar_datos', 'exportar_datos']
        if (permisosLimpios.some(p => listaConfigCheckboxes.includes(p)) || modulosActivos['mod_configuracion']) permisosLimpios.push('configuracion_sistema')


        const permisosFinales = [...permisosLimpios, `START_PATH:${defaultRoute}`]

        const payload = { nombre: nombre, descripcion: descripcion, permisos: permisosFinales }

        let res = editData ? await window.api.updateRol({ ...payload, id: editData.id }) : await window.api.addRol(payload)

        if (res.success) {
            Toast.fire({ icon: 'success', title: 'Rol de seguridad estructurado y guardado.' })
            onSuccess()
            handleClose()
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'Error al compilar el rol.' })
        }
    }

    const isSystemRole = editData && editData.is_system === 1
    const modulosDisponiblesParaInicio = ESQUEMA_SEGURIDAD.filter(m => !!modulosActivos[m.id] || isSystemRole)

    useEffect(() => {
        if (modulosDisponiblesParaInicio.length > 0 && !modulosDisponiblesParaInicio.some(m => m.path === defaultRoute)) {
            setDefaultRoute(modulosDisponiblesParaInicio[0].path)
        }
    }, [modulosActivos])

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered backdrop="static" scrollable>
            <Modal.Header closeButton className="bg-light border-bottom">
                <Modal.Title className="h5 fw-bold text-dark">
                    <i className="bi bi-shield-check text-primary me-2 fs-4"></i>
                    {editData ? `Editar Matriz: ${editData.nombre}` : 'Crear Perfil y Matriz de Privilegios'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4" style={{ maxHeight: '70vh' }}>
                
                {isSystemRole && (
                    <div className="alert alert-warning border-0 shadow-sm py-2 mb-4">
                        <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                        <strong>Rol Nativo del Sistema:</strong> Este rol posee acceso absoluto por bypass de desarrollo.
                    </div>
                )}

                <Form id="formMatrizSeguridad" onSubmit={handleFormSubmit}>
                    <Row className="mb-4 border-bottom pb-4 align-items-end">
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small text-secondary">Nombre del Rol <span className="text-danger">*</span></Form.Label>
                                <Form.Control 
                                    type="text" placeholder="Ej: Cajero..." 
                                    value={nombre} onChange={e => setNombre(e.target.value)}
                                    required disabled={isSystemRole} size="sm" className="text-dark"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small text-secondary">Descripción Operativa</Form.Label>
                                <Form.Control 
                                    type="text" placeholder="Funciones asignadas..." 
                                    value={descripcion} onChange={e => setDescripcion(e.target.value)}
                                    disabled={isSystemRole} size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3 bg-light p-2 rounded border border-primary border-opacity-25">
                                <Form.Label className="small m-0 mb-1">
                                    <i className="bi bi-box-arrow-in-right me-1"></i>Módulo de Inicio por Defecto
                                </Form.Label>
                                <Form.Select 
                                    size="sm" 
                                    value={defaultRoute} 
                                    onChange={e => setDefaultRoute(e.target.value)}
                                    disabled={isSystemRole}
                                    className="text-dark"
                                >
                                    {isSystemRole && <option value="/ventas">Ventas (Por Defecto)</option>}
                                    {modulosDisponiblesParaInicio.map(m => (
                                        <option key={m.id} value={m.path}>{m.nombre}</option>
                                    ))}
                                    {modulosDisponiblesParaInicio.length === 0 && !isSystemRole && (
                                        <option value="/ventas">Selecciona un módulo a la derecha...</option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <div 
                        className="d-flex justify-content-between align-items-center border-bottom bg-white"
                        style={{ position: 'sticky', top: '-24px', zIndex: 100, margin: '-24px -24px 1.5rem -24px', padding: '15px 24px' }}
                    >
                        <strong className="m-0"><i className="bi bi-list-check me-2 fs-5"></i>Estructura Modular de Accesos Directos</strong>
                        {!isSystemRole && (
                            <div>
                                <Button variant="outline-primary" className="px-4 me-2" onClick={seleccionarTodoElSistema}>Habilitar todo el ERP</Button>
                                <Button variant="outline-danger" className="px-4" onClick={limpiarTodoElSistema}>Remover accesos</Button>
                            </div>
                        )}
                    </div>

                    <Row className="g-3">
                        {ESQUEMA_SEGURIDAD.map(modulo => {
                            const moduloHabilitado = !!modulosActivos[modulo.id] || isSystemRole
                            return (
                                <Col md={6} xl={4} key={modulo.id}>
                                    <Card className={`h-100 shadow-sm border-0 border-top border-3 ${moduloHabilitado ? 'border-primary' : 'border-muted bg-light bg-opacity-50'}`} style={{ borderRadius: '6px' }}>
                                        <Card.Header className="bg-white d-flex justify-content-between align-items-center py-2 px-3">
                                            <div className="d-flex align-items-center">
                                                <i className={`bi ${modulo.icono} me-2 fs-5 ${moduloHabilitado ? 'text-primary' : 'text-muted'}`}></i>
                                                <strong className={moduloHabilitado ? 'text-dark fw-bold' : 'text-muted fw-normal'}>{modulo.nombre}</strong>
                                            </div>
                                            <Form.Check 
                                                type="switch" id={`switch-${modulo.id}`}
                                                checked={moduloHabilitado} disabled={isSystemRole}
                                                onChange={() => handleToggleModulo(modulo.id, modulo.submodulos)}
                                                className="fs-5"
                                            />
                                        </Card.Header>
                                        <Collapse in={moduloHabilitado}>
                                            <div>
                                                <Card.Body className="py-2 px-3 border-top border-light bg-white" style={{ minHeight: '110px' }}>
                                                    {modulo.submodulos.map(sub => {
                                                        const subMarcado = permisosSeleccionados.includes(sub.id) || isSystemRole
                                                        return (
                                                            <div key={sub.id} className="mb-2 border-bottom border-light pb-1 last-border-0">
                                                                <Form.Check 
                                                                    type="checkbox" id={`check-${sub.id}`}
                                                                    label={<span className={`small ${subMarcado ? 'fw-medium text-dark' : 'text-muted'}`}>{sub.label}</span>}
                                                                    checked={subMarcado} disabled={isSystemRole}
                                                                    onChange={() => handleTogglePermiso(sub.id)}
                                                                    className="d-flex align-items-start"
                                                                />
                                                                {sub.permisos_hijos && subMarcado && (
                                                                    <div className="ms-4 mt-1 bg-light p-2 rounded border border-light animate__animated animate__fadeIn">
                                                                        {sub.permisos_hijos.map(hijo => (
                                                                            <Form.Check 
                                                                                key={hijo.id} type="checkbox" id={`hijo-${hijo.id}`}
                                                                                label={
                                                                                    <span className={`small text-secondary fst-italic ${hijo.id === 'datos_tablas_vaciar' ? 'text-danger fw-bold' : ''}`}>
                                                                                        <i className="bi bi-arrow-return-right me-1"></i> {hijo.label}
                                                                                    </span>
                                                                                }
                                                                                checked={permisosSeleccionados.includes(hijo.id) || isSystemRole} disabled={isSystemRole}
                                                                                onChange={() => handleTogglePermiso(hijo.id, sub.id)}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </Card.Body>
                                            </div>
                                        </Collapse>
                                    </Card>
                                </Col>
                            )
                        })}
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light border-top">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                {!isSystemRole && (
                    <Button variant="primary" type="submit" form="formMatrizSeguridad" className="px-4">
                        Guardar
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    )
}