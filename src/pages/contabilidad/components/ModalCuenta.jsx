import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'
import { contabilidadService } from '../../../services/contabilidadService'

export const ModalCuenta = ({ show, handleClose, onSuccess, editData }) => {
    const defaultData = {
        id: '', 
        nombre: '', 
        tipo: '', 
        naturaleza: '', 
        exige_tercero: 1, 
        estado: 1
    }
    
    const [formData, setFormData] = useState(defaultData)
    const [nivelVisual, setNivelVisual] = useState('')
    const [esAuxiliar, setEsAuxiliar] = useState(0)

    useEffect(() => {
        if (editData) {
            setFormData(editData)
        } else {
            setFormData(defaultData)
        }
    }, [editData, show])

    useEffect(() => {
        const codigo = formData.id.toString().trim()
        const length = codigo.length

        if (length === 1) { setNivelVisual('Clase'); setEsAuxiliar(0); }
        else if (length === 2) { setNivelVisual('Grupo'); setEsAuxiliar(0); }
        else if (length === 4) { setNivelVisual('Cuenta'); setEsAuxiliar(0); }
        else if (length >= 6) { setNivelVisual('Subcuenta / Auxiliar'); setEsAuxiliar(1); }
        else { setNivelVisual('Longitud no estándar'); setEsAuxiliar(0); }

        if (!editData) {
            if (codigo.startsWith('1')) setFormData(prev => ({ ...prev, tipo: 'activo', naturaleza: 'debito' }))
            else if (codigo.startsWith('2')) setFormData(prev => ({ ...prev, tipo: 'pasivo', naturaleza: 'credito' }))
            else if (codigo.startsWith('3')) setFormData(prev => ({ ...prev, tipo: 'patrimonio', naturaleza: 'credito' }))
            else if (codigo.startsWith('4')) setFormData(prev => ({ ...prev, tipo: 'ingreso', naturaleza: 'credito' }))
            else if (codigo.startsWith('5')) setFormData(prev => ({ ...prev, tipo: 'gasto', naturaleza: 'debito' }))
            else if (codigo.startsWith('6')) setFormData(prev => ({ ...prev, tipo: 'costo', naturaleza: 'debito' }))
            else if (codigo === '') setFormData(prev => ({ ...prev, tipo: '', naturaleza: '' }))
        }
    }, [formData.id, editData])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.tipo || !formData.naturaleza) {
            Swal.fire('Error', 'El código debe empezar por un número válido (1 al 6)', 'warning')
            return
        }

        const dataToSave = { ...formData, es_auxiliar: esAuxiliar }

        let res
        if (editData) {
            res = await contabilidadService.actualizarCuenta(dataToSave)
        } else {
            res = await contabilidadService.crearCuenta(dataToSave)
        }

        if (res.success) {
            Swal.fire({ 
                title: editData ? '¡Actualizada!' : '¡Creada!', 
                text: 'Operación exitosa', 
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

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className={`bi ${editData ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                    {editData ? `Editar Cuenta: ${formData.id}` : 'Nueva Cuenta Contable'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="cuentaForm">
                    <Row className="mb-3">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Código (ID)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    value={formData.id}
                                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                                    disabled={editData != null}
                                    required 
                                    autoFocus={!editData}
                                    placeholder="Ej: 110505"
                                />
                                <Form.Text className="text-primary">
                                    Nivel: <strong>{nivelVisual || '...'}</strong>
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={7}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Nombre de la Cuenta</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    autoFocus={!!editData}
                                    required 
                                    placeholder="Ej: Caja General"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted">Clasificación Automática</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    className="text-capitalize" 
                                    value={formData.tipo} 
                                    disabled 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted">Naturaleza</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    className="text-capitalize" 
                                    value={formData.naturaleza} 
                                    disabled 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {editData && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Estado</Form.Label>
                                    <Form.Select 
                                        value={formData.estado} 
                                        onChange={(e) => setFormData({...formData, estado: parseInt(e.target.value)})}
                                    >
                                        <option value={1}>Activa</option>
                                        <option value={0}>Inactiva</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {esAuxiliar === 1 && (
                        <div className="alert alert-info py-2 d-flex align-items-center mb-0 mt-3">
                            <Form.Check 
                                type="switch" 
                                id="exigeTercero"
                                label="Exigir Tercero (NIT/Cédula) al usar esta cuenta"
                                checked={formData.exige_tercero === 1}
                                onChange={(e) => setFormData({...formData, exige_tercero: e.target.checked ? 1 : 0})}
                                className="mb-0 fw-medium"
                            />
                        </div>
                    )}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" type="submit" form="cuentaForm">
                    <i className="bi bi-save me-2"></i>{editData ? 'Actualizar' : 'Guardar Cuenta'}
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}