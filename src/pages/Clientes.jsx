import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'
import DataTableComponent from '../components/DataTableComponent'

DataTable.use(DT);

export const Clientes = () => {

  const [show, setShow] = useState(false)

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  //connect to DB
  const [items, setItems] = useState([]);
  const [dataInTable, setDataInTable] = useState([])
  const [form, setForm] = useState({ 
      documento: '', 
      nombre: '', 
      telefono: '', 
      direccion: '' 
  })
  const [editingId, setEditingId] = useState(null)

  const load = async () => {
    const data = await window.api.getClientes()
    setItems(data);
    setDataInTable(data)
  };

  const cleanForm = () => {
    setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
  }
  
  useEffect(() => { load() }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()

    try { // <-- START TRY BLOCK
      if (editingId) {
        await window.api.updateCliente({ ...form, id: editingId })
        Swal.fire("Actualizado", "Cliente actualizado exitosamente", "success")
        setEditingId(null)
      } else {
        await window.api.addCliente(form)
        Swal.fire("Guardado", "Cliente creado exitosamente", "success")
      }

      setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
      handleClose()
      load()
    } catch (error) {
      console.error('Error al guardar el cliente:', error)
      Swal.fire({
        title: "Error",
        text: `Error al guardar el cliente. Verifique que el Documento de identidad no exista ya. ${error.message || ''}`, 
        icon: "error"
      });
    }
  }

  const handleEdit = (item) => {
    setForm({ 
      documento: item.documento, 
      nombre: item.nombre, 
      telefono: item.telefono, 
      direccion: item.direccion 
    })
    setEditingId(item.id)
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro que desea eliminar el registro?",
      showDenyButton: true,
      confirmButtonText: "Sí",
      denyButtonText: `No`
    });
    
    if (result.isConfirmed) {
      await window.api.deleteCliente(id)
      load()
    }
  }
  
    return <>

      <div className="pagetitle">
        <h1>Clientes</h1>
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
            { data: 'documento', title: 'Documento' },
            { data: 'nombre', title: 'Nombre' },
            { data: 'telefono', title: 'Teléfono' },
            { data: 'direccion', title: 'Dirección' },
            { data: 'date_created', title: 'Fecha Creación' },
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
              date_created: (data, type, row) => {
                return new Date(data).toLocaleDateString('es-ES');
              },
               // Only show date_modify if needed, else remove
              date_modify: (data, type, row) => {
                return new Date(data).toLocaleDateString('es-ES');
              }
            }}
          />
        </div>
      </div>

      <Modal show={show} onHide={handleClose} size="lg" centered>
          <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Cliente' : 'Crear Cliente'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
              <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                      <Form.Label htmlFor="documento">Documento de identidad</Form.Label>
                      <Form.Control 
                      id='documento'
                      value={form.documento} 
                      onChange={(e) => setForm({ ...form, documento: e.target.value })}
                      type="text" 
                      placeholder="Documento de identificacion del cliente"
                      required
                      />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label htmlFor='nombre'>Nombre</Form.Label>
                      <Form.Control 
                      id='nombre'
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      type="text" 
                      placeholder="Nombre del cliente" 
                      required
                      />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label htmlFor='telefono'>Telefono</Form.Label>
                      <Form.Control 
                      id='telefono'
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      type="text" 
                      placeholder="Telefono o celular del cliente" 
                      required
                      />
                  </Form.Group>
                  <Form.Group className="mb-3">
                      <Form.Label htmlFor='direccion'>Direccion</Form.Label>
                      <Form.Control 
                      id='direccion'
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      type="text" 
                      placeholder="Enrique segoviano" 
                      required
                      />
                  </Form.Group>
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