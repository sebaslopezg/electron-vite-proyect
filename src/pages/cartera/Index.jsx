import { useState, useEffect } from 'react'
import { ModalAbono } from './components/ModalAbono'

import { TabCuentasPorCobrar } from './components/CuentasPorCobrar'
import { TabHistorialAbonos } from './components/HistorialAbonos'

export const Cartera = () => {

    const [carteraData, setCarteraData] = useState([])
    const [abonosData, setAbonosData] = useState([])
    const [almacenConf, setAlmacenConf] = useState(null)
    const [activeTab, setActiveTab] = useState('cobrar') 

    const [showModal, setShowModal] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)

    const loadDatos = async () => {
        const cuentas = await window.api.getCartera()
        setCarteraData(cuentas || [])

        const historial = await window.api.getAbonos()
        if (historial && historial.success) {
            setAbonosData(historial.data || [])
            setAlmacenConf(historial.configuracion || null)
        } else {
            setAbonosData(historial || [])
        }
    }

    useEffect(() => {
        loadDatos()
    }, [])

    const handleOpenModal = (factura) => {
        setFacturaSeleccionada(factura)
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFacturaSeleccionada(null)
    }

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-wallet2 me-2"></i>Cartera</h1>
        </div>

        <section className="section">
            <div className="card">
                <div className="card-body pt-3">
                    
                    <ul className="nav nav-tabs nav-tabs-bordered mb-4">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'cobrar' ? 'active text-primary' : 'text-secondary'}`}
                                onClick={() => setActiveTab('cobrar')}
                            >
                                Cuentas por Cobrar
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'abonos' ? 'active text-primary' : 'text-secondary'}`}
                                onClick={() => setActiveTab('abonos')}
                            >
                                Historial de Abonos
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content pt-2">
                        {activeTab === 'cobrar' && (
                            <TabCuentasPorCobrar 
                                carteraData={carteraData} 
                                onOpenModal={handleOpenModal} 
                            />
                        )}
                        
                        {activeTab === 'abonos' && (
                            <TabHistorialAbonos 
                                abonosData={abonosData} 
                                almacenConf={almacenConf}
                            />
                        )}
                    </div>

                </div>
            </div>
        </section>

        {/* MODAL EXTERNO */}
        <ModalAbono 
            show={showModal} 
            onClose={handleCloseModal} 
            factura={facturaSeleccionada} 
            onSuccess={loadDatos} 
        />
    </>
}