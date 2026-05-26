import { useState, useEffect } from 'react'
import { ModalAbono } from './components/ModalAbono'
import { TabCuentasPorCobrar } from './components/CuentasPorCobrar'
import { TabHistorialAbonos } from './components/HistorialAbonos'

export const Cartera = ({ currentUser }) => {
    const [reloadKey, setReloadKey] = useState(0)
    const [almacenConf, setAlmacenConf] = useState(null)
    const [activeTab, setActiveTab] = useState('') 
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const [showModal, setShowModal] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const canSeeCobrar = hasPermission('cartera_ver') || hasPermission('cartera_abonos_ver')
    const canSeeHistorial = hasPermission('cartera_historial_ver')

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

    useEffect(() => {
        if (canSeeCobrar) {
            setActiveTab('cobrar')
        } else if (canSeeHistorial) {
            setActiveTab('abonos')
        }
    }, [currentUser])

    const handleOpenModal = (factura) => {
        setShowModal(true)
        setFacturaSeleccionada(factura)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFacturaSeleccionada(null)
    }

    const handlePagoExitoso = () => {
        setReloadKey(prev => prev + 1);
    }

    if (!canSeeCobrar && !canSeeHistorial) {
        return (
            <div className="alert alert-warning m-4 text-center shadow-sm border-warning">
                <i className="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <h6 className="fw-bold">Sin Accesos Permitidos</h6>
                <p className="small m-0 text-muted">Tu rol actual no cuenta con permisos asignados para auditar saldos ni ver registros de cartera.</p>
            </div>
        )
    }

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-wallet2 me-2"></i>Cartera</h1>
        </div>

        <section className="section">
            <div className="card shadow-sm border-0">
                <div className="card-body pt-3">
                    
                    <ul className="nav nav-tabs nav-tabs-bordered mb-4" role="tablist">
                        {canSeeCobrar && (
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'cobrar' ? 'active text-primary' : 'text-secondary'}`}
                                    onClick={() => setActiveTab('cobrar')}
                                >
                                    Cuentas por Cobrar
                                </button>
                            </li>
                        )}
                        {canSeeHistorial && (
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'abonos' ? 'active text-primary' : 'text-secondary'}`}
                                    onClick={() => setActiveTab('abonos')}
                                >
                                    Historial de Abonos
                                </button>
                            </li>
                        )}
                    </ul>

                    <div className="tab-content pt-2 animate__animated animate__fadeIn">
                        {activeTab === 'cobrar' && canSeeCobrar && (
                            <TabCuentasPorCobrar 
                                reloadKey={reloadKey}
                                onOpenModal={handleOpenModal} 
                                appConfig={appConfig}
                                currentUser={currentUser}
                            />
                        )}
                        
                        {activeTab === 'abonos' && canSeeHistorial && (
                            <TabHistorialAbonos 
                                reloadKey={reloadKey}
                                almacenConf={almacenConf}
                                appConfig={appConfig}
                                currentUser={currentUser}
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
            currentUser={currentUser}
        />
    </>
}