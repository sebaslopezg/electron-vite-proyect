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

    const [showHistoryConsoleModal, setShowHistoryConsoleModal] = useState(false)
    const [historyConsoleLogs, setHistoryConsoleLogs] = useState([])

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

    useEffect(() => {
        const fetchHistory = async () => {
            if (window.api && window.api.getSyncHistory) {
                const data = await window.api.getSyncHistory()
                setHistoryData(data || [])
            }
        }
        fetchHistory()
    }, [reloadKey])

    useEffect(() => {
        if (window.api && showConsoleModal) {
            window.api.onSyncProgress((data) => {
                setConsoleLogs((prev) => [...prev, data])
            })
        }
        return () => {
            if (window.api) window.api.removeSyncProgressListeners()
        }
    }, [showConsoleModal])

    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [consoleLogs])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-view-details')
            if (!btn || !container.contains(btn)) return
            
            e.preventDefault()
            try {
                const detailsJson = decodeURIComponent(btn.dataset.details)
                let parsedDetails = {}
                try {
                    parsedDetails = JSON.parse(detailsJson)
                } catch (err) {}
                
                // Si tiene el nuevo formato con logs de consola, mostramos la modal
                if (parsedDetails.consoleLogs) {
                    setHistoryConsoleLogs(parsedDetails.consoleLogs)
                    setShowHistoryConsoleModal(true)
                } else {
                    // Fallback para logs antiguos que solo tenían el error
                    Swal.fire({
                        title: '<i class="bi bi-bug text-danger me-2"></i>Detalles de Errores',
                        html: `<div style="text-align: left; background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 13px;">
                                <pre style="margin:0">${JSON.stringify(parsedDetails, null, 2)}</pre>
                               </div>`,
                        width: '700px',
                        confirmButtonText: 'Cerrar',
                        confirmButtonColor: '#6c757d'
                    })
                }
            } catch(err) { 
                console.error(err) 
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [historyData])

    const handleSaveConfig = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            if (window.api) {
                const res = await window.api.saveSyncConfig({ syncToken, syncUrl })
                if (res.success) {
                    Swal.fire({ icon: 'success', title: '¡Conectado!', text: 'Se obtuvieron los permisos de sincronización.', timer: 2000, showConfirmButton: false })
                    setShowConfigModal(false)
                    window.dispatchEvent(new CustomEvent('sync-rules-updated'))
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
                
                setReloadKey(prev => prev + 1) 

                if (res.success) {
                    if (res.errors > 0) {
                        Swal.fire('Completado con advertencias', `Procesados: ${res.processed}. Registros rechazados/Errores: ${res.errors}. Revisa el historial para más detalles.`, 'warning')
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
                    <h5 className="card-title p-0 m-0"><i className="bi-arrow-left-right me-2 text-primary"></i>Centro de Sincronización</h5>
                    <p className="text-muted small mb-0">Gestiona la comunicación entre tu sistema local y la plataforma web.</p>
                </div>
                <div>
                    <Button variant="secondary" className="me-2 shadow-sm" onClick={() => setShowConfigModal(true)} disabled={isSyncing}>
                        <i className="bi bi-gear-fill me-2"></i>Ajustes de Conexión
                    </Button>
                    <Button variant="primary" className="shadow-sm" onClick={handleForceSync} disabled={isSyncing}>
                        {isSyncing ? <><span className="spinner-border spinner-border-sm me-2" />Sincronizando...</> : <><i className="bi bi-cloud-arrow-up-fill me-2"></i>Forzar Sincronización</>}
                    </Button>
                </div>
            </div>

                <div ref={tableContainerRef}> 
                    <CustomDataTable 
                        tableId="dt-sync-history"
                        key={`sync-history-${reloadKey}`}
                        data={historyData}
                        columns={[
                            { 
                                data: 'fecha', title: 'Fecha y Hora',
                                render: (data) => new Date(data).toLocaleString()
                            },
                            { 
                                data: 'mensaje', title: 'Resultado / Mensaje',
                                render: (data) => {
                                    if (data.includes('Fallo')) return `<i class="text-danger bi bi-x-circle me-1"></i>${data}`
                                    if (data.includes('Errores: 0') || data.includes('Advertencias/Errores: 0')) return `<i class="text-success bi bi-check-circle me-1"></i>${data}`
                                    return `<i class="text-warning bi bi-exclamation-triangle me-1"></i>${data}`
                                }
                            },
                            {
                                data: 'detalles', title: 'Detalles', orderable: false, className: 'text-center',
                                render: (data) => {
                                    if (!data) return '<span class="text-muted small">Ninguno</span>'
                                    const safeData = encodeURIComponent(data)
                                    return `<button class="btn btn-sm btn-secondary btn-view-details" data-details="${safeData}"><i class="bi bi-terminal me-1"></i>Ver detalles</button>`
                                }
                            }
                        ]}
                    />
                </div>

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

            {/* MODAL CONSOLA DE SINCRONIZACIÓN EN VIVO */}
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

            {/* MODAL CONSOLA DE HISTORIAL (ESTÁTICA) */}
            <Modal show={showHistoryConsoleModal} onHide={() => setShowHistoryConsoleModal(false)} size="lg" centered>
                <Modal.Header className="bg-dark text-white border-secondary">
                    <Modal.Title className="fs-6 font-monospace">
                        <i className="bi bi-clock-history me-2"></i>Historial de Consola
                    </Modal.Title>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistoryConsoleModal(false)}></button>
                </Modal.Header>
                <Modal.Body className="bg-dark p-0">
                    <div style={{ height: '350px', overflowY: 'auto', backgroundColor: '#1e1e1e', padding: '15px', fontFamily: 'monospace', fontSize: '13px' }}>
                        {historyConsoleLogs.length === 0 && <div className="text-muted">No hay registros de consola guardados.</div>}
                        {historyConsoleLogs.map((log, i) => (
                            <div key={i} className={`mb-1 ${getColorClass(log.type)}`}>
                                <span className="text-secondary me-2">[{log.time}]</span>
                                {log.text}
                            </div>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-dark border-secondary">
                    <Button variant="outline-light" size="sm" onClick={() => setShowHistoryConsoleModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}