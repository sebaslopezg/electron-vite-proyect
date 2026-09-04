import { useState, useEffect } from "react"
import { Calendario } from "./Calendario"
import { Encargos } from "./Encargos"
import { Estados } from "./Estados"
import { ConfiguracionEncargos } from "./Configuracion"

export const IndexEncargos = ({ currentUser }) => {
  const [activeUser, setActiveUser] = useState(currentUser)
  const [activeTab, setActiveTab] = useState('')

  useEffect(() => {
      if (currentUser) {
          setActiveUser(currentUser)
      } else if (window.api && window.api.getCurrentUser) {
          window.api.getCurrentUser().then(res => {
              if (res.success && res.data) {
                  setActiveUser(res.data)
              }
          })
      }
  }, [currentUser])

  const hasPermission = (permissionKey) => {
      const u = activeUser || currentUser;
      if (!u) return false;
      if (u.permisos?.includes('ALL')) return true;
      return u.permisos?.includes(permissionKey);
  }

  const tabsDisponibles = [
      { id: 'encargos', label: 'Encargos', permission: 'encargos_ver', component: <Encargos currentUser={activeUser || currentUser} /> },
      { id: 'calendario', label: 'Calendario', permission: 'encargos_calendario', component: <Calendario currentUser={activeUser || currentUser} /> },
      { id: 'estados', label: 'Estados', permission: 'estados_ver', component: <Estados currentUser={activeUser || currentUser} /> },
      { id: 'configuracion', label: 'Configuración', permission: 'encargos_editar', component: <ConfiguracionEncargos currentUser={activeUser || currentUser} /> }
  ].filter(tab => hasPermission(tab.permission))

  useEffect(() => {
      if (tabsDisponibles.length > 0 && !activeTab) {
          setActiveTab(tabsDisponibles[0].id)
      }
  }, [activeUser, currentUser, tabsDisponibles, activeTab])

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
      <div className="card">
        <div className="card-body">
          <ul
            className="nav nav-tabs nav-tabs-bordered mt-3"
            id="borderedTab"
            role="tablist"
          >
            {tabsDisponibles.map(tab => (
                <li className="nav-item" role="presentation" key={tab.id}>
                    <button
                        className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        type="button"
                        role="tab"
                    >
                        {tab.label}
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