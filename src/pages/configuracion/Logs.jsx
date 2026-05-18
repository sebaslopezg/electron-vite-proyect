import { useState, useEffect } from 'react'
import { Button, Badge } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'

export const Logs = () => {
    const [logs, setLogs] = useState([])
    const [reloadKey, setReloadKey] = useState(0)

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
            text: 'Esta acción eliminará el historial de auditoría y errores. ¿Estás seguro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, limpiar historial'
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

    const getBadgeForType = (tipo) => {
        switch (tipo) {
            case 'ERROR': return <Badge bg="danger">ERROR</Badge>;
            case 'WARNING': return <Badge bg="warning" text="dark">ADVERTENCIA</Badge>
            case 'SUCCESS': return <Badge bg="success">ÉXITO</Badge>
            default: return <Badge bg="info" text="dark">INFO</Badge>
        }
    }

    const columnas = [
        { 
            data: 'fecha', 
            title: 'Fecha / Hora',
            render: (data) => new Date(data).toLocaleString()
        },
        { 
            data: 'tipo', 
            title: 'Tipo',
            render: (data) => {
                let color = 'info';
                if(data==='ERROR') color = 'danger';
                if(data==='WARNING') color = 'warning text-dark';
                if(data==='SUCCESS') color = 'success';
                return `<span class="badge bg-${color}">${data}</span>`;
            }
        },
        { 
            data: 'modulo', 
            title: 'Módulo',
            render: (data) => `<strong>${data}</strong>`
        },
        { data: 'mensaje', title: 'Mensaje' },
        { 
            data: 'detalles', 
            title: 'Detalles',
            render: (data) => data ? `<small class="text-muted fst-italic" style="max-width:300px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${data}">${data}</small>` : '-'
        }
    ];

    return <>

        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h5 className="card-title"><i className="bi bi-terminal-dash me-2"></i>Auditoría y Logs del Sistema</h5>
                <p className="text-muted small m-0">Registro de movimientos, errores y advertencias.</p>
            </div>
            <div>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => setReloadKey(prev => prev + 1)}>
                    <i className="bi bi-arrow-clockwise me-1"></i> Refrescar
                </Button>
                <Button variant="outline-danger" size="sm" onClick={handleClearLogs}>
                    <i className="bi bi-trash3 me-1"></i> Vaciar Historial
                </Button>
            </div>
        </div>

        <DataTableComponent 
            key={`logs-table-${reloadKey}`}
            data={logs}
            columns={columnas}
        />

    </>
}