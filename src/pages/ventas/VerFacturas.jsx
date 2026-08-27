import { useEffect, useState, useRef, useMemo } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button, Row, Col, Form } from 'react-bootstrap'
import { ImpresorFactura } from "./components/ImpresorFactura"
import { ModalDetalleFactura } from "./components/ModalDetalleFactura"
import Swal from 'sweetalert2'
import { formatCurrency } from '../../utils/currencies'
import { ventasService } from '../../services/ventasService'
import { exportToExcel, exportToPDF, exportInvoicePDF } from '../../utils/exporter'

export const VerFacturas = ({ currentUser }) => {

    const [reloadTable, setReloadTable] = useState(0);

    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [notesFactura, setNotasFactura] = useState([]) 
    
    const [startDate, setStartDate] = useState(() => localStorage.getItem('ventas_filtro_inicio') || '')
    const [endDate, setEndDate] = useState(() => localStorage.getItem('ventas_filtro_fin') || '')

    const [todasLasFacturas, setTodasLasFacturas] = useState([])

    useEffect(() => {
        localStorage.setItem('ventas_filtro_inicio', startDate)
        localStorage.setItem('ventas_filtro_fin', endDate)
    }, [startDate, endDate])

    const [almacenConf, setAlmacenConf] = useState(null)
    
    const [showPreview, setShowPreview] = useState(false)
    const [abiertoDesdeDetalles, setAbiertoDesdeDetalles] = useState(false)

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const loadConfig = async () => {
        const configData = await ventasService.getConfiguracion()
        const confAppRaw = configData.find(c => c.key === 'confApp')
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value)
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                })
            } catch(e) {}
        }
    }

    const _formatCurrency = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda)

    useEffect(() => {
        loadConfig()
        window.addEventListener('config-actualizada', loadConfig)
        return () => window.removeEventListener('config-actualizada', loadConfig)
    }, [])

    const handleClose = () => {
        setShow(false)
        setFacturaSeleccionada(null)
        setNotasFactura([]) 
    }
    const handleShow = () => setShow(true)

    useEffect(() => {
        const handleNuevaFactura = () => setReloadTable(prev => prev + 1)
        window.addEventListener('factura-creada', handleNuevaFactura)
        return () => window.removeEventListener('factura-creada', handleNuevaFactura)
    }, [])

    const tableContainerRef = useRef(null)

    const handleExportAllExcel = () => {
        if (todasLasFacturas.length === 0) return Swal.fire('Error', 'No hay facturas para exportar', 'warning')

        const dataToExport = todasLasFacturas.map(f => ({
            'Fecha y Hora': new Date(f.date_created).toLocaleString(appConfig.formato_numero),
            'Factura N°': `${f.prefijo || ''}${f.separador || ''}${f.numero_factura}`,
            'Doc Cliente': f.documento_cliente,
            'Cliente': f.nombre_cliente,
            'Método Pago': f.tipo_pago === 'credito' ? 'Crédito' : 'Contado',
            'Subtotal': (f.total_factura || 0) + (f.descuento || 0) - (f.iva || 0),
            'Descuento': f.descuento || 0,
            'IVA': f.iva || 0,
            'Total': f.total_factura || 0,
            'Pagado': f.total_recibido || 0,
            'Saldo Pendiente': f.saldo_pendiente || 0
        }))

        exportToExcel(dataToExport, `Historial_Facturas_${new Date().toISOString().split('T')[0]}`, "Facturas")
    }

    const handleExportAllPDF = () => {
        if (todasLasFacturas.length === 0) return Swal.fire('Error', 'No hay facturas para exportar', 'warning')

        const tableColumn = ["Fecha", "Factura", "Cliente", "Método", "Total", "Deuda"];
        const tableRows = todasLasFacturas.map(f => [
            new Date(f.date_created).toLocaleDateString(appConfig.formato_numero),
            `${f.prefijo || ''}${f.separador || ''}${f.numero_factura}`,
            f.nombre_cliente,
            f.tipo_pago === 'credito' ? 'Crédito' : 'Contado',
            _formatCurrency(f.total_factura || 0),
            _formatCurrency(f.saldo_pendiente || 0)
        ]);

        exportToPDF({
            title: 'Historial General de Facturas',
            subtitle: (startDate && endDate) ? `Desde: ${startDate.replace('T', ' ')}  Hasta: ${endDate.replace('T', ' ')}` : 'Todas las facturas registradas',
            columns: tableColumn,
            data: tableRows,
            filename: `Historial_Facturas_${new Date().toISOString().split('T')[0]}`
        })
    }

    const handleExportSingleExcel = async (factura) => {
        Swal.fire({ title: 'Procesando...', text: 'Extrayendo detalles', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await ventasService.getDetalleFactura(factura.id)
        Swal.close()

        if (!response.success) return Swal.fire('Error', 'No se pudieron extraer los detalles de la factura', 'error')

        const itemsExport = response.data.map(d => ({
            'Ref / Artículo': d.nombre_producto,
            'Cantidad': d.cantidad_producto,
            'Precio Unitario': d.precio_producto,
            'Subtotal': d.precio_producto * d.cantidad_producto,
            'Descuento': d.descuento || 0,
            'IVA': d.iva || 0,
            'Total': d.total
        }))

        itemsExport.push({ 'Ref / Artículo': '', 'Cantidad': '', 'Precio Unitario': '', 'Subtotal': '', 'Descuento': '', 'IVA': '', 'Total': '' })
        itemsExport.push({ 'Ref / Artículo': 'TOTALES', 'Cantidad': '', 'Precio Unitario': '', 'Subtotal': '', 'Descuento': '', 'IVA': '', 'Total': factura.total_factura })

        exportToExcel(itemsExport, `Factura_${factura.prefijo || ''}${factura.numero_factura}`, "Detalle")
    }

    const handleExportSinglePDF = async (factura) => {
        Swal.fire({ title: 'Generando Documento...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await ventasService.getDetalleFactura(factura.id)
        Swal.close()

        if (!response.success) return Swal.fire('Error', 'No se pudieron extraer los detalles', 'error')

        exportInvoicePDF({
            factura: factura,
            detalles: response.data,
            configuracion: response.configuracion || {},
            moneda: appConfig.moneda,
            formato_numero: appConfig.formato_numero
        });
    }

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btnSee = e.target.closest('.btn-see-item')
            if (btnSee) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnSee.dataset.alldata))
                    verDetalle(item)
                } catch(err) { console.error(err) }
            }

            const btnPrint = e.target.closest('.btn-print-item')
            if (btnPrint) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnPrint.dataset.alldata))
                    imprimirDirecto(item)
                } catch(err) { console.error(err) }
            }

            const btnExcel = e.target.closest('.btn-export-single-excel')
            if (btnExcel) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnExcel.dataset.alldata))
                    handleExportSingleExcel(item)
                } catch(err) { console.error(err) }
            }

            const btnPDF = e.target.closest('.btn-export-single-pdf')
            if (btnPDF) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnPDF.dataset.alldata))
                    handleExportSinglePDF(item)
                } catch(err) { console.error(err) }
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    const verDetalle = async (factura) => {
        setFacturaSeleccionada(factura)

        const response = await ventasService.getDetalleFactura(factura.id)
        if (response.success) {
            setDetalleData(response.data)
            setNotasFactura(response.notes || []) 
            setAlmacenConf(response.configuracion || null)
            handleShow()
        }
    }

    const imprimirDirecto = async (factura) => {
        if (!hasPermission('ventas_imprimir')) {
            return Swal.fire('Acceso Denegado', 'Tu rol no cuenta con permisos para re-imprimir comprobantes.', 'error')
        }

        setFacturaSeleccionada(factura)

        const response = await ventasService.getDetalleFactura(factura.id)
        if (response.success) {
            setDetalleData(response.data)
            setNotasFactura(response.notes || []) 
            setAlmacenConf(response.configuracion || null)
            
            setAbiertoDesdeDetalles(false)
            setShowPreview(true)
        }
    }

    const handlePrepararImpresion = () => {
        if (!hasPermission('ventas_imprimir')) {
            return Swal.fire('Acceso Denegado', 'Tu rol no cuenta con permisos para re-imprimir comprobantes.', 'error')
        }
        setShow(false)
        setAbiertoDesdeDetalles(true)
        setShowPreview(true)
    }

    const handleCerrarPreview = () => {
        setShowPreview(false)
        if (abiertoDesdeDetalles) {
            setShow(true)
        } else {
            setFacturaSeleccionada(null)
            setDetalleData([])
        }
    }

    const columnasTabla = useMemo(() => [
        { 
            data: 'date_created', 
            title: 'Fecha',
            render: (data) => {
                if (!data) return '-';
                return new Date(data).toLocaleString(appConfig.formato_numero, {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                })
            }
        },
        { 
            data: null, title: 'N° Factura',
            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.separador || ''}${row.numero_factura}</strong>`
        },
        { data: 'documento_cliente', title: 'Doc Cliente' },
        { data: 'nombre_cliente', title: 'Nombre Cliente' },
        {
            data: null, title: 'Estado', orderable: false,
            render: function (data, type, row) {
                let badges = ''
                
                const isAnulada = row.notas_motivos && row.notas_motivos.toLowerCase().includes('anula');

                if (isAnulada) {
                    badges += '<span class="badge bg-secondary me-1">Anulada</span>'
                } else {
                    if (row.tipo_pago === 'credito') {
                        if (!row.total_recibido || row.total_recibido === 0) badges += '<span class="badge bg-danger me-1">Crédito</span>'
                        else if (row.saldo_pendiente > 0) badges += '<span class="badge bg-warning text-dark me-1">Crédito</span>'
                        else badges += '<span class="badge bg-success me-1">Crédito</span>'
                    } else {
                        badges += '<span class="badge bg-primary me-1">Contado</span>'
                    }
                }

                if (row.notas_aplicadas) {
                    if (row.notas_aplicadas.includes('Crédito')) badges += '<span class="badge bg-info text-dark me-1">Nota Crédito</span>'
                    if (row.notas_aplicadas.includes('Débito')) badges += '<span class="badge bg-secondary me-1">Nota Débito</span>'
                }
                return badges
            }
        },
        {
            data: null, title: 'Acciones', orderable: false, className: 'text-center',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                const canPrint = hasPermission('ventas_imprimir')

                return `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu shadow-sm">
                            <li>
                                <button class="dropdown-item btn-see-item" data-alldata="${safeData}">
                                    <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                                </button>
                            </li>
                            ${canPrint ? `
                            <li>
                                <button class="dropdown-item btn-print-item" data-alldata="${safeData}">
                                    <i class="bi bi-printer me-2 text-primary"></i> Imprimir Tirilla
                                </button>
                            </li>
                            ` : ''}
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <button class="dropdown-item btn-export-single-pdf" data-alldata="${safeData}">
                                    <i class="bi bi-file-earmark-pdf me-2 text-danger"></i> Descargar en PDF
                                </button>
                            </li>
                            <li>
                                <button class="dropdown-item btn-export-single-excel" data-alldata="${safeData}">
                                    <i class="bi bi-file-earmark-excel me-2 text-success"></i> Exportar a Excel
                                </button>
                            </li>
                        </ul>
                    </div>
                `
            }
        }
    ], [appConfig, currentUser?.permisos])

    return <>
        <div className="bg-light p-3 rounded mb-4 border">
            <Row className="align-items-end">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Desde Fecha/Hora:</small></Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Hasta Fecha/Hora:</small></Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <div className="d-flex gap-2">
                        <Button 
                            variant="outline-secondary" size="sm"
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            disabled={!startDate && !endDate}
                            title="Limpiar Filtros de Fecha"
                        >
                            <i className="bi bi-x-circle me-1"></i> Limpiar Filtro
                        </Button>
                        <Button 
                            variant="outline-danger" size="sm" 
                            onClick={handleExportAllPDF} 
                            disabled={todasLasFacturas.length === 0}
                            title="Exportar Todo a PDF"
                        >
                            <i className="bi bi-file-earmark-pdf"></i>
                        </Button>
                        <Button 
                            variant="outline-success" size="sm" 
                            onClick={handleExportAllExcel} 
                            disabled={todasLasFacturas.length === 0}
                            title="Exportar Todo a Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </Button>
                    </div>
                </Col>
            </Row>
        </div>

        <div ref={tableContainerRef}>
            <div className="card-body p-3 w-100 overflow-visible">
                <DataTableComponent
                    tableId="dt-ver-facturas-maestro"
                    key={`facturas-main-${appConfig.moneda}-${appConfig.formato_numero}-${startDate}-${endDate}-${reloadTable}`}
                    reloadKey={reloadTable}
                    ajaxData={async (params) => {
                        params.startDate = startDate
                        params.endDate = endDate
                        const result = await ventasService.getFacturasPaginadas(params)
                        setTodasLasFacturas(result.data || [])
                        return result;
                    }}
                    columns={columnasTabla}
                />
            </div>
        </div>

        <ModalDetalleFactura
            show={show}
            handleClose={handleClose}
            facturaSeleccionada={facturaSeleccionada}
            detalleData={detalleData}
            notasFactura={notesFactura}
            handlePrepararImpresion={handlePrepararImpresion}
            appConfig={appConfig}
        />
        
        <ImpresorFactura 
            show={showPreview} 
            onClose={handleCerrarPreview} 
            factura={facturaSeleccionada} 
            detalles={detalleData} 
            almacenConf={almacenConf} 
            textoVolver={abiertoDesdeDetalles ? 'Volver a Detalles' : 'Cerrar'} 
        />
    </>
}