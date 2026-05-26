import { useState, useEffect } from 'react'
import { Facturacion } from './Facturacion.jsx'
import { Configuracion } from './Configuracion.jsx'
import { VerFacturas } from './VerFacturas.jsx'
import { Notas } from './Notas.jsx'
import { Reportes } from './Reportes.jsx'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true
})

export const Ventas = ({ currentUser }) => {
    const [almacenData, setAlmacenData] = useState([])
    const [activeTab, setActiveTab] = useState('')

    const loadAlmacenConf = async () => {
        const data = await window.api.getAllConfAlmacen()
        if (data) {
            setAlmacenData(data[0])
        } else {
            Toast.fire({ icon: 'error', title: 'Error al intentar cargar la configuración del almacén' })
        }
    }

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const tabsDisponibles = [
        { id: 'facturacion', label: 'Facturación', permission: 'ventas_crear', component: <Facturacion /> },
        { id: 'verFacturas', label: 'Ver Facturas', permission: 'ventas_historial', component: <VerFacturas currentUser={currentUser} /> },
        { id: 'reportes', label: 'Reportes', permission: 'reportes_ver', component: <Reportes /> },
        { id: 'notas', label: 'Nota Crédito/Débito', permission: 'notas_gestionar', component: <Notas /> },
        { id: 'config', label: 'Configurar', permission: 'ventas_configurar', component: <Configuracion data={almacenData} onReload={loadAlmacenConf} /> }
    ].filter(tab => hasPermission(tab.permission))

    useEffect(() => {
        loadAlmacenConf()
        if (tabsDisponibles.length > 0) {
            setActiveTab(tabsDisponibles[0].id)
        }
    }, [currentUser])

    if (!almacenData) {
        return <div className="p-3 text-muted small">Cargando datos contables...</div>
    }

    if (tabsDisponibles.length === 0) {
        return (
            <div className="alert alert-warning m-3 text-center shadow-sm">
                <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <h6 className="fw-bold">Sin Accesos Permitidos</h6>
                <p className="small m-0 text-muted">Tu rol no cuenta con permisos asignados para sub-módulos de facturación.</p>
            </div>
        )
    }

    const currentTabObj = tabsDisponibles.find(t => t.id === activeTab)

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-receipt-cutoff me-2"></i>Ventas</h1>
        </div>

        <section className="section">
            <div className="card">
                <div className="card-body pt-3">

                    <ul className="nav nav-tabs nav-tabs-bordered" role="tablist">
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
        </section>
    </>
}