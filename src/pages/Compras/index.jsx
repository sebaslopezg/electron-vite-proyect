import { useState, useRef } from 'react'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalCompra } from './components/ModalCompra'

export const Compras = () => {
    const [showModal, setShowModal] = useState(false)
    const [reloadTable, setReloadTable] = useState(0)
    const tableContainerRef = useRef(null)

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0 text-primary"><i className="bi bi-cart4 me-2"></i>Facturas de Compras y Gastos</h4>
                    <p className="text-muted small mb-0">Gestiona las compras de mercancía y los gastos operativos del negocio.</p>
                </div>
                <button className="btn btn-primary shadow-sm" onClick={() => setShowModal(true)}>
                    <i className="bi bi-plus-circle me-2"></i>Registrar Compra
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div ref={tableContainerRef} className="card-body w-100 overflow-hidden">
                    <CustomDataTable 
                        key={`compras-${reloadTable}`} 
                        ajaxData={(params) => window.comprasAPI.getComprasPaginadas(params)}
                        columns={[
                            { 
                                data: 'date_created', title: 'Fecha Registro',
                                render: (data) => new Date(data).toLocaleDateString('es-CO')
                            },
                            { 
                                data: 'numero_factura', title: 'N° Factura',
                                render: (data) => `<span class="fw-bold"># ${data}</span>`
                            },
                            { data: 'nombre_proveedor', title: 'Proveedor' },
                            { data: 'documento_proveedor', title: 'NIT/CC' },
                            { 
                                data: 'total_factura', title: 'Total Factura', className: 'text-end',
                                render: (data) => `<span class="fw-medium text-success">${formatMoney(data)}</span>`
                            },
                            { 
                                data: 'estado', title: 'Estado', className: 'text-center',
                                render: (data) => {
                                    if (data === 'pagada') return '<span class="badge bg-success">Pagada</span>';
                                    if (data === 'pendiente') return '<span class="badge bg-warning text-dark">Pendiente (CxP)</span>';
                                    return '<span class="badge bg-secondary">Anulada</span>';
                                }
                            },
                            {
                                data: null, title: 'Acciones', orderable: false, className: 'text-center',
                                render: function (data, type, row) {
                                    return `
                                        <button class="btn btn-sm btn-info text-white me-2 btn-view" data-id="${row.id}" title="Ver Detalles">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    `;
                                }
                            }
                        ]}
                    />
                </div>
            </div>

            <ModalCompra 
                show={showModal} 
                handleClose={() => setShowModal(false)} 
                onSuccess={() => setReloadTable(prev => prev + 1)} 
            />
        </div>
    );
};