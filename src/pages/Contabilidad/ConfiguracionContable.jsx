import { useState, useEffect } from 'react'
import { Row, Col, Form, Button } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const ConfiguracionContable = () => {
    const [config, setConfig] = useState({
        cuenta_caja: '', cuenta_cartera: '', cuenta_ingresos: '', cuenta_iva: '', cuenta_descuento: ''
    })
    const [cuentasAuxiliares, setCuentasAuxiliares] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
        setLoading(true)
        if (window.contaAPI) {
            const resCuentas = await window.contaAPI.getCuentasAuxiliares()
            if (resCuentas.success) setCuentasAuxiliares(resCuentas.data)

            const resConfig = await window.contaAPI.getConfigContable()
            if (resConfig.success && resConfig.data) {
                setConfig({
                    cuenta_caja: resConfig.data.cuenta_caja || '',
                    cuenta_cartera: resConfig.data.cuenta_cartera || '',
                    cuenta_ingresos: resConfig.data.cuenta_ingresos || '',
                    cuenta_iva: resConfig.data.cuenta_iva || '',
                    cuenta_descuento: resConfig.data.cuenta_descuento || ''
                })
            }
        }
        setLoading(false);
    }

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const res = await window.contaAPI.updateConfigContable(config)
        if (res.success) {
            Swal.fire({ title: '¡Guardado!', text: 'Mapeo contable actualizado.', icon: 'success', timer: 1500, showConfirmButton: false })
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Mapeo de Integración: Ventas <i className="bi bi-arrow-right mx-2"></i> Contabilidad</h5>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                    <div className="alert alert-info border-info bg-opacity-10 d-flex align-items-center mb-4">
                        <i className="bi bi-info-circle-fill fs-4 me-3 text-info"></i>
                        <div>
                            <strong>Automatización de Asientos:</strong> Define a qué cuentas del PUC se debe enviar el dinero cuando se genere una nueva <strong>Factura de Venta</strong> en el sistema.
                        </div>
                    </div>

                    <Form onSubmit={handleSubmit}>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-success"><i className="bi bi-cash-stack me-2"></i>Cuenta de Caja / Bancos</Form.Label>
                                    <Form.Text className="d-block text-muted mb-2">Aquí entrará el dinero de las ventas de "Contado" o los abonos iniciales.</Form.Text>
                                    <Form.Select name="cuenta_caja" value={config.cuenta_caja} onChange={handleChange} required>
                                        <option value="">Selecciona la cuenta (Ej. 110505)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-warning text-darken"><i className="bi bi-journal-bookmark me-2"></i>Cuenta de Cartera (Cuentas x Cobrar)</Form.Label>
                                    <Form.Text className="d-block text-muted mb-2">Aquí se registrará la deuda cuando la factura sea a "Crédito".</Form.Text>
                                    <Form.Select name="cuenta_cartera" value={config.cuenta_cartera} onChange={handleChange} required>
                                        <option value="">Selecciona la cuenta (Ej. 130505)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr className="my-4 text-muted" />

                        <Row className="mb-4">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-primary"><i className="bi bi-graph-up-arrow me-2"></i>Cuenta de Ingresos</Form.Label>
                                    <Form.Text className="d-block text-muted mb-2">El subtotal de la venta sin impuestos (Suma a Ingresos).</Form.Text>
                                    <Form.Select name="cuenta_ingresos" value={config.cuenta_ingresos} onChange={handleChange} required>
                                        <option value="">Selecciona (Ej. 413500)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-danger"><i className="bi bi-bank me-2"></i>Cuenta de IVA Generado</Form.Label>
                                    <Form.Text className="d-block text-muted mb-2">El impuesto recaudado que se le debe a la DIAN (Pasivo).</Form.Text>
                                    <Form.Select name="cuenta_iva" value={config.cuenta_iva} onChange={handleChange} required>
                                        <option value="">Selecciona (Ej. 240801)...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-secondary"><i className="bi bi-tags me-2"></i>Cuenta de Descuentos</Form.Label>
                                    <Form.Text className="d-block text-muted mb-2">Gasto financiero por rebajas comerciales (Opcional).</Form.Text>
                                    <Form.Select name="cuenta_descuento" value={config.cuenta_descuento} onChange={handleChange}>
                                        <option value="">Ninguna / No aplica...</option>
                                        {cuentasAuxiliares.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="d-flex justify-content-end border-top pt-3 mt-4">
                            <Button variant="primary" type="submit" size="lg">
                                <i className="bi bi-link me-2"></i>Guardar Integración
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    )
}