import { useState, useEffect, useMemo, useRef } from 'react'
import { Form, Row, Col, Button, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalExportConfig } from '../../components/ModalExportConfig'
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

const isCreditBalanceMethod = (methodName) => {
    return String(methodName || '').trim().toLowerCase() === 'saldo a favor'
}

const analyzeTransactionPayment = (transaction) => {
    const methodsBreakdown = {}
    let cashInflow = 0
    let creditBalanceUsed = 0

    const addMethodAmount = (methodName, amount) => {
        if (amount <= 0) return
        const cleanMethod = methodName || 'Contado'
        methodsBreakdown[cleanMethod] = (methodsBreakdown[cleanMethod] || 0) + amount

        if (isCreditBalanceMethod(cleanMethod)) {
            creditBalanceUsed += amount
        } else {
            cashInflow += amount
        }
    }

    if (transaction.tipo_transaccion === 'abono') {
        const paymentValue = Number(transaction.valor) || 0
        addMethodAmount(transaction.metodo_pago || 'Abono', paymentValue)
        return { cashInflow, creditBalanceUsed, methodsBreakdown }
    }

    if (transaction.tipo_transaccion === 'venta') {
        const initialPending = transaction.saldo_pendiente_original ?? transaction.saldo_pendiente ?? 0
        const paidAtSale = Math.max(0, (Number(transaction.total_factura) || 0) - (Number(initialPending) || 0))

        if (paidAtSale > 0) {
            let distributedTotal = 0

            if (transaction.pagos_multiples) {
                try {
                    const parsedPayments = JSON.parse(transaction.pagos_multiples)
                    if (Array.isArray(parsedPayments) && parsedPayments.length > 0) {
                        const orderedPayments = [...parsedPayments].sort((a, b) => {
                            const aIsCredit = isCreditBalanceMethod(a.metodo) ? 0 : 1
                            const bIsCredit = isCreditBalanceMethod(b.metodo) ? 0 : 1
                            return aIsCredit - bIsCredit
                        })

                        let remainingToDistribute = paidAtSale
                        orderedPayments.forEach(payment => {
                            if (remainingToDistribute <= 0) return
                            let amount = parseFloat(payment.monto) || 0
                            if (amount > remainingToDistribute) amount = remainingToDistribute

                            if (amount > 0) {
                                addMethodAmount(payment.metodo || 'Contado', amount)
                                remainingToDistribute -= amount
                                distributedTotal += amount
                            }
                        })
                    }
                } catch (err) {
                    console.error('Error parsing pagos_multiples in sales report', err)
                }
            }

            if (distributedTotal === 0) {
                addMethodAmount(transaction.metodo_pago || 'Contado', paidAtSale)
            }
        }
    }

    return { cashInflow, creditBalanceUsed, methodsBreakdown }
}

