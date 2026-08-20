import { useState, useEffect } from "react"
import { Button, Card, Col, Form, Row } from "react-bootstrap"
import Swal from "sweetalert2"
import { encargosService } from "../../services/encargosService"
import { v4 as uuidv4 } from "uuid"

export const ConfiguracionEncargos = () => {
    const [campos, setCampos] = useState([])

    const loadData = async () => {
        const data = await encargosService.getEncargosCampos()
        setCampos(data || [])
    }

    useEffect(() => { loadData() }, []);

    const handleAddCampo = () => {
        setCampos([...campos, { id: uuidv4(), label: '', type: 'text', options: '', required: false }])
    }

    const handleRemoveCampo = (index) => {
        const nuevos = [...campos]
        nuevos.splice(index, 1)
        setCampos(nuevos)
    }

    const handleChange = (index, key, value) => {
        const nuevos = [...campos]
        nuevos[index][key] = value
        setCampos(nuevos)
    }

    const handleSave = async () => {
        if (campos.some(c => !c.label.trim())) {
            return Swal.fire('Error', 'Todos los campos deben tener un nombre (Label)', 'error')
        }
        
        Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        const result = await encargosService.saveEncargosCampos(campos);
        if (result.success) {
            Swal.fire('¡Éxito!', 'Formulario actualizado correctamente', 'success')
            window.dispatchEvent(new CustomEvent('formulario-encargos-actualizado'))
        } else {
            Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
        }
    }

    return <>
        <div className="p-3 animate__animated animate__fadeIn">
            <div className="d-flex align-items-center border-bottom pb-2 mb-4">
                <h5 className="card-title m-0 me-3">
                    Editar Formulario de Encargos
                </h5>
                <Button variant="outline-primary" size="sm" onClick={handleAddCampo}>
                    <i className="bi bi-plus-lg me-1"></i>Añadir Campo
                </Button>
            </div>

            <p className="text-muted small">
                Agrega campos adicionales (como medidas, colores, sabores o enlaces) que deban llenarse al momento de crear un encargo.
            </p>

            {campos.length === 0 ? (
                <div className="border rounded bg-light text-center py-4">No hay campos personalizados configurados.</div>
            ) : (
                campos.map((campo, idx) => (
                    <Card key={campo.id} className="mb-3 border-secondary shadow-sm">
                        <Card.Body className="p-3">
                            <Row className="align-items-end g-3">
                                <Col md={3}>
                                    <Form.Label className="small fw-bold">Nombre del Campo</Form.Label>
                                    <Form.Control size="sm" value={campo.label} onChange={(e) => handleChange(idx, 'label', e.target.value)} placeholder="Ej. Talla o Color" />
                                </Col>
                                <Col md={3}>
                                    <Form.Label className="small fw-bold">Tipo de Respuesta</Form.Label>
                                    <Form.Select size="sm" value={campo.type} onChange={(e) => handleChange(idx, 'type', e.target.value)}>
                                        <option value="text">Texto Corto</option>
                                        <option value="number">Número</option>
                                        <option value="date">Fecha</option>
                                        <option value="select">Lista de Opciones</option>
                                    </Form.Select>
                                </Col>
                                <Col md={4}>
                                    {campo.type === 'select' && (
                                        <div className="mb-2">
                                            <Form.Label className="small fw-bold mb-1">Opciones (Separadas por coma)</Form.Label>
                                            <Form.Control size="sm" value={campo.options} onChange={(e) => handleChange(idx, 'options', e.target.value)} placeholder="Ej. Rojo, Verde, Azul" />
                                        </div>
                                    )}
                                    <div className={`d-flex align-items-center ${campo.type === 'select' ? '' : 'h-100 pb-1'}`}>
                                        <Form.Check type="switch" id={`req-${idx}`} label="Campo Obligatorio" checked={campo.required === 1 || campo.required === true} onChange={(e) => handleChange(idx, 'required', e.target.checked)} />
                                    </div>
                                </Col>
                                <Col md={2} className="text-end">
                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveCampo(idx)}>
                                        <i className="bi bi-trash"></i> Quitar
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                ))
            )}

            <div className="d-flex justify-content-between mt-4 border-top pt-3">
                <Button variant="primary" className="px-4" onClick={handleSave}>
                    Guardar Formulario
                </Button>
            </div>
        </div>
    </>
}