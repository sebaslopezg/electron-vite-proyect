import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { formatCurrency } from '../../utils/currencies'
import { ModalSeleccionItemNota } from './components/ModalSeleccionItemNota'
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

const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100

export const NuevaNota = ({ onBack, onSuccess, canCrearCredito, canCrearDebito }) => {
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

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
            } catch (e) {}
        }
    }

    useEffect(() => { loadConfig() }, [])

    const initialNoteType = canCrearCredito ? 'Crédito' : (canCrearDebito ? 'Débito' : '')

    const [formData, setFormData] = useState({
        tipo_nota: initialNoteType,
        motivo_dian: initialNoteType === 'Crédito' ? 'Devolución de parte de los bienes' : 'Intereses',
        numero_factura_origen: '',
        observaciones: '',
        afecta_inventario: true,
        generar_saldo_favor: initialNoteType === 'Crédito'
    })

    const [loadedInvoice, setLoadedInvoice] = useState(null)
    const [clientBalance, setClientBalance] = useState(null)
    const [availableProducts, setAvailableProducts] = useState([])
    const [items, setItems] = useState([])

    const [showModal, setShowModal] = useState(false)
    const [itemForm, setItemForm] = useState({ id_producto: '', cantidad: 1 })

    const creditReasons = [
        "Devolución de parte de los bienes",
        "Anulación de factura electrónica",
        "Rebaja total",
        "Descuento parcial"
    ]
    const debitReasons = [
        "Intereses",
        "Gastos por cobrar",
        "Cambio del valor"
    ]

    const rawTotals = items.reduce((acc, item) => {
        return {
            grossBase: acc.grossBase + (item.subtotal_bruto || 0),
            discount: acc.discount + (item.descuento_total || 0),
            base: acc.base + (item.subtotal || 0),
            iva: acc.iva + ((item.subtotal * item.iva_percent) || 0),
            final: acc.final + (item.total || 0)
        }
    }, { grossBase: 0, discount: 0, base: 0, iva: 0, final: 0 })

    const totals = {
        grossBase: roundMoney(rawTotals.grossBase),
        discount: roundMoney(rawTotals.discount),
        base: roundMoney(rawTotals.base),
        iva: roundMoney(rawTotals.iva),
        final: roundMoney(rawTotals.final)
    }

    const isCreditNote = formData.tipo_nota === 'Crédito'
    const hasRegisteredClient = Boolean(clientBalance?.id)
    const currentClientCredit = Number(clientBalance?.saldo_favor) || 0
    const invoicePendingDebt = Math.max(0, Number(loadedInvoice?.saldo_pendiente) || 0)
    const invoiceDiscountTotal = Math.max(0, Number(loadedInvoice?.descuento) || 0)
    const debtToDiscount = isCreditNote ? Math.min(invoicePendingDebt, totals.final) : 0
    const creditExcess = isCreditNote ? Math.max(0, roundMoney(totals.final - debtToDiscount)) : 0
    const willAddCreditBalance = isCreditNote && hasRegisteredClient && formData.generar_saldo_favor && creditExcess > 0
    const projectedClientCredit = roundMoney(currentClientCredit + (willAddCreditBalance ? creditExcess : 0))

    const formatMoney = (value) => formatCurrency(value, appConfig.formato_numero, appConfig.moneda)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target

        if (name === 'tipo_nota') {
            setFormData({
                ...formData,
                [name]: value,
                motivo_dian: value === 'Crédito' ? creditReasons[0] : debitReasons[0],
                generar_saldo_favor: value === 'Crédito'
            })
        } else {
            setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
        }
    }

    const handleSearchInvoice = async () => {
        const exactSearch = formData.numero_factura_origen.trim()

        if (!exactSearch) {
            Toast.fire({ icon: 'warning', title: 'Ingrese un número de factura' })
            return
        }

        const result = await ventasService.searchFactura(exactSearch)

        if (result.success) {
            setLoadedInvoice(result.maestro)
            setClientBalance(result.clienteSaldo || null)
            setAvailableProducts(result.detalles)
            setItems([])
            setFormData(prev => ({
                ...prev,
                generar_saldo_favor: prev.tipo_nota === 'Crédito' && Boolean(result.clienteSaldo?.id)
            }))
            Toast.fire({ icon: 'success', title: 'Factura Encontrada', text: `Cliente: ${result.maestro.nombre_cliente}` })
        } else {
            Toast.fire({ icon: 'error', title: result.message || 'Factura no encontrada' })
            setLoadedInvoice(null)
            setClientBalance(null)
            setAvailableProducts([])
        }
    }

    const handleCloseModal = () => setShowModal(false)

    const handleOpenModal = () => {
        if (availableProducts.length > 0) {
            setItemForm({ id_producto: availableProducts[0].id_producto, cantidad: 1 })
        }
        setShowModal(true)
    }

    const handleConfirmAddItem = () => {
        const invoiceProduct = availableProducts.find(p => p.id_producto === itemForm.id_producto)
        if (!invoiceProduct) return

        const qtyToAdd = parseFloat(itemForm.cantidad)

        if (qtyToAdd <= 0) {
            Toast.fire({ icon: 'error', title: 'La cantidad debe ser mayor a 0' })
            return
        }
        if (qtyToAdd > invoiceProduct.cantidad_producto) {
            Toast.fire({ icon: 'error', title: `La cantidad supera lo vendido (${invoiceProduct.cantidad_producto})` })
            return
        }
        if (items.some(i => i.id_producto === invoiceProduct.id_producto)) {
            Toast.fire({ icon: 'warning', title: 'Este producto ya está en la nota' })
            return
        }

        const originalUnitPrice = Number(invoiceProduct.precio_producto) || 0
        const unitDiscount = Number(invoiceProduct.descuento_unitario) || 0
        const netUnitPrice = invoiceProduct.precio_unitario_neto !== undefined
            ? Number(invoiceProduct.precio_unitario_neto)
            : Math.max(0, originalUnitPrice - unitDiscount)

        const newItem = {
            id: invoiceProduct.id_producto,
            id_producto: invoiceProduct.id_producto,
            sku: invoiceProduct.sku,
            sku_prefix: invoiceProduct.sku_prefix,
            separador: invoiceProduct.separador,
            nombre_producto: invoiceProduct.nombre_producto,
            amount: qtyToAdd,
            cantidad: qtyToAdd,
            precio_original: originalUnitPrice,
            descuento_unitario: unitDiscount,
            precio_unitario: netUnitPrice,
            iva_percent: Number(invoiceProduct.iva ?? 0) / 100,
            get subtotal_bruto() { return this.cantidad * this.precio_original },
            get descuento_total() { return this.cantidad * this.descuento_unitario },
            get subtotal() { return this.cantidad * this.precio_unitario },
            get total() { return this.subtotal * (1 + this.iva_percent) }
        }

        setItems([...items, newItem])
        handleCloseModal()
    }

    const handleDeleteItem = (productIdToRemove) => {
        setItems(prevItems => prevItems.filter(item => item.id !== productIdToRemove))
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const deleteBtn = e.target.closest('.btn-delete-item')
            if (deleteBtn) {
                const id = deleteBtn.dataset.id
                handleDeleteItem(id)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [items])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (items.length === 0) {
            Toast.fire({ icon: 'error', title: 'Debe agregar al menos un producto' })
            return
        }

        const payload = {
            tipo_nota: formData.tipo_nota,
            prefijo: formData.tipo_nota === 'Crédito' ? 'NC' : 'ND',
            numero_nota: 0,
            id_factura_origen: loadedInvoice.id,
            numero_factura_origen: loadedInvoice.numero_factura.toString(),
            documento_cliente: loadedInvoice.documento_cliente || '',
            nombre_cliente: loadedInvoice.nombre_cliente || 'Cliente Mostrador',
            motivo_dian: formData.motivo_dian,
            observaciones: formData.observaciones,
            total_base: totals.base,
            total_iva: totals.iva,
            total_final: totals.final,
            moneda: appConfig.moneda,
            formato_numero: appConfig.formato_numero,
            afecta_inventario: formData.afecta_inventario,
            generar_saldo_favor: isCreditNote && hasRegisteredClient && formData.generar_saldo_favor,
            usuario: "Admin",
            items: items.map(item => ({
                id_producto: item.id_producto,
                nombre_producto: item.nombre_producto,
                cantidad: item.cantidad,
                precio_unitario: roundMoney(item.precio_unitario),
                iva_percent: item.iva_percent,
                subtotal: roundMoney(item.subtotal),
                total: roundMoney(item.total)
            }))
        }

        const result = await ventasService.addNota(payload)
        if (result.success) {
            window.dispatchEvent(new Event('factura-creada'))
            const extraMsg = result.creditBalanceAdded > 0
                ? `Saldo a favor abonado: ${formatMoney(result.creditBalanceAdded)}`
                : undefined
            Toast.fire({ icon: 'success', title: 'La nota ha sido registrada con éxito', text: extraMsg })
            onSuccess()
        } else {
            Toast.fire({ icon: 'error', title: result.error || 'No se pudo guardar la nota' })
        }
    }

    return <>
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-primary">Nueva Nota</h5>
                <button className="btn btn-outline-secondary btn-sm" onClick={onBack}>Volver</button>
            </div>

            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Tipo de Nota</label>
                            <select className="form-select" name="tipo_nota" value={formData.tipo_nota} onChange={handleChange}>
                                {canCrearCredito && <option value="Crédito">Nota Crédito (Resta)</option>}
                                {canCrearDebito && <option value="Débito">Nota Débito (Suma)</option>}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">N° Factura Origen</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    name="numero_factura_origen"
                                    value={formData.numero_factura_origen}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleSearchInvoice()
                                        }
                                    }}
                                    placeholder="Ej: F-123"
                                    required
                                />
                                <button className="btn btn-primary" type="button" onClick={handleSearchInvoice}>
                                    <i className="bi bi-search"></i>
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Motivo (DIAN)</label>
                            <select className="form-select" name="motivo_dian" value={formData.motivo_dian} onChange={handleChange}>
                                {(isCreditNote ? creditReasons : debitReasons).map((reason, idx) => (
                                    <option key={idx} value={reason}>{reason}</option>
                                ))}
                            </select>
                        </div>

                        {loadedInvoice && (
                            <div className="col-12 mt-2">
                                <div className="alert alert-info py-2 m-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                    <div>
                                        <strong>Factura Seleccionada:</strong> {loadedInvoice.prefijo || ''}{loadedInvoice.separador || ''}{loadedInvoice.numero_factura} |
                                        <strong> Cliente:</strong> {loadedInvoice.nombre_cliente} |
                                        <strong> Total Factura:</strong> {formatMoney(loadedInvoice.total_factura || 0)}
                                        {invoiceDiscountTotal > 0 && (
                                            <span className="ms-2 text-danger fw-bold">
                                                (Desc: -{formatMoney(invoiceDiscountTotal)})
                                            </span>
                                        )}
                                    </div>
                                    <div className="d-flex gap-3">
                                        <span>
                                            <strong>Saldo Pendiente:</strong>{' '}
                                            <span className={invoicePendingDebt > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                                                {formatMoney(invoicePendingDebt)}
                                            </span>
                                        </span>
                                        <span>
                                            <strong>Saldo a Favor Actual:</strong>{' '}
                                            {hasRegisteredClient ? (
                                                <span className="text-success fw-bold">{formatMoney(currentClientCredit)}</span>
                                            ) : (
                                                <span className="badge bg-warning text-dark">No registrado en Terceros</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="col-md-6">
                            <label className="form-label fw-bold">Observaciones</label>
                            <input type="text" className="form-control" name="observaciones" value={formData.observaciones} onChange={handleChange} />
                        </div>

                        <div className="col-md-3 d-flex align-items-end">
                            <div className="form-check form-switch fs-5">
                                <input className="form-check-input" type="checkbox" name="afecta_inventario" id="inventarioSwitch" checked={formData.afecta_inventario} onChange={handleChange} />
                                <label className="form-check-label fs-6 ms-2" htmlFor="inventarioSwitch">Afecta Inventario</label>
                            </div>
                        </div>

                        {isCreditNote && (
                            <div className="col-md-3 d-flex align-items-end">
                                <div className="form-check form-switch fs-5">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        name="generar_saldo_favor"
                                        id="creditBalanceSwitch"
                                        checked={formData.generar_saldo_favor && hasRegisteredClient}
                                        disabled={!loadedInvoice || !hasRegisteredClient}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label fs-6 ms-2" htmlFor="creditBalanceSwitch">
                                        Dar Saldo a Favor
                                    </label>
                                </div>
                            </div>
                        )}

                        {isCreditNote && loadedInvoice && totals.final > 0 && (
                            <div className="col-12">
                                <div className={`alert py-2 m-0 small ${willAddCreditBalance ? 'alert-success' : 'alert-secondary'}`}>
                                    <i className={`bi ${willAddCreditBalance ? 'bi-wallet2' : 'bi-info-circle'} me-2`}></i>
                                    {debtToDiscount > 0 && (
                                        <span className="me-2">
                                            Se descontarán <strong>{formatMoney(debtToDiscount)}</strong> de la deuda pendiente de esta factura.
                                        </span>
                                    )}
                                    {creditExcess > 0 ? (
                                        !hasRegisteredClient ? (
                                            <span>El cliente no está registrado en Terceros; el excedente de <strong>{formatMoney(creditExcess)}</strong> no se puede asignar como saldo a favor.</span>
                                        ) : formData.generar_saldo_favor ? (
                                            <span>
                                                Se abonarán <strong>{formatMoney(creditExcess)}</strong> al saldo a favor del cliente (Nuevo saldo a favor: <strong>{formatMoney(projectedClientCredit)}</strong>).
                                            </span>
                                        ) : (
                                            <span>
                                                El excedente de <strong>{formatMoney(creditExcess)}</strong> no se guardará como saldo a favor (devolución directa).
                                            </span>
                                        )
                                    ) : (
                                        <span>La nota cubre deuda pendiente; no genera excedente como saldo a favor.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-end mb-2">
                            <h6 className="fw-bold mb-0">Detalle de la Nota</h6>
                            <button type="button" className="btn btn-success btn-sm" disabled={!loadedInvoice} onClick={handleOpenModal}>
                                <i className="bi bi-plus me-1"></i> Agregar Ítem
                            </button>
                        </div>

                        <div ref={tableContainerRef}>
                            <DataTableComponent
                                data={items}
                                columns={[
                                    {
                                        data: 'sku',
                                        title: 'SKU',
                                        render: (data, type, row) => {
                                            if (!data) return '-'
                                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}`.toUpperCase() : ''
                                            const skuVal = String(data).toUpperCase()

                                            const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`
                                            return `<strong>${finalSku}</strong>`
                                        }
                                    },
                                    { data: 'nombre_producto', title: 'Producto' },
                                    { data: 'cantidad', title: 'Cant.' },
                                    { data: 'precio_original', title: 'V. Unitario' },
                                    { data: 'descuento_total', title: 'Desc.' },
                                    { data: 'iva_percent', title: 'IVA' },
                                    { data: 'total', title: 'Total' },
                                    {
                                        data: null,
                                        title: 'Acciones',
                                        orderable: false,
                                        render: function (data, type, row) {
                                            return `
                                                <button type="button" class="btn btn-sm btn-danger btn-delete-item" data-id="${row.id}">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            `
                                        }
                                    }
                                ]}
                                customRenders={{
                                    precio_original: (data) => formatMoney(data),
                                    descuento_total: (data) => {
                                        const discountVal = Number(data) || 0
                                        return discountVal > 0
                                            ? `<span class="text-danger">-${formatMoney(discountVal)}</span>`
                                            : '<span class="text-muted">-</span>'
                                    },
                                    iva_percent: (data) => `${(parseFloat(data) * 100).toFixed(0)}%`,
                                    total: (data) => `<strong>${formatMoney(data)}</strong>`
                                }}
                            />
                        </div>
                    </div>

                    <div className="row justify-content-end">
                        <div className="col-md-4">
                            <table className="table table-sm table-borderless text-end fs-5">
                                <tbody>
                                    {totals.discount > 0 ? (
                                        <>
                                            <tr><td className="fw-bold">Subtotal Bruto:</td><td>{formatMoney(totals.grossBase)}</td></tr>
                                            <tr className="text-danger"><td className="fw-bold">Descuento:</td><td>-{formatMoney(totals.discount)}</td></tr>
                                            <tr><td className="fw-bold">Subtotal Neto:</td><td>{formatMoney(totals.base)}</td></tr>
                                        </>
                                    ) : (
                                        <tr><td className="fw-bold">Subtotal:</td><td>{formatMoney(totals.base)}</td></tr>
                                    )}
                                    <tr><td className="fw-bold">IVA:</td><td>{formatMoney(totals.iva)}</td></tr>
                                    <tr className="border-top border-2 border-dark">
                                        <td className="fw-bold fs-4">Total:</td><td className="fw-bold fs-4 text-primary">{formatMoney(totals.final)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="d-grid mt-3">
                                <button type="submit" className="btn btn-primary btn-lg">Generar Nota</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <ModalSeleccionItemNota
                show={showModal}
                handleClose={handleCloseModal}
                productosDisponibles={availableProducts}
                itemForm={itemForm}
                setItemForm={setItemForm}
                handleConfirmAddItem={handleConfirmAddItem}
            />
        </div>
    </>
}