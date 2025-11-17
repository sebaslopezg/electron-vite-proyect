import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

DataTable.use(DT);

export const Productos = () => {

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  //connect to DB
  const [items, setItems] = useState([]);
  const [dataInTable, setDataInTable] = useState([]);
  const [form, setForm] = useState({ ref_name: '', sku: '', status: '' });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const data = await window.api.getInventario();
    setItems(data);
    setDataInTable(data)
  };

  const cleanForm = () => {
    setForm({ ref_name: '', sku: '', status: '' })
  }
  
  useEffect(() => { load() }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await window.api.updateInventario({ ...form, id: editingId });
      setEditingId(null);
    } else {
      await window.api.addInventario(form);
    }
    setForm({ ref_name: '', sku: '', status: '' });
    handleClose()
    load();
  };

  const handleEdit = (item) => {
    setForm({ ref_name: item.ref_name, sku: item.sku, status: item.status });
    setEditingId(item.id);
  };

  const handleDelete = async (id) => {
    await window.api.deleteInventario(id);
    load();
  };

    return <>

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
        <DataTable 
          data={dataInTable} 
          className="display table table-striped"
          options={{
            columns: [
              { data: 'id', title: 'ID' },
              { data: 'ref_name', title: 'Ref Name' },
              { data: 'sku', title: 'SKU' },
              { data: 'status', title: 'Status' },
              { data: 'date_created', title: 'Date Created' },
              { data: 'date_modify', title: 'Date Modify' },
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
            ],
            createdRow: function(row, data, dataIndex) {
              // Attach event listeners to the buttons
              const editBtn = row.querySelector(`.btn-edit-${data.id}`);
              const deleteBtn = row.querySelector(`.btn-delete-${data.id}`);
              
              if (editBtn) {
                editBtn.onclick = () => {
                  handleEdit(data)
                  handleShow()
                };
              }
              
              if (deleteBtn) {
                deleteBtn.onclick = () => handleDelete(data.id);
              }
            }
          }}
        >
        </DataTable>

        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Editar Producto' : 'Crear Producto'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre</Form.Label>
                        <Form.Control 
                        value={form.ref_name} 
                        onChange={(e) => setForm({ ...form, ref_name: e.target.value })}
                        type="text" 
                        placeholder="mi producto"
                        required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Código SKU</Form.Label>
                        <Form.Control 
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        type="text" 
                        placeholder="SKU-001" 
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