import { useState, useEffect, useRef } from 'react'
import { Card, Form, Button, Row, Col, Modal, Alert } from 'react-bootstrap'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'

export const Sincronizacion = ({ currentUser }) => {
    // Estados Configuración
    const [syncToken, setSyncToken] = useState('')
    const [syncUrl, setSyncUrl] = useState('')
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Estados Sincronización & Consola
    const [isSyncing, setIsSyncing] = useState(false)
    const [showConsoleModal, setShowConsoleModal] = useState(false)
    const [consoleLogs, setConsoleLogs] = useState([])
    const consoleEndRef = useRef(null)

    // Estados Historial
    const [historyData, setHistoryData] = useState([])
    const [reloadKey, setReloadKey] = useState(0)
    const tableContainerRef = useRef(null)

    // 1. Cargar configuración inicial
    useEffect(() => {
        const loadSettings = async () => {
            if (window.api) {
                const config = await window.api.getSyncConfig()
                if (config) {
                    setSyncToken(config.syncToken || '')
                    setSyncUrl(config.syncUrl || '')
                }
            }
        }
        loadSettings()
    }, [])

    // 2. Cargar historial de la base de datos local
    useEffect(() => {
        const fetchHistory = async () => {
            if (window.api && window.api.getSyncHistory) {
                const data = await window.api.getSyncHistory()
                setHistoryData(data || [])
            }
        }
        fetchHistory()
    }, [reloadKey])

    // 3. Escuchar eventos de la consola en tiempo real
    useEffect(() => {
        if (window.api && showConsoleModal) {
            window.api.onSyncProgress((data) => {
                setConsoleLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), ...data }])
            })
        }
        return () => {
            if (window.api) window.api.removeSyncProgressListeners()
        }
    }, [showConsoleModal])

    // 4. Auto-scroll de la consola
    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [consoleLogs])

    // 5. Manejador de clics para ver el JSON de errores en la tabla
    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-view-error')
            if (!btn || !container.contains(btn)) return
            
            e.preventDefault()
            try {
                const errorJson = decodeURIComponent(btn.dataset.errors)
                const parsedErrors = JSON.parse(errorJson)
                
                Swal.fire({
                    title: '<i class="bi bi-bug text-danger me-2"></i>Detalles de Errores',
                    html: `<div style="text-align: left; background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 13px;">
                            <pre style="margin:0">${JSON.stringify(parsedErrors, null, 2)}</pre>
                           </div>`,
                    width: '700px',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d'
                })
            } catch(err) { 
                console.error(err) 
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [historyData]) // Dependemos de historyData para re-atar eventos si la tabla cambia

    const handleSaveConfig = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            if (window.api) {
                const res = await window.api.saveSyncConfig({ syncToken, syncUrl })
                if (res.success) {
                    Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false })
                    setShowConfigModal(false)
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la configuración.', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleForceSync = async () => {
        if (!syncToken || !syncUrl) {
            return Swal.fire('Atención', 'Debes configurar la URL y el Token de Sincronización primero.', 'warning')
        }

        setConsoleLogs([])
        setShowConsoleModal(true)
        setIsSyncing(true)

        try {
            if (window.api) {
                const res = await window.api.forceSyncNow()
                
                // Sin importar el resultado, recargamos el historial
                setReloadKey(prev => prev + 1) 

                if (res.success) {
                    if (res.errors > 0) {
                        Swal.fire('Completado con advertencias', `Procesados: ${res.processed}. Registros rechazados: ${res.errors}. Revisa el historial para más detalles.`, 'warning')
                    } else {
                        Swal.fire('Sincronización Completada', `Enviados exitosamente a la nube.`, 'success')
                    }
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        } catch (error) {
            Swal.fire('Error Crítico', error.message, 'error')
            setReloadKey(prev => prev + 1) 
        } finally {
            setIsSyncing(false)
        }
    }

    const getColorClass = (type) => {
        switch (type) {
            case 'success': return 'text-success'
            case 'error': return 'text-danger fw-bold'
            case 'warning': return 'text-warning'
            default: return 'text-info'
        }
    }

    return (
        <div className="animation-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="fw-bold mb-0"><i className="bi bi-cloud-sync me-2 text-primary"></i>Centro de Sincronización</h5>
                    <p className="text-muted small mb-0">Gestiona la comunicación entre tu sistema local y la plataforma web.</p>
                </div>
                <div>
                    <Button variant="outline-secondary" className="me-2 shadow-sm" onClick={() => setShowConfigModal(true)} disabled={isSyncing}>
                        <i className="bi bi-gear-fill me-2"></i>Ajustes de Conexión
                    </Button>
                    <Button variant="primary" className="shadow-sm" onClick={handleForceSync} disabled={isSyncing}>
                        {isSyncing ? <><span className="spinner-border spinner-border-sm me-2" />Sincronizando...</> : <><i className="bi bi-cloud-arrow-up-fill me-2"></i>Forzar Sincronización</>}
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-light fw-bold border-bottom">
                    <i className="bi bi-clock-history me-2"></i>Historial de Sincronizaciones
                </Card.Header>
                <Card.Body className="p-0">
                    {/* Contenedor con ref para delegar los clics del botón Ver JSON */}
                    <div ref={tableContainerRef}> 
                        <CustomDataTable 
                            tableId="dt-sync-history"
                            key={`sync-history-${reloadKey}`}
                            data={historyData} // <-- Ahora pasamos el arreglo directamente
                            columns={[
                                { 
                                    data: 'fecha', title: 'Fecha y Hora',
                                    render: (data) => new Date(data).toLocaleString()
                                },
                                { 
                                    data: 'mensaje', title: 'Resultado / Mensaje',
                                    render: (data) => {
                                        if (data.includes('Fallo')) return `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>${data}</span>`
                                        if (data.includes('Errores devueltos: 0')) return `<span class="text-success fw-bold"><i class="bi bi-check-circle me-1"></i>${data}</span>`
                                        return `<span class="text-warning fw-bold"><i class="bi bi-exclamation-triangle me-1"></i>${data}</span>`
                                    }
                                },
                                {
                                    data: 'detalles', title: 'Detalles (Errores)', orderable: false, className: 'text-center',
                                    render: (data) => {
                                        if (!data) return '<span class="text-muted small">Ninguno</span>'
                                        const safeData = encodeURIComponent(data)
                                        // Usamos data-errors para capturar el clic en el useEffect
                                        return `<button class="btn btn-sm btn-outline-danger btn-view-error" data-errors="${safeData}"><i class="bi bi-bug me-1"></i>Ver Errores</button>`
                                    }
                                }
                            ]}
                        />
                    </div>
                </Card.Body>
            </Card>

            {/* MODAL DE CONFIGURACIÓN */}
            <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} centered>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5"><i className="bi bi-link-45deg me-2 text-primary"></i>Ajustes de Conexión Web</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveConfig}>
                    <Modal.Body>
                        <Alert variant="info" className="small">
                            El <strong>Token</strong> y la <strong>URL</strong> son obligatorios para conectar con tu panel en la nube.
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">URL del Sistema Web</Form.Label>
                            <Form.Control type="url" placeholder="Ej: http://localhost:3000 o https://mitienda.com" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Token de Sincronización (x-sync-token)</Form.Label>
                            <Form.Control type="password" placeholder="Pegar token aquí..." value={syncToken} onChange={(e) => setSyncToken(e.target.value)} required />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConfigModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL CONSOLA DE SINCRONIZACIÓN */}
            <Modal show={showConsoleModal} onHide={() => !isSyncing && setShowConsoleModal(false)} size="lg" centered backdrop={isSyncing ? 'static' : true} keyboard={!isSyncing}>
                <Modal.Header className="bg-dark text-white border-secondary">
                    <Modal.Title className="fs-6 font-monospace">
                        <i className="bi bi-terminal me-2"></i>Consola de Sincronización
                    </Modal.Title>
                    {!isSyncing && <button type="button" className="btn-close btn-close-white" onClick={() => setShowConsoleModal(false)}></button>}
                </Modal.Header>
                <Modal.Body className="bg-dark p-0">
                    <div style={{ height: '350px', overflowY: 'auto', backgroundColor: '#1e1e1e', padding: '15px', fontFamily: 'monospace', fontSize: '13px' }}>
                        {consoleLogs.length === 0 && <div className="text-muted">Esperando inicio del proceso...</div>}
                        {consoleLogs.map((log, i) => (
                            <div key={i} className={`mb-1 ${getColorClass(log.type)}`}>
                                <span className="text-secondary me-2">[{log.time}]</span>
                                {log.text}
                            </div>
                        ))}
                        <div ref={consoleEndRef} />
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-dark border-secondary">
                    <Button variant="outline-light" size="sm" onClick={() => setShowConsoleModal(false)} disabled={isSyncing}>
                        {isSyncing ? 'Trabajando...' : 'Cerrar Terminal'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}