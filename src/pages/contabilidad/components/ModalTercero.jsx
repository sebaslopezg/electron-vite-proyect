import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'
import { contabilidadService } from '../../../services/contabilidadService'

export const ModalTercero = ({ show, handleClose, onSuccess, editData, forceCliente, initialDocument = '' }) => {
    const defaultData = {
        id: '', tipo_documento: 'CC',
        numero_documento: initialDocument,
        digito_verificacion: '',
        tipo_persona: 'natural',
        razon_social: '', 
        nombres: '', 
        apellidos: '',
        direccion: '', 
        telefono: '', 
        email: '', 
        ciudad_id: '',
        es_cliente: forceCliente ? 1 : 0,
        es_proveedor: 0, estado: 1
    }
    
    const [formData, setFormData] = useState(defaultData)

    useEffect(() => {
        if (editData) {
            setFormData(editData)
        } else {
            setFormData({...defaultData, numero_documento: initialDocument})
        }
    }, [editData, show, initialDocument])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        let res
        if (editData) {
            res = await contabilidadService.actualizarTercero(formData)
        } else {
            res = await contabilidadService.crearTercero(formData)
        }

        if (res.success) {
            Swal.fire({ 
                title: formData.id || editData ? '¡Actualizado!' : '¡Creado!', 
                text: 'Tercero guardado correctamente.', 
                icon: 'success', 
                timer: 1500,
                showConfirmButton: false 
            });
            onSuccess()
            handleClose()
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className={`bi ${editData ? 'bi-person-gear' : 'bi-person-plus'} me-2`}></i>
                    {editData ? 'Editar Tercero' : 'Nuevo Tercero'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="terceroForm">
                    
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Tipo de Persona</Form.Label>
                                <Form.Select 
                                    value={formData.tipo_persona}
                                    onChange={(e) => setFormData({...formData, tipo_persona: e.target.value})}
                                >
                                    <option value="juridica">Persona Jurídica (Empresa)</option>
                                    <option value="natural">Persona Natural (Individuo)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6} className="d-flex gap-3 align-items-end pb-2">
                            <Form.Check 
                                type="checkbox" label="Es Cliente" id="es_cliente"
                                checked={formData.es_cliente === 1}
                                onChange={(e) => setFormData({...formData, es_cliente: e.target.checked ? 1 : 0})}
                                disabled={forceCliente}
                            />
                            <Form.Check 
                                type="checkbox" label="Es Proveedor" id="es_proveedor"
                                checked={formData.es_proveedor === 1}
                                onChange={(e) => setFormData({...formData, es_proveedor: e.target.checked ? 1 : 0})}
                            />
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Tipo Documento</Form.Label>
                                <Form.Select 
                                    value={formData.tipo_documento}
                                    onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}
                                >
                                    <option value="NIT">NIT</option>
                                    <option value="CC">Cédula de Ciudadanía</option>
                                    <option value="CE">Cédula de Extranjería</option>
                                    <option value="PAS">Pasaporte</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Número de Documento</Form.Label>
                                <Form.Control 
                                    type="text" required 
                                    value={formData.numero_documento}
                                    onChange={(e) => setFormData({...formData, numero_documento: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>DV</Form.Label>
                                <Form.Control 
                                    type="text" maxLength={1}
                                    value={formData.digito_verificacion}
                                    onChange={(e) => setFormData({...formData, digito_verificacion: e.target.value})}
                                    disabled={formData.tipo_documento !== 'NIT'}
                                    placeholder="Ej: 9"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {formData.tipo_persona === 'juridica' ? (
                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Razón Social</Form.Label>
                                    <Form.Control 
                                        type="text" required={formData.tipo_persona === 'juridica'}
                                        value={formData.razon_social}
                                        onChange={(e) => setFormData({...formData, razon_social: e.target.value, nombres: '', apellidos: ''})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    ) : (
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Nombres</Form.Label>
                                    <Form.Control 
                                        type="text" required={formData.tipo_persona === 'natural'}
                                        value={formData.nombres}
                                        onChange={(e) => setFormData({...formData, nombres: e.target.value, razon_social: ''})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Apellidos</Form.Label>
                                    <Form.Control 
                                        type="text" required={formData.tipo_persona === 'natural'}
                                        value={formData.apellidos}
                                        onChange={(e) => setFormData({...formData, apellidos: e.target.value, razon_social: ''})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Teléfono</Form.Label>
                                <Form.Control type="text" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                            </Form.Group>
                        </Col>
                        <Col md={8}>
                            <Form.Group>
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Dirección</Form.Label>
                                <Form.Control type="text" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
                            </Form.Group>
                        </Col>
                    </Row>

                    {editData && (
                        <Row>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Estado</Form.Label>
                                    <Form.Select value={formData.estado} onChange={(e) => setFormData({...formData, estado: parseInt(e.target.value)})}>
                                        <option value={1}>Activo</option>
                                        <option value={0}>Inactivo</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="terceroForm">
                    <i className="bi bi-save me-2"></i>{editData ? 'Actualizar' : 'Guardar Tercero'}
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}