import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import {
  Button,
  InputGroup,
  Form,
  Row,
  Col
} from 'react-bootstrap'
import Modal from 'react-bootstrap/Modal'
import { ImpresorFactura } from './components/ImpresorFactura'

export const Facturacion = () => {
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carrito, setCarrito] = useState([])
  const [show, setShow] = useState(false)
  const [cliente, setCliente] = useState(null)
  const [modalData, setModalData] = useState({ title: '', columns: [], type: '' })
  const [descuento, setDescuento] = useState(0)
  const [esPorcentaje, setEsPorcentaje] = useState(true)
  
  const [tipoPago, setTipoPago] = useState('contado')
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  
  const [cuotas, setCuotas] = useState(1)
  const [totalRecibido, setTotalRecibido] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [docInput, setDocInput] = useState('')

  const [showPreviewImpresion, setShowPreviewImpresion] = useState(false);
  const [facturaParaImprimir, setFacturaParaImprimir] = useState(null);
  const [detallesParaImprimir, setDetallesParaImprimir] = useState([]);
  const [almacenConfParaImprimir, setAlmacenConfParaImprimir] = useState(null);

  const [categoriasList, setCategoriasList] = useState([])
  const [etiquetasList, setEtiquetasList] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const loadInitialData = async () => {
    const prods = await window.api.getAllProductos();
    setProductos(prods);

    const clis = await window.api.getClientes();
    setClientes(clis);

    const cats = await window.api.getCategorias();
    const tags = await window.api.getEtiquetas();
    setCategoriasList(cats || []);
    setEtiquetasList(tags || []);
  }

  useEffect(() => {
    loadInitialData();
  }, [])


  const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
  const valorDescuento = esPorcentaje ? subtotal * (descuento / 100) : descuento

  const resumen = carrito.reduce((acc, item) => {
    const bruto = item.precio * item.cantidad;
    const ahorro = item.tipoDescuento === 'porcentaje' ? bruto * (item.descuento / 100) : item.descuento * item.cantidad
    const baseIndividual = bruto - ahorro
    const tasaIva = (Number(item.iva) || 0) / 100;
    const ivaIndividual = baseIndividual * tasaIva;

    acc.subtotal += bruto;
    acc.totalDescuentos += ahorro;
    acc.totalIva += ivaIndividual;
    acc.totalFinal += (baseIndividual + ivaIndividual);
    return acc
  }, { subtotal: 0, totalDescuentos: 0, totalIva: 0, totalFinal: 0 })

  const subtotalNeto = resumen.subtotal - resumen.totalDescuentos;
  const ivaTotal = resumen.totalIva;
  const totalFinal = resumen.totalFinal;
  const recibidoNum = parseFloat(totalRecibido) || 0;
  const cambio = recibidoNum >= totalFinal ? recibidoNum - totalFinal : 0;
  const saldoPendiente = recibidoNum < totalFinal ? totalFinal - recibidoNum : 0;

  const handleClose = () => {
    setShow(false);
    setFilterCategory('');
    setFilterTag('');
  }
  const handleShow = () => setShow(true)

  const handleClosePreviewImpresion = () => {
    setShowPreviewImpresion(false);
    setFacturaParaImprimir(null);
    setDetallesParaImprimir([]);
    setAlmacenConfParaImprimir(null);
  }


  const handleSearchProduct = async () => {
    if (!skuInput.trim()) {
      handleAddProduct();
      return;
    }
    
    let currentProducts = productos;
    if (currentProducts.length === 0) {
      currentProducts = await window.api.getAllProductos();
      setProductos(currentProducts);
    }

    const searchStr = skuInput.trim().toLowerCase();

    const found = currentProducts.find(p => {
      if (!p.sku) return false;
      const fullSku = p.sku_prefix ? `${p.sku_prefix}${p.separador || ''}${p.sku}` : p.sku;
      return fullSku.toLowerCase() === searchStr || p.sku.toLowerCase() === searchStr;
    });
    
    if (found) {
      agregarAlCarrito(found);
      setSkuInput('');
    } else {
      handleAddProduct();
    }
  }

  const handleSearchClient = async () => {
    if (!docInput.trim()) {
      handleAddClient();
      return;
    }

    let currentClients = clientes;
    if (currentClients.length === 0) {
      currentClients = await window.api.getClientes();
      setClientes(currentClients);
    }

    const found = currentClients.find(c => c.documento === docInput.trim());
    
    if (found) {
      setCliente(found);
      setDocInput(''); 
    } else {
      handleAddClient();
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
            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
            return data ? `<strong>${prefix}${data.toUpperCase()}</strong>` : '-';
          }
        },
        { data: 'stock', title: 'Stock' },
        { 
          data: 'precio', 
          title: 'Precio',
          render: (data) => `$${parseFloat(data||0).toLocaleString('es-CO')}`
        },
        {
          data: null,
          title: 'Agregar',
          orderable: false,
          render: function (data, type, row) {
            const safeData = encodeURIComponent(JSON.stringify(row));
            return `<button class="btn btn-sm btn-primary btn-select-product" data-alldata="${safeData}">
              <i class="bi bi-cart-plus me-1"></i> ${row.stock > 0 ? "Agregar" : "Encargar"}
            </button>`;
          }
        }
      ]
    })
    handleShow()
  }

  const handleAddClient = () => {
    setModalData({
      type: 'cliente',
      title: 'Seleccionar Cliente',
      columns: [
        { data: 'nombre', title: 'Nombre' },
        { data: 'documento', title: 'Documento' },
        { data: 'telefono', title: 'Telefono' },
        {
          data: null,
          title: 'Agregar',
          render: function (data, type, row) {
            const safeData = encodeURIComponent(JSON.stringify(row));
            return `
                  <button class="btn btn-sm btn-success btn-select-client" data-alldata="${safeData}">
                    Agregar
                  </button>
                  `;
          }
        }
      ]
    })
    handleShow()
  }

  const aplicarDescuentoMasivo = () => {
    if (carrito.length === 0) return;
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
        const pct = parseFloat(result.value);
        setCarrito(prev => prev.map(item => ({
          ...item, descuento: pct, tipoDescuento: 'porcentaje'
        })));
        Swal.fire('Aplicado', `${pct}% de descuento aplicado a la carreta`, 'success');
      }
    });
  };

  const vaciarCarrito = () => {
    Swal.fire({
      title: '¿Vaciar carrito?',
      text: "Se eliminarán todos los productos de la preventa.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        cleanForm();
      }
    });
  };

  const agregarAlCarrito = (prod) => {
    setCarrito((prev) => {
      const unitsInCartWithStock = prev
        .filter(item => item.id === prod.id && item.isEncargo === '0')
        .reduce((acc, item) => acc + item.cantidad, 0);

      const needsToBeEncargo = prod.tipo === "producto" && unitsInCartWithStock >= prod.stock;
      const isEncargoVal = needsToBeEncargo ? '1' : '0';

      const existe = prev.find(item => item.id === prod.id && item.isEncargo === isEncargoVal);

      if (existe) {
        if (isEncargoVal === '0' && (existe.cantidad + 1) > prod.stock) {
          return [...prev, { ...prod, cantidad: 1, descuento: 0, tipoDescuento: 'porcentaje', iva: prod.iva, isEncargo: '1' }];
        }

        return prev.map(item =>
          (item.id === prod.id && item.isEncargo === isEncargoVal)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [...prev, { ...prod, cantidad: 1, descuento: 0, tipoDescuento: 'porcentaje', iva: prod.iva, isEncargo: isEncargoVal }];
      }
    });
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return

    if (!cliente) {
      Swal.fire({ icon: 'warning', title: 'Falta el Cliente', text: 'Por favor seleccione o busque un cliente.' });
      return;
    }

    if (recibidoNum < totalFinal) {
      if (tipoPago === 'contado') {
        Swal.fire('Atención', 'El cliente no ha entregado el monto completo. Si es un abono, cambie el "Tipo de Pago" a Crédito.', 'warning');
        return;
      }
      if (tipoPago === 'credito') {
        const confirm = await Swal.fire({
          title: 'Venta con saldo pendiente',
          text: '¿Esta venta irá a la sección de cartera, seguro que desea guardar la factura?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, guardar',
          cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
      }
    }

    const data = {
      maestro: {
        nombre_cliente: cliente?.nombre, documento_cliente: cliente?.documento,
        subtotal: subtotal, descuento: valorDescuento, iva: ivaTotal, total: totalFinal,
        total_recibido: recibidoNum, saldo_pendiente: saldoPendiente,
        tipo_pago: tipoPago, metodo_pago: metodoPago,
      },
      detalles: carrito
    };

    const result = await window.api.createVenta(data)

    if (result.success) {
      const printData = await window.api.getDetalle(result.maestroId);
      const facturaGenerada = {
          id: result.maestroId, numero_factura: result.numero_factura, prefijo: result.prefijo,
          date_created: new Date().toISOString(), nombre_cliente: cliente.nombre, documento_cliente: cliente.documento,
          subtotal: subtotal, descuento: valorDescuento, iva: ivaTotal, total_factura: totalFinal,
          total_recibido: recibidoNum, saldo_pendiente: saldoPendiente, tipo_pago: tipoPago, metodo_pago: metodoPago
      };

      Swal.fire({
          title: '¡Venta Exitosa!',
          text: `Factura ${result.prefijo || ''}${printData.configuracion?.separador || ''}${result.numero_factura} generada. ¿Deseas imprimirla?`,
          icon: 'success', showCancelButton: true, confirmButtonColor: '#198754', cancelButtonColor: '#6c757d',
          confirmButtonText: '<i class="bi bi-printer me-2"></i>Imprimir', cancelButtonText: 'Cerrar'
      }).then((res) => {
          if (res.isConfirmed && printData.success) {
              setFacturaParaImprimir(facturaGenerada);
              setDetallesParaImprimir(printData.data);
              setAlmacenConfParaImprimir(printData.configuracion);
              setShowPreviewImpresion(true);
          }
          
          loadInitialData();
          cleanForm();
          window.dispatchEvent(new CustomEvent('factura-creada'));
      });
    } else {
      Swal.fire('Error', result.error, 'error')
    }
  }

  const cleanForm = () => {
    setCarrito([]); setCliente(null); setDescuento(0);
    setTotalRecibido(''); setTipoPago('contado'); setMetodoPago('Efectivo');
  };

  const updateQuantity = (id, delta, isEncargo) => {
    setCarrito(prev => {
      const item = prev.find(i => i.id === id && i.isEncargo === isEncargo);
      if (!item) return prev;
      const newQty = item.cantidad + delta;

      if (delta > 0 && isEncargo === '0' && newQty > item.stock && item.tipo === "producto") {
        Swal.fire({
          title: 'Sin stock físico', text: '¿Deseas agregar las unidades adicionales como un encargo?',
          icon: 'info', showCancelButton: true, confirmButtonText: 'Sí, encargar', cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) agregarAlCarrito(item);
        });
        return prev;
      }

      return prev.map(i => {
        if (i.id === id && i.isEncargo === isEncargo) return newQty > 0 ? { ...i, cantidad: newQty } : i;
        return i;
      });
    });
  };
  
  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  useEffect(() => {
    const handleGlobalEvents = (e) => {
      const target = e.target.closest('button') || e.target;
      const id = target.getAttribute('data-id');
      const isEncargo = target.getAttribute('data-encargo');

      if (e.type === 'change' && id) {
        if (e.target.classList.contains('change-iva')) {
          const val = parseFloat(e.target.value) || 0;
          setCarrito(prev => prev.map(item => (String(item.id) === String(id) && item.isEncargo === isEncargo) ? { ...item, iva: val } : item));
        }
        if (e.target.classList.contains('change-discount')) {
          const val = parseFloat(e.target.value) || 0;
          setCarrito(prev => prev.map(item => (String(item.id) === String(id) && item.isEncargo === isEncargo) ? { ...item, descuento: val } : item));
        }
      }

      if (e.type === 'click') {
        if (target.closest('.toggle-discount-type') && id) {
          setCarrito(prev => prev.map(item => {
            if (String(item.id) === String(id) && item.isEncargo === isEncargo) {
              return { ...item, tipoDescuento: item.tipoDescuento === 'porcentaje' ? 'fijo' : 'porcentaje' };
            }
            return item;
          }));
        }

        if (target.closest('.btn-select-product')) {
          const btn = target.closest('.btn-select-product');
          if (btn.dataset.alldata) {
            const selected = JSON.parse(decodeURIComponent(btn.dataset.alldata));
            agregarAlCarrito(selected);
          }
        }

        if (target.closest('.btn-select-client')) {
          const btn = target.closest('.btn-select-client');
          if (btn.dataset.alldata) {
             const selected = JSON.parse(decodeURIComponent(btn.dataset.alldata));
             setCliente(selected);
             handleClose();
          }
        }

        if (target.closest('.btn-qty-plus') && id) updateQuantity(id, 1, isEncargo);
        if (target.closest('.btn-qty-minus') && id) updateQuantity(id, -1, isEncargo);
        if (target.closest('.btn-remove-item') && id) {
          setCarrito(prev => prev.filter(item => !(String(item.id) === String(id) && item.isEncargo === isEncargo)));
        }
      }
    };

    document.addEventListener('change', handleGlobalEvents);
    document.addEventListener('click', handleGlobalEvents);

    return () => {
      document.removeEventListener('change', handleGlobalEvents);
      document.removeEventListener('click', handleGlobalEvents);
    }
  }, [productos, clientes, carrito]);

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
        {!cliente ? (
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
              <strong>Cliente:</strong> {cliente.nombre} <br />
              <small className="text-muted">CC: {cliente.documento}</small>
            </div>
            <Button variant="link" size="sm" className="text-danger" onClick={() => setCliente(null)}>
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
            onClick={aplicarDescuentoMasivo}
            disabled={carrito.length === 0}
          >
            <i className="bi bi-percent me-1"></i>
            Descuento Masivo
          </Button>

          <Button
            variant="outline-danger"
            size="sm"
            onClick={vaciarCarrito}
            disabled={carrito.length === 0}
          >
            <i className="bi bi-trash3 me-1"></i>
            Vaciar Carrito
          </Button>
        </div>

        <div className="w-100 pe-2" style={{ minWidth: 0 }}>
          <DataTableComponent
            data={carrito}
            columns={[
            { data: 'ref_name', title: 'Ref.' },
              { 
                data: 'sku', 
                title: 'SKU',
                render: (data, type, row) => {
                  const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                  return data ? `<strong>${prefix}${data.toUpperCase()}</strong>` : '-';
                }
              },
              {
                data: 'ref_name',
                title: 'Stk.',
                render: (data, type, row) => `
                  <span class="badge ${row.stock < 5 ? 'bg-danger' : 'bg-info'}">
                    ${row.stock}
                  </span>
                `
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
                render: (val) => `$${(Number(val)).toLocaleString()}`
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
                      ${row.tipoDescuento === 'porcentaje' ? '%' : '$'}
                    </button>
                  </div>
                `
              },
              {
                data: null,
                title: 'Tipo',
                render: function (data, type, row) {
                  let badges = '';
                  if (row.tipo === 'producto') badges += '<span class="badge bg-primary me-1">Producto</span>';
                  else badges += '<span class="badge bg-success me-1">Servicio</span>';
                  if (row.isEncargo > 0) badges += '<span class="badge bg-warning text-dark me-1">Encargo</span>';
                  return badges;
                }
              },
              {
                data: null,
                title: 'Total',
                render: (data, type, row) => {
                  const sub = row.precio * row.cantidad;
                  const desc = row.tipoDescuento === 'porcentaje' ? sub * (row.descuento / 100) : row.descuento;
                  return `<strong>${formatCurrency(sub - desc)}</strong>`;
                }
              },
              {
                data: null,
                title: '',
                orderable: false,
                render: (data, type, row) => `
                  <button class="btn btn-sm btn-danger btn-remove-item" 
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
        <div className="card shadow-sm sticky-top" style={{ top: '20px' }}>
          <div className="card-body">
            <h5 className="card-title mb-3">Resumen de Venta</h5>

            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {resumen.totalDescuentos > 0 && (
              <div className="d-flex justify-content-between mb-2 text-danger font-italic">
                <span>Total Descuentos:</span>
                <span>-{formatCurrency(resumen.totalDescuentos)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between mb-2 border-top pt-2">
              <strong>Subtotal Neto:</strong>
              <strong>{formatCurrency(subtotalNeto)}</strong>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted">
              <span>IVA:</span>
              <span>{formatCurrency(ivaTotal)}</span>
            </div>

            <hr />
            <div className="d-flex justify-content-between mb-3">
              <span className="h5">Total:</span>
              <span className="h5 text-primary">{formatCurrency(totalFinal)}</span>
            </div>

            <Form.Group className="mb-3 bg-light p-2 rounded">
              <Form.Label className="fw-bold"><small>Dinero Recibido</small></Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  min="0"
                  value={totalRecibido}
                  onChange={(e) => setTotalRecibido(e.target.value)}
                />
              </InputGroup>
            </Form.Group>

            {recibidoNum > totalFinal && (
              <div className="d-flex justify-content-between mb-3 text-success">
                <strong>Cambio a devolver:</strong>
                <strong className="fs-5">{formatCurrency(cambio)}</strong>
              </div>
            )}

            {recibidoNum > 0 && recibidoNum < totalFinal && (
              <div className="d-flex justify-content-between mb-3 text-warning">
                <strong>Saldo pendiente (Deuda):</strong>
                <strong>{formatCurrency(saldoPendiente)}</strong>
              </div>
            )}

            <Row className="border-top pt-3">
                <Col xs={6}>
                    <Form.Group className="mb-3">
                    <Form.Label><small className="fw-bold">Tipo de Pago</small></Form.Label>
                    <Form.Select size="sm" value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
                        <option value="contado">Contado</option>
                        <option value="credito">Crédito</option>
                    </Form.Select>
                    </Form.Group>
                </Col>
                <Col xs={6}>
                    <Form.Group className="mb-3">
                    <Form.Label><small className="fw-bold">Método</small></Form.Label>
                    <Form.Select size="sm" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Datafono">Datafono</option>
                        <option value="Transaccion Bancaria">Transacción</option>
                    </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            {tipoPago === 'credito' && (
              <Form.Group className="mb-3 animate__animated animate__fadeIn bg-light p-2 rounded">
                <Form.Label><small className="text-danger fw-bold">Plazo en Días para pagar</small></Form.Label>
                <InputGroup size="sm">
                  <Form.Control type="number" min="1" max="72" value={cuotas} onChange={(e) => setCuotas(Math.max(1, parseInt(e.target.value) || 1))} />
                  <InputGroup.Text>Días</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">Aplica para saldos pendientes</Form.Text>
              </Form.Group>
            )}

            <Button
              variant="success"
              size="lg"
              className="w-100 mt-2 shadow-sm"
              disabled={carrito.length === 0}
              onClick={finalizarVenta}
            >
              <i className="bi bi-check-circle me-2"></i>
              Generar Factura
            </Button>
          </div>
        </div>
      </Col>
    </Row>

    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fs-5">{modalData.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        
        {show && modalData.type === 'producto' && (
          <>
            <div className="bg-light p-3 rounded mb-3 border">
              <Row className="align-items-end">
                <Col md={5}>
                  <Form.Group>
                    <Form.Label className="fw-bold"><small>Categoría:</small></Form.Label>
                    <Form.Select size="sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                      <option value="">Todas</option>
                      {categoriasList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group>
                    <Form.Label className="fw-bold"><small>Etiqueta:</small></Form.Label>
                    <Form.Select size="sm" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                      <option value="">Todas</option>
                      {etiquetasList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Button variant="outline-secondary" size="sm" className="w-100" onClick={() => { setFilterCategory(''); setFilterTag(''); }} disabled={!filterCategory && !filterTag}>
                    <i className="bi bi-x-circle me-1"></i>Limpiar
                  </Button>
                </Col>
              </Row>
            </div>

            <div className="w-100 overflow-hidden">
                <DataTableComponent
                  key={`prod-modal-${filterCategory}-${filterTag}`}
                  ajaxData={(params) => {
                    params.customCategory = filterCategory;
                    params.customTag = filterTag;
                    return window.api.getProductosPaginados(params); 
                  }}
                  columns={modalData.columns}
                />
            </div>
          </>
        )}

        {show && modalData.type === 'cliente' && (
          <div className="w-100 overflow-hidden">
            <DataTableComponent
              key={modalData.type}
              data={clientes}
              columns={modalData.columns}
            />
          </div>
        )}

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>

    <ImpresorFactura 
        show={showPreviewImpresion} 
        onClose={handleClosePreviewImpresion} 
        factura={facturaParaImprimir} 
        detalles={detallesParaImprimir} 
        almacenConf={almacenConfParaImprimir} 
        textoVolver="Volver a Facturación" 
    />

  </>
}