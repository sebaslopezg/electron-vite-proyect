import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { Button, InputGroup, Form, Row, Col } from 'react-bootstrap'
import { ImpresorFactura } from './components/ImpresorFactura'
import { getCurrencySymbol, formatCurrency } from '../../utils/currencies'
import { ModalTercero } from '../contabilidad/components/ModalTercero'
import { ModalBusquedaVentas } from './components/ModalBusquedaVentas'
import { ProductoDetalles } from '../productos/components/ProductoDetalles'
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

const DRAFT_KEY = 'ventas_draft_invoice'

const getInitialDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    return {}
  }
}

export const Facturacion = ({ currentUser: initialUser }) => {
  const draft = getInitialDraft()

  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])

  const [cart, setCart] = useState(draft.carrito || [])
  const [client, setClient] = useState(draft.cliente || null)
  const [discount, setDiscount] = useState(draft.descuento || 0)
  const [isPercentage, setIsPercentage] = useState(draft.esPorcentaje ?? true)

  const [paymentType, setPaymentType] = useState(draft.tipoPago || 'contado')
  const [installments, setInstallments] = useState(draft.cuotas || 1)
  const [notes, setNotes] = useState(draft.observaciones || '')

  const [payments, setPayments] = useState(draft.pagos || [{ metodo: 'Efectivo', monto: '' }])

  // Store credit states
  const [availableCredit, setAvailableCredit] = useState(Number(draft.cliente?.saldo_favor) || 0)
  const [useCreditBalance, setUseCreditBalance] = useState(Boolean(draft.useCreditBalance))
  const [creditAmountInput, setCreditAmountInput] = useState(draft.creditAmountInput ?? '')

  const [paymentMethodsList, setPaymentMethodsList] = useState([])

  const [show, setShow] = useState(false)
  const [showTerceroModal, setShowTerceroModal] = useState(false)
  const [modalData, setModalData] = useState({ title: '', columns: [], type: '' })

  const [skuInput, setSkuInput] = useState('')
  const [docInput, setDocInput] = useState('')

  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [invoiceToPrint, setInvoiceToPrint] = useState(null)
  const [detailsToPrint, setDetailsToPrint] = useState([])
  const [storeConfToPrint, setStoreConfToPrint] = useState(null)

  const [showProdDetail, setShowProdDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const [categoriesList, setCategoriesList] = useState([])
  const [tagsList, setTagsList] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })
  const [currentUser, setCurrentUser] = useState(initialUser)

  useEffect(() => {
    if (initialUser) setCurrentUser(initialUser)
  }, [initialUser])

  useEffect(() => {
    if (cart.length === 0 && !client && payments.every(p => !p.monto) && !notes) {
      localStorage.removeItem(DRAFT_KEY)
      return
    }

    const currentDraft = {
      carrito: cart,
      cliente: client,
      descuento: discount,
      esPorcentaje: isPercentage,
      tipoPago: paymentType,
      pagos: payments,
      cuotas: installments,
      observaciones: notes,
      useCreditBalance,
      creditAmountInput
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(currentDraft))
  }, [cart, client, discount, isPercentage, paymentType, payments, installments, notes, useCreditBalance, creditAmountInput])

  // Fetch fresh store credit whenever selected client changes
  useEffect(() => {
    let isMounted = true

    const fetchClientCredit = async () => {
      if (!client?.documento) {
        setAvailableCredit(0)
        setUseCreditBalance(false)
        setCreditAmountInput('')
        return
      }

      let freshCredit = Number(client.saldo_favor) || 0

      try {
        if (window.api?.getClienteSaldo) {
          const res = await window.api.getClienteSaldo({ documento: client.documento })
          if (res?.success && res.data) {
            freshCredit = Number(res.data.saldo_favor) || 0
          }
        }
      } catch (err) {
        console.error('Error fetching client credit balance', err)
      }

      if (isMounted) {
        setAvailableCredit(freshCredit)
        if (freshCredit <= 0) {
          setUseCreditBalance(false)
          setCreditAmountInput('')
        }
      }
    }

    fetchClientCredit()
    return () => { isMounted = false }
  }, [client?.documento])

  const selectClient = (newClient) => {
    setClient(newClient)
    setUseCreditBalance(false)
    setCreditAmountInput('')
  }

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
      } catch (e) {}
    }
  }

  const loadPaymentMethods = async () => {
    const methods = await ventasService.getMetodosPago()
    setPaymentMethodsList(methods || [])

    setPayments(prev => {
      if (prev.length === 1 && (!prev[0].metodo || prev[0].metodo === 'Efectivo') && methods && methods.length > 0) {
        return [{ ...prev[0], metodo: methods[0].nombre }]
      }
      return prev
    })
  }

  const loadInitialData = async () => {
    setIsLoading(true)

    if (!initialUser && window.api && window.api.getCurrentUser) {
      const userRes = await window.api.getCurrentUser()
      if (userRes?.success) setCurrentUser(userRes.data)
    }

    const prods = await ventasService.getAllProductos()
    setProducts(prods)
    const clis = await ventasService.getClientes()
    setClients(clis)
    const cats = await ventasService.getCategorias()
    const tags = await ventasService.getEtiquetas()
    setCategoriesList(cats || [])
    setTagsList(tags || [])

    await loadConfig()
    await loadPaymentMethods()

    setIsLoading(false)
  }

  useEffect(() => {
    loadInitialData()
    window.addEventListener('config-actualizada', loadConfig)
    window.addEventListener('metodos-pago-actualizados', loadPaymentMethods)
    return () => {
      window.removeEventListener('config-actualizada', loadConfig)
      window.removeEventListener('metodos-pago-actualizados', loadPaymentMethods)
    }
  }, [])

  const renderCurrency = (val) => {
    return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
  }

  const addPayment = () => {
    setPayments([...payments, { metodo: paymentMethodsList.length > 0 ? paymentMethodsList[0].nombre : 'Efectivo', monto: '' }])
  }

  const removePayment = (index) => {
    const updatedPayments = [...payments]
    updatedPayments.splice(index, 1)
    setPayments(updatedPayments)
  }

  const updatePayment = (index, field, value) => {
    const updatedPayments = [...payments]
    updatedPayments[index][field] = value
    setPayments(updatedPayments)
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  const summary = cart.reduce((acc, item) => {
    const gross = item.precio * item.cantidad
    const savings = item.tipoDescuento === 'porcentaje' ? gross * (item.descuento / 100) : item.descuento * item.cantidad
    const itemBase = gross - savings
    const taxRate = (Number(item.iva) || 0) / 100
    const itemTax = itemBase * taxRate

    acc.subtotal += gross
    acc.totalDiscounts += savings
    acc.totalTax += itemTax
    acc.totalFinal += (itemBase + itemTax)
    return acc
  }, { subtotal: 0, totalDiscounts: 0, totalTax: 0, totalFinal: 0 })

  const netSubtotal = summary.subtotal - summary.totalDiscounts
  const totalTax = summary.totalTax
  const totalFinal = summary.totalFinal

  // Store credit & payment totals calculation
  const maxUsableCredit = Math.min(availableCredit, totalFinal)
  const parsedCreditInput = parseFloat(creditAmountInput) || 0
  const effectiveCreditUsed = useCreditBalance
    ? Math.min(Math.max(0, parsedCreditInput), maxUsableCredit)
    : 0
  const remainingCreditAfterSale = Math.max(0, availableCredit - effectiveCreditUsed)
  const remainingAfterCredit = Math.max(0, totalFinal - effectiveCreditUsed)

  const otherPaymentsReceived = remainingAfterCredit > 0
    ? payments.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0)
    : 0

  const totalReceived = effectiveCreditUsed + otherPaymentsReceived
  const changeAmount = otherPaymentsReceived > remainingAfterCredit
    ? otherPaymentsReceived - remainingAfterCredit
    : 0
  const pendingBalance = totalReceived < totalFinal ? totalFinal - totalReceived : 0

  // Keep credit input clamped when cart total decreases
  useEffect(() => {
    if (useCreditBalance && creditAmountInput !== '') {
      const numericVal = parseFloat(creditAmountInput)
      if (!isNaN(numericVal) && numericVal > maxUsableCredit) {
        setCreditAmountInput(maxUsableCredit > 0 ? String(maxUsableCredit) : '0')
      }
    }
  }, [maxUsableCredit, useCreditBalance])

  const handleToggleCreditBalance = (checked) => {
    setUseCreditBalance(checked)
    if (checked) {
      setCreditAmountInput(maxUsableCredit > 0 ? String(maxUsableCredit) : '0')
    } else {
      setCreditAmountInput('')
    }
  }

  const handleCreditInputChange = (rawVal) => {
    if (rawVal === '') {
      setCreditAmountInput('')
      return
    }
    const numericVal = parseFloat(rawVal)
    if (isNaN(numericVal) || numericVal < 0) return
    if (numericVal > maxUsableCredit) {
      setCreditAmountInput(String(maxUsableCredit))
      return
    }
    setCreditAmountInput(rawVal)
  }

  const handleClose = () => {
    setShow(false)
    setFilterCategory('')
    setFilterTag('')
  }
  const handleShow = () => setShow(true)

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false)
    setInvoiceToPrint(null)
    setDetailsToPrint([])
    setStoreConfToPrint(null)
  }

  const handleSearchProduct = async () => {
    if (!skuInput.trim()) {
      handleAddProduct()
      return
    }

    let currentProducts = products
    if (currentProducts.length === 0) {
      currentProducts = await ventasService.getAllProductos()
      setProducts(currentProducts)
    }

    const searchStr = skuInput.trim().toLowerCase()

    const found = currentProducts.find(p => {
      if (!p.sku) return false
      const fullSku = p.sku_prefix ? `${p.sku_prefix}${p.separador || ''}${p.sku}` : p.sku
      return fullSku.toLowerCase() === searchStr || p.sku.toLowerCase() === searchStr
    })

    if (found) {
      addToCart(found)
      setSkuInput('')
    } else {
      handleAddProduct()
    }
  }

  const handleSearchClient = async () => {
    if (!docInput.trim()) {
      handleAddClient()
      return
    }

    let currentClients = clients
    if (currentClients.length === 0) {
      currentClients = await ventasService.getClientes()
      setClients(currentClients)
    }

    const found = currentClients.find(c => c.documento === docInput.trim())

    if (found) {
      selectClient(found)
      setDocInput('')
    } else {
      Swal.fire({
        title: 'Cliente no encontrado',
        text: `No se encontró el documento ${docInput.trim()}. ¿Deseas crearlo ahora?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, crear cliente',
        cancelButtonText: 'Buscar en la lista'
      }).then((result) => {
        if (result.isConfirmed) {
          setShowTerceroModal(true)
        } else {
          handleAddClient()
        }
      })
    }
  }

  const handleAddProduct = () => {
    setModalData({
      type: 'producto',
      title: 'Catálogo de Productos',
      columns: [
        { data: 'ref_name', title: 'Nombre Referencia' },
        {
          data: 'sku',
          title: 'SKU',
          render: (data, type, row) => {
            if (!data) return '-'
            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}`.toUpperCase() : ''
            const skuVal = String(data).toUpperCase()

            const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`
            const safeData = encodeURIComponent(JSON.stringify(row))

            return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view-product" data-alldata="${safeData}">${finalSku}</a>`
          }
        },
        { data: 'stock', title: 'Stock' },
        {
          data: 'precio',
          title: 'Precio',
          render: (data, type, row) => renderCurrency(row.precio)
        },
        {
          data: null,
          title: 'Agregar',
          orderable: false,
          render: function (data, type, row) {
            const safeData = encodeURIComponent(JSON.stringify(row))
            let buttons = ''

            const allowOrder = (row.allow_encargo === undefined || row.allow_encargo === null)
              ? 1
              : (String(row.allow_encargo) === '1' || String(row.allow_encargo).toLowerCase() === 'true' ? 1 : 0)

            const orderOnlyOutOfStock = (row.encargo_solo_sin_stock === undefined || row.encargo_solo_sin_stock === null)
              ? 1
              : (String(row.encargo_solo_sin_stock) === '1' || String(row.encargo_solo_sin_stock).toLowerCase() === 'true' ? 1 : 0)

            if (Number(row.stock) > 0 || row.tipo === 'servicio') {
              buttons += `<button class="btn btn-sm btn-primary btn-select-product me-1 mb-1" data-alldata="${safeData}" data-force-encargo="0">
                <i class="bi bi-cart-plus me-1"></i> Agregar
              </button>`
            }

            if (allowOrder === 1 && row.tipo === 'producto') {
              if (Number(row.stock) <= 0 || orderOnlyOutOfStock === 1) {
                buttons += `<button class="btn btn-sm btn-warning text-dark btn-select-product mb-1" data-alldata="${safeData}" data-force-encargo="1">
                <i class="bi bi-box-seam me-1"></i> Encargar
                </button>`
              }
            } else if (allowOrder === 0 && Number(row.stock) <= 0) {
              buttons += `<button class="btn btn-sm btn-secondary disabled mb-1"><i class="bi bi-x-circle me-1"></i> Agotado</button>`
            }
            return buttons
          }
        }
      ]
    })
    handleShow()
  }

  const handleAddClient = () => {
    if (!hasPermission('clientes_ver')) {
      return Swal.fire({
        icon: 'warning',
        title: 'Acceso Restringido',
        text: 'Tu rol no tiene permisos para explorar el directorio general de clientes. Por favor, busca digitando el número de documento exacto.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      })
    }

    setModalData({
      type: 'cliente',
      title: 'Seleccionar Cliente',
      columns: [
        { data: 'nombre', title: 'Nombre' },
        { data: 'documento', title: 'Documento' },
        { data: 'telefono', title: 'Teléfono' },
        {
          data: 'saldo_favor',
          title: 'Saldo a Favor',
          render: (data) => {
            const val = Number(data) || 0
            return val > 0
              ? `<span class="badge bg-success">${renderCurrency(val)}</span>`
              : `<span class="text-muted">${renderCurrency(0)}</span>`
          }
        },
        {
          data: null,
          title: 'Agregar',
          render: function (data, type, row) {
            const safeData = encodeURIComponent(JSON.stringify(row))
            return `
              <button class="btn btn-sm btn-success btn-select-client" data-alldata="${safeData}">
                Agregar
              </button>
            `
          }
        }
      ]
    })
    handleShow()
  }

  const applyBulkDiscount = () => {
    if (cart.length === 0) return
    Swal.fire({
      title: 'Descuento General',
      text: 'Ingresa el porcentaje de descuento para todos los productos:',
      input: 'number',
      inputAttributes: { min: 0, max: 100 },
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const pct = parseFloat(result.value)
        setCart(prev => prev.map(item => ({
          ...item, descuento: pct, tipoDescuento: 'porcentaje'
        })))
        Toast.fire({ icon: 'success', title: `Descuento masivo del ${pct}% aplicado` })
      }
    })
  }

  const clearCart = () => {
    Swal.fire({
      title: '¿Reiniciar Módulo?',
      text: "Se vaciarán todos los productos, clientes y pagos ingresados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        cleanForm()
        Toast.fire({ icon: 'info', title: 'Facturación limpia' })
      }
    })
  }

  const addToCart = (prod, forceOrder = false) => {
    setCart((prev) => {
      const unitsInCartWithStock = prev
        .filter(item => item.id === prod.id && item.isEncargo === '0')
        .reduce((acc, item) => acc + item.cantidad, 0)
      let isOrderVal = forceOrder ? '1' : '0'

      if (!forceOrder && prod.tipo === "producto" && unitsInCartWithStock >= prod.stock) {
        const allowOrder = prod.allow_encargo !== undefined ? Number(prod.allow_encargo) : 1
        if (allowOrder === 0) {
          Toast.fire({
            icon: 'warning',
            title: 'Agotado',
            text: 'Stock físico agotado y el producto no permite encargos.'
          })
          return prev
        }
        isOrderVal = '1'
      }

      const existing = prev.find(item => item.id === prod.id && item.isEncargo === isOrderVal)

      if (existing) {
        if (isOrderVal === '0' && (existing.cantidad + 1) > prod.stock) {
          const allowOrder = prod.allow_encargo !== undefined ? Number(prod.allow_encargo) : 1
          if (allowOrder === 0) {
            Toast.fire({ icon: 'warning', title: 'Agotado', text: 'Alcanzaste el límite de stock y el producto no permite encargos.' })
            return prev
          }
          return [...prev, { ...prod, cantidad: 1, descuento: 0, tipoDescuento: 'porcentaje', iva: prod.iva, isEncargo: '1' }]
        }

        return prev.map(item =>
          (item.id === prod.id && item.isEncargo === isOrderVal)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      } else {
        return [...prev, { ...prod, cantidad: 1, descuento: 0, tipoDescuento: 'porcentaje', iva: prod.iva, isEncargo: isOrderVal }]
      }
    })
  }

  const finalizeSale = async () => {
    if (cart.length === 0) return

    if (!client) {
      Toast.fire({
        icon: 'warning',
        title: 'Falta el Cliente',
        text: 'Por favor seleccione o busque un cliente.'
      })
      return
    }

    if (totalReceived < totalFinal) {
      if (paymentType === 'contado') {
        Toast.fire({
          icon: 'warning',
          title: 'Monto Incompleto',
          text: 'El cliente no ha entregado el monto completo. Si es un abono, cambie el Tipo de Pago a Crédito.'
        })
        return
      }
      if (paymentType === 'credito') {
        const confirm = await Swal.fire({
          title: 'Venta con saldo pendiente',
          text: '¿Esta venta irá a la sección de cartera, seguro que desea guardar la factura?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, guardar',
          cancelButtonText: 'Cancelar'
        })
        if (!confirm.isConfirmed) return
      }
    }

    // Build final payments list including Store Credit if applied
    const finalPaymentsList = []
    if (effectiveCreditUsed > 0) {
      finalPaymentsList.push({ metodo: 'Saldo a Favor', monto: effectiveCreditUsed })
    }
    if (remainingAfterCredit > 0) {
      payments.forEach(p => {
        const numericAmount = parseFloat(p.monto) || 0
        if (numericAmount > 0) {
          finalPaymentsList.push({ metodo: p.metodo, monto: numericAmount })
        }
      })
    }

    const usedMethods = finalPaymentsList.length > 0
      ? finalPaymentsList.map(p => p.metodo).filter(Boolean).join(', ')
      : (payments.map(p => p.metodo).filter(Boolean).join(', ') || 'Efectivo')

    const serializedPayments = JSON.stringify(finalPaymentsList.length > 0 ? finalPaymentsList : payments)

    const payload = {
      maestro: {
        nombre_cliente: client?.nombre,
        documento_cliente: client?.documento,
        subtotal: subtotal,
        descuento: summary.totalDiscounts,
        iva: totalTax,
        total: totalFinal,
        total_recibido: totalReceived,
        saldo_pendiente: pendingBalance,
        saldo_favor_usado: effectiveCreditUsed,
        tipo_pago: paymentType,
        metodo_pago: usedMethods,
        pagos_multiples: serializedPayments,
        moneda: appConfig.moneda,
        formato_numero: appConfig.formato_numero,
        observaciones: notes
      },
      detalles: cart
    }

    const result = await ventasService.createVenta(payload)

    if (result.success) {
      const printData = await ventasService.getDetalleFactura(result.maestroId)
      const generatedInvoice = {
        id: result.maestroId,
        numero_factura: result.numero_factura,
        prefijo: result.prefijo,
        date_created: new Date().toISOString(),
        nombre_cliente: client.nombre,
        documento_cliente: client.documento,
        subtotal: subtotal,
        descuento: summary.totalDiscounts,
        iva: totalTax,
        total_factura: totalFinal,
        total_recibido: totalReceived,
        saldo_pendiente: pendingBalance,
        tipo_pago: paymentType,
        metodo_pago: usedMethods,
        pagos_multiples: serializedPayments,
        moneda: appConfig.moneda,
        formato_numero: appConfig.formato_numero,
        observaciones: notes
      }

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: `Factura ${result.prefijo || ''}${printData.configuracion?.separador || ''}${result.numero_factura} generada. ¿Deseas imprimirla?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-printer me-2"></i>Imprimir',
        cancelButtonText: 'Cerrar'
      }).then((res) => {
        if (res.isConfirmed && printData.success) {
          setInvoiceToPrint(generatedInvoice)
          setDetailsToPrint(printData.data)
          setStoreConfToPrint(printData.configuracion)
          setShowPrintPreview(true)
        }

        loadInitialData()
        cleanForm()
        window.dispatchEvent(new CustomEvent('factura-creada'))
      })
    } else {
      Toast.fire({ icon: 'error', title: 'Error en la venta', text: result.error })
    }
  }

  const cleanForm = () => {
    setCart([])
    setClient(null)
    setAvailableCredit(0)
    setUseCreditBalance(false)
    setCreditAmountInput('')
    setDiscount(0)
    setIsPercentage(true)
    setPayments([{ metodo: paymentMethodsList.length > 0 ? paymentMethodsList[0].nombre : 'Efectivo', monto: '' }])
    setPaymentType('contado')
    setInstallments(1)
    setNotes('')
    setSkuInput('')
    setDocInput('')
    localStorage.removeItem(DRAFT_KEY)
  }

  const updateQuantity = (id, delta, isOrder) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id && i.isEncargo === isOrder)
      if (!item) return prev
      const newQty = item.cantidad + delta

      if (delta > 0 && isOrder === '0' && newQty > item.stock && item.tipo === "producto") {
        const allowOrder = item.allow_encargo !== undefined ? Number(item.allow_encargo) : 1
        if (allowOrder === 0) {
          Toast.fire({ icon: 'warning', title: 'Agotado', text: 'Has alcanzado el límite de stock y este producto no permite encargos.' })
          return prev
        }

        Swal.fire({
          title: 'Sin stock físico',
          text: '¿Deseas agregar las unidades adicionales como un encargo?',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Sí, encargar',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) addToCart(item, true)
        })
        return prev
      }

      return prev.map(i => {
        if (i.id === id && i.isEncargo === isOrder) return newQty > 0 ? { ...i, cantidad: newQty } : i
        return i
      })
    })
  }

  useEffect(() => {
    const handleGlobalEvents = (e) => {
      const target = e.target.closest('button, a') || e.target
      const id = target.getAttribute('data-id')
      const isOrder = target.getAttribute('data-encargo')

      if (e.type === 'change' && id) {
        if (e.target.classList.contains('change-iva')) {
          const val = parseFloat(e.target.value) || 0
          setCart(prev => prev.map(item => (
            String(item.id) === String(id) && item.isEncargo === isOrder
          ) ? { ...item, iva: val } : item))
        }
        if (e.target.classList.contains('change-discount')) {
          const val = parseFloat(e.target.value) || 0
          setCart(prev => prev.map(item => (
            String(item.id) === String(id) && item.isEncargo === isOrder
          ) ? { ...item, descuento: val } : item))
        }
      }

      if (e.type === 'click') {
        if (target.closest('.btn-view-product')) {
          e.preventDefault()
          const link = target.closest('.btn-view-product')
          if (link.dataset.alldata) {
            const selectedProd = JSON.parse(decodeURIComponent(link.dataset.alldata))
            setSelectedProduct(selectedProd)
            setShowProdDetail(true)
          }
        }

        if (target.closest('.toggle-discount-type') && id) {
          setCart(prev => prev.map(item => {
            if (String(item.id) === String(id) && item.isEncargo === isOrder) {
              return { ...item, tipoDescuento: item.tipoDescuento === 'porcentaje' ? 'fijo' : 'porcentaje' }
            }
            return item
          }))
        }

        if (target.closest('.btn-select-product')) {
          const btn = target.closest('.btn-select-product')
          if (btn.dataset.alldata) {
            const selected = JSON.parse(decodeURIComponent(btn.dataset.alldata))
            const forceOrder = btn.dataset.forceEncargo === "1"
            addToCart(selected, forceOrder)
          }
        }

        if (target.closest('.btn-select-client')) {
          const btn = target.closest('.btn-select-client')
          if (btn.dataset.alldata) {
            const selected = JSON.parse(decodeURIComponent(btn.dataset.alldata))
            selectClient(selected)
            handleClose()
          }
        }

        if (target.closest('.btn-qty-plus') && id) updateQuantity(id, 1, isOrder)
        if (target.closest('.btn-qty-minus') && id) updateQuantity(id, -1, isOrder)
        if (target.closest('.btn-remove-item') && id) {
          setCart(prev => prev.filter(item => !(String(item.id) === String(id) && item.isEncargo === isOrder)))
        }
      }
    }

    document.addEventListener('change', handleGlobalEvents)
    document.addEventListener('click', handleGlobalEvents)

    return () => {
      document.removeEventListener('change', handleGlobalEvents)
      document.removeEventListener('click', handleGlobalEvents)
    }
  }, [products, clients, cart])

  if (isLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return <>
    <Row className="justify-content-between mb-3">
      <Col xs={4}>
        <InputGroup>
          <Button variant="primary" onClick={handleSearchProduct}>
            <i className="bi bi-search me-1"></i> Buscar Producto
          </Button>
          <Form.Control
            placeholder="Código de Barras"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchProduct()}
            autoFocus
          />
        </InputGroup>
      </Col>

      <Col xs={5}>
        {!client ? (
          <InputGroup>
            <Button variant="primary" onClick={handleSearchClient}>
              <i className="bi bi-person-add me-1"></i> Buscar Cliente
            </Button>
            <Form.Control
              placeholder="Buscar por documento..."
              value={docInput}
              onChange={(e) => setDocInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClient()}
            />
          </InputGroup>
        ) : (
          <div className="p-2 border rounded bg-light d-flex justify-content-between align-items-center">
            <div>
              <strong>Cliente:</strong> {client.nombre} <br />
              <small className="text-muted">CC: {client.documento}</small>
              {availableCredit > 0 && (
                <div className="mt-1">
                  <span className="badge bg-success bg-opacity-10 text-success border border-success">
                    <i className="bi bi-wallet2 me-1"></i>
                    Saldo a favor: {renderCurrency(availableCredit)}
                  </span>
                </div>
              )}
            </div>
            <Button variant="link" size="sm" className="text-danger" onClick={() => selectClient(null)}>
              Cambiar
            </Button>
          </div>
        )}
      </Col>
    </Row>

    <Row>
      <Col lg={8} xl={9}>
        <div className="d-flex gap-2 mb-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={applyBulkDiscount}
            disabled={cart.length === 0}
          >
            <i className="bi bi-percent me-1"></i>
            Descuento Masivo
          </Button>

          <Button
            variant="outline-danger"
            size="sm"
            onClick={clearCart}
          >
            <i className="bi bi-trash3 me-1"></i>
            Vaciar Formulario
          </Button>
        </div>

        <div className="w-100 pe-2" style={{ minWidth: 0 }}>
          <DataTableComponent
            tableId="dt-facturacion-carrito"
            key={`cart-table-${appConfig.moneda}-${appConfig.formato_numero}`}
            data={cart}
            columns={[
              { data: 'ref_name', title: 'Ref.' },
              {
                data: 'sku',
                title: 'SKU',
                render: (data, type, row) => {
                  if (!data) return '-'
                  const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}`.toUpperCase() : ''
                  const skuVal = String(data).toUpperCase()

                  const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`
                  const safeData = encodeURIComponent(JSON.stringify(row))

                  return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view-product" data-alldata="${safeData}">${finalSku}</a>`
                }
              },
              {
                data: 'ref_name',
                title: 'Stk.',
                render: (data, type, row) => {
                  if (row.tipo === 'servicio') {
                    return `<span class="badge bg-secondary">-</span>`
                  }

                  const minThreshold = row.min_stock !== undefined ? row.min_stock : 5
                  const badgeColor = row.stock <= minThreshold ? 'bg-danger' : 'bg-success'

                  return `
                  <span class="badge ${badgeColor}">
                    ${row.stock}
                  </span>
                `
                }
              },
              {
                data: null,
                title: 'Cant.',
                render: (data, type, row) => `
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary btn-qty-minus" 
                    data-id="${row.id}" data-encargo="${row.isEncargo}">-</button>
                    <span class="btn btn-light disabled">${row.cantidad}</span>
                    <button class="btn btn-outline-secondary btn-qty-plus" 
                    data-id="${row.id}" data-encargo="${row.isEncargo}">+</button>
                  </div>
                `
              },
              {
                data: 'iva',
                title: 'IVA%',
                render: (data, type, row) => `
                  <div class="input-group input-group-sm" style="width: 70px">
                    <input type="number" class="form-control change-iva text-center px-1" 
                          data-id="${row.id}" data-encargo="${row.isEncargo}" value="${row.iva || 0}"> 
                  </div>
                `
              },
              {
                data: 'precio',
                title: 'Precio',
                render: (data, type, row) => renderCurrency(row.precio)
              },
              {
                data: null,
                title: 'Desc.',
                render: (data, type, row) => `
                  <div class="input-group input-group-sm" style="width: 90px">
                    <input type="number" class="form-control change-discount px-1 text-center" 
                          data-id="${row.id}" data-encargo="${row.isEncargo}" value="${row.descuento || 0}">
                    <button class="btn btn-outline-secondary toggle-discount-type px-1" 
                            data-id="${row.id}" data-encargo="${row.isEncargo}">
                      ${row.tipoDescuento === 'porcentaje' ? '%' : getCurrencySymbol(appConfig.moneda)}
                    </button>
                  </div>
                `
              },
              {
                data: null,
                title: 'Tipo',
                render: function (data, type, row) {
                  let badges = ''
                  if (row.tipo === 'producto') badges += '<span class="badge border border-primary text-primary me-1">Producto</span>'
                  else badges += '<span class="badge border border-success text-success me-1">Servicio</span>'
                  if (row.isEncargo > 0) badges += '<span class="badge border border-warning text-dark me-1">Encargo</span>'
                  return badges
                }
              },
              {
                data: null,
                title: 'Total',
                render: (data, type, row) => {
                  const sub = row.precio * row.cantidad
                  const desc = row.tipoDescuento === 'porcentaje' ? sub * (row.descuento / 100) : row.descuento
                  return `<strong>${renderCurrency(sub - desc)}</strong>`
                }
              },
              {
                data: null,
                title: '',
                orderable: false,
                render: (data, type, row) => `
                  <button class="btn btn-sm btn-outline-danger btn-remove-item" 
                          data-id="${row.id}" data-encargo="${row.isEncargo}">
                    <i class="bi bi-trash"></i>
                  </button>
                `
              }
            ]}
          />
        </div>
      </Col>

      <Col lg={4} xl={3}>
        <div className="card shadow-sm" style={{ position: 'sticky', top: '85px', zIndex: 10 }}>
          <div className="card-body">
            <h5 className="card-title mb-3">Resumen de Venta</h5>

            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <span>{renderCurrency(subtotal)}</span>
            </div>

            {summary.totalDiscounts > 0 && (
              <div className="d-flex justify-content-between mb-2 text-danger font-italic">
                <span>Total Descuentos:</span>
                <span>-{renderCurrency(summary.totalDiscounts)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between mb-2 border-top pt-2">
              <strong>Subtotal Neto:</strong>
              <strong>{renderCurrency(netSubtotal)}</strong>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted">
              <span>IVA:</span>
              <span>{renderCurrency(totalTax)}</span>
            </div>

            <hr />
            <div className="d-flex justify-content-between mb-3">
              <span className="h5">Total:</span>
              <span className="h5 text-primary">{renderCurrency(totalFinal)}</span>
            </div>

            {availableCredit > 0 && (
              <div className="p-2 mb-3 border border-success rounded bg-success bg-opacity-10">
                <Form.Check
                  type="switch"
                  id="use-credit-balance-switch"
                  className="fw-bold text-success small"
                  label={`Usar Saldo a Favor (${renderCurrency(availableCredit)})`}
                  checked={useCreditBalance}
                  disabled={totalFinal <= 0}
                  onChange={(e) => handleToggleCreditBalance(e.target.checked)}
                />

                {useCreditBalance && (
                  <div className="mt-2">
                    <InputGroup size="sm">
                      <InputGroup.Text className="text-success px-2">
                        <small>{getCurrencySymbol(appConfig.moneda)}</small>
                      </InputGroup.Text>
                      <Form.Control
                        type="number"
                        min="0"
                        max={maxUsableCredit}
                        placeholder="Saldo a aplicar"
                        value={creditAmountInput}
                        onChange={(e) => handleCreditInputChange(e.target.value)}
                      />
                      <Button
                        variant="outline-success"
                        onClick={() => setCreditAmountInput(String(maxUsableCredit))}
                      >
                        Máx
                      </Button>
                    </InputGroup>
                    <div className="d-flex justify-content-between small text-muted mt-1">
                      <span>Saldo restante cliente:</span>
                      <strong className="text-success">{renderCurrency(remainingCreditAfterSale)}</strong>
                    </div>
                    {remainingAfterCredit > 0 && (
                      <div className="d-flex justify-content-between small text-dark mt-1">
                        <span>Restante por pagar:</span>
                        <strong>{renderCurrency(remainingAfterCredit)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Row className="mb-2">
              <Col xs={12}>
                <Form.Group className="mb-2">
                  <Form.Label><small className="fw-bold">Tipo de Facturación</small></Form.Label>
                  <Form.Select size="sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                    <option value="contado">Venta de Contado</option>
                    <option value="credito">Venta a Crédito / Con Saldo Pendiente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div>
              <Form.Label className="fw-bold d-block"><small>Métodos de Pago</small></Form.Label>

              {remainingAfterCredit === 0 && effectiveCreditUsed > 0 ? (
                <div className="alert alert-success py-2 px-2 small mb-2">
                  <i className="bi bi-check-circle me-1"></i>
                  Factura cubierta totalmente con Saldo a Favor.
                </div>
              ) : (
                <>
                  {payments.map((payment, index) => (
                    <div key={index} className="p-2 mb-2 bg-white border rounded shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted fw-bold">Pago {index + 1}</span>
                        {payments.length > 1 && (
                          <Button variant="link" size="sm" className="text-danger p-0 text-decoration-none" onClick={() => removePayment(index)}>
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </div>
                      <Form.Select
                        size="sm"
                        className="mb-2"
                        value={payment.metodo}
                        onChange={(e) => updatePayment(index, 'metodo', e.target.value)}
                      >
                        {paymentMethodsList.length === 0 && <option value="Efectivo">Efectivo</option>}
                        {paymentMethodsList.map(m => (
                          <option key={m.id} value={m.nombre}>{m.nombre}</option>
                        ))}
                      </Form.Select>

                      <InputGroup size="sm">
                        <InputGroup.Text className="text-muted px-2"><small>{getCurrencySymbol(appConfig.moneda)}</small></InputGroup.Text>
                        <Form.Control
                          type="number"
                          min="0"
                          placeholder={effectiveCreditUsed > 0 ? `Restante: ${remainingAfterCredit}` : 'Monto a recibir'}
                          value={payment.monto}
                          onChange={(e) => updatePayment(index, 'monto', e.target.value)}
                        />
                      </InputGroup>
                    </div>
                  ))}

                  <div className="text-center mt-2">
                    <Button variant="link" size="sm" className="text-decoration-none p-0 fw-bold" onClick={addPayment}>
                      <i className="bi bi-plus-circle me-1"></i> Añadir método de pago
                    </Button>
                  </div>
                </>
              )}
            </div>

            {changeAmount > 0 && (
              <div className="d-flex justify-content-between mb-3 text-success">
                <strong>Cambio a devolver:</strong>
                <strong className="fs-5">{renderCurrency(changeAmount)}</strong>
              </div>
            )}

            {totalReceived > 0 && totalReceived < totalFinal && (
              <div className="d-flex justify-content-between mb-3 text-warning">
                <strong>Saldo pendiente (Deuda):</strong>
                <strong>{renderCurrency(pendingBalance)}</strong>
              </div>
            )}

            <Form.Group className="mb-3 border-top pt-3">
              <Form.Label><small className="fw-bold">Observaciones en factura</small></Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                placeholder=""
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>

            {paymentType === 'credito' && (
              <Form.Group className="mb-3 animate__animated animate__fadeIn bg-light p-2 rounded">
                <Form.Label><small className="text-danger fw-bold">Plazo en Días para pagar</small></Form.Label>
                <InputGroup size="sm">
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={installments}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        setInstallments('')
                      } else if (/^\d+$/.test(val)) {
                        setInstallments(parseInt(val, 10))
                      }
                    }}
                  />
                  <InputGroup.Text>Días</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">Aplica para saldos pendientes</Form.Text>
              </Form.Group>
            )}

            <Button
              variant="success"
              size="lg"
              className="w-100 mt-2 shadow-sm"
              disabled={cart.length === 0}
              onClick={finalizeSale}
            >
              <i className="bi bi-check-circle me-2"></i>
              Generar Factura
            </Button>
          </div>
        </div>
      </Col>
    </Row>

    <ModalBusquedaVentas
      show={show}
      handleClose={handleClose}
      modalData={modalData}
      filterCategory={filterCategory}
      setFilterCategory={setFilterCategory}
      filterTag={filterTag}
      setFilterTag={setFilterTag}
      categoriasList={categoriesList}
      etiquetasList={tagsList}
      appConfig={appConfig}
      clientes={clients}
      isUnder={showProdDetail}
    />

    <ImpresorFactura
      show={showPrintPreview}
      onClose={handleClosePrintPreview}
      factura={invoiceToPrint}
      detalles={detailsToPrint}
      almacenConf={storeConfToPrint}
      textoVolver="Volver a Facturación"
    />

    <ModalTercero
      show={showTerceroModal}
      handleClose={() => setShowTerceroModal(false)}
      forceCliente={true}
      initialDocument={docInput.trim()}
      onSuccess={async () => {
        setShowTerceroModal(false)
        const updatedClients = await ventasService.getClientes()
        setClients(updatedClients)

        const newlyCreated = updatedClients.find(c => c.documento === docInput.trim())
        if (newlyCreated) {
          selectClient(newlyCreated)
          setDocInput('')
          Toast.fire({ icon: 'success', title: '¡Listo!', text: 'Cliente asignado a la factura.' })
        }
      }}
    />

    <ProductoDetalles
      show={showProdDetail}
      handleClose={() => setShowProdDetail(false)}
      productoData={selectedProduct}
      appConfig={appConfig}
    />
  </>
}