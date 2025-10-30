//import { useEffect, useState } from "react";
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { NavMain } from './components/NavMain';

function App() {


  return <>
  
    <NavMain />
<div className='d-flex flex-nowrap'>

<div className="d-flex flex-column flex-shrink-0 p-3 text-bg-dark"> 
  <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">  
  <span className="fs-4">Sidebar</span> </a> 
  <hr /> 
  
  <ul className="nav nav-pills flex-column mb-auto"> 
    <li className="nav-item"> 
      <a href="#" className="nav-link active" aria-current="page">Home</a> 
    </li> 

    <li> 
      <a href="#" className="nav-link text-white">Dashboard</a> 
    </li>
    
    <li> 
      <a href="#" className="nav-link text-white">Orders</a> 
    </li> 
    <li> 
      <a href="#" className="nav-link text-white">Products</a>
    </li>

    <li>
      <a href="#" className="nav-link text-white">Customers</a> 
    </li> 
  </ul> 

  <hr />

  <div className="dropdown"> 
    <a href="#" className="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"> 
    <img src="https://github.com/mdo.png" alt="" width="32" height="32" className="rounded-circle me-2" /> 
    <strong>mdo</strong> </a> 
    <ul className="dropdown-menu dropdown-menu-dark text-small shadow"> 
      <li>
        <a className="dropdown-item" href="#">New project...</a>
      </li> 

      <li>
        <a className="dropdown-item" href="#">Settings</a>
      </li> 

      <li>
        <a className="dropdown-item" href="#">Profile</a>
      </li> 

      <li>
        <hr className="dropdown-divider" /></li> 
        <li>
          <a className="dropdown-item" href="#">Sign out</a>
        </li> 
      </ul> 
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



