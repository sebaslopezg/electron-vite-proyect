//import { useEffect, useState } from "react";
import { SideBar } from './components/SideBar.jsx';

import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { useState } from 'react';
 
DataTable.use(DT);

function App() {

  

    const [tableData, setTableData] = useState([
    [ 'Tiger Nixon', 'System Architect' ],
    [ 'Garrett Winters', 'Accountant' ],
  ]);

  return <>

    <div className="container-fluid">
      <div className='row'>
        <div className="col-2 p-0">
          <SideBar/>
        </div>
        <div className="col-10 p-3">

          <div className="row">
            Botones de accion
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



