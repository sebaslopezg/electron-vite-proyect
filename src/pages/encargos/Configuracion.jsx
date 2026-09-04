import { useState, useEffect } from "react"
import { Button, Card, Col, Form, Row } from "react-bootstrap"
import Swal from "sweetalert2"
import { encargosService } from "../../services/encargosService"
import { v4 as uuidv4 } from "uuid"

export const ConfiguracionEncargos = ({ currentUser }) => {
    const [activeUser, setActiveUser] = useState(currentUser)
    const [campos, setCampos] = useState([])
    const [alcanceEstados, setAlcanceEstados] = useState('global')

    useEffect(() => {
        if (currentUser) {
            setActiveUser(currentUser)
        } else if (window.api && window.api.getCurrentUser) {
            window.api.getCurrentUser().then(res => {
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            })
        }
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        const u = activeUser || currentUser;
        if (!u) return false;
        if (u.permisos?.includes('ALL')) return true;
        return u.permisos?.includes(permissionKey);
    }

    const canEditEstados = hasPermission('encargos_config_estados');
    const canEditCampos = hasPermission('encargos_config_campos');

    const isFormDisabled = !canEditEstados && !canEditCampos;

    const loadData = async () => {
        const data = await encargosService.getEncargosCampos()
        setCampos(data || [])

        try {
            const settings = await window.api.getEncargosSettings()
            if (settings && settings.alcance_estados) {
                setAlcanceEstados(settings.alcance_estados)
            }
        } catch (error) {
            console.error("Error al cargar configuraciones", error)
        }
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
        if (canEditCampos && campos.some(c => !c.label.trim())) {
            return Swal.fire('Error', 'Todos los campos dinámicos deben tener un nombre (Label)', 'error')
        }
        
        Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        
        let resultCampos = { success: true }
        let resultSettings = { success: true }

        if (canEditCampos) {
            resultCampos = await encargosService.saveEncargosCampos(campos)
        }

        if (canEditEstados) {
            resultSettings = await window.api.saveEncargosSettings('alcance_estados', alcanceEstados)
        }

        if (resultCampos.success && resultSettings.success) {
            Swal.fire('¡Éxito!', 'Configuración de encargos actualizada correctamente', 'success')
            window.dispatchEvent(new CustomEvent('formulario-encargos-actualizado'))
            window.dispatchEvent(new CustomEvent('configuracion-estados-actualizada'))
        } else {
            Swal.fire('Error', 'No se pudo guardar la configuración completa', 'error')
        }
    }

    return <>
        <div className="p-3 animate__animated animate__fadeIn">
            
            <div className={`d-flex align-items-center border-bottom pb-2 mb-4 ${!canEditEstados ? 'opacity-75' : ''}`}>
                <h5 className="card-title m-0 me-3">
                    <i className="bi bi-gear text-primary"></i> Configurar Estados
                </h5>
            </div>
            <Card className={`mb-5 border-secondary shadow-sm ${!canEditEstados ? 'opacity-75' : ''}`}>
                <Card.Body className="p-4">
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Alcance de los estados</Form.Label>
                                <Form.Select 
                                    value={alcanceEstados} 
                                    onChange={e => setAlcanceEstados(e.target.value)}
                                    disabled={!canEditEstados}
                                >
                                    <option value="global">Global</option>
                                    <option value="usuario">Por Usuario</option>
                                    <option value="rol">Por Rol</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <div className={`d-flex align-items-center border-bottom pb-2 mb-4 ${!canEditCampos ? 'opacity-75' : ''}`}>
                <h5 className="card-title m-0 me-3">
                    <i className="bi bi-ui-checks text-primary"></i> Campos Dinámicos del Encargo
                </h5>
                <Button variant="outline-primary" size="sm" onClick={handleAddCampo} disabled={!canEditCampos}>
                    <i className="bi bi-plus-lg me-1"></i>Añadir Campo
                </Button>
            </div>

            <p className={`text-muted small ${!canEditCampos ? 'opacity-75' : ''}`}>
                Agrega campos adicionales que deban llenarse al momento de crear un encargo.
            </p>

            <div className={!canEditCampos ? 'opacity-75' : ''}>
                {campos.length === 0 ? (
                    <div className="border rounded bg-light text-center py-4 mb-4">No hay campos personalizados configurados.</div>
                ) : (
                    campos.map((campo, idx) => (
                        <Card key={campo.id} className="mb-3 border-secondary shadow-sm">
                            <Card.Body className="p-3">
                                <Row className="align-items-end g-3">
                                    <Col md={3}>
                                        <Form.Label className="small fw-bold">Nombre del Campo</Form.Label>
                                        <Form.Control size="sm" value={campo.label} onChange={(e) => handleChange(idx, 'label', e.target.value)} placeholder="Ej. Talla o Color" disabled={!canEditCampos} />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label className="small fw-bold">Tipo de Respuesta</Form.Label>
                                        <Form.Select size="sm" value={campo.type} onChange={(e) => handleChange(idx, 'type', e.target.value)} disabled={!canEditCampos}>
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
                                                <Form.Control size="sm" value={campo.options} onChange={(e) => handleChange(idx, 'options', e.target.value)} placeholder="Ej. Rojo, Verde, Azul" disabled={!canEditCampos} />
                                            </div>
                                        )}
                                        <div className={`d-flex align-items-center ${campo.type === 'select' ? '' : 'h-100 pb-1'}`}>
                                            <Form.Check type="switch" id={`req-${idx}`} label="Campo Obligatorio" checked={campo.required === 1 || campo.required === true} onChange={(e) => handleChange(idx, 'required', e.target.checked)} disabled={!canEditCampos} />
                                        </div>
                                    </Col>
                                    <Col md={2} className="text-end">
                                        <Button variant="outline-danger" size="sm" onClick={() => handleRemoveCampo(idx)} disabled={!canEditCampos}>
                                            <i className="bi bi-trash"></i> Quitar
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    ))
                )}
            </div>

            <div className="d-flex justify-content-end mt-4 border-top pt-3">
                <Button variant="primary" className="px-4" onClick={handleSave} disabled={isFormDisabled}>
                    {isFormDisabled ? 'Sin permisos para guardar' : 'Guardar Toda la Configuración'}
                </Button>
            </div>
        </div>
    </>
}