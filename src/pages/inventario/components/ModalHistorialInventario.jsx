import { useRef, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import CustomDataTable from '../../../components/DataTableComponent'
import { inventarioService } from '../../../services/inventarioService'

export const ModalHistorialInventario = ({ 
    show, 
    handleClose, 
    historyProductId, 
    historyTitle, 
    appConfig,
    onVerFactura
}) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        
        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-view-factura-global')
            if (btn && container.contains(btn)) {
                e.preventDefault()
                if (onVerFactura) onVerFactura(btn.dataset.fullnum)
            }
        }
        
        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [onVerFactura])

    return <>
        <Modal show={show} onHide={handleClose} size="xl" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-clock-history me-2"></i>{historyTitle}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-3" ref={containerRef}>
                {historyProductId && (
                    <CustomDataTable 
                        tableId="dt-inventario-historial-movimientos"
                        key={`history-${historyProductId}-${appConfig.formato_numero}`}
                        ajaxData={(params) => {
                            params.productoId = historyProductId;
                            return inventarioService.getInventarioHistoryPaginados(params);
                        }}
                        columns={[
                            { 
                                data: 'fecha', title: 'Fecha', 
                                render: (data) => {
                                    if (!data) return '-';
                                    return new Date(data).toLocaleString(appConfig.formato_numero, {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                    });
                                }
                            },
                            { 
                                data: 'tipo_movimiento', title: 'Tipo',
                                render: (data) => {
                                    const val = data ? data.toLowerCase() : '';
                                    let badgeClass = 'secondary';
                                    if (val === 'ingreso' || val === 'entrada' || val === 'creacion_producto') badgeClass = 'success';
                                    if (val === 'egreso' || val === 'salida' || val === 'venta') badgeClass = 'danger';
                                    return `<span class="badge bg-${badgeClass}">${(data||'').toUpperCase()}</span>`;
                                }
                            },
                            { data: 'cantidad', title: 'Cant.' },
                            { data: 'stock_anterior', title: 'Antes' },
                            { data: 'stock_nuevo', title: 'Después' },
                            { data: 'usuario', title: 'Usuario', render: (d) => `<span class="fw-bold text-dark">@${d || 'system'}</span>` },
                            { 
                                data: 'notas', 
                                title: 'Motivo / Descripción', 
                                render: (data) => data 
                                    ? `<div style="max-width: 300px; white-space: normal; line-height: 1.3;"><small class="text-muted">${data}</small></div>` 
                                    : '<span class="text-muted fst-italic">-</span>' 
                            }
                        ]}
                    />
                )}
            </Modal.Body>
            <Modal.Header className="bg-light border-top p-2 d-flex justify-content-end">
                <Button variant="secondary" size="sm" onClick={handleClose}>Cerrar</Button>
            </Modal.Header>
        </Modal>
    </>
}