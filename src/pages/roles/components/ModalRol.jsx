import { useState, useEffect } from 'react'
import { 
    Modal, 
    Button, 
    Form, 
    Row, 
    Col, 
    Card 
} from 'react-bootstrap'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true, 
    position: 'bottom-end', 
    showConfirmButton: false, 
    timer: 5000, 
    timerProgressBar: true
})

const LISTA_PERMISOS = [
    {
        modulo: 'Dashboard & Reportes',
        permisos: [
            { id: 'dashboard_ver', label: 'Ver panel principal' },
            { id: 'reportes_ver', label: 'Ver reportes financieros' }
        ]
    },
    {
        modulo: 'Ventas y Facturación',
        permisos: [
            { id: 'ventas_crear', label: 'Crear facturas (Vender)' },
            { id: 'ventas_historial', label: 'Ver histórico de facturas' },
            { id: 'ventas_anular', label: 'Anular facturas' },
            { id: 'notas_gestionar', label: 'Crear Notas Crédito/Débito' },
            { id: 'ventas_configurar', label: 'Configurar métodos de pago y caja' }
        ]
    },
    {
        modulo: 'Inventario y Productos',
        permisos: [
            { id: 'productos_ver', label: 'Ver catálogo de productos' },
            { id: 'productos_gestionar', label: 'Crear/Editar productos y servicios' },
            { id: 'categorias_gestionar', label: 'Gestionar categorías y etiquetas' },
            { id: 'inventario_ajustar', label: 'Hacer ajustes manuales de stock' }
        ]
    },
    {
        modulo: 'Usuarios y Seguridad',
        permisos: [
            { id: 'usuarios_gestionar', label: 'Crear/Editar/Eliminar usuarios' },
            { id: 'roles_gestionar', label: 'Crear/Editar roles y permisos' }
        ]
    }
]

export const ModalRol = ({ show, handleClose, editData, onSuccess }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        permisos: []
    })

    useEffect(() => {
        if (show) {
            if (editData) {
                let parsedPermisos = []
                try { parsedPermisos = JSON.parse(editData.permisos_json) } catch (e) {}
                setFormData({
                    nombre: editData.nombre,
                    descripcion: editData.descripcion || '',
                    permisos: parsedPermisos
                })
            } else {
                setFormData({ nombre: '', descripcion: '', permisos: [] })
            }
        }
    }, [show, editData])

    const handleTogglePermiso = (permisoId) => {
        setFormData(prev => {
            const hasPermiso = prev.permisos.includes(permisoId)
            if (hasPermiso) {
                return { ...prev, permisos: prev.permisos.filter(p => p !== permisoId) }
            } else {
                return { ...prev, permisos: [...prev.permisos, permisoId] }
            }
        })
    }

    const seleccionarTodos = () => {
        const todos = LISTA_PERMISOS.flatMap(m => m.permisos.map(p => p.id))
        setFormData({ ...formData, permisos: todos })
    }

    const limpiarTodos = () => setFormData({ ...formData, permisos: [] })

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.nombre.trim()) {
            return Toast.fire({ icon: 'error', title: 'El nombre del rol es obligatorio.' })
        }

        let res;
        if (editData) {
            res = await window.api.updateRol({ ...formData, id: editData.id })
        } else {
            res = await window.api.addRol(formData)
        }

        if (res.success) {
            Toast.fire({ icon: 'success', title: 'Rol guardado correctamente.' })
            onSuccess()
            handleClose()
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'Error al guardar el rol.' })
        }
    }

    const isSystemRole = editData && editData.is_system === 1

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className="bi bi-shield-lock me-2 text-primary"></i>
                    {editData ? 'Editar Rol' : 'Nuevo Rol de Acceso'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isSystemRole && (
                    <div className="alert alert-warning py-2 mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        Este es un rol nativo del sistema. Tiene acceso a todo y no puede ser modificado.
                    </div>
                )}
                <Form id="formRol" onSubmit={handleSubmit}>
                    <Row>
                        <Col md={5}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">Nombre del Rol <span className="text-danger">*</span></Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Ej: Supervisor" 
                                    value={formData.nombre} 
                                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                                    required 
                                    disabled={isSystemRole}
                                    autoFocus 
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">Descripción</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={3}
                                    placeholder="Funciones de este rol..." 
                                    value={formData.descripcion} 
                                    onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                                    disabled={isSystemRole}
                                />
                            </Form.Group>
                        </Col>
                        
                        <Col md={7}>
                            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                                <Form.Label className="fw-bold small m-0 text-primary">Asignación de Permisos</Form.Label>
                                {!isSystemRole && (
                                    <div>
                                        <Button variant="link" className="p-0 text-decoration-none small me-3" onClick={seleccionarTodos}>Marcar todos</Button>
                                        <Button variant="link" className="p-0 text-decoration-none small text-danger" onClick={limpiarTodos}>Limpiar</Button>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="pe-2">
                                {LISTA_PERMISOS.map((grupo, index) => (
                                    <Card key={index} className="mb-2 border-0 shadow-sm">
                                        <Card.Header className="bg-white py-1 px-3">
                                            <strong className="small text-secondary">{grupo.modulo}</strong>
                                        </Card.Header>
                                        <Card.Body className="py-2 px-3">
                                            {grupo.permisos.map(permiso => (
                                                <Form.Check 
                                                    key={permiso.id}
                                                    type="checkbox"
                                                    id={`permiso-${permiso.id}`}
                                                    label={<span className="small">{permiso.label}</span>}
                                                    checked={isSystemRole || formData.permisos.includes(permiso.id)}
                                                    onChange={() => handleTogglePermiso(permiso.id)}
                                                    disabled={isSystemRole}
                                                    className="mb-1"
                                                />
                                            ))}
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
                {!isSystemRole && (
                    <Button variant="primary" type="submit" form="formRol">
                        Guardar Rol
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    )
}