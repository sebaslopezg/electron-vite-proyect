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
  const [carrito, setCarrito] = useState([])
  const [show, setShow] = useState(false)
  const [cliente, setCliente] = useState({ nombre: 'Consumidor Final', documento: '222222' })
  const [modalData, setModalData] = useState({})


  useEffect(() => {

  }, [])

  const loadProductos = async () => {
    const data = await window.api.getProductos()
    setProductos(data)
  }

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)


  const handleAddProduct = () =>{
    loadProductos()
    handleShow()
    setModalData({
      title:'Agregar Producto',
      columns:[
        { data: 'ref_name', title: 'Nombre Referencia' },
        { data: 'sku', title: 'SKU' },
        { data: 'precio', title: 'Precio' },
      ]
    })
  }

  const handleAddClient = () =>{
    //handleShow()
  }


  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id)
    if (existe) {
      setCarrito(carrito.map(item => 
        item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ))
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }])
    }
  }

  const finalizarVenta = async () => {
    if (carrito.length === 0) return

    const data = {
      maestro: {
        numero_factura: Date.now(), // Simplified for example
        nombre_cliente: cliente.nombre,
        documento_cliente: cliente.documento
      },
      detalles: carrito
    }

    const result = await window.api.createVenta(data)

    if (result.success) {
      Swal.fire('Venta exitosa', `Factura #${data.maestro.numero_factura} creada`, 'success')
      setCarrito([])
      loadProductos() // Refresh stock in UI
    } else {
      Swal.fire('Error', result.error, 'error')
    }
  }

  const cleanForm = () =>{
  
  }

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)

  return <>

    <Row className="justify-content-between">
      <Col xs={4}>
        <InputGroup className="mb-3">
          <Button variant="primary" onClick={(e) => {
            handleAddProduct()
          }}>Agregar Producto</Button>
            <Form.Control
              placeholder="Código SKU" 
            />
        </InputGroup>
      </Col>

      <Col xs={5}>
        <InputGroup className="mb-3">
          <Button variant="primary" onClick={(e) => {
            handleAddClient()
          }}>Agregar Cliente</Button>
            <Form.Control
              placeholder="Documento de identidad del cliente" 
            />
        </InputGroup>
      </Col>
    </Row>

    <DataTableComponent 
      data=""
      columns={[
      { data: 'number', title: '#' },
      { data: 'referencia', title: 'Referencia' },
      { data: 'nombre', title: 'Producto' },
      { data: 'cantidad', title: 'Cantidad' },
      { data: 'descuento', title: '% Descuento' },
      { data: 'iva', title: 'IVA' },
      { data: 'total', title: 'TOTAL' },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        render: function(data, type, row) {
          return `
            <button class="btn btn-sm btn-secondary me-2 btn-edit-${row.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger btn-delete-${row.id}">
             <i class="bi bi-trash3"></i>
            </button>
            `;
          }
        }
      ]}
    />


    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Agregar Productos</Modal.Title>
      </Modal.Header>
          <Modal.Body>

          <DataTableComponent 
            data={productos}
            columns={[
              { data: 'ref_name', title: 'Nombre Referencia' },
              { data: 'sku', title: 'SKU' },
              { data: 'precio', title: 'Precio' },
              {
                data: null,
                title: 'Agregar',
                orderable: false,
                render: function(data, type, row) {
                  return `
                  <button class="btn btn-sm btn-secondary me-2 btn-add-${row.id}">
                    Agregar
                  </button>
                  `;
                }
              }
            ]}
          />

          </Modal.Body>
          <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                  Cerrar
              </Button>
          </Modal.Footer>
      </Modal>
  
  </>
}