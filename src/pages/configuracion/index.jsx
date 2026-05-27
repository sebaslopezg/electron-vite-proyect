import { useState, useEffect } from 'react'
import { General } from './General'
import { Datos } from './Datos'
import { Importar } from './Importar'
import { Exportar } from './Exportar'
import { Actualizaciones } from './Actualizaciones'
import { Logs } from './Logs'

export const ConfiguracionIndex = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('')

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const tabsDisponibles = [
        { 
            id: 'general', 
            label: 'General', 
            icon: '', 
            perm: 'configuracion_general', 
            component: <General currentUser={currentUser} /> 
        },
        { 
            id: 'actualizaciones', 
            label: 'Actualizaciones', 
            icon: 'bi-arrow-repeat', 
            perm: 'configuracion_sistema', 
            component: <Actualizaciones currentUser={currentUser} /> 
        },
        { 
            id: 'logs', 
            label: 'Logs', 
            icon: 'bi-journal-text', 
            perm: 'ver_logs', 
            component: <Logs currentUser={currentUser} /> 
        },
        { 
            id: 'datos', 
            label: 'Manejo de Datos', 
            icon: 'bi-database-fill-gear', 
            perm: 'manejo_datos', 
            component: <Datos currentUser={currentUser} /> 
        },
        { 
            id: 'importar', 
            label: 'Importar Datos', 
            icon: 'bi-cloud-upload', 
            perm: 'importar_datos', 
            component: <Importar currentUser={currentUser} /> 
        },
        { 
            id: 'exportar', 
            label: 'Exportar Datos', 
            icon: 'bi-cloud-download', 
            perm: 'exportar_datos', 
            component: <Exportar currentUser={currentUser} /> 
        },
    ].filter(tab => hasPermission(tab.perm))

    useEffect(() => {
        if (tabsDisponibles.length > 0) setActiveTab(tabsDisponibles[0].id)
    }, [currentUser])

    if (tabsDisponibles.length === 0) {
        return (
            <div className="alert alert-warning m-4 text-center shadow-sm">
                <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <h6 className="fw-bold">Sin Accesos Permitidos</h6>
                <p className="small m-0 text-muted">Tu rol no cuenta con permisos para alterar o auditar configuraciones globales.</p>
            </div>
        )
    }

    const currentTabObj = tabsDisponibles.find(t => t.id === activeTab)

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-gear me-2"></i>Configuración del Sistema</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body">
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                    {tabsDisponibles.map(tab => (
                        <li className="nav-item" role="presentation" key={tab.id}>
                            <button 
                                className={`nav-link ${activeTab === tab.id ? 'active' : 'text-secondary'}`} 
                                onClick={() => setActiveTab(tab.id)}
                                type="button" role="tab"
                            >
                                {tab.icon && <i className={`${tab.icon} me-1`}></i>} {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="tab-content pt-4 animate__animated animate__fadeIn">
                    {currentTabObj ? currentTabObj.component : null}
                </div>
            </div>
        </div>
    </>
}