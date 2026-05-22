import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const ModalUsuario = ({ show, handleClose, editData, onSuccess, rolesDisponibles = [] }) => {
    const [formData, setFormData] = useState({
        nombre_completo: '',
        username: '',
        password: '',
        rol: ''
    })

    useEffect(() => {
        if (show) {
            const defaultRol = rolesDisponibles.length > 0 ? rolesDisponibles[0].nombre : 'Vendedor'

            if (editData) {
                setFormData({
                    nombre_completo: editData.nombre_completo,
                    username: editData.username,
                    password: '', 
                    rol: editData.rol || defaultRol
                })
            } else {
                setFormData({ 
                    nombre_completo: '', 
                    username: '', 
                    password: '', 
                    rol: defaultRol 
                })
            }
        }
    }, [show, editData, rolesDisponibles])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.nombre_completo.trim() || !formData.username.trim()) {
            return Toast.fire({ icon: 'error', title: 'El nombre y el usuario son obligatorios.' })
        }

        if (!editData && (!formData.password || formData.password.length < 5)) {
            return Toast.fire({ icon: 'warning', title: 'La contraseña es obligatoria y debe tener al menos 5 caracteres.' })
        }

        if (!formData.rol) {
            return Toast.fire({ icon: 'error', title: 'Debe seleccionar un rol para el usuario.' })
        }

        let res;
        if (editData) {
            res = await window.api.updateUsuario({ ...formData, id: editData.id })
        } else {
            res = await window.api.addUsuario(formData)
        }

        if (res.success) {
            Toast.fire({ icon: 'success', title: 'Usuario guardado correctamente.' })
            onSuccess()
            handleClose()
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'Error al guardar' })
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    {editData ? 'Editar Usuario' : 'Nuevo Usuario Global'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form id="formUsuario" onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small">Nombre Completo <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            type="text" 
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
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    required={!editData}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-2 border-top pt-3">
                        <Form.Label className="fw-bold small text-primary">Rol Global Asignado</Form.Label>
                        <Form.Select 
                            value={formData.rol} 
                            onChange={e => setFormData({...formData, rol: e.target.value})}
                            required
                        >
                            {rolesDisponibles.length === 0 && <option value="">Sin roles disponibles...</option>}
                            {rolesDisponibles.map(rol => (
                                <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="formUsuario">
                    Guardar Usuario
                </Button>
            </Modal.Footer>
        </Modal>
    )
}