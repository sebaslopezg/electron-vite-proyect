import { SideBar } from './components/SideBar.jsx';
import { Productos } from './components/Productos.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {

  return <>
    <div className="container-fluid">
      <div className='row'>
        <div className="col-2 p-0">
          <SideBar/>
        </div>
        <div className="col-10 p-3">
          <Productos />
        </div>
      </div>
    </div>
  </>
}

export default App;

