//import { useEffect, useState } from "react";
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { SideBar } from './components/SideBar';

function App() {


  return <>

  <SideBar/>

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



