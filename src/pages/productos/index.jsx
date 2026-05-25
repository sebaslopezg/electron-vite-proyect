import { useState, useEffect } from 'react'
import { Servicios } from './Servicios'
import { Productos } from './Productos'
import { Categorias } from './Categorias' 
import { Subcategorias } from './Subcategorias'
import { Etiquetas } from './Etiquetas'

export const ProductosIndex = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('')

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const tabsDisponibles = [
        { id: 'productos', label: 'Productos', permission: 'productos_ver', component: <Productos currentUser={currentUser} /> },
        { id: 'servicios', label: 'Servicios', permission: 'productos_ver', component: <Servicios currentUser={currentUser} /> },
        { id: 'categorias', label: 'Categorías', permission: 'categorias_gestionar', component: <Categorias currentUser={currentUser} /> },
        { id: 'subcategorias', label: 'Subcategorías', permission: 'categorias_gestionar', component: <Subcategorias currentUser={currentUser} /> },
        { id: 'etiquetas', label: 'Etiquetas', permission: 'categorias_gestionar', component: <Etiquetas currentUser={currentUser} /> }
    ].filter(tab => hasPermission(tab.permission))

    useEffect(() => {
        if (tabsDisponibles.length > 0) {
            setActiveTab(tabsDisponibles[0].id)
        }
    }, [currentUser])

    if (tabsDisponibles.length === 0) {
        return (
            <div className="alert alert-warning m-3 text-center shadow-sm">
                <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <h6 className="fw-bold">Sin Accesos Permitidos</h6>
                <p className="small m-0 text-muted">Tu rol no cuenta con permisos asignados para visualizar el inventario o sus configuraciones.</p>
            </div>
        )
    }

    const currentTabObj = tabsDisponibles.find(t => t.id === activeTab)

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-box-seam me-2"></i>Productos</h1>
        </div>
        <div className="card shadow-sm border-0">
            <div className="card-body">
                
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
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

                <div className="tab-content pt-4 animate__animated animate__fadeIn">
                    {currentTabObj ? currentTabObj.component : <div className="text-muted small">Cargando módulo...</div>}
                </div>
            </div>
        </div>
    </>
}