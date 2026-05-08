import { useState, useEffect } from 'react'
import { Row, Col, Form, Button, Table } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const ConfiguracionContable = () => {
    const [config, setConfig] = useState({
        cuenta_caja: '', 
        cuenta_cartera: '', 
        cuenta_ingresos: '', 
        cuenta_iva: '', 
        cuenta_descuento: ''
    })
    const [cuentasAuxiliares, setCuentasAuxiliares] = useState([])
    const [metodosPago, setMetodosPago] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
        setLoading(true)
        if (window.contaAPI) {
            const [resCuentas, resConfig, resMetodos] = await Promise.all([
                window.contaAPI.getCuentasAuxiliares(),
                window.contaAPI.getConfigContable(),
                window.api.getMetodosPago()
            ])

            if (resCuentas.success) setCuentasAuxiliares(resCuentas.data)
            if (resConfig.success && resConfig.data) setConfig(resConfig.data)
            setMetodosPago(resMetodos || [])
        }
        setLoading(false)
    }

    const handleMetodoCuentaChange = async (metodoId, cuentaId) => {
        const res = await window.api.updateMetodoPagoCuenta({ id: metodoId, cuenta_id: cuentaId })
        if (res.success) {
            setMetodosPago(prev => prev.map(m => m.id === metodoId ? { ...m, cuenta_id: cuentaId } : m))
        } else {
            Swal.fire('Error', 'No se pudo actualizar el mapeo del método', 'error')
        }
    }

    const handleSubmitGeneral = async (e) => {
        e.preventDefault()
        const res = await window.contaAPI.updateConfigContable(config)
        if (res.success) {
            Swal.fire({ title: '¡Guardado!', text: 'Configuración general actualizada.', icon: 'success', timer: 1500, showConfirmButton: false })
        }
    }

    if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>

    return <>
        <div>
            <h5 className="card-title mb-3">Mapeo Contable de Ventas</h5>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                    <Form onSubmit={handleSubmitGeneral}>
                        <h6 className="fw-bold text-secondary mb-3"><i className="bi bi-gear-fill me-2"></i>Cuentas Generales de Respaldo</h6>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta de Caja (Default)</Form.Label>
                                    <Form.Select name="cuenta_caja" value={config.cuenta_caja} onChange={(e) => setConfig({...config, cuenta_caja: e.target.value})} required>
                                        <option value="">Selecciona...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta de Cartera</Form.Label>
                                    <Form.Select name="cuenta_cartera" value={config.cuenta_cartera} onChange={(e) => setConfig({...config, cuenta_cartera: e.target.value})} required>
                                        <option value="">Selecciona...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">Ingresos</Form.Label><Form.Select name="cuenta_ingresos" value={config.cuenta_ingresos} onChange={(e) => setConfig({...config, cuenta_ingresos: e.target.value})} required>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">IVA Generado</Form.Label><Form.Select name="cuenta_iva" value={config.cuenta_iva} onChange={(e) => setConfig({...config, cuenta_iva: e.target.value})} required>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">Descuentos</Form.Label><Form.Select name="cuenta_descuento" value={config.cuenta_descuento} onChange={(e) => setConfig({...config, cuenta_descuento: e.target.value})}>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                        </Row>
                        <div className="text-end mt-3">
                            <Button variant="primary" type="submit" size="sm">Actualizar Cuentas Generales</Button>
                        </div>
                    </Form>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                    <h6 className="fw-bold text-secondary mb-3"><i className="bi bi-credit-card-2-back-fill me-2"></i>Mapeo Específico por Método de Pago</h6>
                    <p className="text-muted small">Define a qué cuenta bancaria o de caja debe ir el dinero según el medio de pago utilizado.</p>
                    
                    <Table responsive hover size="sm" className="align-middle border">
                        <thead className="table-light">
                            <tr>
                                <th>Método de Pago</th>
                                <th>Cuenta Contable Asignada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metodosPago.map(m => (
                                <tr key={m.id}>
                                    <td className="fw-bold">{m.nombre}</td>
                                    <td>
                                        <Form.Select 
                                            size="sm" 
                                            value={m.cuenta_id || ''} 
                                            onChange={(e) => handleMetodoCuentaChange(m.id, e.target.value)}
                                        >
                                            <option value="">Usar cuenta de Caja por defecto...</option>
                                            {cuentasAuxiliares.map(c => (
                                                <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>
                                            ))}
                                        </Form.Select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    </>
}