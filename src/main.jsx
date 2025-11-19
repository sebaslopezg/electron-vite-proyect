import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/vendor/bootstrap-icons/bootstrap-icons.css'
import './assets/vendor/quill/quill.snow.css'
import './assets/vendor/quill/quill.bubble.css'
import './assets/niceStyle.css';
import './assets/vendor/quill/quill.js'
import './assets/vendor/tinymce/tinymce.min.js'
import './assets/niceMain.js'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
