import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Modal, Button, Row, Col, Badge, Card } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'
import { ModalDetalleFactura } from '../../ventas/components/ModalDetalleFactura'
import { ImpresorFactura } from '../../ventas/components/ImpresorFactura'
import { formatCurrency } from '../../../utils/currencies'
import { ventasService } from '../../../services/ventasService'

const getPortfolioStatusMeta = (debtTotal, creditBalance) => {
    if (debtTotal > 0) {
        return {
            key: 'debt',
            title: 'Con Deuda Pendiente',
            subtitle: 'Debe al almacén',
            amount: debtTotal,
            cardClass: 'border-danger bg-danger bg-opacity-10',
            textClass: 'text-danger',
            badgeBg: 'danger',
            icon: 'bi-exclamation-circle-fill'
        }
    }

    if (creditBalance > 0) {
        return {
            key: 'credit',
            title: 'Saldo a Favor',
            subtitle: 'Crédito disponible',
            amount: creditBalance,
            cardClass: 'border-primary bg-opacity-10',
            textClass: 'text-dark',
            badgeBg: 'secondary',
            icon: 'bi-wallet2'
        }
    }

    return {
        key: 'clear',
        title: 'Cartera al Día',
        subtitle: 'Sin saldos pendientes',
        amount: 0,
        cardClass: 'border-success bg-opacity-10',
        textClass: 'text-success',
        badgeBg: 'success',
        icon: 'bi-check-circle-fill'
    }
}

