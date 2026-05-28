import { useState, useEffect, useRef, useMemo } from 'react'
import { Button, Form, Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalVerLog } from './components/ModalVerLog'

export const Logs = () => {
    const [logs, setLogs] = useState([])
    const [reloadKey, setReloadKey] = useState(0)

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [logType, setLogType] = useState('')
    const [logModule, setLogModule] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [selectedLog, setSelectedLog] = useState(null)

    const tableContainerRef = useRef(null)

    const loadLogs = async () => {
        const data = await window.api.getSystemLogs(2000)
        setLogs(data || []);
    };

    useEffect(() => {
        loadLogs()
    }, [reloadKey])

    const handleClearLogs = async () => {
        const confirm = await Swal.fire({
            title: '¿Vaciar Logs del Sistema?',
            text: 'Esta acción eliminará el historial de auditoría y errores de forma definitiva. ¿Estás seguro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, limpiar historial',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            const res = await window.api.clearSystemLogs()
            if (res.success) {
                Swal.fire('Vaciado', 'El registro de logs ha sido limpiado.', 'success')
                setReloadKey(prev => prev + 1)
            } else {
                Swal.fire('Error', res.error, 'error')
            }
        }
    }

    const listaModulosDisponibles = useMemo(() => {
        const modulosSet = new Set(logs.map(log => log.modulo).filter(Boolean))
        return Array.from(modulosSet).sort()
    }, [logs])

    const logsFiltrados = useMemo(() => {
        return logs.filter(log => {
            if (logType && log.tipo !== logType) return false;
            if (logModule && log.modulo !== logModule) return false;

            if (startDate) {
                const dateStart = new Date(startDate);
                const logDate = new Date(log.fecha);
                if (logDate < dateStart) return false;
            }

            if (endDate) {
                const dateEnd = new Date(endDate);
                const logDate = new Date(log.fecha);
                if (logDate > dateEnd) return false;
            }

            return true;
        });
    }, [logs, logType, logModule, startDate, endDate]);

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-view-log')
            if (!btn || !container.contains(btn)) return
            
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata))
                setSelectedLog(item)
                setShowModal(true)
            } catch(err) { 
                console.error("Error leyendo metadatos del log", err) 
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [logsFiltrados])

    const columnas = [
        { 
            data: 'fecha', 
            title: 'Fecha / Hora',
            render: (data) => data ? new Date(data).toLocaleString() : '-'
        },
        { 
            data: 'tipo', 
            title: 'Tipo',
            render: (data) => {
                let color = 'info';
                if(data === 'ERROR') color = 'danger';
                if(data === 'WARNING') color = 'warning text-dark';
                if(data === 'SUCCESS') color = 'success';
                return `<span class="badge bg-${color} fw-bold">${data}</span>`;
            }
        },
        { 
            data: 'modulo', 
            title: 'Módulo',
            render: (data) => `<span class="badge bg-dark bg-opacity-75">${data}</span>`
        },
        { data: 'mensaje', title: 'Mensaje' },
        { 
            data: null, 
            title: 'Detalle',
            orderable: false,
            className: 'text-center',
            render: (data, type, row) => {
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `
                    <button class="btn btn-sm btn-secondary btn-view-log" data-alldata="${safeData}" title="Inspeccionar Detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                `
            }
        }
    ];

    return <>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h5 className="card-title p-0 m-0"><i className="bi bi-terminal-dash me-2 text-primary fs-4"></i>Auditoría y Logs del Sistema</h5>
                <p className="text-muted small m-0">Registro de movimientos de auditoría, transacciones e incidencias operacionales.</p>
            </div>
            <div>
                <Button variant="outline-primary" size="sm" className="me-2 fw-bold" onClick={() => setReloadKey(prev => prev + 1)}>
                    <i className="bi bi-arrow-clockwise me-1"></i> Refrescar
                </Button>
                <Button variant="outline-danger" size="sm" className="fw-bold" onClick={handleClearLogs}>
                    <i className="bi bi-trash3 me-1"></i> Vaciar Historial
                </Button>
            </div>
        </div>

        <div className="bg-light p-3 rounded mb-4 border">
            <Row className="g-2 align-items-end small">
                <Col md={2}>
                    <Form.Group>
                        <Form.Label className="text-secondary mb-1">Desde Fecha/Hora</Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group>
                        <Form.Label className="text-secondary mb-1">Hasta Fecha/Hora</Form.Label>
                        <Form.Control type="datetime-local" size="sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="text-secondary mb-1">Módulo</Form.Label>
                        <Form.Select size="sm" value={logModule} onChange={e => setLogModule(e.target.value)} className="text-dark">
                            <option value="">-- Todos los módulos --</option>
                            {listaModulosDisponibles.map(mod => (
                                <option key={mod} value={mod}>{mod}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="text-secondary mb-1">Criticidad (Tipo)</Form.Label>
                        <Form.Select size="sm" value={logType} onChange={e => setLogType(e.target.value)}>
                            <option value="">-- Todos los niveles --</option>
                            <option value="INFO">INFO (Lecturas y auditoría común)</option>
                            <option value="SUCCESS">SUCCESS (Guardados y transacciones OK)</option>
                            <option value="WARNING">WARNING (Bypass y advertencias)</option>
                            <option value="ERROR">ERROR (Excepciones y fallas críticas)</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Button 
                        variant="secondary" size="sm"
                        onClick={() => { setStartDate(''); setEndDate(''); setLogType(''); setLogModule(''); }}
                        disabled={!startDate && !endDate && !logType && !logModule}
                    >
                        <i className="bi bi-x-circle me-1"></i> Limpiar
                    </Button>
                </Col>
            </Row>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-hidden">
            <DataTableComponent 
                tableId="dt-configuracion-logs"
                key={`logs-table-${reloadKey}-${logsFiltrados.length}`}
                data={logsFiltrados}
                columns={columnas}
            />
        </div>

        <ModalVerLog 
            show={showModal} 
            onHide={() => { setShowModal(false); setSelectedLog(null); }} 
            log={selectedLog} 
        />
    </>
}