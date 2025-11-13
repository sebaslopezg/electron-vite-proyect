import { SideBar } from './components/SideBar.jsx';

import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import 'bootstrap/dist/css/bootstrap.min.css';
 
DataTable.use(DT);
// crear modal con formularios
function App() {

  const [tableData, setTableData] = useState([
    [ 'Tiger Nixon', 'System Architect' ],
    [ 'Garrett Winters', 'Accountant' ],
  ]); 

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
    console.log(data)
    setItems(data);
    const formattedData = data.flatMap(obj => Object.values(obj));
    setDataInTable(formattedData)
  };
  
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
    <div className="container-fluid">
      <div className='row'>
        <div className="col-2 p-0">
          <SideBar/>
        </div>
        <div className="col-10 p-3">

          <div className="row">
            {/* -- action buttons -- */}

            <div className="row">
              <div className="col">
                <button className='btn btn-primary' onClick={handleShow}>Nuevo</button>
              </div>
            </div>
          </div>

          <DataTable id="hixD" data={dataInTable} className="display table">
              <thead>
                  <tr>
                      <th>Name</th>
                      <th>Position</th>
                  </tr>
              </thead>
          </DataTable>







 <div className="container mt-5">
      <h2 className="text-center mb-4">Inventario CRUD</h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-3">
          <input
            className="form-control"
            placeholder="Reference name"
            value={form.ref_name}
            onChange={(e) => setForm({ ...form, ref_name: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <input
            className="form-control"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          {editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button
            type="button"
            className="btn btn-secondary ms-2"
            onClick={() => {
              setEditingId(null);
              setForm({ ref_name: '', sku: '', status: '' });
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ref Name</th>
            <th>SKU</th>
            <th>Status</th>
            <th>Date Created</th>
            <th>Date Modify</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.id}</td>
              <td>{it.ref_name}</td>
              <td>{it.sku}</td>
              <td>{it.status}</td>
              <td>{it.date_created}</td>
              <td>{it.date_modify}</td>
              <td>
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => handleEdit(it)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(it.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>









        </div>
      </div>
    </div>


    {/* modal para usar mas tarde */}


      <Modal show={show} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Crear Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Nombre</Form.Label>
              <Form.Control 
                value={form.ref_name} 
                onChange={(e) => setForm({ ...form, ref_name: e.target.value })}
                type="text" 
                placeholder="mi producto"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Código SKU</Form.Label>
              <Form.Control 
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                type="text" 
                placeholder="mi producto" 
              />
            </Form.Group>
          </Form>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" type='submit'>
            {editingId ? 'Actualizar' : 'Guardar'}
          </Button>
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={() => {
                setEditingId(null);
                setForm({ ref_name: '', sku: '', status: '' });
              }}
            >
              Cancelar
            </button>
          )}
        </Modal.Footer>
      </Modal>

  </>
}

export default App;


/*

-- guardado para ICP ------------

function App() {
  const [response, setResponse] = useState("");

  useEffect(() => {
    // Call the "ping" IPC handler
    window.api.ping().then((res) => {
      console.log("Ping reply:", res);
      setResponse(res);
    });

    // Send a custom message to main
    window.api.sendMessage("custom-event", { foo: "bar" });

    // Listen for main's reply
    window.api.onMessage("custom-event-reply", (msg) => {
      console.log("Reply from main:", msg);
    });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "30vh", fontFamily: "sans-serif" }}>
      <h1>⚡ React + Electron + Vite</h1>
      <p>{response || "Waiting for main process..."}</p>
    </div>
  );
}

*/



