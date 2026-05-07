import { useState, useRef, useEffect } from 'react'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalComprobante } from './components/ModalComprobante'

export const Comprobantes = () => {
    const [showModal, setShowModal] = useState(false);
    const [reloadTable, setReloadTable] = useState(0);
    const tableContainerRef = useRef(null);

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    return <>
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Comprobantes Contables</h5>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                        }
                    ]}
                />
            </div>
            <ModalComprobante show={showModal} handleClose={() => setShowModal(false)} onSuccess={() => setReloadTable(prev => prev + 1)} />
        </div>
    </>
}