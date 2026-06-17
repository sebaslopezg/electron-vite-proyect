import { useState, useEffect, useMemo } from 'react'
import { Form, Row, Col, Button, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { formatCurrency } from '../../utils/currencies'
import { ImpresorReporte } from './components/ImpresorReporte'
import { ventasService } from '../../services/ventasService'

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

const getLocalDatetime = (startOfDay = true) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const time = startOfDay ? '00:00' : '23:59';
    return `${year}-${month}-${day}T${time}`;
}

export const Reportes = () => {
    const [startDate, setStartDate] = useState(() => getLocalDatetime(true))
    const [endDate, setEndDate] = useState(() => getLocalDatetime(false))

    const [facturas, setFacturas] = useState([])
    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
        const loadConfig = async () => {
            const configData = await ventasService.getConfiguracion()
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
        const res = await ventasService.getReporteVentas({ startDate, endDate })
        if (res.success) {
            setFacturas(res.data);
            setAlmacenConf(res.configuracion)
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'No se pudo cargar el reporte' })
        }
        setLoading(false);
    }

    useEffect(() => {
        loadReporte();
        const handleNovaFactura = () => loadReporte();
        window.addEventListener('factura-creada', handleNovaFactura);
        return () => window.removeEventListener('factura-creada', handleNovaFactura);
    }, [startDate, endDate]);

    const totales = useMemo(() => {
        return facturas.reduce((acc, f) => {
            acc.total += f.total_factura;
            const metodo = f.metodo_pago || (f.tipo_pago === 'credito' ? 'Crédito' : 'Contado');
            if (!acc.metodos[metodo]) acc.metodos[metodo] = 0;
            acc.metodos[metodo] += f.total_factura;
            return acc;
        }, { total: 0, metodos: {} });
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
            data: 'metodo_pago', title: 'Método / Tipo',
            render: (data, type, row) => {
                if (row.tipo_pago === 'credito') return '<span class="badge bg-warning text-dark">Crédito</span>'
                return `<span class="badge bg-primary">${data || 'Contado'}</span>`
            }
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
                    <Form.Label className="fw-bold text-muted small"><i className="bi bi-calendar me-1"></i> Desde Fecha/Hora</Form.Label>
                    <Form.Control type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Form.Group>
            </Col>
            <Col md={3}>
                <Form.Group>
                    <Form.Label className="fw-bold text-muted small"><i className="bi bi-calendar me-1"></i> Hasta Fecha/Hora</Form.Label>
                    <Form.Control type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Form.Group>
            </Col>
        </Row>

        <Row className="mb-4 g-3">
            <Col xs={12} sm={6} md={4} lg={3}>
                <Card className="shadow-sm border-0 border-start border-success border-4 bg-success bg-opacity-10 h-100">
                    <Card.Body className="p-3">
                        <p className="text-success small mb-1 fw-bold text-uppercase">Total Facturado</p>
                        <h4 className="m-0 text-success fw-bold">{_formatCurrency(totales.total)}</h4>
                    </Card.Body>
                </Card>
            </Col>
            {Object.entries(totales.metodos).map(([metodo, valor]) => (
                <Col xs={12} sm={6} md={4} lg={3} key={metodo}>
                    <Card className="shadow-sm border-0 border-start border-primary border-4 h-100">
                        <Card.Body className="p-3">
                            <p className="text-muted small mb-1 fw-bold text-uppercase">{metodo}</p>
                            <h5 className="m-0 fw-bold">{_formatCurrency(valor)}</h5>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>

        <h6 className="fw-bold text-secondary mb-3">Detalle de Facturas ({facturas.length})</h6>
        <div className="w-100 overflow-hidden bg-white">
            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : (
                <DataTableComponent 
                    tableId="dt-reportes-ventas"
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