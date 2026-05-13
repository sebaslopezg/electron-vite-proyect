import { useState, useEffect } from 'react'
import { Row, Col, Form, Button, Table } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const ConfiguracionContable = () => {
    const [config, setConfig] = useState({
        cuenta_caja: '', 
        cuenta_cartera: '', 
        cuenta_ingresos: '', 
        cuenta_iva: '', 
        cuenta_descuento: '',
        cuenta_proveedores: '',
        cuenta_iva_compras: '',
        cuenta_inventario: ''
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
            
            if (resConfig.success && resConfig.data) {
                setConfig({
                    cuenta_caja: resConfig.data.cuenta_caja || '',
                    cuenta_cartera: resConfig.data.cuenta_cartera || '',
                    cuenta_ingresos: resConfig.data.cuenta_ingresos || '',
                    cuenta_iva: resConfig.data.cuenta_iva || '',
                    cuenta_descuento: resConfig.data.cuenta_descuento || '',
                    cuenta_proveedores: resConfig.data.cuenta_proveedores || '',
                    cuenta_iva_compras: resConfig.data.cuenta_iva_compras || '',
                    cuenta_inventario: resConfig.data.cuenta_inventario || ''
                })
            }
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

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSubmitGeneral = async (e) => {
        e.preventDefault()
        const res = await window.contaAPI.updateConfigContable(config)
        if (res.success) {
            Swal.fire({ title: '¡Guardado!', text: 'Configuración general actualizada.', icon: 'success', timer: 1500, showConfirmButton: false })
        } else {
            Swal.fire('Error', res.error || 'No se pudo guardar', 'error')
        }
    }

    if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>

    return <>
        <div>
            <h5 className="card-title mb-3">Mapeo Contable de Integración</h5>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                    <Form onSubmit={handleSubmitGeneral}>
                        <h6 className="fw-bold text-secondary mb-3"><i className="bi bi-tag-fill me-2"></i>Cuentas Generales de Ventas</h6>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta de Caja (Default)</Form.Label>
                                    <Form.Select name="cuenta_caja" value={config.cuenta_caja} onChange={handleChange} required>
                                        <option value="">Selecciona...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta de Cartera</Form.Label>
                                    <Form.Select name="cuenta_cartera" value={config.cuenta_cartera} onChange={handleChange} required>
                                        <option value="">Selecciona...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">Ingresos</Form.Label><Form.Select name="cuenta_ingresos" value={config.cuenta_ingresos} onChange={handleChange} required><option value="">Selecciona...</option>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">IVA Generado</Form.Label><Form.Select name="cuenta_iva" value={config.cuenta_iva} onChange={handleChange} required><option value="">Selecciona...</option>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label className="small fw-bold">Descuentos</Form.Label><Form.Select name="cuenta_descuento" value={config.cuenta_descuento} onChange={handleChange}><option value="">Opcional...</option>{cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}</Form.Select></Form.Group></Col>
                        </Row>

                        <h6 className="fw-bold text-secondary mb-3 mt-5"><i className="bi bi-cart-fill me-2"></i>Mapeo para Compras y Gastos</h6>
                        <Row className="mb-4 border p-3 rounded bg-light mx-0">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta Proveedores (Pasivo)</Form.Label>
                                    <Form.Select name="cuenta_proveedores" value={config.cuenta_proveedores} onChange={handleChange} required>
                                        <option value="">Selecciona (Ej. 220505)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta IVA en Compras</Form.Label>
                                    <Form.Select name="cuenta_iva_compras" value={config.cuenta_iva_compras} onChange={handleChange} required>
                                        <option value="">Selecciona (Ej. 240810)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Cuenta Inventario (Activo)</Form.Label>
                                    <Form.Select name="cuenta_inventario" value={config.cuenta_inventario} onChange={handleChange} required>
                                        <option value="">Selecciona (Ej. 143501)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="text-end mt-3 border-top pt-3">
                            <Button variant="primary" type="submit" size="lg"><i className="bi bi-save me-2"></i>Actualizar Cuentas Generales</Button>
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