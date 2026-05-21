import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const ModalUsuario = ({ show, handleClose, editData, onSuccess }) => {
    const [formData, setFormData] = useState({
        nombre_completo: '',
        username: '',
        password: '',
        rol: 'Vendedor' // Valor por defecto temporal hasta crear el módulo de roles
    })

    // Lista temporal de roles (luego esto vendrá de la base de datos)
    const rolesDisponibles = ['Administrador', 'Gerente', 'Cajero', 'Vendedor']

    useEffect(() => {
        if (show) {
            if (editData) {
                setFormData({
                    nombre_completo: editData.nombre_completo,
                    username: editData.username,
                    password: '', // Siempre vacío por seguridad al editar
                    rol: editData.rol
                })
            } else {
                setFormData({ nombre_completo: '', username: '', password: '', rol: 'Vendedor' })
            }
        }
    }, [show, editData])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.nombre_completo.trim() || !formData.username.trim()) {
            return Swal.fire('Error', 'El nombre y el usuario son obligatorios.', 'error')
        }

        // Validación de contraseña solo requerida al crear
        if (!editData && (!formData.password || formData.password.length < 5)) {
            return Swal.fire('Error', 'La contraseña es obligatoria y debe tener al menos 5 caracteres.', 'error')
        }

        let res;
        if (editData) {
            res = await window.api.updateUsuario({ ...formData, id: editData.id })
        } else {
            res = await window.api.addUsuario(formData)
        }

        if (res.success) {
            Swal.fire({
                title: '¡Guardado!',
                text: 'El usuario ha sido registrado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
            onSuccess()
            handleClose()
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className="bi bi-person-badge me-2 text-primary"></i>
                    {editData ? 'Editar Usuario' : 'Nuevo Usuario'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form id="formUsuario" onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small">Nombre Completo <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="Ej: Juan Pérez" 
                            value={formData.nombre_completo} 
                            onChange={e => setFormData({...formData, nombre_completo: e.target.value})} 
                            required 
                            autoFocus 
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">Usuario de Acceso <span className="text-danger">*</span></Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Ej: juanp" 
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} 
                                    required 
                                />
                                <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>Sin espacios ni mayúsculas</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">Contraseña {editData && <span className="text-muted fw-normal">(Opcional)</span>}</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    placeholder={editData ? "Escribe para cambiar" : "Mínimo 5 caracteres"} 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    required={!editData}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-2 border-top pt-3">
                        <Form.Label className="fw-bold small text-primary">Rol / Nivel de Acceso</Form.Label>
                        <Form.Select 
                            value={formData.rol} 
                            onChange={e => setFormData({...formData, rol: e.target.value})}
                        >
                            {rolesDisponibles.map(rol => (
                                <option key={rol} value={rol}>{rol}</option>
                            ))}
                        </Form.Select>
                        <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Próximamente asociaremos este rol a los permisos específicos en el módulo de Roles.
                        </Form.Text>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="formUsuario">
                    <i className="bi bi-save me-2"></i> Guardar Usuario
                </Button>
            </Modal.Footer>
        </Modal>
    )
}