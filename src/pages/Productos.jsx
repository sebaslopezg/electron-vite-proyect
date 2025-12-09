import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5';
import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Form, Button, Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../components/DataTableComponent'

DataTable.use(DT);

export const Productos = () => {

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  //connect to DB
  const [items, setItems] = useState([])
  const [dataInTable, setDataInTable] = useState([])

  const emptyForm = {
    ref_name: '', 
    sku: '', 
    status: 1,
    stock:0,
    unidad_medida:'',
    iva:0,
    allow_negative:'',
    descripcion:'',
    precio:0
  }

  const [form, setForm] = useState({...emptyForm})
  const [editingId, setEditingId] = useState(null)

  const load = async () => {
    const data = await window.api.getProductos()
    setItems(data)
    setDataInTable(data)
  };

  const cleanForm = () => {
    setForm({...emptyForm})
  }
  
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      await window.api.updateProducto({ ...form, id: editingId })
      setEditingId(null)
    } else {
      await window.api.addProducto(form)
    }
    cleanForm()
    handleClose()
    load()
  }

  const handleEdit = (item) => {
    setForm({ 
      ref_name: item.ref_name, 
      sku: item.sku, 
      status: item.status,
      stock:item.stock,
      unidad_medida:item.unidad_medida,
      iva:item.iva,
      allow_negative:item.allow_negative,
      descripcion:item.descripcion,
      precio:item.precio
    })
    setEditingId(item.id)
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro que desea eliminar el registro?",
      showDenyButton: true,
      confirmButtonText: "Sí",
      denyButtonText: `No`
    })
    
    if (result.isConfirmed) {
      await window.api.deleteProducto(id)
      load()
    }
  }
  
    return <>

      <div className="pagetitle">
        <h1>Productos</h1>
      </div>

      <div className="card">
        <div className="card-title"></div>
        <div className="card-body">

          <div className="row">
            <div className="row">
              <div className="col">
                <button className='btn btn-primary' onClick={(e) => {
                  setEditingId(null)
                  cleanForm()
                  handleShow()
                  }}>Nuevo</button>
              </div>
            </div>
          </div>

          <DataTableComponent 
            data={dataInTable}
            columns={[
              { data: 'ref_name', title: 'Nombre Referencia' },
              { data: 'sku', title: 'SKU' },
              { data: 'status', title: 'Status' },
              { data: 'date_created', title: 'Fecha Creación' },
              { data: 'date_modify', title: 'Fecha Modificación' },
              {
                data: null,
                title: 'Actions',
                orderable: false,
                render: function(data, type, row) {
                  return `
                    <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
                      Editar
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-${row.id}">
                      Eliminar
                    </button>
                  `;
                }
              }
            ]}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShow={handleShow}
            customRenders={{
              status: (data, type, row) => {
                const badgeClass = data === 1 ? 'bg-success' : 'bg-danger';
                const statusName = data === 1 ? 'Activo' : 'Inactivo'
                return `<span class="badge ${badgeClass}">${statusName}</span>`;
              },
              date_created: (data, type, row) => {
                return new Date(data).toLocaleDateString('es-ES');
              },
              date_modify: (data, type, row) => {
                return new Date(data).toLocaleDateString('es-ES');
              },
              sku: (data, type, row) => {
                return `<strong>${data.toUpperCase()}</strong>`;
              }
            }}
          />
        </div>
      </div>

      <Modal show={show} onHide={handleClose} size="lg" centered>
          <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Producto' : 'Crear Producto'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                      <Form.Group className="mb-3">
                      <Form.Label htmlFor="skuCode">Código SKU</Form.Label>
                      <Form.Control 
                        id='skuCode'
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        type="text" 
                        placeholder="SKU-001" 
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="nombre">Nombre</Form.Label>
                        <Form.Control 
                          id='nombre'
                          value={form.ref_name} 
                          onChange={(e) => setForm({ ...form, ref_name: e.target.value })}
                          type="text" 
                          placeholder="mi producto"
                          required
                        />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="initialStock">Stock inicial</Form.Label>
                        <Form.Control 
                          id='initialStock'
                          value={form.stock} 
                          onChange={(e) => setForm({ ...form, stock: e.target.value })}
                          type="number" 
                          placeholder="Cantidad inicial del producto"
                          required
                        />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="unidad_medida">Unidad de medida</Form.Label>
                        <Form.Select
                          value={form.unidad_medida}
                          onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                        >
                          <option>Unidad de medida</option>
                          <option value="un">Unidad</option>
                          <option value="kg">Kilo Gramos (kg)</option>
                          <option value="g">Gramos (g)</option>
                          <option value="cajas">Cajas</option>
                        </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="iva">IVA (%)</Form.Label>
                        <Form.Control 
                          htmlFor="iva"
                          value={form.iva} 
                          onChange={(e) => setForm({ ...form, iva: e.target.value })}
                          type="text" 
                          placeholder="Porcentaje de IVA"
                          required
                        />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Check
                          checked={form.allow_negative === 1}
                          onChange={(e) => setForm({ ...form, allow_negative: e.target.checked ? 1 : 0 })}
                          type="switch"
                          id="custom-switch"
                          label="Permitir negativos"
                        />
                    </Form.Group>
                  </Col>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="precio">Precio</Form.Label>
                        <Form.Control 
                          id='precio'
                          value={form.precio} 
                          onChange={(e) => setForm({ ...form, precio: e.target.value })}
                          type="number" 
                          placeholder="Precio del producto"
                          required
                        />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <Form.Group>
                      <Form.Label htmlFor="descripcion">Descripcion</Form.Label>
                      <Form.Control 
                        id='descripcion'
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        as="textarea" rows={3} 
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
          </Modal.Body>
          <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                  Cancelar
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                  {editingId ? 'Actualizar' : 'Guardar'}
              </Button>
          </Modal.Footer>
      </Modal>
    </>
}