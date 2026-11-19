import { useState, useRef, useEffect, useMemo } from 'react'
import { Row, Col, Card, ButtonGroup, Button } from 'react-bootstrap'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalDetalleTercero } from '../contabilidad/components/ModalDetalleTercero'
import { clientesService } from '../../services/clientesService'
import { ventasService } from '../../services/ventasService'
import { formatCurrency } from '../../utils/currencies'

export const ClientesSaldos = ({ activeUser }) => {
    const [showDetalle, setShowDetalle] = useState(false)
    const [terceroVer, setTerceroVer] = useState(null)

    const [tipoSaldo, setTipoSaldo] = useState('todos') // 'todos' | 'deuda' | 'favor'
    const [resumen, setResumen] = useState({ totalDeuda: 0, totalFavor: 0 })
    const [reloadTable, setReloadTable] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const configData = await ventasService.getConfiguracion()
                const confAppRaw = configData.find(c => c.key === 'confApp')
                if (confAppRaw) {
                    const parsed = JSON.parse(confAppRaw.value)
                    setAppConfig({
                        moneda: parsed.moneda || 'COP',
                        formato_numero: parsed.formato_numero || 'es-CO'
                    })
                }
            } catch (e) {}
        }
        loadConfig()
    }, [])

    useEffect(() => {
        if (activeUser) {
            setIsLoading(false)
        } else {
            const timer = setTimeout(() => setIsLoading(false), 1000)
            return () => clearTimeout(timer)
        }
    }, [activeUser])

    useEffect(() => {
        const handleRefresh = () => setReloadTable(prev => prev + 1)
        window.addEventListener('factura-creada', handleRefresh)
        window.addEventListener('realtime-sync-applied', handleRefresh)
        return () => {
            window.removeEventListener('factura-creada', handleRefresh)
            window.removeEventListener('realtime-sync-applied', handleRefresh)
        }
    }, [])

    const _formatCurrency = (val) => formatCurrency(val || 0, appConfig.formato_numero, appConfig.moneda)

    const handleVerDetalles = (tercero) => {
        setTerceroVer(tercero)
        setShowDetalle(true)
    }

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const actionEl = e.target.closest('.btn-view[data-alldata]')
            if (!actionEl || !container.contains(actionEl)) return

            e.preventDefault()
            try {
                const item = JSON.parse(decodeURIComponent(actionEl.dataset.alldata))
                handleVerDetalles(item)
            } catch (err) {
                console.error(err)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [activeUser, isLoading])

    const columns = useMemo(() => [
        {
            data: null,
            title: 'Documento',
            render: (data, type, row) => `${row.tipo_documento || ''} ${row.numero_documento || ''}${row.digito_verificacion ? `-${row.digito_verificacion}` : ''}`
        },
        {
            data: null,
            title: 'Nombre / Razón Social',
            render: (data, type, row) => {
                const nombre = row.tipo_persona === 'juridica'
                    ? row.razon_social
                    : `${row.nombres || ''} ${row.apellidos || ''}`.trim()
                return `<i class="bi ${row.tipo_persona === 'juridica' ? 'bi-building' : 'bi-person'} text-secondary me-2"></i>${nombre}`
            }
        },
        {
            data: null,
            title: 'Contacto',
            orderable: false,
            render: (data, type, row) => `<div class="small text-muted">${row.telefono ? `<div><i class="bi bi-telephone me-1"></i>${row.telefono}</div>` : ''}${row.email ? `<div><i class="bi bi-envelope me-1"></i>${row.email}</div>` : ''}</div>`
        },
        {
            data: 'deuda_total',
            title: 'Debe al Almacén',
            className: 'text-end',
            render: (data, type, row) => {
                const deuda = Number(row.deuda_total) || 0
                if (deuda <= 0) return `<span class="text-muted">${_formatCurrency(0)}</span>`
                return `
                    <div>
                        <span class="fw-bold text-danger">${_formatCurrency(deuda)}</span>
                        ${row.facturas_pendientes ? `<div class="small text-muted">${row.facturas_pendientes} fact. pend.</div>` : ''}
                    </div>
                `
            }
        },
        {
            data: 'saldo_favor',
            title: 'Saldo a Favor',
            className: 'text-end',
            render: (data, type, row) => {
                const favor = Number(row.saldo_favor) || 0
                if (favor <= 0) return `<span class="text-muted">${_formatCurrency(0)}</span>`
                return `<span class="fw-bold text-success">${_formatCurrency(favor)}</span>`
            }
        },
        {
            data: null,
            title: 'Estado',
            orderable: false,
            className: 'text-center',
            render: (data, type, row) => {
                const deuda = Number(row.deuda_total) || 0
                const favor = Number(row.saldo_favor) || 0
                let badges = ''
                if (deuda > 0) badges += '<span class="badge border border-danger text-danger me-1">Debe</span>'
                if (favor > 0) badges += '<span class="badge border border-success text-success">A Favor</span>'
                return badges
            }
        },
        {
            data: null,
            title: 'Acciones',
            orderable: false,
            className: 'text-center',
            render: (data, type, row) => {
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu shadow-sm">
                            <li>
                                <a class="dropdown-item btn-view" href="#" data-alldata="${safeData}">
                                    <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                                </a>
                            </li>
                        </ul>
                    </div>
                `
            }
        }
    ], [appConfig])

    return <>
        <div className="position-relative" style={{ minHeight: isLoading ? '60vh' : 'auto' }}>

            {isLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white" style={{ zIndex: 10 }}>
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            )}

            <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.4s ease-in-out', pointerEvents: isLoading ? 'none' : 'auto' }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <h5 className="card-title mb-0">
                        <i className="bi bi-wallet2 text-primary me-2"></i>
                        Estado de Saldos de Clientes
                    </h5>

                    <ButtonGroup size="sm">
                        <Button
                            variant={tipoSaldo === 'todos' ? 'primary' : 'outline-primary'}
                            onClick={() => setTipoSaldo('todos')}
                        >
                            Todos
                        </Button>
                        <Button
                            variant={tipoSaldo === 'deuda' ? 'primary' : 'outline-primary'}
                            onClick={() => setTipoSaldo('deuda')}
                        >
                            Deben al Almacén
                        </Button>
                        <Button
                            variant={tipoSaldo === 'favor' ? 'primary' : 'outline-primary'}
                            onClick={() => setTipoSaldo('favor')}
                        >
                            Saldo a Favor
                        </Button>
                    </ButtonGroup>
                </div>

                <Row className="mb-4 g-3">
                    <Col xs={12} md={6}>
                        <Card className="shadow-sm border-0 border-start border-primary border-4 bg-opacity-10">
                            <Card.Body className="py-2 px-3">
                                <p className="text-secondary small mb-0 fw-bold text-uppercase">Total por Cobrar</p>
                                <h5 className="m-0 text-dark fw-bold">{_formatCurrency(resumen.totalDeuda)}</h5>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card className="shadow-sm border-0 border-start border-primary border-4 bg-opacity-10">
                            <Card.Body className="py-2 px-3">
                                <p className="text-secondary small mb-0 fw-bold text-uppercase">Total Saldos a Favor</p>
                                <h5 className="m-0 text-dark fw-bold">{_formatCurrency(resumen.totalFavor)}</h5>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <div ref={tableContainerRef} className="w-100 overflow-visible">
                    <CustomDataTable
                        tableId="dt-clientes-saldos"
                        key={`clientes-saldos-${tipoSaldo}-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}`}
                        ajaxData={async (params) => {
                            const res = await clientesService.getClientesSaldosPaginados({ ...params, tipoSaldo })
                            if (res?.resumen) setResumen(res.resumen)
                            return res
                        }}
                        columns={columns}
                        order={[[3, 'desc']]}
                    />
                </div>
            </div>
        </div>

        <ModalDetalleTercero
            show={showDetalle}
            handleClose={() => setShowDetalle(false)}
            terceroData={terceroVer}
        />
    </>
}