export const Reportes = ({ currentUser }) => {
    const [activeUser, setActiveUser] = useState(currentUser)

    const [startDate, setStartDate] = useState(() => getLocalDatetime(true))
    const [endDate, setEndDate] = useState(() => getLocalDatetime(false))

    const [transactions, setTransactions] = useState([])
    const [storeConfig, setStoreConfig] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    const tableContainerRef = useRef(null)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [showInvoicePrinter, setShowInvoicePrinter] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [detailData, setDetailData] = useState([])
    const [invoiceNotes, setInvoiceNotes] = useState([])

    const [showExportModal, setShowExportModal] = useState(false)
    const [exportFormat, setExportFormat] = useState(null)

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
        const userToEvaluate = activeUser || currentUser
        if (!userToEvaluate) return false
        if (userToEvaluate.permisos?.includes('ALL')) return true
        return userToEvaluate.permisos?.includes(permissionKey)
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
                    const parsed = JSON.parse(confAppRaw.value)
                    setAppConfig({ moneda: parsed.moneda || 'COP', formato_numero: parsed.formato_numero || 'es-CO' })
                } catch (e) {}
            }
        }
        loadConfig()
    }, [])

    const formatMoney = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda)

    const loadReport = async () => {
        setLoading(true)
        const res = await ventasService.getReporteVentas({ startDate, endDate })
        if (res.success) {
            setTransactions(res.data)
            setStoreConfig(res.configuracion)
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'No se pudo cargar el reporte' })
        }
        setLoading(false)
    }

    useEffect(() => {
        loadReport()
        const handleNewInvoice = () => loadReport()
        window.addEventListener('factura-creada', handleNewInvoice)
        return () => window.removeEventListener('factura-creada', handleNewInvoice)
    }, [startDate, endDate])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const invoiceBtn = e.target.closest('.btn-view-factura')
            if (invoiceBtn && container.contains(invoiceBtn)) {
                e.preventDefault()
                try {
                    const item = JSON.parse(decodeURIComponent(invoiceBtn.dataset.alldata))
                    const invoiceId = item.tipo_transaccion === 'abono' ? item.maestro_id : item.id

                    handleViewInvoice({
                        ...item,
                        id: invoiceId,
                        numero_factura: item.numero_factura || item.factura_numero,
                        tipo_pago: item.tipo_transaccion === 'abono' ? 'credito' : item.tipo_pago
                    })
                } catch (err) {
                    console.error('Error parsing transaction data', err)
                }
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    const handleViewInvoice = async (invoice) => {
        setSelectedInvoice(invoice)
        setShowInvoiceModal(true)

        try {
            const result = await ventasService.getDetalleFactura(invoice.id)
            if (Array.isArray(result)) {
                setDetailData(result)
                setInvoiceNotes([])
            } else if (result && (result.success || result.data || result.detalles)) {
                setDetailData(result.data || result.detalles || [])
                setInvoiceNotes(result.notes || result.notas || [])

                if (result.facturaMaestro) {
                    setSelectedInvoice(result.facturaMaestro)
                }
                if (result.configuracion) {
                    setStoreConfig(result.configuracion)
                }
            } else {
                setDetailData([])
                setInvoiceNotes([])
            }
        } catch (err) {
            console.error('Error loading invoice detail', err)
            setDetailData([])
            setInvoiceNotes([])
        }
    }

    const handleCloseInvoiceModal = () => {
        setShowInvoiceModal(false)
        setSelectedInvoice(null)
        setDetailData([])
        setInvoiceNotes([])
    }

    const handlePrepareInvoicePrint = () => {
        setShowInvoiceModal(false)
        setShowInvoicePrinter(true)
    }

    const totals = useMemo(() => {
        return transactions.reduce((acc, item) => {
            if (item.tipo_transaccion === 'venta') {
                acc.totalFacturado += (Number(item.total_factura) || 0)
            }

            const { cashInflow, methodsBreakdown } = analyzeTransactionPayment(item)
            acc.ingresoTotalCaja += cashInflow

            Object.entries(methodsBreakdown).forEach(([method, amount]) => {
                acc.metodos[method] = (acc.metodos[method] || 0) + amount
            })

            if (item.tipo_transaccion === 'venta' && (Number(item.saldo_pendiente) || 0) > 0) {
                acc.metodos['Crédito'] = (acc.metodos['Crédito'] || 0) + (Number(item.saldo_pendiente) || 0)
            }

            return acc
        }, { totalFacturado: 0, ingresoTotalCaja: 0, metodos: {} })
    }, [transactions])

    const exportColumnsDef = [
        { key: 'hora', label: 'Hora', defaultChecked: true },
        { key: 'documento', label: 'Documento', defaultChecked: true },
        { key: 'cliente', label: 'Cliente', defaultChecked: true },
        { key: 'concepto', label: 'Concepto / Método', defaultChecked: true },
        { key: 'venta', label: 'Venta (Total)', defaultChecked: true },
        { key: 'ingreso', label: 'Ingreso Real', defaultChecked: true }
    ]

    const openExportModal = (format) => {
        if (transactions.length === 0) {
            return Swal.fire('Error', 'No hay registros para exportar', 'warning')
        }
        setExportFormat(format)
        setShowExportModal(true)
    }

    const handleProcessExport = (limit, selectedColumnKeys, customFileName, exportTypeSelection) => {
        let dataToProcess = transactions

        if (limit && exportTypeSelection === 'limit') {
            dataToProcess = [...transactions]
                .sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
                .slice(0, limit)
        }

        const extractValue = (item, key) => {
            const { cashInflow } = analyzeTransactionPayment(item)
            const saleAmount = item.tipo_transaccion === 'abono' ? 0 : (item.total_factura || 0)
            let concept = item.tipo_transaccion === 'abono'
                ? `Abono - ${item.metodo_pago}`
                : (item.tipo_pago === 'credito' ? 'Venta a Crédito' : `Venta - ${item.metodo_pago || 'Contado'}`)

            if (item.notas_aplicadas) {
                concept += exportFormat === 'pdf' ? `\n(${item.notas_aplicadas})` : ` (${item.notas_aplicadas})`
            }

            switch (key) {
                case 'hora': return new Date(item.date_created).toLocaleTimeString(appConfig.formato_numero, { hour: '2-digit', minute: '2-digit' })
                case 'documento': return item.tipo_transaccion === 'abono' ? `Abono a F-${item.factura_numero || ''}` : `${item.prefijo || ''}${item.separador || ''}${item.numero_factura || ''}`
                case 'cliente': return item.nombre_cliente
                case 'concepto': return concept
                case 'venta': return exportFormat === 'pdf' ? (saleAmount > 0 ? formatMoney(saleAmount) : '-') : saleAmount
                case 'ingreso': return exportFormat === 'pdf' ? (cashInflow > 0 ? formatMoney(cashInflow) : '$0') : cashInflow
                default: return ''
            }
        }

        const safeFileName = customFileName || `Reporte_Financiero_${startDate.split('T')[0]}`

        if (exportFormat === 'excel') {
            const dataToExport = dataToProcess.map(item => {
                const row = {}
                exportColumnsDef.forEach(colDef => {
                    if (selectedColumnKeys.includes(colDef.key)) {
                        row[colDef.label] = extractValue(item, colDef.key)
                    }
                })
                return row
            })

            const emptyRow = {}
            const totalsRow = {}
            exportColumnsDef.forEach(colDef => {
                if (selectedColumnKeys.includes(colDef.key)) {
                    emptyRow[colDef.label] = ''
                    if (colDef.key === 'concepto') totalsRow[colDef.label] = 'TOTALES GLOBALES'
                    else if (colDef.key === 'venta') totalsRow[colDef.label] = totals.totalFacturado
                    else if (colDef.key === 'ingreso') totalsRow[colDef.label] = totals.ingresoTotalCaja
                    else totalsRow[colDef.label] = ''
                }
            })
            dataToExport.push(emptyRow, totalsRow)

            exportToExcel(dataToExport, safeFileName, 'Transacciones')
        } else if (exportFormat === 'pdf') {
            const tableColumn = exportColumnsDef
                .filter(col => selectedColumnKeys.includes(col.key))
                .map(col => col.label)

            const tableRows = dataToProcess.map(item => {
                return exportColumnsDef
                    .filter(col => selectedColumnKeys.includes(col.key))
                    .map(col => extractValue(item, col.key))
            })

            const stats = dataToProcess.reduce((acc, item) => {
                if (item.tipo_transaccion === 'venta') {
                    acc.subtotal += item.subtotal || 0
                    acc.descuentos += item.descuento || 0
                    acc.iva += item.iva || 0
                    if (item.tipo_pago === 'contado') acc.contado += item.total_factura || 0
                    if (item.tipo_pago === 'credito') acc.credito += item.total_factura || 0
                }
                return acc
            }, { subtotal: 0, descuentos: 0, iva: 0, contado: 0, credito: 0 })

            exportToPDF({
                title: 'Reporte de Ventas',
                subtitle: `Desde: ${startDate.replace('T', ' ')} | Hasta: ${endDate.replace('T', ' ')}`,
                columns: tableColumn,
                data: tableRows,
                filename: safeFileName,
                configuracion: storeConfig,
                totales: {
                    ...totals,
                    subtotal: stats.subtotal,
                    descuentos: stats.descuentos,
                    iva: stats.iva,
                    contado: stats.contado,
                    credito: stats.credito
                },
                moneda: appConfig.moneda,
                formato_numero: appConfig.formato_numero
            })
        }
    }

    const columns = [
        {
            data: 'date_created',
            title: 'Hora',
            render: (data) => new Date(data).toLocaleTimeString(appConfig.formato_numero, { hour: '2-digit', minute: '2-digit' })
        },
        {
            data: null,
            title: 'Documento',
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
            data: null,
            title: 'Concepto / Método',
            render: (data, type, row) => {
                let htmlReturn = ''

                if (row.tipo_transaccion === 'abono') {
                    //const isCreditBal = isCreditBalanceMethod(row.metodo_pago)
                    //const badgeClass = isCreditBal ? 'border-info text-info' : 'border-success text-success'
                    htmlReturn += `<span class="badge bg-success me-1">Abono</span> <span class="badge border border-success text-success">${row.metodo_pago}</span>`
                } else if (row.tipo_pago === 'credito') {
                    htmlReturn += `<span class="badge bg-primary me-1">Venta</span> <span class="badge border border-warning text-warning text-dark">Crédito</span>`
                } else {
                    let badges = `<span class="badge bg-primary me-1">Venta</span>`
                    if (row.pagos_multiples) {
                        try {
                            const paymentsList = JSON.parse(row.pagos_multiples)
                            paymentsList.forEach(payment => {
                                if (parseFloat(payment.monto) > 0) {
                                    //const badgeClass = isCreditBalanceMethod(payment.metodo)
                                    //    ? 'border-info text-info'
                                    //    : 'border-primary text-primary'
                                    badges += ` <span class="badge border border-primary text-primary mx-1" title="${payment.metodo}: ${formatMoney(payment.monto)}">${payment.metodo}</span>`
                                }
                            })
                            htmlReturn += badges
                        } catch (e) {}
                    } else {
                        const badgeClass = isCreditBalanceMethod(row.metodo_pago)
                            ? 'border-info text-info'
                            : 'border-primary text-primary'
                        htmlReturn += badges + ` <span class="badge border ${badgeClass} mx-1">${row.metodo_pago || 'Contado'}</span>`
                    }
                }

                if (row.tipo_transaccion === 'venta' && row.notas_aplicadas) {
                    if (row.notas_aplicadas.includes('Crédito')) {
                        htmlReturn += ` <span class="badge border border-info text-dark" title="Factura modificada con Nota de Crédito">Nota Crédito</span>`
                    }
                    if (row.notas_aplicadas.includes('Débito')) {
                        htmlReturn += ` <span class="badge border border-secondary" title="Factura modificada con Nota de Débito">Nota Débito</span>`
                    }
                }

                return htmlReturn
            }
        },
        {
            data: null,
            title: 'Venta',
            render: (data, type, row) => {
                if (row.tipo_transaccion === 'abono') return `<span class="text-muted">-</span>`
                return `${formatMoney(row.total_factura || 0)}`
            }
        },
        {
            data: null,
            title: 'Abono / Ingreso',
            render: (data, type, row) => {
                const { cashInflow, creditBalanceUsed } = analyzeTransactionPayment(row)

                if (cashInflow <= 0 && creditBalanceUsed > 0) {
                    return `
                        <div class="small text-secondary">Saldo a Favor: ${formatMoney(creditBalanceUsed)}</div>
                    `
                }

                if (cashInflow <= 0) return `<span class="text-muted">$0</span>`

                const creditNote = creditBalanceUsed > 0
                    ? `<span class="small text-secondary"> (${formatMoney(creditBalanceUsed)})</span>`
                    : ''

                return `<strong class="text-success">${formatMoney(cashInflow)}</strong>${creditNote}`
            }
        }
    ]

    return <>
        <div className="bg-light p-3 rounded mb-4 border">
            <Row className="align-items-end">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Desde Fecha/Hora:</small></Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Hasta Fecha/Hora:</small></Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>

                <Col md={6}>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => { setStartDate(''); setEndDate('') }}
                            disabled={!startDate && !endDate}
                            title="Limpiar Filtros de Fecha"
                        >
                            <i className="bi bi-x-circle me-1"></i> Limpiar Filtro
                        </Button>

                        {canPrint && (
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setShowPreview(true)}
                                disabled={transactions.length === 0}
                                title="Imprimir Reporte"
                            >
                                <i className="bi bi-printer"></i>
                            </Button>
                        )}

                        {canDownloadPDF && (
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => openExportModal('pdf')}
                                disabled={transactions.length === 0}
                                title="Exportar a PDF"
                            >
                                <i className="bi bi-file-earmark-pdf"></i>
                            </Button>
                        )}

                        {canDownloadExcel && (
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => openExportModal('excel')}
                                disabled={transactions.length === 0}
                                title="Exportar a Excel"
                            >
                                <i className="bi bi-file-earmark-excel"></i>
                            </Button>
                        )}
                    </div>
                </Col>
            </Row>
        </div>

        <Row className="mb-4 g-3">
            <Col xs={12} sm={6} md={4} lg={3}>
                <Card className="shadow-sm border-0 border-start border-success border-4 bg-success bg-opacity-10 mb-0">
                    <Card.Body className="py-2 px-3">
                        <p className="text-success small mb-0 fw-bold text-uppercase">Total Facturado</p>
                        <h5 className="m-0 text-success fw-bold">{formatMoney(totals.totalFacturado)}</h5>
                    </Card.Body>
                </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3}>
                <Card className="shadow-sm border-0 border-start border-success border-4 bg-success bg-opacity-10 mb-0">
                    <Card.Body className="py-2 px-3">
                        <p className="text-success small mb-0 fw-bold text-uppercase">Ingreso Caja</p>
                        <h5 className="m-0 text-success fw-bold">{formatMoney(totals.ingresoTotalCaja)}</h5>
                    </Card.Body>
                </Card>
            </Col>

            {Object.entries(totals.metodos).map(([method, amount]) => {
                const isCreditBal = isCreditBalanceMethod(method)
                return (
                    <Col xs={12} sm={6} md={4} lg={3} key={method}>
                        <Card className={`shadow-sm border-0 border-start border-4 mb-0 border-primary`}>
                            <Card.Body className="py-2 px-3">
                                <p className={`small mb-0 fw-bold text-uppercase text-muted`}>{method}</p>
                                <h6 className="m-0 fw-bold">{formatMoney(amount)}</h6>
                            </Card.Body>
                        </Card>
                    </Col>
                )
            })}
        </Row>

        <h6 className="mb-3">Detalle de Transacciones ({transactions.length})</h6>
        <div className="w-100 bg-white" ref={tableContainerRef}>
            {loading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            ) : (
                <DataTableComponent
                    tableId="dt-reportes-ventas"
                    key={`reporte-${startDate}-${endDate}-${transactions.length}`}
                    data={transactions}
                    columns={columns}
                    order={[[0, 'desc']]}
                />
            )}
        </div>

        <ImpresorReporte
            show={showPreview}
            onClose={() => setShowPreview(false)}
            facturas={transactions}
            almacenConf={storeConfig}
            fechaInicio={startDate}
            fechaFin={endDate}
        />

        <ModalDetalleFactura
            show={showInvoiceModal}
            handleClose={handleCloseInvoiceModal}
            facturaSeleccionada={selectedInvoice}
            detalleData={detailData}
            notasFactura={invoiceNotes}
            handlePrepararImpresion={handlePrepareInvoicePrint}
            appConfig={appConfig}
            canPrint={canPrint}
        />

        <ImpresorFactura
            show={showInvoicePrinter}
            onClose={() => setShowInvoicePrinter(false)}
            factura={selectedInvoice}
            detalles={detailData}
            almacenConf={storeConfig}
            textoVolver="Volver a Reportes"
        />

        <ModalExportConfig
            show={showExportModal}
            handleClose={() => setShowExportModal(false)}
            onExport={handleProcessExport}
            title="Reporte de ventas"
            defaultFilename={`Reporte_Ventas_${startDate.split('T')[0]}`}
            totalRecords={transactions.length}
            totalFiltered={transactions.length}
            availableColumns={exportColumnsDef}
        />
    </>
}