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

export const Facturacion = () => {
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carrito, setCarrito] = useState([])
  const [show, setShow] = useState(false)
  const [cliente, setCliente] = useState(null)
  const [modalData, setModalData] = useState({ title: '', columns: [], type: '' })
  const [descuento, setDescuento] = useState(0)
  const [esPorcentaje, setEsPorcentaje] = useState(true)

  const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  const valorDescuento = esPorcentaje
    ? subtotal * (descuento / 100)
    : descuento

  const resumen = carrito.reduce((acc, item) => {
    const bruto = item.precio * item.cantidad;
    const ahorro = item.tipoDescuento === 'porcentaje'
      ? bruto * (item.descuento / 100)
      : item.descuento * item.cantidad

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

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  const loadProductos = async () => {
    const data = await window.api.getProductos()
    setProductos(data)
  }

  const loadClientes = async () => {
    const data = await window.api.getClientes()
    setClientes(data)
  }

  const handleAddProduct = () => {
    loadProductos()
    setModalData({
      type: 'producto',
      title: 'Agregar Producto',
      columns: [
        { data: 'ref_name', title: 'Nombre Referencia' },
        { data: 'sku', title: 'SKU' },
        { data: 'precio', title: 'Precio' },
        {
          data: null,
          title: 'Agregar',
          render: function (data, type, row) {
            return `<button class="btn btn-sm btn-primary btn-select-product" data-id="${row.id}">
                    + Añadir
                  </button>`;
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
          ...item,
          descuento: pct,
          tipoDescuento: 'porcentaje'
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
        setCarrito([]);
        setDescuento(0);
        setCliente(null);
      }
    });
  };

  const handleAddClient = () => {
    loadClientes()
    setModalData({
      type: 'cliente',
      title: 'Agregar cliente',
      columns: [
        { data: 'nombre', title: 'Nombre' },
        { data: 'documento', title: 'Documento' },
        { data: 'telefono', title: 'Telefono' },
        {
          data: null,
          title: 'Agregar',
          render: function (data, type, row) {
            return `
                  <button class="btn btn-sm btn-success btn-select-client" data-id="${row.id}">
                    Agregar
                  </button>
                  `;
          }
        }
      ]
    })
    handleShow()
  }

  const agregarAlCarrito = (prod) => {
    setCarrito((prev) => {
      const existe = prev.find(item => item.id === prod.id);

      const currentQty = existe ? existe.cantidad : 0;
      if (currentQty >= prod.stock) {
        Swal.fire('Sin Stock', `Solo hay ${prod.stock} unidades disponibles de ${prod.ref_name}`, 'warning');
        return prev;
      }

      if (existe) {
        return prev.map(item =>
          item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      } else {
        return [...prev, { ...prod, cantidad: 1, descuento: 0, tipoDescuento: 'porcentaje', iva: prod.iva }];
      }
    });
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return

    const data = {
      maestro: {
        numero_factura: Date.now(),
        nombre_cliente: cliente?.nombre,
        documento_cliente: cliente?.documento,
        subtotal: subtotal,
        descuento: valorDescuento,
        iva: ivaTotal,
        total: totalFinal
      },
      detalles: carrito
    };

    const result = await window.api.createVenta(data)

    if (result.success) {
      Swal.fire('Venta exitosa', `Factura #${data.maestro.numero_factura} creada`, 'success')
      setCarrito([])
      loadProductos()
      setDescuento(0);
      cleanForm();
    } else {
      Swal.fire('Error', result.error, 'error')
    }
  }

  const cleanForm = () => {
    setCarrito([]);
    setCliente(null);
  };

  const updateQuantity = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.cantidad + delta;

        if (delta > 0 && newQty > item.stock) {
          Swal.fire('Límite alcanzado', 'No hay más unidades en inventario', 'info');
          return item;
        }

        return newQty > 0 ? { ...item, cantidad: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val);

  useEffect(() => {
    const handleGlobalClicks = (e) => {
      const id = e.target.getAttribute('data-id') || e.target.closest('button')?.getAttribute('data-id');
      if (!id) return;

      if (e.target.classList.contains('change-iva')) {
        const val = parseFloat(e.target.value) || 0;
        setCarrito(prev => prev.map(item =>
          String(item.id) === String(id) ? { ...item, iva: val } : item
        ));
      }

      if (e.target.closest('.btn-select-product')) {
        const selected = productos.find(p => String(p.id) === String(id));
        if (selected) agregarAlCarrito(selected);
      }

      if (e.target.closest('.btn-select-client')) {
        const selected = clientes.find(c => String(c.id) === String(id));
        if (selected) {
          setCliente(selected);
          handleClose();
        }
      }

      if (e.target.classList.contains('change-discount')) {
        const val = parseFloat(e.target.value) || 0;

        setCarrito(prev => prev.map(item =>
          String(item.id) === String(id) ? { ...item, descuento: val } : item
        ));
      }

      if (e.target.closest('.toggle-discount-type')) {
        setCarrito(prev => prev.map(item => {
          if (String(item.id) === String(id)) {
            return {
              ...item,
              tipoDescuento: item.tipoDescuento === 'porcentaje' ? 'fijo' : 'porcentaje'
            };
          }
          return item;
        }));
      }

      if (e.target.closest('.btn-qty-plus')) updateQuantity(id, 1);
      if (e.target.closest('.btn-qty-minus')) updateQuantity(id, -1);
      if (e.target.closest('.btn-remove-item')) {
        removeItem(id);
      }
    };
    document.addEventListener('input', handleGlobalClicks);
    document.addEventListener('click', handleGlobalClicks);
    return () => {
      document.addEventListener('input', handleGlobalClicks);
      document.removeEventListener('click', handleGlobalClicks)
    }
  }, [productos, clientes, carrito]);

  return <>

    <Row className="justify-content-between">
      <Col xs={4}>
        <InputGroup className="mb-3">
          <Button variant="primary" onClick={handleAddProduct}>
            Agregar Producto</Button>
          <Form.Control
            placeholder="Código SKU"
          />
        </InputGroup>
      </Col>

      <Col xs={5}>
        {!cliente ? (
          <InputGroup>
            <Button variant="primary" onClick={handleAddClient}>
              Agregar Cliente
            </Button>
            <Form.Control placeholder="Buscar por documento..." />
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

    <Row className="mb-3">
      <Col className="d-flex gap-2">
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
      </Col>
    </Row>

    <DataTableComponent
      data={carrito}
      columns={[
        { data: 'ref_name', title: 'Referencia' },
        { data: 'sku', title: 'SKU' },
        {
          data: 'ref_name',
          title: 'Stock',
          render: (data, type, row) => `
      <span class="badge ${row.stock < 5 ? 'bg-danger' : 'bg-info'}">
        ${row.stock}
      </span>
    </div>
  `
        },
        {
          data: null,
          title: 'Cantidad',
          render: (data, type, row) => `
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-qty-minus" data-id="${row.id}">-</button>
          <span class="btn btn-light disabled" style="width: 40px">${row.cantidad}</span>
          <button class="btn btn-outline-secondary btn-qty-plus" data-id="${row.id}">+</button>
        </div>
      `
        },
        {
          data: 'iva',
          title: 'IVA %',
          render: (data, type, row) => `
    <div class="input-group input-group-sm" style="width: 80px">
      <input type="number" class="form-control change-iva text-center" 
             data-id="${row.id}" value="${row.iva || 0}">
      <span class="input-group-text">%</span>
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
          title: 'Descuento',
          render: (data, type, row) => `
    <div class="input-group input-group-sm" style="width: 120px">
      <input type="number" class="form-control change-discount" 
             data-id="${row.id}" value="${row.descuento || 0}">
      <button class="btn btn-outline-secondary toggle-discount-type" data-id="${row.id}">
        ${row.tipoDescuento === 'porcentaje' ? '%' : '$'}
      </button>
    </div>
  `
        },
        {
          data: null,
          title: 'Total',
          render: (data, type, row) => {
            const sub = row.precio * row.cantidad;
            const desc = row.tipoDescuento === 'porcentaje'
              ? sub * (row.descuento / 100)
              : row.descuento;
            return `<strong>${formatCurrency(sub - desc)}</strong>`;
          }
        },
        {
          data: null,
          title: 'Actions',
          orderable: false,
          render: function (data, type, row) {
            return `
            <button class="btn btn-sm btn-danger btn-remove-item" data-id="${row.id}">
          <i class="bi bi-trash"></i>
        </button>
            `;
          }
        }
      ]}
    />

    <Row className="mt-4 justify-content-end">
      <Col md={4}>
        <div className="card shadow-sm mt-3">
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
            <div className="d-flex justify-content-between mb-4">
              <span className="h5">Total:</span>
              <span className="h5 text-primary">{formatCurrency(totalFinal)}</span>
            </div>

            <Button
              variant="success"
              size="lg"
              className="w-100"
              disabled={carrito.length === 0}
              onClick={finalizarVenta}
            >
              <i className="bi bi-cash-stack me-2"></i>
              Finalizar Factura
            </Button>
          </div>
        </div>
      </Col >
    </Row >

    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{modalData.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {show && (
          <DataTableComponent
            key={modalData.type}
            data={modalData.type === 'producto' ? productos : clientes}
            columns={modalData.columns}
          />
        )}

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>

  </>
}