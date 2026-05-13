import { useState } from 'react'
import Swal from 'sweetalert2'
import { 
    Row, 
    Col, 
    Form, 
    Button, 
    Table 
} from 'react-bootstrap'

const TablaBalancePrueba = ({ data, formatMoney }) => {
    const { listado, totales } = data
    const diferencia = Math.abs(totales.debito - totales.credito)
    const estaCuadrado = diferencia < 0.01

    return <>
        <Table responsive hover size="sm" className="mb-0">
            <thead className="table-dark">
                <tr>
                    <th width="15%">Cuenta</th>
                    <th width="35%">Nombre</th>
                    <th width="15%" className="text-end">Débitos</th>
                    <th width="15%" className="text-end">Créditos</th>
                    <th width="20%" className="text-end">Saldo Final</th>
                </tr>
            </thead>
            <tbody>
                {listado.length === 0 ? (
                    <tr><td colSpan="5" className="text-center p-4 text-muted">No hay movimientos.</td></tr>
                ) : (
                    listado.map((row) => (
                        <tr key={row.cuenta}>
                            <td className="fw-medium">{row.cuenta}</td>
                            <td>{row.nombre} <small className="text-muted ms-1 d-block">{row.tipo}</small></td>
                            <td className="text-end">{formatMoney(row.total_debito)}</td>
                            <td className="text-end">{formatMoney(row.total_credito)}</td>
                            <td className={`text-end fw-bold ${row.saldo < 0 ? 'text-danger' : ''}`}>{formatMoney(row.saldo)}</td>
                        </tr>
                    ))
                )}
            </tbody>
            {listado.length > 0 && (
                <tfoot className="table-light">
                    <tr className="fw-bold fs-6">
                        <td colSpan="2" className="text-end">TOTALES:</td>
                        <td className="text-end text-success">{formatMoney(totales.debito)}</td>
                        <td className="text-end text-success">{formatMoney(totales.credito)}</td>
                        <td className="text-end border-start">
                            {estaCuadrado ? (
                                <span className="text-success"><i className="bi bi-check-circle me-2"></i>Cuadrado</span>
                            ) : (
                                <span className="text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Descuadre: {formatMoney(diferencia)}</span>
                            )}
                        </td>
                    </tr>
                </tfoot>
            )}
        </Table>
    </>
}

const TablaPyG = ({ data, formatMoney }) => {
    const { cuentas, totales } = data
    const { ingresos, gastos, costos, utilidad } = totales

    return <>
        <Table responsive hover size="sm" className="mb-0">
            <thead className="table-dark">
                <tr><th width="15%">Cuenta</th><th width="60%">Nombre</th><th width="25%" className="text-end">Saldo</th></tr>
            </thead>
            <tbody>
                <tr className="table-light"><td colSpan="3" className="fw-bold text-primary">INGRESOS</td></tr>
                {cuentas.filter(c => c.clase === '4').map(c => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td className="text-end">{formatMoney(c.saldo)}</td></tr>
                ))}
                
                <tr className="table-light"><td colSpan="3" className="fw-bold text-danger mt-3">MENOS: GASTOS Y COSTOS</td></tr>
                {cuentas.filter(c => c.clase === '5' || c.clase === '6').map(c => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td className="text-end text-danger">- {formatMoney(c.saldo)}</td></tr>
                ))}
            </tbody>
            <tfoot className="table-light">
                <tr>
                    <td colSpan="2" className="text-end fw-bold">TOTAL INGRESOS:</td>
                    <td className="text-end fw-bold">{formatMoney(ingresos)}</td>
                </tr>
                <tr>
                    <td colSpan="2" className="text-end fw-bold">TOTAL GASTOS Y COSTOS:</td>
                    <td className="text-end fw-bold text-danger">- {formatMoney(gastos + costos)}</td>
                </tr>
                <tr className={`fs-5 fw-bold ${utilidad >= 0 ? 'text-success' : 'text-danger'}`}>
                    <td colSpan="2" className="text-end">UTILIDAD (PÉRDIDA) DEL EJERCICIO:</td>
                    <td className="text-end border-top border-dark">{formatMoney(utilidad)}</td>
                </tr>
            </tfoot>
        </Table>
    </>
}