export const ModalDetalleTercero = ({ show, handleClose, terceroData }) => {
    const [activeTab, setActiveTab] = useState('general')
    const [isLoading, setIsLoading] = useState(false)
    const [detailData, setDetailData] = useState(null)
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })
    const [canPrintInvoice, setCanPrintInvoice] = useState(true)

    // Nested invoice detail & print modal states
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [showInvoicePrinter, setShowInvoicePrinter] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [invoiceDetails, setInvoiceDetails] = useState([])
    const [invoiceNotes, setInvoiceNotes] = useState([])
    const [storeConfig, setStoreConfig] = useState(null)

    const modalBodyRef = useRef(null)

    useEffect(() => {
        const loadAppConfigAndSession = async () => {
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
            } catch (err) {
                console.error('Error loading app config in third party detail modal', err)
            }

            try {
                if (window.api?.getCurrentUser) {
                    const userRes = await window.api.getCurrentUser()
                    if (userRes?.success && userRes.data) {
                        const permissions = userRes.data.permisos || []
                        setCanPrintInvoice(permissions.includes('ALL') || permissions.includes('ventas_imprimir'))
                    }
                }
            } catch (err) {
                console.error('Error checking print permission in third party detail modal', err)
            }
        }
        loadAppConfigAndSession()
    }, [])

    useEffect(() => {
        if (!show) {
            setShowInvoiceModal(false)
            setShowInvoicePrinter(false)
            setSelectedInvoice(null)
            setInvoiceDetails([])
            setInvoiceNotes([])
            return
        }

        let isMounted = true

        const fetchCompleteDetail = async () => {
            if (!terceroData) return

            setActiveTab('general')
            setIsLoading(true)

            try {
                if (window.api?.getTerceroDetalleCompleto) {
                    const response = await window.api.getTerceroDetalleCompleto({
                        id: terceroData.id,
                        documento: terceroData.numero_documento
                    })
                    if (isMounted && response?.success) {
                        setDetailData(response.data)
                    } else if (isMounted) {
                        setDetailData(null)
                    }
                } else if (isMounted) {
                    setDetailData(null)
                }
            } catch (err) {
                console.error('Error loading complete third party details', err)
                if (isMounted) setDetailData(null)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        fetchCompleteDetail()
        return () => { isMounted = false }
    }, [show, terceroData])

    const handleOpenInvoice = useCallback(async (invoiceId, fallbackInvoice = null) => {
        if (!invoiceId) return

        setSelectedInvoice(fallbackInvoice || { id: invoiceId })
        setInvoiceDetails([])
        setInvoiceNotes([])
        setShowInvoiceModal(true)

        try {
            const response = await ventasService.getDetalleFactura(invoiceId)
            if (response && response.success) {
                setInvoiceDetails(response.data || [])
                setInvoiceNotes(response.notes || [])
                setStoreConfig(response.configuracion || null)
                if (response.facturaMaestro || response.maestro) {
                    setSelectedInvoice(response.facturaMaestro || response.maestro)
                }
            } else {
                setInvoiceDetails([])
                setInvoiceNotes([])
            }
        } catch (err) {
            console.error('Error loading invoice detail from third party modal', err)
            setInvoiceDetails([])
            setInvoiceNotes([])
        }
    }, [])

    const handleCloseInvoiceModal = () => {
        setShowInvoiceModal(false)
        setSelectedInvoice(null)
        setInvoiceDetails([])
        setInvoiceNotes([])
    }

    const handlePrepareInvoicePrint = () => {
        setShowInvoiceModal(false)
        setShowInvoicePrinter(true)
    }

    const handleCloseInvoicePrinter = () => {
        setShowInvoicePrinter(false)
        setShowInvoiceModal(true)
    }

    useEffect(() => {
        const container = modalBodyRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const invoiceLink = e.target.closest('.btn-view-factura')
            if (!invoiceLink || !container.contains(invoiceLink)) return

            e.preventDefault()
            const invoiceId = invoiceLink.dataset.invoiceId
            if (!invoiceId) return

            let fallbackData = { id: invoiceId }
            if (invoiceLink.dataset.alldata) {
                try {
                    fallbackData = JSON.parse(decodeURIComponent(invoiceLink.dataset.alldata))
                } catch (err) {
                    console.error('Error decoding invoice fallback payload', err)
                }
            }

            handleOpenInvoice(invoiceId, fallbackData)
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [show, activeTab, isLoading, showInvoiceModal, showInvoicePrinter, handleOpenInvoice])

    const invoices = detailData?.facturas || []
    const payments = detailData?.abonos || []
    const rawCreditMovements = detailData?.movimientosSaldoFavor || []

    const creditMovements = useMemo(() => {
        const paymentInvoiceMap = new Map()
        payments.forEach(pay => {
            if (pay.id && pay.maestro_id) {
                paymentInvoiceMap.set(String(pay.id), pay.maestro_id)
            }
        })

        return rawCreditMovements.map(mov => {
            let resolvedInvoiceId = mov.factura_id || null

            if (!resolvedInvoiceId && mov.type === 'sale_usage' && String(mov.id).startsWith('sale-credit-')) {
                resolvedInvoiceId = String(mov.id).replace('sale-credit-', '')
            } else if (!resolvedInvoiceId && mov.type === 'payment_usage' && String(mov.id).startsWith('payment-credit-')) {
                const paymentId = String(mov.id).replace('payment-credit-', '')
                resolvedInvoiceId = paymentInvoiceMap.get(paymentId) || null
            }

            return {
                ...mov,
                resolvedInvoiceId
            }
        })
    }, [rawCreditMovements, payments])

    const formatMoney = useCallback(
        (value) => formatCurrency(value || 0, appConfig.formato_numero, appConfig.moneda),
        [appConfig]
    )

    const formatDateTime = useCallback((rawDate) => {
        if (!rawDate) return '-'
        const parsed = new Date(rawDate)
        if (Number.isNaN(parsed.getTime())) return String(rawDate)
        return parsed.toLocaleString(appConfig.formato_numero, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }, [appConfig])

    const invoiceColumns = useMemo(() => [
        {
            data: 'date_created',
            title: 'Fecha',
            render: (data, type) => {
                if (type === 'sort' || type === 'type') return data || ''
                return `<span class="text-nowrap">${formatDateTime(data)}</span>`
            }
        },
        {
            data: 'numero_factura',
            title: 'N° Factura',
            render: (data, type, row) => {
                const invoiceNum = `${row.prefijo || ''}${row.separador_efectivo || row.separador || ''}${row.numero_factura || ''}`
                if (type === 'sort' || type === 'type' || type === 'filter') return invoiceNum
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `<a href="#" class="text-primary fw-bold text-decoration-underline text-nowrap btn-view-factura" data-invoice-id="${row.id}" data-alldata="${safeData}">${invoiceNum}</a>`
            }
        },
        {
            data: 'metodo_pago',
            title: 'Método de Pago',
            render: (data) => data || '-'
        },
        {
            data: 'total_factura',
            title: 'Total',
            className: 'text-end',
            render: (data, type) => {
                const numericVal = Number(data) || 0
                if (type === 'sort' || type === 'type') return numericVal
                return `<strong class="text-nowrap">${formatMoney(numericVal)}</strong>`
            }
        },
        {
            data: 'saldo_pendiente',
            title: 'Pendiente',
            className: 'text-end',
            render: (data, type) => {
                const numericVal = Number(data) || 0
                if (type === 'sort' || type === 'type') return numericVal
                const colorClass = numericVal > 0 ? 'text-danger fw-bold' : 'text-muted'
                return `<span class="${colorClass} text-nowrap">${formatMoney(numericVal)}</span>`
            }
        },
        {
            data: null,
            title: 'Estado',
            orderable: false,
            className: 'text-center',
            render: (data, type, row) => {
                const isAnnulled = row.notas_motivos && row.notas_motivos.toLowerCase().includes('anula')
                let badges = ''

                if (isAnnulled) {
                    badges += '<span class="badge bg-secondary me-1">Anulada</span>'
                } else if (row.tipo_pago === 'credito') {
                    if ((Number(row.saldo_pendiente) || 0) > 0) {
                        badges += '<span class="badge border border-warning text-dark me-1">Crédito</span>'
                    } else {
                        badges += '<span class="badge border border-success text-success me-1">Crédito Pagado</span>'
                    }
                } else {
                    badges += '<span class="badge border border-primary text-primary me-1">Contado</span>'
                }

                if (row.notas_aplicadas?.includes('Crédito')) {
                    badges += '<span class="badge border border-info text-dark me-1">Nota Crédito</span>'
                }
                if (row.notas_aplicadas?.includes('Débito')) {
                    badges += '<span class="badge border border-secondary text-dark me-1">Nota Débito</span>'
                }

                return badges
            }
        }
    ], [formatDateTime, formatMoney])

    const paymentColumns = useMemo(() => [
        {
            data: 'date_created',
            title: 'Fecha',
            render: (data, type) => {
                if (type === 'sort' || type === 'type') return data || ''
                return `<span class="text-nowrap">${formatDateTime(data)}</span>`
            }
        },
        {
            data: 'numero_factura',
            title: 'N° Factura',
            render: (data, type, row) => {
                const invoiceRef = `${row.prefijo || ''}${row.separador || ''}${row.numero_factura || ''}`
                if (type === 'sort' || type === 'type' || type === 'filter') return invoiceRef
                if (!row.maestro_id) return `<span class="fw-bold text-nowrap">${invoiceRef || '-'}</span>`
                return `<a href="#" class="text-primary fw-bold text-decoration-underline text-nowrap btn-view-factura" data-invoice-id="${row.maestro_id}">${invoiceRef}</a>`
            }
        },
        {
            data: 'metodo_pago',
            title: 'Método de Pago',
            render: (data, type) => {
                const methodLabel = data || '-'
                if (type === 'sort' || type === 'type' || type === 'filter') return methodLabel
                const isCreditBal = String(methodLabel).trim().toLowerCase() === 'saldo a favor'
                const badgeStyle = isCreditBal ? 'border-secondary text-secondary' : 'border-success text-success'
                return `<span class="badge border ${badgeStyle}">${methodLabel}</span>`
            }
        },
        {
            data: 'valor',
            title: 'Valor',
            className: 'text-end',
            render: (data, type) => {
                const numericVal = Number(data) || 0
                if (type === 'sort' || type === 'type') return numericVal
                return `<strong class="text-success text-nowrap">${formatMoney(numericVal)}</strong>`
            }
        },
        {
            data: 'usuario',
            title: 'Usuario',
            render: (data) => data || '-'
        },
        {
            data: 'observaciones',
            title: 'Observaciones',
            render: (data) => `<span class="text-muted">${data || '-'}</span>`
        }
    ], [formatDateTime, formatMoney])

    const creditMovementColumns = useMemo(() => [
        {
            data: 'date_created',
            title: 'Fecha',
            render: (data, type) => {
                if (type === 'sort' || type === 'type') return data || ''
                return `<span class="text-nowrap">${formatDateTime(data)}</span>`
            }
        },
        {
            data: 'label',
            title: 'Tipo',
            render: (data, type, row) => {
                if (type === 'sort' || type === 'type' || type === 'filter') return data || ''
                const isIncoming = row.direction === 'in'
                const badgeStyle = isIncoming ? 'border-success text-success' : 'border-secondary text-secondary'
                return `<span class="badge border ${badgeStyle}">${data || '-'}</span>`
            }
        },
        {
            data: 'reference',
            title: 'Documento / N° Factura',
            render: (data, type, row) => {
                const refText = data || '-'
                if (type === 'sort' || type === 'type' || type === 'filter') return refText
                if (row.resolvedInvoiceId) {
                    return `<a href="#" class="text-primary fw-bold text-decoration-underline text-nowrap btn-view-factura" data-invoice-id="${row.resolvedInvoiceId}">${refText}</a>`
                }
                return `<strong class="text-nowrap">${refText}</strong>`
            }
        },
        {
            data: 'detail',
            title: 'Detalle',
            render: (data) => `<span class="text-muted">${data || '-'}</span>`
        },
        {
            data: 'amount',
            title: 'Valor',
            className: 'text-end',
            render: (data, type, row) => {
                const numericVal = Number(data) || 0
                if (type === 'sort' || type === 'type') return numericVal
                const isIncoming = row.direction === 'in'
                const textColor = isIncoming ? 'text-success' : 'text-secondary'
                const prefix = isIncoming ? '+' : '-'
                return `<strong class="${textColor} text-nowrap">${prefix}${formatMoney(numericVal)}</strong>`
            }
        }
    ], [formatDateTime, formatMoney])

    if (!terceroData) return null

    const client = detailData?.tercero || terceroData
    const portfolioSummary = detailData?.resumenCartera || {
        deuda_total: Number(terceroData.deuda_total) || 0,
        facturas_pendientes: Number(terceroData.facturas_pendientes) || 0,
        saldo_favor: Number(terceroData.saldo_favor) || 0,
        total_comprado: 0,
        total_facturas: 0
    }

    const isLegalEntity = client.tipo_persona === 'juridica'
    const fullName = isLegalEntity
        ? client.razon_social
        : `${client.nombres || ''} ${client.apellidos || ''}`.trim()

    const formattedDocument = `${client.tipo_documento || ''} ${client.numero_documento || ''}${client.digito_verificacion ? `-${client.digito_verificacion}` : ''}`.trim()

    const portfolioMeta = getPortfolioStatusMeta(
        Number(portfolioSummary.deuda_total) || 0,
        Number(portfolioSummary.saldo_favor) || 0
    )

    const isMainModalVisible = show && !showInvoiceModal && !showInvoicePrinter

    return <>
        <Modal show={isMainModalVisible} onHide={handleClose} size="xl" centered className="shadow" scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className={`bi ${isLegalEntity ? 'bi-building' : 'bi-person'} me-2 text-primary`}></i>
                    Detalles del {client.es_cliente === 1 && client.es_proveedor === 0 ? 'Cliente' : 'Tercero'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4" ref={modalBodyRef}>
                {/* TOP HEADER SUMMARY + PORTFOLIO CARD */}
                <Row className="align-items-center g-3 pb-3 mb-4 border-bottom">
                    <Col md={7}>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <h4 className="mb-0 fw-bold">{fullName}</h4>
                            <Badge bg={client.estado === 1 ? 'success' : 'danger'} className="px-2 py-1">
                                {client.estado === 1 ? 'ACTIVO' : 'INACTIVO'}
                            </Badge>
                        </div>
                        <div className="d-flex flex-wrap gap-3 text-muted small mt-2">
                            <span>
                                <i className="bi bi-card-heading me-1 text-primary"></i>
                                <strong className="text-dark">{formattedDocument || 'Sin documento'}</strong>
                            </span>
                            <span>
                                <i className="bi bi-telephone me-1 text-primary"></i>
                                <strong className="text-dark">{client.telefono || 'Sin teléfono'}</strong>
                            </span>
                        </div>
                    </Col>

                    <Col md={5}>
                        <Card className={`border-0 border-start border-4 shadow-sm mb-0 ${portfolioMeta.cardClass}`}>
                            <Card.Body className="py-2 px-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p className={`small mb-0 fw-bold text-uppercase ${portfolioMeta.textClass}`}>
                                            <i className={`bi ${portfolioMeta.icon} me-1`}></i>
                                            {portfolioMeta.title}
                                        </p>
                                        <small className="text-muted">{portfolioMeta.subtitle}</small>
                                    </div>
                                    <div className="text-end">
                                        {isLoading ? (
                                            <div className="spinner-border spinner-border-sm text-secondary" role="status" />
                                        ) : (
                                            <h5 className={`mb-0 fw-bold ${portfolioMeta.textClass}`}>
                                                {formatMoney(portfolioMeta.amount)}
                                            </h5>
                                        )}
                                    </div>
                                </div>
                                {!isLoading && portfolioSummary.deuda_total > 0 && portfolioSummary.saldo_favor > 0 && (
                                    <div className="mt-1 pt-1 border-top small text-secondary d-flex justify-content-between">
                                        <span>Saldo a favor disponible:</span>
                                        <strong>{formatMoney(portfolioSummary.saldo_favor)}</strong>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* NAVIGATION TABS */}
                <ul className="nav nav-tabs nav-tabs-bordered mb-4" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === 'general' ? 'active text-primary' : 'text-muted'}`}
                            onClick={() => setActiveTab('general')}
                            type="button"
                            role="tab"
                        >
                            <i className="bi bi-person-vcard me-2"></i>
                            Información general
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === 'contacto' ? 'active text-primary' : 'text-muted'}`}
                            onClick={() => setActiveTab('contacto')}
                            type="button"
                            role="tab"
                        >
                            <i className="bi bi-telephone me-2"></i>
                            Datos de contacto
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === 'compras' ? 'active text-primary' : 'text-muted'}`}
                            onClick={() => setActiveTab('compras')}
                            type="button"
                            role="tab"
                        >
                            <i className="bi bi-bag-check me-2"></i>
                            Historial de compras
                            {!isLoading && (
                                <Badge bg="light" text="dark" className="ms-2 border">
                                    {invoices.length}
                                </Badge>
                            )}
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === 'cartera' ? 'active text-primary' : 'text-muted'}`}
                            onClick={() => setActiveTab('cartera')}
                            type="button"
                            role="tab"
                        >
                            <i className="bi bi-wallet2 me-2"></i>
                            Cartera
                        </button>
                    </li>
                </ul>

                {/* TAB 1: INFORMACIÓN GENERAL */}
                {activeTab === 'general' && (
                    <div>
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Datos Básicos</h6>
                        <Row className="g-3 mb-4 bg-light p-3 rounded border mx-0">
                            <Col md={6}>
                                <label className="d-block small text-muted mb-1">Tipo de Persona</label>
                                <span className="fw-medium">
                                    {isLegalEntity ? 'Persona Jurídica (Empresa)' : 'Persona Natural (Individuo)'}
                                </span>
                            </Col>
                            <Col md={6}>
                                <label className="d-block small text-muted mb-1">Identificación</label>
                                <span className="fw-medium">{formattedDocument || 'No registrada'}</span>
                            </Col>

                            {isLegalEntity ? (
                                <Col md={6}>
                                    <label className="d-block small text-muted mb-1">Razón Social</label>
                                    <span className="fw-medium">{client.razon_social || 'No registrada'}</span>
                                </Col>
                            ) : (
                                <>
                                    <Col md={6}>
                                        <label className="d-block small text-muted mb-1">Nombres</label>
                                        <span className="fw-medium">{client.nombres || 'No registrados'}</span>
                                    </Col>
                                    <Col md={6}>
                                        <label className="d-block small text-muted mb-1">Apellidos</label>
                                        <span className="fw-medium">{client.apellidos || 'No registrados'}</span>
                                    </Col>
                                </>
                            )}

                            <Col md={6}>
                                <label className="d-block small text-muted mb-1">Roles Asignados</label>
                                <div>
                                    {client.es_cliente === 1 && <Badge bg="info" className="me-1">Cliente</Badge>}
                                    {client.es_proveedor === 1 && <Badge bg="warning" text="dark" className="me-1">Proveedor</Badge>}
                                    {client.es_cliente !== 1 && client.es_proveedor !== 1 && (
                                        <span className="text-muted small">Sin roles</span>
                                    )}
                                </div>
                            </Col>

                            <Col md={6}>
                                <label className="d-block small text-muted mb-1">Fecha de Registro</label>
                                <span className="fw-medium">{formatDateTime(client.date_created)}</span>
                            </Col>
                        </Row>

{/*                         <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Información Tributaria</h6>
                        <div className="p-3 rounded border bg-white text-muted small d-flex align-items-center">
                            <i className="bi bi-file-earmark-text fs-5 me-3 text-secondary"></i>
                            <div>
                                <div className="fw-semibold text-dark">Perfil tributario pendiente de configuración</div>
                                <div>Aquí se visualizarán el régimen tributario, responsabilidades fiscales y datos para facturación electrónica.</div>
                            </div>
                        </div> */}
                    </div>
                )}

                {/* TAB 2: DATOS DE CONTACTO */}
                {activeTab === 'contacto' && (
                    <div>
                        <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Información de Contacto</h6>
                        <Row className="g-3">
                            <Col md={6}>
                                <Card className="border bg-light h-100 mb-0">
                                    <Card.Body className="py-3">
                                        <label className="d-block small text-muted mb-1">
                                            <i className="bi bi-telephone me-1 text-primary"></i>
                                            Teléfono
                                        </label>
                                        <div className="fw-semibold fs-6">
                                            {client.telefono || <span className="text-muted fst-italic fw-normal">No registrado</span>}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <Card className="border bg-light h-100 mb-0">
                                    <Card.Body className="py-3">
                                        <label className="d-block small text-muted mb-1">
                                            <i className="bi bi-envelope me-1 text-primary"></i>
                                            Correo Electrónico
                                        </label>
                                        <div className="fw-semibold fs-6 text-break">
                                            {client.email || <span className="text-muted fst-italic fw-normal">No registrado</span>}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={12}>
                                <Card className="border bg-light mb-0">
                                    <Card.Body className="py-3">
                                        <label className="d-block small text-muted mb-1">
                                            <i className="bi bi-geo-alt me-1 text-primary"></i>
                                            Dirección
                                        </label>
                                        <div className="fw-semibold fs-6">
                                            {client.direccion || <span className="text-muted fst-italic fw-normal">No registrada</span>}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                )}

                {/* TAB 3: HISTORIAL DE COMPRAS */}
                {activeTab === 'compras' && (
                    <div>
                        {isLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status" />
                            </div>
                        ) : (
                            <>
                                <div className="d-flex flex-wrap gap-3 mb-3">
                                    <div className="px-3 py-2 bg-light border rounded small">
                                        <span className="text-muted me-1">Total Facturas:</span>
                                        <strong>{portfolioSummary.total_facturas}</strong>
                                    </div>
                                    <div className="px-3 py-2 bg-light border rounded small">
                                        <span className="text-muted me-1">Total Comprado:</span>
                                        <strong>{formatMoney(portfolioSummary.total_comprado)}</strong>
                                    </div>
                                </div>

                                <div className="w-100 bg-white">
                                    <DataTableComponent
                                        tableId="dt-tercero-compras"
                                        key={`tercero-compras-${client.id}-${invoices.length}-${appConfig.moneda}`}
                                        data={invoices}
                                        columns={invoiceColumns}
                                        order={[[0, 'desc']]}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* TAB 4: CARTERA */}
                {activeTab === 'cartera' && (
                    <div>
                        {isLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status" />
                            </div>
                        ) : (
                            <>
                                {/* PORTFOLIO STATUS CARD INSIDE TAB */}
                                <Card className={`border-0 border-start border-4 shadow-sm mb-4 ${portfolioMeta.cardClass}`}>
                                    <Card.Body className="py-3">
                                        <Row className="align-items-center g-3">
                                            <Col md={4}>
                                                <div className={`small fw-bold text-uppercase ${portfolioMeta.textClass}`}>
                                                    <i className={`bi ${portfolioMeta.icon} me-1`}></i>
                                                    Estado de la Cartera
                                                </div>
                                                <h5 className={`mb-0 fw-bold ${portfolioMeta.textClass}`}>
                                                    {portfolioMeta.title}
                                                </h5>
                                                <small className="text-muted">
                                                    {portfolioSummary.facturas_pendientes > 0
                                                        ? `${portfolioSummary.facturas_pendientes} factura(s) con saldo pendiente`
                                                        : portfolioMeta.subtitle}
                                                </small>
                                            </Col>
                                            <Col md={4} className="border-start">
                                                <div className="small text-muted">Deuda Actual</div>
                                                <h5 className={`mb-0 fw-bold ${portfolioSummary.deuda_total > 0 ? 'text-danger' : 'text-muted'}`}>
                                                    {formatMoney(portfolioSummary.deuda_total)}
                                                </h5>
                                            </Col>
                                            <Col md={4} className="border-start">
                                                <div className="small text-muted">Saldo a Favor Disponible</div>
                                                <h5 className={`mb-0 fw-bold ${portfolioSummary.saldo_favor > 0 ? 'text-dark' : 'text-muted'}`}>
                                                    {formatMoney(portfolioSummary.saldo_favor)}
                                                </h5>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                {/* ABONOS DATATABLE */}
                                <h6 className="text-uppercase small fw-bold mb-2 text-secondary">
                                    <i className="bi bi-cash-coin me-1"></i>
                                    Historial de Abonos ({payments.length})
                                </h6>
                                <div className="w-100 bg-white mb-4">
                                    <DataTableComponent
                                        tableId="dt-tercero-abonos"
                                        key={`tercero-abonos-${client.id}-${payments.length}-${appConfig.moneda}`}
                                        data={payments}
                                        columns={paymentColumns}
                                        order={[[0, 'desc']]}
                                    />
                                </div>

                                {/* STORE CREDIT MOVEMENTS DATATABLE */}
                                <h6 className="text-uppercase small fw-bold mb-2 text-secondary">
                                    <i className="bi bi-arrow-left-right me-1"></i>
                                    Movimientos de Saldo a Favor ({creditMovements.length})
                                </h6>
                                <div className="w-100 bg-white">
                                    <DataTableComponent
                                        tableId="dt-tercero-saldos-favor"
                                        key={`tercero-saldos-${client.id}-${creditMovements.length}-${appConfig.moneda}`}
                                        data={creditMovements}
                                        columns={creditMovementColumns}
                                        order={[[0, 'desc']]}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>

        <ModalDetalleFactura
            show={showInvoiceModal}
            handleClose={handleCloseInvoiceModal}
            facturaSeleccionada={selectedInvoice}
            detalleData={invoiceDetails}
            notasFactura={invoiceNotes}
            handlePrepararImpresion={handlePrepareInvoicePrint}
            appConfig={appConfig}
            canPrint={canPrintInvoice}
        />

        <ImpresorFactura
            show={showInvoicePrinter}
            onClose={handleCloseInvoicePrinter}
            factura={selectedInvoice}
            detalles={invoiceDetails}
            almacenConf={storeConfig}
            textoVolver="Volver a Detalles"
        />
    </>
}