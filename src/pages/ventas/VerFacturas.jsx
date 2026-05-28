import { useEffect, useState, useRef, useMemo } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button, Row, Col, Form } from 'react-bootstrap'
import { ImpresorFactura } from "./components/ImpresorFactura"
import { ModalDetalleFactura } from "./components/ModalDetalleFactura"
import Swal from 'sweetalert2'
import { ventasService } from '../../services/ventasService'

export const VerFacturas = ({ currentUser }) => {

    const [reloadTable, setReloadTable] = useState(0);

    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [notesFactura, setNotasFactura] = useState([]) 
    
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

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
                if (row.tipo_pago === 'credito') {
                    if (!row.total_recibido || row.total_recibido === 0) badges += '<span class="badge bg-danger me-1">Crédito</span>'
                    else if (row.saldo_pendiente > 0) badges += '<span class="badge bg-warning text-dark me-1">Crédito</span>'
                    else badges += '<span class="badge bg-success me-1">Crédito</span>'
                } else {
                    badges += '<span class="badge bg-primary me-1">Contado</span>'
                }
                if (row.notas_aplicadas) {
                    if (row.notas_aplicadas.includes('Crédito')) badges += '<span class="badge bg-info text-dark me-1">Nota Crédito</span>'
                    if (row.notas_aplicadas.includes('Débito')) badges += '<span class="badge bg-secondary me-1">Nota Débito</span>'
                }
                return badges
            }
        },
        {
            data: null, title: 'Acciones', orderable: false,
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                const canPrint = hasPermission('ventas_imprimir')

                return `
                    <button class="btn btn-sm btn-secondary text-white btn-see-item me-1" data-alldata="${safeData}" title="Ver Detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${canPrint ? `
                    <button class="btn btn-sm btn-primary text-white btn-print-item" data-alldata="${safeData}" title="Imprimir Factura">
                        <i class="bi bi-printer"></i>
                    </button>
                    ` : ''}
                `
            }
        }
    ], [appConfig, currentUser?.permisos])

    return <>
        <div className="bg-light p-3 rounded mb-4 border">
            <Row className="align-items-end">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Desde:</small></Form.Label>
                        <Form.Control type="date" size="sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Hasta:</small></Form.Label>
                        <Form.Control type="date" size="sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Button 
                        variant="outline-secondary" size="sm"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        disabled={!startDate && !endDate}
                    >
                        <i className="bi bi-x-circle me-1"></i> Limpiar Filtro
                    </Button>
                </Col>
            </Row>
        </div>

        <div ref={tableContainerRef}>
            <div className="card-body p-3 w-100 overflow-hidden">
                <DataTableComponent
                    tableId="dt-ver-facturas-maestro"
                    key={`facturas-main-${appConfig.moneda}-${appConfig.formato_numero}-${startDate}-${endDate}-${reloadTable}`}
                    reloadKey={reloadTable}
                    ajaxData={(params) => {
                        params.startDate = startDate
                        params.endDate = endDate
                        return ventasService.getFacturasPaginadas(params)
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