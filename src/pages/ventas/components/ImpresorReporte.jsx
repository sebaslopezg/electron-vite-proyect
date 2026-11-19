import { useState, useEffect, useMemo } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { BaseImpresor } from '../../../components/BaseImpresor'
import { formatCurrency } from '../../../utils/currencies'
import { ventasService } from '../../../services/ventasService'

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
                console.error('Error parsing pagos_multiples in report printer', err)
            }
        }

        if (distributedTotal === 0) {
            addMethodAmount(transaction.metodo_pago || 'Contado', paidAtSale)
        }
    }

    return { cashInflow, creditBalanceUsed, methodsBreakdown }
}

const formatPaymentConcept = (transaction) => {
    if (transaction.tipo_transaccion === 'abono') {
        return `Abono - ${transaction.metodo_pago || 'Contado'}`
    }

    let label = ''
    if (transaction.tipo_pago === 'credito') {
        label = 'Venta - Crédito'
    } else if (transaction.pagos_multiples) {
        try {
            const parsed = JSON.parse(transaction.pagos_multiples)
            const activeMethods = parsed
                .filter(p => (parseFloat(p.monto) || 0) > 0)
                .map(p => p.metodo)
                .filter(Boolean)
            label = `Venta - ${activeMethods.length > 0 ? activeMethods.join(', ') : (transaction.metodo_pago || 'Contado')}`
        } catch (err) {
            label = `Venta - ${transaction.metodo_pago || 'Contado'}`
        }
    } else {
        label = `Venta - ${transaction.metodo_pago || 'Contado'}`
    }

    if (transaction.notas_aplicadas) {
        label += ` (${transaction.notas_aplicadas})`
    }

    return label
}

