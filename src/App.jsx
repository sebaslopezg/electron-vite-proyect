import { useEffect } from 'react'
import Dashboard from './components/layout/Dashboard'
import Swal from 'sweetalert2'

import 'bootstrap/dist/css/bootstrap.min.css'

function App() {

  useEffect(() => {
    if (!window.updaterAPI) return

    window.updaterAPI.onUpdateAvailable((info) => {
      Swal.fire({
        title: '¡Nueva versión disponible!',
        text: `La versión ${info.version} está lista. ¿Deseas descargarla ahora?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '<i class="bi bi-cloud-download"></i> Sí, descargar',
        cancelButtonText: 'Más tarde'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: 'Descargando actualización...',
            text: 'Puedes seguir usando la aplicación.',
            icon: 'success',
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 4000
          })
          window.updaterAPI.downloadUpdate()
        }
      })
    })

    window.updaterAPI.onUpdateDownloaded(() => {
      Swal.fire({
        title: '¡Actualización lista!',
        text: 'La descarga ha finalizado. ¿Deseas reiniciar la aplicación para instalarla?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-arrow-clockwise"></i> Reiniciar e Instalar',
        cancelButtonText: 'En otro momento'
      }).then((result) => {
        if (result.isConfirmed) {
          window.updaterAPI.installUpdate()
        }
      })
    })

    return () => {
      window.updaterAPI.removeAllListeners()
    }
  }, [])

  return (
    <>
      <Dashboard />
    </>
  )
}

export default App