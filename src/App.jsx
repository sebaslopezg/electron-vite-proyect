import { useEffect, useState } from 'react'
import Dashboard from './components/layout/Dashboard'
import { Login } from './pages/auth/Login'
import { Activation } from './pages/auth/Activation'
import Swal from 'sweetalert2'

import 'bootstrap/dist/css/bootstrap.min.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [loginRequired, setLoginRequired] = useState(false)

  const [licenseActive, setLicenseActive] = useState(false)
  const [hardwareId, setHardwareId] = useState('')

  const verificarSeguridadAcceso = async () => {
    setLoading(true)
    
    if (window.api && window.api.checkLicense) {
      const licRes = await window.api.checkLicense()
      if (licRes.success) {
        setHardwareId(licRes.hardwareId)
        setLicenseActive(licRes.activated)
        
        if (!licRes.activated) {
          setLoading(false)
          return
        }
      }
    }

    const savedToken = localStorage.getItem('auth_token')
    if (window.api && window.api.checkLoginRequired) {
      const res = await window.api.checkLoginRequired(savedToken)
      if (res.success) {
        setLoginRequired(res.required)
        if (!res.required && res.user) {
          setCurrentUser(res.user)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    verificarSeguridadAcceso()

    const handleGlobalProfileUpdate = (e) => {
      setCurrentUser(e.detail)
    }
    window.addEventListener('perfil-actualizado', handleGlobalProfileUpdate)

    if (window.updaterAPI) {
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
          cancelButtonColor: 'rgb(108, 117, 125)',
          confirmButtonText: '<i class="bi bi-arrow-clockwise"></i> Reiniciar e Instalar',
          cancelButtonText: 'En otro momento'
        }).then((result) => {
          if (result.isConfirmed) {
            window.updaterAPI.installUpdate()
          }
        })
      })
    }

    return () => {
      window.removeEventListener('perfil-actualizado', handleGlobalProfileUpdate)
      if (window.updaterAPI && window.updaterAPI.removeAllListeners) {
        window.updaterAPI.removeAllListeners()
      }
    }
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('auth_token')
    if (window.api && window.api.logoutUser) {
        await window.api.logoutUser()
    }
    setCurrentUser(null)
    setLoginRequired(true)
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-light" style={{ minHeight: '100vh', width: '100vw' }}>
          <div className="text-center">
              <div className="spinner-border text-primary mb-2" role="status"></div>
              <p className="text-muted small fw-bold">Iniciando módulos de seguridad...</p>
          </div>
      </div>
    )
  }

  if (!licenseActive) {
    return <Activation hardwareId={hardwareId} onActivationSuccess={verificarSeguridadAcceso} />
  }

  if (loginRequired && !currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  return <>
    <Dashboard currentUser={currentUser} onLogout={handleLogout} />
  </>
}

export default App