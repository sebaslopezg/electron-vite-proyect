//import { Productos } from './components/Productos.jsx';

import { Header } from './components/layout/Header';

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {

  return <>

    <Header />

    <aside id="sidebar" className="sidebar">
        {/* Your sidebar content */}
    </aside>

    <main id="main" className="main">
        {/* Your dashboard content goes here */}
        <h1>Dashboard Content</h1>
    </main>

    <a
      href="#"
      className={`back-to-top d-flex align-items-center justify-content-center ${showBackToTop ? 'active' : ''}`}
      onClick={scrollToTop}
    >
      <i className="bi bi-arrow-up-short"></i>
    </a>

  </>

}

export default App;

