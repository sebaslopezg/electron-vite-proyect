import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalComprobante } from './components/ModalComprobante'

export const Comprobantes = () => {
    const [showModal, setShowModal] = useState(false);
    const [reloadTable, setReloadTable] = useState(0);
    const [comprobanteAEditar, setComprobanteAEditar] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    
    const tableContainerRef = useRef(null);

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    const handleNuevo = () => {
        setComprobanteAEditar(null);
        setIsViewOnly(false);
        setShowModal(true);
    };

    const handleAccion = async (id, accion) => {
        const res = await window.contaAPI.getComprobanteDetalle(id);
        if (res.success) {
            setComprobanteAEditar(res.data);
            setIsViewOnly(accion === 'ver');
            setShowModal(true);
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-id]');
            if (!btn) return;
            
            const id = btn.dataset.id;
            if (btn.classList.contains('btn-view')) {
                handleAccion(id, 'ver');
            } else if (btn.classList.contains('btn-edit')) {
                handleAccion(id, 'editar');
            }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Comprobantes Contables</h5>
                <button className="btn btn-primary" onClick={handleNuevo}>
                    <i className="bi bi-plus-circle me-2"></i>Nuevo Asiento
                </button>
            </div>

            <div ref={tableContainerRef} className="w-100 overflow-hidden">
                <CustomDataTable 
                    key={`comprobantes-${reloadTable}`} 
                    ajaxData={(params) => window.contaAPI.getComprobantesPaginados(params)}
                    columns={[
                        { 
                            data: 'numero_comprobante', title: 'Número',
                            render: (data) => `<span class="fw-bold"># ${data}</span>`
                        },
                        { 
                            data: 'fecha', title: 'Fecha',
                            render: (data) => new Date(data).toLocaleDateString('es-CO')
                        },
                        { data: 'concepto', title: 'Concepto' },
                        { data: 'documento_referencia', title: 'Doc. Referencia' },
                        { 
                            data: 'total', title: 'Total Comprobante', className: 'text-end',
                            render: (data) => `<span class="fw-medium text-success">${formatMoney(data)}</span>`
                        },
                        { 
                            data: 'estado', title: 'Estado', className: 'text-center',
                            render: (data) => {
                                return data === 1 
                                    ? '<span class="badge bg-success">Asentado</span>'
                                    : '<span class="badge bg-danger">Anulado</span>'
                            }
                        },
                        {
                            data: null, title: 'Acciones', orderable: false, className: 'text-end pe-4',
                            render: function (data, type, row) {
                                return `
                                    <button class="btn btn-sm btn-info text-white me-2 btn-view" data-id="${row.id}" title="Ver Detalle">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary btn-edit" data-id="${row.id}" title="Editar">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                `
                            }
                        }
                    ]}
                />
            </div>
            <ModalComprobante 
                show={showModal} 
                handleClose={() => setShowModal(false)} 
                onSuccess={() => setReloadTable(prev => prev + 1)} 
                editData={comprobanteAEditar}
                isViewOnly={isViewOnly}
            />
        </div>
    )
}