const TablaBalanceGeneral = ({ data, formatMoney }) => {
    const { cuentas, totales } = data
    const { activo, pasivo, patrimonioPuro, utilidadDelEjercicio, patrimonioTotal, pasivoMasPatrimonio } = totales
    
    const cuadra = Math.abs(activo - pasivoMasPatrimonio) < 0.01

    return <>
        <Table responsive hover size="sm" className="mb-0">
            <thead className="table-dark">
                <tr><th width="15%">Cuenta</th><th width="60%">Nombre</th><th width="25%" className="text-end">Saldo</th></tr>
            </thead>
            <tbody>
                <tr className="table-light"><td colSpan="3" className="fw-bold text-success">ACTIVOS</td></tr>
                {cuentas.filter(c => c.clase === '1').map(c => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td className="text-end">{formatMoney(c.saldo)}</td></tr>
                ))}
                
                <tr className="table-light"><td colSpan="3" className="fw-bold text-danger">PASIVOS</td></tr>
                {cuentas.filter(c => c.clase === '2').map(c => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td className="text-end">{formatMoney(c.saldo)}</td></tr>
                ))}

                <tr className="table-light"><td colSpan="3" className="fw-bold text-primary">PATRIMONIO</td></tr>
                {cuentas.filter(c => c.clase === '3').map(c => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td className="text-end">{formatMoney(c.saldo)}</td></tr>
                ))}
                <tr className="text-primary">
                    <td>360505</td>
                    <td>Utilidad (Pérdida) del Ejercicio <em>(Cálculo Automático PyG)</em></td>
                    <td className="text-end fw-medium">{formatMoney(utilidadDelEjercicio)}</td>
                </tr>
            </tbody>
            <tfoot className="table-light">
                <tr>
                    <td colSpan="2" className="text-end fw-bold text-success">TOTAL ACTIVOS:</td>
                    <td className="text-end fw-bold text-success fs-6">{formatMoney(activo)}</td>
                </tr>
                <tr>
                    <td colSpan="2" className="text-end fw-bold text-danger">TOTAL PASIVOS:</td>
                    <td className="text-end fw-bold text-danger">{formatMoney(pasivo)}</td>
                </tr>
                <tr>
                    <td colSpan="2" className="text-end fw-bold text-primary">TOTAL PATRIMONIO:</td>
                    <td className="text-end fw-bold text-primary">{formatMoney(patrimonioTotal)}</td>
                </tr>
                <tr className="bg-light">
                    <td colSpan="2" className="text-end fw-bold">TOTAL PASIVO + PATRIMONIO:</td>
                    <td className="text-end fw-bold fs-6 border-top border-dark">{formatMoney(pasivoMasPatrimonio)}</td>
                </tr>
                <tr>
                    <td colSpan="3" className={`text-end fw-bold py-3 ${cuadra ? 'text-success' : 'text-danger'}`}>
                        {cuadra ? <><i className="bi bi-shield-check me-2"></i>Ecuación Patrimonial Cuadrada</> : <><i className="bi bi-shield-x me-2"></i>Descuadre en Ecuación Patrimonial</>}
                    </td>
                </tr>
            </tfoot>
        </Table>
    </>
}

export const Reportes = () => {
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const hoy = new Date().toISOString().split('T')[0]

    const [filtros, setFiltros] = useState({ tipoReporte: 'balance_prueba', fechaInicio: primerDiaMes, fechaFin: hoy })
    const [datosReporte, setDatosReporte] = useState(null)
    const [loading, setLoading] = useState(false)

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    const generarReporte = async (e) => {
        e.preventDefault()
        setLoading(true)
        setDatosReporte(null)

        let res;
        if (filtros.tipoReporte === 'balance_prueba') {
            res = await window.contaAPI.getBalancePrueba(filtros)
        } else if (filtros.tipoReporte === 'estado_resultados') {
            res = await window.contaAPI.getEstadoResultados(filtros)
        } else if (filtros.tipoReporte === 'balance_general') {
            res = await window.contaAPI.getBalanceGeneral(filtros)
        }

        if (res?.success) {
            if (filtros.tipoReporte === 'balance_prueba') {
                setDatosReporte({ tipo: filtros.tipoReporte, data: { listado: res.data, totales: res.totales } })
            } else {
                setDatosReporte({ tipo: filtros.tipoReporte, data: res.data })
            }
        } else {
            Swal.fire('Error', res?.error || 'Error desconocido', 'error')
        }
        setLoading(false)
    }

    const getNombreReporte = () => {
        if (filtros.tipoReporte === 'balance_prueba') return "Balance de Prueba"
        if (filtros.tipoReporte === 'estado_resultados') return "Estado de Resultados (PyG)"
        return "Balance General"
    }

    return <>
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Centro de Reportes NIIF</h5>
                {datosReporte && (
                    <Button variant="outline-success" size="sm">
                        <i className="bi bi-file-earmark-excel me-2"></i>Exportar Excel
                    </Button>
                )}
            </div>

            <div className="card shadow-sm border-0 mb-4 bg-light">
                <div className="card-body py-3">
                    <Form onSubmit={generarReporte}>
                        <Row className="align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small">Tipo de Reporte</Form.Label>
                                    <Form.Select value={filtros.tipoReporte} onChange={(e) => setFiltros({...filtros, tipoReporte: e.target.value})}>
                                        <option value="balance_prueba">Balance de Prueba</option>
                                        <option value="estado_resultados">Estado de Resultados (PyG)</option>
                                        <option value="balance_general">Balance General</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small">Fecha Inicio</Form.Label>
                                    <Form.Control type="date" required value={filtros.fechaInicio} onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small">Fecha Fin</Form.Label>
                                    <Form.Control type="date" required value={filtros.fechaFin} onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-funnel me-2"></i>}
                                    Generar Reporte
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </div>

            {datosReporte && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        <div className="p-3 border-bottom bg-white d-flex justify-content-between">
                            <h6 className="fw-bold mb-0 text-primary">{getNombreReporte()}</h6>
                            <small className="text-muted">Del {filtros.fechaInicio} al {filtros.fechaFin}</small>
                        </div>
                        
                        {datosReporte.tipo === 'balance_prueba' && <TablaBalancePrueba data={datosReporte.data} formatMoney={formatMoney} />}
                        {datosReporte.tipo === 'estado_resultados' && <TablaPyG data={datosReporte.data} formatMoney={formatMoney} />}
                        {datosReporte.tipo === 'balance_general' && <TablaBalanceGeneral data={datosReporte.data} formatMoney={formatMoney} />}
                        
                    </div>
                </div>
            )}
        </div>
    </>
}