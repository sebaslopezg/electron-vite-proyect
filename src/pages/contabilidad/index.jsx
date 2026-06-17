import { useState, useEffect } from 'react'
import { Puc } from './Puc'
import { Terceros } from './Terceros'
import { Comprobantes } from './Comprobantes'
import { Reportes } from './Reportes'
import { ConfiguracionContable } from './ConfiguracionContable'

export const ContabilidadIndex = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('')

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const pestañasValidas = [
        { 
            id: 'puc', 
            label: 'Plan Único de Cuentas (PUC)', 
            icono: 'bi-diagram-3', 
            perm: 'puc_ver', 
            component: <Puc currentUser={currentUser} /> 
        },
        { 
            id: 'terceros', 
            label: 'Terceros', 
            icono: 'bi-people', 
            perm: 'terceros_ver', 
            component: <Terceros currentUser={currentUser} /> 
        },
        { 
            id: 'comprobantes', 
            label: 'Comprobantes', 
            icono: 'bi-receipt', 
            perm: 'comprobantes_ver', 
            component: <Comprobantes currentUser={currentUser} /> 
        },
        { 
            id: 'reportes', 
            label: 'Reportes Financieros', 
            icono: 'bi-graph-up', 
            perm: 'contabilidad_reportes_ver', 
            component: <Reportes currentUser={currentUser} /> 
        },
        { 
            id: 'configContable', 
            label: 'Configuración', 
            icono: 'bi-gear', 
            perm: 'contabilidad_config_ver', 
            component: <ConfiguracionContable currentUser={currentUser} /> 
        }
    ].filter(t => hasPermission(t.perm))

    useEffect(() => {
        if (pestañasValidas.length > 0) setActiveTab(pestañasValidas[0].id)
    }, [currentUser])

    if (pestañasValidas.length === 0) {
        return <>
            <div className="alert alert-warning m-4 text-center shadow-sm">
                <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <h6 className="fw-bold">
                    Sin Accesos Permitidos
                </h6>
                <p className="small m-0 text-muted">
                    Tu rol no cuenta con credenciales para auditar el libro mayor o balances contables.
                </p>
            </div>
        </>
    }

    const currentTabObj = pestañasValidas.find(t => t.id === activeTab)

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-calculator me-2"></i>Módulo de Contabilidad (NIIF)</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body">
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                    {pestañasValidas.map(tab => (
                        <li className="nav-item" role="presentation" key={tab.id}>
                            <button 
                                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                type="button" role="tab"
                            >
                                <i className={`bi ${tab.icono} me-1`}></i> {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="tab-content pt-4 animate__animated animate__fadeIn">
                    {currentTabObj ? currentTabObj.component : <div className="text-muted small">Cargando pestaña...</div>}
                </div>
            </div>
        </div>
    </>
}