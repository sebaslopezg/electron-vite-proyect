import { useEffect, useRef, useState } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'
import { formatCurrency } from '../../../utils/currencies'
import { carteraService } from '../../../services/carteraService'

export const TabCuentasPorCobrar = ({ reloadKey, onOpenModal, onViewFactura, appConfig, currentUser, almacenConf }) => {
    const receivablesTableRef = useRef(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (currentUser) {
            setIsLoading(false)
        } else {
            const timer = setTimeout(() => setIsLoading(false), 800)
            return () => clearTimeout(timer)
        }
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    useEffect(() => {
        const container = receivablesTableRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const payBtn = e.target.closest('.btn-pay-item')
            if (payBtn && container.contains(payBtn)) {
                try {
                    const item = JSON.parse(decodeURIComponent(payBtn.dataset.alldata))
                    onOpenModal(item)
                } catch (err) {
                    console.error('Error parsing invoice row for payment modal', err)
                }
            }

            const viewInvoiceBtn = e.target.closest('.btn-view-factura')
            if (viewInvoiceBtn && container.contains(viewInvoiceBtn)) {
                e.preventDefault()
                try {
                    const item = JSON.parse(decodeURIComponent(viewInvoiceBtn.dataset.alldata))
                    onViewFactura(item)
                } catch (err) {
                    console.error('Error parsing invoice row for detail view', err)
                }
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [onOpenModal, onViewFactura, currentUser, isLoading])

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        )
    }

    return <>
        <div className="animation-fade-in">
            <div ref={receivablesTableRef} className="w-100">
                <DataTableComponent
                    tableId="dt-cartera-cuentas-por-cobrar"
                    key={`cobrar-${appConfig.moneda}-${appConfig.formato_numero}-${currentUser?.permisos?.length}`}
                    reloadKey={reloadKey}
                    ajaxData={(params) => carteraService.getCuentasPorCobrarPaginadas(params)}
                    columns={[
                        {
                            data: 'numero_factura',
                            title: 'N° Factura',
                            render: (data, type, row) => {
                                if (!data) return '-'

                                const prefix = row.prefijo ? String(row.prefijo) : ''
                                const separator = row.separador || almacenConf?.separador || '-'
                                let numVal = String(data)

                                if (prefix && numVal.startsWith(prefix)) {
                                    numVal = numVal.substring(prefix.length)
                                }

                                if (numVal.startsWith(separator)) {
                                    numVal = numVal.substring(separator.length)
                                }

                                const finalInvoice = prefix ? `${prefix}${separator}${numVal}` : numVal
                                const safeData = encodeURIComponent(JSON.stringify(row))

                                return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view-factura" data-alldata="${safeData}">${finalInvoice}</a>`
                            }
                        },
                        { data: 'documento_cliente', title: 'Doc / NIT' },
                        {
                            data: 'nombre_cliente',
                            title: 'Cliente',
                            render: (data, type, row) => {
                                const creditBalance = Number(row.cliente_saldo_favor) || 0
                                const creditBadge = creditBalance > 0
                                    ? `<div><span class="badge bg-info bg-opacity-10 text-dark border border-info mt-1"><i class="bi bi-wallet2 me-1"></i>Saldo a favor: ${formatCurrency(creditBalance, appConfig.formato_numero, appConfig.moneda)}</span></div>`
                                    : ''
                                return `<div>${data || ''}</div>${creditBadge}`
                            }
                        },
                        {
                            data: 'date_created',
                            title: 'Fecha Venta',
                            render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero)
                        },
                        {
                            data: 'total_factura',
                            title: 'Total Venta',
                            render: (data) => formatCurrency(data, appConfig.formato_numero, appConfig.moneda)
                        },
                        {
                            data: 'saldo_pendiente',
                            title: 'Deuda Pendiente',
                            render: (data) => `<strong class="text-danger fs-6">${formatCurrency(data, appConfig.formato_numero, appConfig.moneda)}</strong>`
                        },
                        {
                            data: null,
                            title: 'Acciones',
                            orderable: false,
                            className: 'text-center',
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row))
                                const canPay = hasPermission('cartera_abonar')

                                return canPay ? `
                                    <button class="btn btn-sm btn-success text-white btn-pay-item" data-alldata="${safeData}" title="Registrar Pago">
                                        <i class="bi bi-cash-coin me-1"></i> Abonar
                                    </button>
                                ` : '<span class="text-muted small fst-italic">Solo Lectura</span>'
                            }
                        }
                    ]}
                />
            </div>
        </div>
    </>
}