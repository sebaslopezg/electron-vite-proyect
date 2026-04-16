import { 
  useState, 
  useEffect, 
  useRef 
} from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'
import CustomDataTable from '../components/DataTableComponent'

export const Clientes = () => {

  const [show, setShow] = useState(false)
  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)
  const [reloadTable, setReloadTable] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    documento: '',
    nombre: '',
    telefono: '',
    direccion: ''
  })

  const cleanForm = () => {
    setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
  }

  const tableContainerRef = useRef(null);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleTableClick = (e) => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        handleEdit({
          id: editBtn.dataset.id,
          documento: editBtn.dataset.documento,
          nombre: editBtn.dataset.nombre,
          telefono: editBtn.dataset.telefono,
          direccion: editBtn.dataset.direccion
        });
      }
      const delBtn = e.target.closest('.btn-delete');
      if (delBtn) handleDelete(delBtn.dataset.id);
    };

    container.addEventListener('click', handleTableClick);
    return () => container.removeEventListener('click', handleTableClick);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await window.api.updateCliente({ ...form, id: editingId })
        Swal.fire("Actualizado", "Cliente actualizado exitosamente", "success")
        setEditingId(null)
      } else {
        await window.api.addCliente(form)
        Swal.fire("Guardado", "Cliente creado exitosamente", "success")
      }
      cleanForm()
      handleClose()
      setReloadTable(prev => prev + 1)
    } catch (error) {
      Swal.fire("Error", "Error al guardar. Verifique que el Documento no exista ya.", "error")
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
    handleShow()
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro que desea eliminar el registro?",
      showDenyButton: true,
      confirmButtonText: "Sí",
      denyButtonText: `No`
    });

    if (result.isConfirmed) {
      await window.api.deleteCliente(id)
      setReloadTable(prev => prev + 1)
    }
  }

  useEffect(() => {
    const handleTableClick = (e) => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        handleEdit({
          id: editBtn.dataset.id,
          documento: editBtn.dataset.documento,
          nombre: editBtn.dataset.nombre,
          telefono: editBtn.dataset.telefono,
          direccion: editBtn.dataset.direccion
        });
      }
      const delBtn = e.target.closest('.btn-delete');
      if (delBtn) handleDelete(delBtn.dataset.id);
    };

    document.addEventListener('click', handleTableClick);
    return () => document.removeEventListener('click', handleTableClick);
  }, []);

  return <>
    <div className="pagetitle">
      <h1>Clientes</h1>
    </div>

    <div className="card">
      <div className="card-body pt-4">
        <div className="row mb-4">
          <div className="col">
            <button className='btn btn-primary' onClick={() => {
              setEditingId(null)
              cleanForm()
              handleShow()
            }}> <i className="bi bi-plus-circle me-1"></i> Nuevo Cliente</button>
          </div>
        </div>

        <div ref={tableContainerRef} className="w-100">
          <CustomDataTable
            reloadKey={reloadTable}
            ajaxData={(params) => window.api.getClientesPaginados(params)}
            columns={[
              { data: 'documento', title: 'Documento' },
              { data: 'nombre', title: 'Nombre' },
              { data: 'telefono', title: 'Teléfono' },
              { data: 'direccion', title: 'Dirección' },
              { 
                data: 'date_created', 
                title: 'Fecha Creación',
                render: (data) => new Date(data).toLocaleDateString('es-CO')
              },
              {
                data: null,
                title: 'Acciones',
                orderable: false,
                render: function (data, type, row) {
                  const safeDoc = (row.documento || '').toString().replace(/"/g, '&quot;');
                  const safeNom = (row.nombre || '').toString().replace(/"/g, '&quot;');
                  const safeTel = (row.telefono || '').toString().replace(/"/g, '&quot;');
                  const safeDir = (row.direccion || '').toString().replace(/"/g, '&quot;');

                  return `
                    <button class="btn btn-sm btn-secondary me-2 btn-edit" 
                      data-id="${row.id}" data-documento="${safeDoc}" data-nombre="${safeNom}"
                      data-telefono="${safeTel}" data-direccion="${safeDir}">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}">
                     <i class="bi bi-trash3"></i>
                    </button>
                  `;
                }
              }
            ]}
          />

        </div>
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
              placeholder="Ej: Calle 1 # 2-3"
              required
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit}>
          {editingId ? 'Actualizar' : 'Guardar'}
        </Button>
      </Modal.Footer>
    </Modal>
  </>
}