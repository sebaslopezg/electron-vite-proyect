import { useState, useEffect } from 'react'
import { ClientesActivos } from './ClientesActivos'
import { ClientesInactivos } from './ClientesInactivos'
import { clientesService } from '../../services/clientesService'

export const Clientes = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('activos')
    const [activeUser, setActiveUser] = useState(currentUser)

    useEffect(() => {
        if (currentUser) {
            setActiveUser(currentUser)
        } else {
            clientesService.getCurrentUser().then(res => {
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            })
        }
    }, [currentUser])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-people me-2"></i>Clientes</h1>
        </div>

        <section className="section">
            <div className="card shadow-sm">
                <div className="card-body pt-3">
                    <ul className="nav nav-tabs nav-tabs-bordered mb-4" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button 
                                className={`nav-link ${activeTab === 'activos' ? 'active text-primary' : 'text-muted'}`}
                                onClick={() => setActiveTab('activos')}
                                type="button" 
                                role="tab"
                            >
                                <i className="bi bi-person-check-fill me-2"></i> Clientes Activos
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className={`nav-link ${activeTab === 'inactivos' ? 'active' : 'text-muted'}`}
                                onClick={() => setActiveTab('inactivos')}
                                type="button" 
                                role="tab"
                            >
                                <i className="bi bi-person-x-fill me-2"></i> Clientes Inactivos
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content animate__animated animate__fadeIn">
                        {activeTab === 'activos' && <ClientesActivos activeUser={activeUser} />}
                        {activeTab === 'inactivos' && <ClientesInactivos activeUser={activeUser} />}
                    </div>
                </div>
            </div>
        </section>
    </>
}