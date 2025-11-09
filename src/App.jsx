//import { useEffect, useState } from "react";
import { SideBar } from './components/SideBar.jsx';

import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { useState } from 'react';
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

          <DataTable data={tableData} className="display table">
              <thead>
                  <tr>
                      <th>Name</th>
                      <th>Position</th>
                  </tr>
              </thead>
          </DataTable>
        </div>
      </div>
    </div>


      <Modal show={show} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Crear Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>

          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" placeholder="mi producto" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Código SKU</Form.Label>
              <Form.Control type="text" placeholder="mi producto" />
            </Form.Group>
          </Form>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            alert('Saved!');
            handleClose();
          }}>
            Save Changes
          </Button>
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



