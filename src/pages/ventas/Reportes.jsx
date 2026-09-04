import { useState, useEffect, useMemo, useRef } from 'react'
import { Form, Row, Col, Button, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { formatCurrency } from '../../utils/currencies'
import { ImpresorReporte } from './components/ImpresorReporte'
import { ModalDetalleFactura } from './components/ModalDetalleFactura'
import { ImpresorFactura } from './components/ImpresorFactura'
import { ventasService } from '../../services/ventasService'
import { exportToExcel, exportToPDF } from '../../utils/exporter'

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
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    const time = startOfDay ? '00:00' : '23:59'
    return `${year}-${month}-${day}T${time}`
}

export const Reportes = ({ currentUser }) => {
    // Estado local para garantizar que siempre tengamos la sesión cargada
    const [activeUser, setActiveUser] = useState(currentUser)

    const [startDate, setStartDate] = useState(() => getLocalDatetime(true))
    const [endDate, setEndDate] = useState(() => getLocalDatetime(false))

    const [transacciones, setTransacciones] = useState([])
    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    const tableContainerRef = useRef(null)
    const [showModalFactura, setShowModalFactura] = useState(false)
    const [showImpresorFactura, setShowImpresorFactura] = useState(false)
    const [facturaVer, setFacturaVer] = useState(null)
    const [detalleData, setDetalleData] = useState([])
    const [notasFactura, setNotasFactura] = useState([])

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
        const fetchSession = async () => {
            if (window.api && window.api.getCurrentUser) {
                const res = await window.api.getCurrentUser()
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            }
        }
        if (!currentUser) fetchSession()
        else setActiveUser(currentUser)
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        const userToEvaluate = activeUser || currentUser;
        if (!userToEvaluate) return false;
        if (userToEvaluate.permisos?.includes('ALL')) return true;
        return userToEvaluate.permisos?.includes(permissionKey);
    }

    const canPrint = hasPermission('reportes_imprimir')
    const canDownloadPDF = hasPermission('reportes_descargar_pdf')
    const canDownloadExcel = hasPermission('reportes_descargar_excel')

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
            setTransacciones(res.data);
            setAlmacenConf(res.configuracion)
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'No se pudo cargar el reporte' })
        }
        setLoading(false)
    }

    useEffect(() => {
        loadReporte()
        const handleNovaFactura = () => loadReporte()
        window.addEventListener('factura-creada', handleNovaFactura)
        return () => window.removeEventListener('factura-creada', handleNovaFactura)
    }, [startDate, endDate])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btnFactura = e.target.closest('.btn-view-factura')
            if (btnFactura && container.contains(btnFactura)) {
                e.preventDefault()
                try {
                    const item = JSON.parse(decodeURIComponent(btnFactura.dataset.alldata))
                    const facturaId = item.tipo_transaccion === 'abono' ? item.maestro_id : item.id
                    
                    handleViewFactura({
                        ...item,
                        id: facturaId,
                        numero_factura: item.numero_factura || item.factura_numero,
                        tipo_pago: item.tipo_transaccion === 'abono' ? 'credito' : item.tipo_pago
                    })
                } catch(err) { console.error(err) }
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    const handleViewFactura = async (factura) => {
        setFacturaVer(factura)
        setShowModalFactura(true)
        
        try {
            const result = await ventasService.getDetalleFactura(factura.id)
            if (Array.isArray(result)) {
                setDetalleData(result)
                setNotasFactura([])
            } else if (result && (result.success || result.data || result.detalles)) {
                setDetalleData(result.data || result.detalles || [])
                setNotasFactura(result.notes || result.notas || [])
            } else {
                setDetalleData([])
                setNotasFactura([])
            }
        } catch(e) {
            console.error("Error cargando detalle", e)
            setDetalleData([])
            setNotasFactura([])
        }
    }

    const handleCloseModalFactura = () => {
        setShowModalFactura(false)
        setFacturaVer(null)
        setDetalleData([])
        setNotasFactura([])
    }

    const handlePrepararImpresionFactura = () => {
        setShowModalFactura(false)
        setShowImpresorFactura(true)
    }

    const totales = useMemo(() => {
        return transacciones.reduce((acc, t) => {
            if (t.tipo_transaccion === 'venta') {
                acc.totalFacturado += (t.total_factura || 0)
            }

            if (t.tipo_transaccion === 'abono') {
                const metodo = t.metodo_pago || 'Abono'
                if (!acc.metodos[metodo]) acc.metodos[metodo] = 0
                acc.metodos[metodo] += (t.valor || 0)
                
                acc.ingresoTotalCaja += (t.valor || 0)
            } 
            else if (t.tipo_transaccion === 'venta') {
                const ingresoReal = (t.total_factura || 0) - (t.saldo_pendiente || 0)
                
                if (ingresoReal > 0) {
                    const metodo = t.metodo_pago || 'Contado'
                    if (!acc.metodos[metodo]) acc.metodos[metodo] = 0
                    acc.metodos[metodo] += ingresoReal
                    
                    acc.ingresoTotalCaja += ingresoReal
                }
                
                if (t.saldo_pendiente > 0) {
                    if (!acc.metodos['Crédito']) acc.metodos['Crédito'] = 0
                    acc.metodos['Crédito'] += (t.saldo_pendiente || 0)
                }
            }

            return acc
        }, { totalFacturado: 0, ingresoTotalCaja: 0, metodos: {} })
    }, [transacciones])

    const handleExportExcel = () => {
        try {
            const dataToExport = transacciones.map(t => {
                const ingreso = t.tipo_transaccion === 'abono' ? (t.valor || 0) : ((t.total_factura || 0) - (t.saldo_pendiente || 0))
                const venta = t.tipo_transaccion === 'abono' ? 0 : (t.total_factura || 0)

                return {
                    'Fecha y Hora': new Date(t.date_created).toLocaleString(appConfig.formato_numero),
                    'Documento': t.tipo_transaccion === 'abono' ? `Abono a F-${t.factura_numero || ''}` : `${t.prefijo || ''}${t.separador || ''}${t.numero_factura || ''}`,
                    'Cliente': t.nombre_cliente,
                    'Concepto / Método': t.tipo_transaccion === 'abono' ? `Abono - ${t.metodo_pago}` : (t.tipo_pago === 'credito' ? 'Venta a Crédito' : `Venta - ${t.metodo_pago || 'Contado'}`),
                    'Venta (Total)': venta,
                    'Ingreso Real': ingreso
                }
            })

            dataToExport.push({
                'Fecha y Hora': '',
                'Documento': '',
                'Cliente': '',
                'Concepto / Método': 'TOTALES GLOBALES',
                'Venta (Total)': totales.totalFacturado,
                'Ingreso Real': totales.ingresoTotalCaja
            })

            exportToExcel(dataToExport, `Reporte_Financiero_${startDate.split('T')[0]}`, "Transacciones")
        } catch (error) {
            console.error("Error exportando a Excel:", error)
            Swal.fire('Error', 'No se pudo generar el archivo Excel: ' + error.message, 'error')
        }
    }

    const handleExportPDF = () => {
        try {
            const tableColumn = ["Hora", "Documento", "Cliente", "Concepto / Método", "Venta", "Ingreso"]
            const tableRows = [];

            transacciones.forEach(t => {
                const ingreso = t.tipo_transaccion === 'abono' ? (t.valor || 0) : ((t.total_factura || 0) - (t.saldo_pendiente || 0))
                const venta = t.tipo_transaccion === 'abono' ? 0 : (t.total_factura || 0);
                const concepto = t.tipo_transaccion === 'abono' ? `Abono - ${t.metodo_pago}` : (t.tipo_pago === 'credito' ? 'Venta a Crédito' : `Venta - ${t.metodo_pago || 'Contado'}`)

                const rowData = [
                    new Date(t.date_created).toLocaleTimeString(appConfig.formato_numero, { hour: '2-digit', minute: '2-digit' }),
                    t.tipo_transaccion === 'abono' ? `Abono a F-${t.factura_numero || ''}` : `${t.prefijo || ''}${t.separador || ''}${t.numero_factura || ''}`,
                    t.nombre_cliente,
                    concepto,
                    venta > 0 ? _formatCurrency(venta) : '-',
                    ingreso > 0 ? _formatCurrency(ingreso) : '$0'
                ]
                tableRows.push(rowData)
            })

            tableRows.push([
                "", "", "", "TOTALES GLOBALES",
                _formatCurrency(totales.totalFacturado),
                _formatCurrency(totales.ingresoTotalCaja)
            ])

            exportToPDF({
                title: 'Reporte Financiero de Transacciones',
                subtitle: `Periodo: ${startDate.replace('T', ' ')} a ${endDate.replace('T', ' ')}`,
                columns: tableColumn,
                data: tableRows,
                filename: `Reporte_Financiero_${startDate.split('T')[0]}`
            })
        } catch (error) {
            console.error("Error exportando a PDF:", error);
            Swal.fire('Error', 'No se pudo generar el archivo PDF: ' + error.message, 'error')
        }
    }

    const columnas = [
        { 
            data: 'date_created', 
            title: 'Hora',
            render: (data) => new Date(data).toLocaleTimeString(appConfig.formato_numero, { hour: '2-digit', minute: '2-digit' })
        },
        { 
            data: null, title: 'Documento',
            render: (data, type, row) => {
                const safeData = encodeURIComponent(JSON.stringify(row))
                if (row.tipo_transaccion === 'abono') {
                    return `<strong>Abono a <a href="#" class="text-primary text-decoration-underline btn-view-factura" data-alldata="${safeData}">F-${row.factura_numero || ''}</a></strong>`
                }
                const pref = row.prefijo || ''
                const sep = row.separador || ''
                const num = row.numero_factura || ''
                return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view-factura" data-alldata="${safeData}">${pref}${sep}${num}</a>`
            }
        },
        { data: 'nombre_cliente', title: 'Cliente' },
        { 
            data: null, title: 'Concepto / Método',
            render: (data, type, row) => {
                if (row.tipo_transaccion === 'abono') {
                    return `<span class="badge bg-success me-1">Abono</span> <span class="badge border border-success text-success">${row.metodo_pago}</span>`
                }
                if (row.tipo_pago === 'credito') {
                    return `<span class="badge bg-primary me-1">Venta</span> <span class="badge border border-warning text-warning text-dark">Crédito</span>`
                }
                return `<span class="badge bg-primary me-1">Venta</span> <span class="badge border border-primary text-primary">${row.metodo_pago || 'Contado'}</span>`
            }
        },
        { 
            data: null, title: 'Venta',
            render: (data, type, row) => {
                if (row.tipo_transaccion === 'abono') return `<span class="text-muted">-</span>`
                return `${_formatCurrency(row.total_factura || 0)}`
            }
        },
        { 
            data: null, title: 'Abono / Ingreso',
            render: (data, type, row) => {
                let ingreso = 0;
                if (row.tipo_transaccion === 'abono') {
                    ingreso = row.valor || 0;
                } else {
                    ingreso = (row.total_factura || 0) - (row.saldo_pendiente || 0)
                }

                if (ingreso <= 0) return `<span class="text-muted">$0</span>`
                return `<strong class="text-success">${_formatCurrency(ingreso)}</strong>`
            }
        }
    ]

    return <>
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 border-bottom pb-3 gap-3">
            <div>
                {canPrint && (
                    <Button variant="primary" className="me-2" onClick={() => setShowPreview(true)} disabled={transacciones.length === 0}>
                        <i className="bi bi-printer me-2"></i> Imprimir
                    </Button>
                )}
            </div>
            <div className="d-flex gap-2">
                {canDownloadPDF && (
                    <Button variant="outline-danger" onClick={handleExportPDF} disabled={transacciones.length === 0}>
                        <i className="bi bi-file-earmark-pdf me-2"></i> Exportar PDF
                    </Button>
                )}
                {canDownloadExcel && (
                    <Button variant="outline-success" onClick={handleExportExcel} disabled={transacciones.length === 0}>
                        <i className="bi bi-file-earmark-excel me-2"></i> Exportar Excel
                    </Button>
                )}
            </div>
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
                        <h4 className="m-0 text-success fw-bold">{_formatCurrency(totales.totalFacturado)}</h4>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col xs={12} sm={6} md={4} lg={3}>
                <Card className="shadow-sm border-0 border-start border-success border-4 bg-success bg-opacity-10 h-100">
                    <Card.Body className="p-3">
                        <p className="text-success small mb-1 fw-bold text-uppercase">Ingreso Caja</p>
                        <h4 className="m-0 text-success fw-bold">{_formatCurrency(totales.ingresoTotalCaja)}</h4>
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

        <h6 className="mb-3">Detalle de Transacciones ({transacciones.length})</h6>
        <div className="w-100 bg-white" ref={tableContainerRef}>
            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : (
                <DataTableComponent 
                    tableId="dt-reportes-ventas"
                    key={`reporte-${startDate}-${endDate}-${transacciones.length}`}
                    data={transacciones}
                    columns={columnas}
                    order={[[0, 'desc']]}
                />
            )}
        </div>

        <ImpresorReporte 
            show={showPreview} 
            onClose={() => setShowPreview(false)} 
            facturas={transacciones}
            almacenConf={almacenConf}
            fechaInicio={startDate}
            fechaFin={endDate}
        />

        <ModalDetalleFactura 
            show={showModalFactura}
            handleClose={handleCloseModalFactura}
            facturaSeleccionada={facturaVer}
            detalleData={detalleData}
            notasFactura={notasFactura}
            handlePrepararImpresion={handlePrepararImpresionFactura}
            appConfig={appConfig}
            canPrint={hasPermission('ventas_imprimir')}
        />

        <ImpresorFactura 
            show={showImpresorFactura}
            onClose={() => setShowImpresorFactura(false)}
            factura={facturaVer}
            detalles={detalleData}
            almacenConf={almacenConf}
            textoVolver="Volver a Reportes"
        />
    </>
}