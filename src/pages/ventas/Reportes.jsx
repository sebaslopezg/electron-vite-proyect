import { useState, useEffect, useMemo } from 'react'
import { Form, Row, Col, Button, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { getCurrencySymbol, formatCurrency } from '../../utils/currencies'
import { ImpresorReporte } from './components/ImpresorReporte'

export const Reportes = () => {
    const hoy = new Date().toISOString().split('T')[0]
    const [startDate, setStartDate] = useState(hoy)
    const [endDate, setEndDate] = useState(hoy)

    const [facturas, setFacturas] = useState([])
    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
        const loadConfig = async () => {
            const configData = await window.api.getConfiguracion()
            const confAppRaw = configData.find(c => c.key === 'confApp')
            if (confAppRaw) {
                try {
                    const parsed = JSON.parse(confAppRaw.value);
                    setAppConfig({ moneda: parsed.moneda || 'COP', formato_numero: parsed.formato_numero || 'es-CO' })
                } catch(e) {}
            }
        }
        loadConfig()
    }, [])

    const _formatCurrency = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda)

    const loadReporte = async () => {
        setLoading(true)
        const res = await window.api.getReporteVentas({ startDate, endDate })
        if (res.success) {
            setFacturas(res.data);
            setAlmacenConf(res.configuracion)
        } else {
            Swal.fire('Error', res.error, 'error')
        }
        setLoading(false);
    }

    useEffect(() => {
        loadReporte();
        const handleNuevaFactura = () => loadReporte();
        window.addEventListener('factura-creada', handleNuevaFactura);
        return () => window.removeEventListener('factura-creada', handleNuevaFactura);
    }, [startDate, endDate]);

    const totales = useMemo(() => {
        return facturas.reduce((acc, f) => {
            acc.total += f.total_factura;
            if (f.tipo_pago === 'contado') acc.contado += f.total_factura;
            if (f.tipo_pago === 'credito') acc.credito += f.total_factura;
            return acc;
        }, { total: 0, contado: 0, credito: 0 });
    }, [facturas]);

    const columnas = [
        { 
            data: 'date_created', 
            title: 'Hora',
            render: (data) => new Date(data).toLocaleTimeString(appConfig.formato_numero, { hour: '2-digit', minute: '2-digit' })
        },
        { 
            data: null, title: 'N° Factura',
            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.separador || ''}${row.numero_factura}</strong>`
        },
        { data: 'nombre_cliente', title: 'Cliente' },
        { 
            data: 'tipo_pago', title: 'Tipo Pago',
            render: (data) => data === 'contado' ? '<span class="badge bg-primary">Contado</span>' : '<span class="badge bg-warning text-dark">Crédito</span>'
        },
        { 
            data: 'total_factura', title: 'Total',
            render: (data) => `<strong class="text-success">${_formatCurrency(data)}</strong>`
        }
    ];

    return <>

            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <Button variant="success" onClick={() => setShowPreview(true)} disabled={facturas.length === 0}>
                    <i className="bi bi-printer me-2"></i> Imprimir Reporte
                </Button>
            </div>

            <Row className="mb-4">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted small"><i className="bi bi-calendar me-1"></i> Fecha Inicial</Form.Label>
                        <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted small"><i className="bi bi-calendar me-1"></i> Fecha Final</Form.Label>
                        <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 border-start border-primary border-4">
                        <Card.Body>
                            <p className="text-muted small mb-1 fw-bold text-uppercase">Ventas de Contado</p>
                            <h3 className="m-0">{_formatCurrency(totales.contado)}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 border-start border-warning border-4">
                        <Card.Body>
                            <p className="text-muted small mb-1 fw-bold text-uppercase">Ventas a Crédito</p>
                            <h3 className="m-0">{_formatCurrency(totales.credito)}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 border-start border-success border-4 bg-success bg-opacity-10">
                        <Card.Body>
                            <p className="text-success small mb-1 fw-bold text-uppercase">Total Facturado</p>
                            <h3 className="m-0 text-success fw-bold">{_formatCurrency(totales.total)}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <h6 className="fw-bold text-secondary mb-3">Detalle de Facturas ({facturas.length})</h6>
            <div className="w-100 overflow-hidden bg-white">
                {loading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : (
                    <DataTableComponent 
                        key={`reporte-${startDate}-${endDate}-${facturas.length}`}
                        data={facturas}
                        columns={columnas}
                    />
                )}
            </div>

            <ImpresorReporte 
                show={showPreview} 
                onClose={() => setShowPreview(false)} 
                facturas={facturas}
                almacenConf={almacenConf}
                fechaInicio={startDate}
                fechaFin={endDate}
            />
    </>
}