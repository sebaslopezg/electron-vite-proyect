import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalCompra } from './components/ModalCompra'
import { ModalVerCompra } from './components/ModalVerCompra'

export const Compras = ({ currentUser }) => {
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false)
    const [compraSeleccionada, setCompraSeleccionada] = useState(null)
    const [reloadTable, setReloadTable] = useState(0);
    const tableContainerRef = useRef(null);

    // Validador de permisos interno para la interfaz de compras
    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    const handleVerDetalles = async (id) => {
        try {
            const res = await window.comprasAPI.getCompraDetalle(id)
            if (res.success) {
                setCompraSeleccionada(res.data)
                setShowViewModal(true)
            } else {
                Swal.fire('Error', res.error, 'error')
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un problema al cargar los detalles.', 'error')
        }
    };

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-id]')
            if (!btn || !container.contains(btn)) return
            
            const id = btn.dataset.id
            
            if (btn.classList.contains('btn-view')) {
                handleVerDetalles(id)
            }
        }

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    return (
        <div>
            <div className="pagetitle">
                <h1><i className="bi bi-cart4 me-2"></i>Compras y Gastos</h1>
            </div>

            <div className="card shadow-sm border-0">
                <div ref={tableContainerRef} className="card-body pt-4 w-100 overflow-hidden">
                    
                    {hasPermission('compras_crear') && (
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <button className="btn btn-primary shadow-sm" onClick={() => setShowModal(true)}>
                                <i className="bi bi-plus-circle me-2"></i>Registrar Compra
                            </button>
                        </div>
                    )}

                    <CustomDataTable 
                        tableId="dt-compras-maestro" // <-- CORREGIDO: ID único para el almacenamiento de estado en caché permanente
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

            <ModalVerCompra
                show={showViewModal}
                handleClose={() => setShowViewModal(false)}
                data={compraSeleccionada}
            />
        </div>
    );
};