export const ImpresorReporte = ({ show, onClose, facturas = [], almacenConf, fechaInicio, fechaFin }) => {
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
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
                } catch (err) {
                    console.error('Error parsing app config in report printer', err)
                }
            }
        }
        if (show) loadConfig()
    }, [show])

    const renderCurrency = (val) => formatCurrency(val || 0, appConfig.formato_numero, appConfig.moneda)

    const stats = useMemo(() => {
        return facturas.reduce((acc, item) => {
            const isPaymentRecord = item.tipo_transaccion === 'abono'
            const { cashInflow, creditBalanceUsed, methodsBreakdown } = analyzeTransactionPayment(item)

            acc.cashInflowTotal += cashInflow
            acc.creditBalanceTotal += creditBalanceUsed

            Object.entries(methodsBreakdown).forEach(([method, amount]) => {
                acc.methods[method] = (acc.methods[method] || 0) + amount
            })

            if (isPaymentRecord) {
                acc.paymentsCount += 1
                return acc
            }

            acc.invoicesCount += 1

            const invoiceTotal = Number(item.total_factura) || 0
            const rawSubtotal = Number(item.subtotal) || 0
            const rawDiscount = Number(item.descuento) || 0
            const rawTax = Number(item.iva) || 0
            const rawPending = Math.max(0, Number(item.saldo_pendiente) || 0)

            const originalComputedTotal = rawSubtotal - rawDiscount + rawTax
            const adjustmentRatio = invoiceTotal <= 0
                ? 0
                : (originalComputedTotal > 0 ? invoiceTotal / originalComputedTotal : 1)

            acc.totalInvoiced += invoiceTotal
            acc.subtotal += rawSubtotal * adjustmentRatio
            acc.discounts += rawDiscount * adjustmentRatio
            acc.tax += rawTax * adjustmentRatio
            acc.pendingDebt += rawPending

            if (item.tipo_pago === 'credito') {
                acc.creditSales += invoiceTotal
            } else {
                acc.cashSales += invoiceTotal
            }

            return acc
        }, {
            invoicesCount: 0,
            paymentsCount: 0,
            totalInvoiced: 0,
            cashInflowTotal: 0,
            creditBalanceTotal: 0,
            subtotal: 0,
            discounts: 0,
            tax: 0,
            cashSales: 0,
            creditSales: 0,
            pendingDebt: 0,
            methods: {}
        })
    }, [facturas])

    if (!almacenConf) return null

    const cleanDate = (dateStr) => (dateStr ? String(dateStr).replace('T', ' ') : '')

    const DateRangeLabel = () => {
        if (!fechaInicio && !fechaFin) return 'Histórico Completo'
        if (fechaInicio === fechaFin) return `Fecha: ${cleanDate(fechaInicio)}`
        return `Desde: ${cleanDate(fechaInicio)} | Hasta: ${cleanDate(fechaFin)}`
    }

    const renderIncomeCell = (transaction) => {
        const { cashInflow, creditBalanceUsed } = analyzeTransactionPayment(transaction)

        if (cashInflow > 0 && creditBalanceUsed > 0) {
            return (
                <span className="text-nowrap">
                    <strong className="text-success">{renderCurrency(cashInflow)}</strong>{' '}
                    <span className="text-muted">({renderCurrency(creditBalanceUsed)})</span>
                </span>
            )
        }

        if (cashInflow > 0) {
            return <strong className="text-success text-nowrap">{renderCurrency(cashInflow)}</strong>
        }

        if (creditBalanceUsed > 0) {
            return <span className="text-muted text-nowrap">Saldo a Favor: {renderCurrency(creditBalanceUsed)}</span>
        }

        return <span className="text-muted text-nowrap">{renderCurrency(0)}</span>
    }

    const PosTemplate = () => (
        <div className="formato-pos text-black">
            <div className="text-center mb-3">
                <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                <div>NIT: {almacenConf.nit_almacen}</div>
                <div className="mt-2 fw-bold border-top border-bottom border-dark py-1">
                    REPORTE DE VENTAS
                </div>
                <div className="small"><DateRangeLabel /></div>
                <div className="small">Impreso: {new Date().toLocaleString(appConfig.formato_numero)}</div>
            </div>

            <h6 className="fw-bold border-bottom border-dark pb-1 mb-2">RESUMEN GENERAL</h6>
            <div className="d-flex justify-content-between mb-1">
                <span>Facturas Emitidas:</span>
                <span>{stats.invoicesCount}</span>
            </div>
            {stats.paymentsCount > 0 && (
                <div className="d-flex justify-content-between mb-1">
                    <span>Abonos Cartera:</span>
                    <span>{stats.paymentsCount}</span>
                </div>
            )}
            <div className="d-flex justify-content-between mb-1">
                <span>Subtotal Ventas:</span>
                <span>{renderCurrency(stats.subtotal)}</span>
            </div>
            {stats.discounts > 0 && (
                <div className="d-flex justify-content-between mb-1">
                    <span>Descuentos:</span>
                    <span>-{renderCurrency(stats.discounts)}</span>
                </div>
            )}
            <div className="d-flex justify-content-between mb-1">
                <span>Total IVA:</span>
                <span>{renderCurrency(stats.tax)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold mt-2 pt-1 border-top border-dark">
                <span>TOTAL FACTURADO:</span>
                <span>{renderCurrency(stats.totalInvoiced)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-6 mt-1">
                <span>INGRESO CAJA:</span>
                <span>{renderCurrency(stats.cashInflowTotal)}</span>
            </div>

            <h6 className="fw-bold border-bottom border-dark pb-1 mt-3 mb-2">TIPO DE VENTA</h6>
            <div className="d-flex justify-content-between mb-1">
                <span>Contado:</span>
                <span>{renderCurrency(stats.cashSales)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
                <span>Crédito:</span>
                <span>{renderCurrency(stats.creditSales)}</span>
            </div>
            {stats.pendingDebt > 0 && (
                <div className="d-flex justify-content-between mb-1">
                    <span>Saldo Pendiente:</span>
                    <span>{renderCurrency(stats.pendingDebt)}</span>
                </div>
            )}

            <h6 className="fw-bold border-bottom border-dark pb-1 mt-3 mb-2">MÉTODOS DE PAGO</h6>
            {Object.entries(stats.methods).map(([method, amount]) => (
                <div key={method} className="d-flex justify-content-between mb-1">
                    <span>{method}{isCreditBalanceMethod(method) ? '*' : ''}:</span>
                    <span>{renderCurrency(amount)}</span>
                </div>
            ))}
            {stats.creditBalanceTotal > 0 && (
                <div className="small mt-2 pt-1 border-top border-dark">
                    * Saldo a Favor no suma a Ingreso Caja.
                </div>
            )}
        </div>
    )

    const A4Template = () => (
        <div className="formato-a4 text-black">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-2 border-dark pb-3">
                <div className="d-flex align-items-center">
                    {almacenConf.logo_almacen && (
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px' }} className="me-3 rounded" />
                    )}
                    <div>
                        <h3 className="fw-bold text-uppercase mb-1">{almacenConf.nombre_almacen}</h3>
                        <div>NIT: {almacenConf.nit_almacen}</div>
                    </div>
                </div>
                <div className="text-end">
                    <h4 className="mb-0 text-secondary text-uppercase fw-bold">Reporte de Ventas</h4>
                    <div className="text-muted"><DateRangeLabel /></div>
                    <div className="small text-muted">Generado: {new Date().toLocaleString(appConfig.formato_numero)}</div>
                </div>
            </div>

            <Row className="mb-4 g-3">
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100 bg-light">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">RESUMEN FINANCIERO</h6>
                        <div className="d-flex justify-content-between mt-2">
                            <span>Facturas Emitidas:</span>
                            <strong>{stats.invoicesCount}</strong>
                        </div>
                        {stats.paymentsCount > 0 && (
                            <div className="d-flex justify-content-between mt-1">
                                <span>Abonos Cartera:</span>
                                <strong>{stats.paymentsCount}</strong>
                            </div>
                        )}
                        <div className="d-flex justify-content-between mt-1">
                            <span>Subtotal Neto:</span>
                            <strong>{renderCurrency(stats.subtotal)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                            <span>Descuentos:</span>
                            <strong className="text-danger">-{renderCurrency(stats.discounts)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                            <span>Impuestos (IVA):</span>
                            <strong>{renderCurrency(stats.tax)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-2 pt-2 border-top border-dark">
                            <span className="fw-bold text-primary">TOTAL FACTURADO:</span>
                            <strong className="text-primary">{renderCurrency(stats.totalInvoiced)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                            <span className="fw-bold text-success">INGRESO CAJA:</span>
                            <strong className="text-success">{renderCurrency(stats.cashInflowTotal)}</strong>
                        </div>
                    </div>
                </Col>
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">TIPO DE VENTA</h6>
                        <div className="d-flex justify-content-between mt-2 fs-5">
                            <span>Contado:</span>
                            <strong className="text-success">{renderCurrency(stats.cashSales)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-3 fs-5">
                            <span>Crédito:</span>
                            <strong className="text-warning">{renderCurrency(stats.creditSales)}</strong>
                        </div>
                        {stats.pendingDebt > 0 && (
                            <div className="d-flex justify-content-between mt-3 pt-2 border-top small">
                                <span className="text-muted">Pendiente Cartera:</span>
                                <strong className="text-danger">{renderCurrency(stats.pendingDebt)}</strong>
                            </div>
                        )}
                    </div>
                </Col>
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">MÉTODOS DE PAGO</h6>
                        {Object.entries(stats.methods).map(([method, amount]) => {
                            const isCredit = isCreditBalanceMethod(method)
                            return (
                                <div key={method} className="d-flex justify-content-between mt-2">
                                    <span>
                                        {method}
                                    </span>
                                    <strong className={isCredit ? 'text-muted' : ''}>{renderCurrency(amount)}</strong>
                                </div>
                            )
                        })}
                        {Object.keys(stats.methods).length === 0 && (
                            <div className="text-muted small text-center mt-3">Sin ingresos registrados.</div>
                        )}
                    </div>
                </Col>
            </Row>

            <h6 className="fw-bold border-bottom border-dark pb-2 mb-3 text-secondary">Desglose de Transacciones</h6>
            <table className="table table-bordered border-dark table-sm text-center align-middle" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light border-dark">
                    <tr>
                        <th>Documento</th>
                        <th>Fecha/Hora</th>
                        <th className="text-start">Cliente</th>
                        <th className="text-start">Concepto / Método</th>
                        <th className="text-end">Venta</th>
                        <th className="text-end">Abono / Ingreso</th>
                    </tr>
                </thead>
                <tbody>
                    {facturas.map((transaction, idx) => {
                        const isPayment = transaction.tipo_transaccion === 'abono'
                        const documentLabel = isPayment
                            ? `Abono a F-${transaction.factura_numero || ''}`
                            : `${transaction.prefijo || ''}${transaction.separador || ''}${transaction.numero_factura || ''}`

                        return (
                            <tr key={transaction.id || idx}>
                                <td className="fw-bold text-nowrap">{documentLabel}</td>
                                <td className="text-nowrap">
                                    {new Date(transaction.date_created).toLocaleString(appConfig.formato_numero, {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="text-start">{transaction.nombre_cliente}</td>
                                <td className="text-start">{formatPaymentConcept(transaction)}</td>
                                <td className="text-end text-nowrap">
                                    {isPayment ? <span className="text-muted">-</span> : renderCurrency(transaction.total_factura)}
                                </td>
                                <td className="text-end">{renderIncomeCell(transaction)}</td>
                            </tr>
                        )
                    })}
                    {facturas.length === 0 && (
                        <tr><td colSpan="6" className="text-muted py-3">No hay transacciones en este rango de fechas.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    )

    return <>
        <BaseImpresor
            show={show}
            onClose={onClose}
            titulo="Vista Previa del Reporte de Ventas"
            textoVolver="Cerrar Reporte"
            renderPos={PosTemplate}
            renderA4={A4Template}
        />
    </>
}