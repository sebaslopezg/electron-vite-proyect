import { useState, useEffect } from "react"
import { Calendario } from "./Calendario"
import { Encargos } from "./Encargos"
import { Estados } from "./Estados"
import { ConfiguracionEncargos } from "./Configuracion"
import { encargosService } from "../../services/encargosService"

export const IndexEncargos = ({ currentUser }) => {
  const [activeUser, setActiveUser] = useState(currentUser)
  const [activeTab, setActiveTab] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
      let isMounted = true;
      const fetchUser = async () => {
          if (currentUser) {
              if (isMounted) {
                  setActiveUser(currentUser)
                  setIsLoading(false)
              }
          } else {
              try {
                  const res = await encargosService.getCurrentUser()
                  if (isMounted) {
                      if (res && res.success && res.data) {
                          setActiveUser(res.data)
                      }
                      setIsLoading(false)
                  }
              } catch (error) {
                  if (isMounted) setIsLoading(false)
              }
          }
      }
      
      fetchUser()
      return () => { isMounted = false }
  }, [currentUser])

  const hasPermission = (permissionKey) => {
      const u = activeUser || currentUser;
      if (!u) return false;
      if (u.permisos?.includes('ALL')) return true;
      return u.permisos?.includes(permissionKey);
  }

  const tabsDisponibles = [
    { 
        id: 'encargos', 
        label: 'Encargos',
        icon: 'bi bi-box-seam',
        permission: 'encargos_ver', 
        component: <Encargos currentUser={activeUser || currentUser} /> 
    },  
    { 
        id: 'calendario', 
        label: 'Calendario', 
        icon: 'bi bi-calendar-check',
        permission: 'encargos_calendario', 
        component: <Calendario currentUser={activeUser || currentUser} /> 
    },
    { 
        id: 'estados', 
        label: 'Estados',
        icon: 'bi bi-clipboard', 
        permission: 'estados_ver', 
        component: <Estados currentUser={activeUser || currentUser} /> 
    },  
    { 
        id: 'configuracion', 
        label: 'Configuración', 
        icon: 'bi bi-gear',
        permission: 'encargos_editar', 
        component: <ConfiguracionEncargos currentUser={activeUser || currentUser} /> 
    }
  ].filter(tab => hasPermission(tab.permission))

  useEffect(() => {
      if (tabsDisponibles.length > 0 && !activeTab && !isLoading) {
          setActiveTab(tabsDisponibles[0].id)
      }
  }, [activeUser, currentUser, tabsDisponibles, activeTab, isLoading])

  if (isLoading) {
      return (
          <div className="d-flex align-items-center justify-content-center w-100" style={{ minHeight: '60vh' }}>
              <div className="text-center animate__animated animate__fadeIn">
                  <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                  <h5 className="text-muted fw-bold">Cargando Encargos...</h5>
                  <p className="text-muted small">Verificando permisos y accesos</p>
              </div>
          </div>
      )
  }

  if (tabsDisponibles.length === 0) {
      return (
          <div className="alert alert-warning m-3 text-center shadow-sm">
              <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
              <h6 className="fw-bold">Sin Accesos Permitidos</h6>
              <p className="small m-0 text-muted">Tu rol no cuenta con permisos asignados para visualizar el módulo de encargos.</p>
          </div>
      )
  }

  const currentTabObj = tabsDisponibles.find(t => t.id === activeTab)

  return <>
      <div className="pagetitle">
        <h1><i className="bi bi-calendar-event"></i> Encargos</h1>
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <ul
            className="nav nav-tabs nav-tabs-bordered mt-3"
            id="borderedTab"
            role="tablist"
          >
            {tabsDisponibles.map(tab => (
                <li className="nav-item" role="presentation" key={tab.id}>
                    <button
                        className={`nav-link ${activeTab === tab.id ? 'active text-primary' : 'text-secondary'}`}
                        onClick={() => setActiveTab(tab.id)}
                        type="button"
                        role="tab"
                    >
                       {tab.icon && <i className={`${tab.icon} me-1`}></i>} {tab.label}
                    </button>
                </li>
            ))}
          </ul>

          <div className="tab-content pt-2" id="borderedTabContent">
              <div className="tab-pane fade show active" role="tabpanel">
                  {currentTabObj ? currentTabObj.component : <div className="text-muted small">Cargando módulo...</div>}
              </div>
          </div>
        </div>
      </div>
  </>
}