import { useState, useEffect } from 'react'
import { ModalAbono } from './components/ModalAbono'

import { TabCuentasPorCobrar } from './components/CuentasPorCobrar'
import { TabHistorialAbonos } from './components/HistorialAbonos'
 
export const Cartera = () => {
    const [reloadKey, setReloadKey] = useState(0)
    const [almacenConf, setAlmacenConf] = useState(null)
    const [activeTab, setActiveTab] = useState('cobrar') 
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const [showModal, setShowModal] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)

    const loadConfig = async () => {
        const configData = await window.api.getConfiguracion();
        const confAppRaw = configData.find(c => c.key === 'confApp');
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value);
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                });
            } catch(e) {}
        }
    };

    const loadAlmacenInfo = async () => {
        try {
            const data = await window.api.getAllConfAlmacen();
            if (data && data.length > 0) setAlmacenConf(data[0]);
        } catch (error) {
            console.error("Error cargando info de almacén", error);
        }
    };

    useEffect(() => {
        loadAlmacenInfo();
        loadConfig();
        window.addEventListener('config-actualizada', loadConfig);
        return () => window.removeEventListener('config-actualizada', loadConfig);
    }, [])

    const handleOpenModal = (factura) => {
        setFacturaSeleccionada(factura)
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFacturaSeleccionada(null)
    }

    const handlePagoExitoso = () => {
        setReloadKey(prev => prev + 1);
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
                                reloadKey={reloadKey}
                                onOpenModal={handleOpenModal} 
                                appConfig={appConfig}
                            />
                        )}
                        
                        {activeTab === 'abonos' && (
                            <TabHistorialAbonos 
                                reloadKey={reloadKey}
                                almacenConf={almacenConf}
                                appConfig={appConfig}
                            />
                        )}
                    </div>

                </div>
            </div>
        </section>

        <ModalAbono 
            show={showModal} 
            onClose={handleCloseModal} 
            factura={facturaSeleccionada} 
            onSuccess={handlePagoExitoso} 
            appConfig={appConfig}
        />
    </>
}