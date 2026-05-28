import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalComprobante } from './components/ModalComprobante'
import { ModalVerComprobante } from './components/ModalVerComprobante'

export const Comprobantes = ({ currentUser }) => {
    const [showModalEdit, setShowModalEdit] = useState(false)
    const [showModalView, setShowModalView] = useState(false)
    
    const [reloadTable, setReloadTable] = useState(0)
    const [comprobanteActivo, setComprobanteActivo] = useState(null)
    const tableContainerRef = useRef(null)

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    const handleNuevo = () => {
        setComprobanteActivo(null)
        setShowModalEdit(true)
    }

    const handleAccion = async (id, accion) => {
        const res = await window.contaAPI.getComprobanteDetalle(id)
        if (res.success) {
            setComprobanteActivo(res.data)
            if (accion === 'ver') setShowModalView(true)
            else if (accion === 'editar') setShowModalEdit(true)
        } else { Swal.fire('Error', res.error, 'error') }
    }

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-id]')
            if (!btn || !container.contains(btn)) return
            
            const id = btn.dataset.id
            if (btn.classList.contains('btn-view')) handleAccion(id, 'ver')
            else if (btn.classList.contains('btn-edit')) handleAccion(id, 'editar')
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    return <>
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Comprobantes Contables</h5>
                {hasPermission('comprobantes_crear') && (
                    <button className="btn btn-primary" onClick={handleNuevo}>
                        <i className="bi bi-plus-circle me-2"></i>Nuevo Asiento
                    </button>
                )}
            </div>

            <div ref={tableContainerRef} className="w-100 overflow-hidden">
                <CustomDataTable 
                    tableId="dt-comprobantes-contables"
                    key={`comprobantes-${reloadTable}-${currentUser?.permisos?.length}`} 
                    ajaxData={(params) => window.contaAPI.getComprobantesPaginados(params)}
                    columns={[
                        { data: 'numero_comprobante', title: 'Número', render: (d) => `<span class="fw-bold"># ${d}</span>` },
                        { data: 'fecha', title: 'Fecha', render: (d) => new Date(d).toLocaleDateString('es-CO') },
                        { data: 'concepto', title: 'Concepto' },
                        { data: 'documento_referencia', title: 'Doc. Referencia' },
                        { data: 'total', title: 'Total Comprobante', className: 'text-end', render: (d) => `<span class="fw-medium text-success">${formatMoney(d)}</span>` },
                        { data: 'estado', title: 'Estado', className: 'text-center', render: (d) => d === 1 ? '<span class="badge bg-success">Asentado</span>':'<span class="badge bg-danger">Anulado</span>' },
                        {
                            data: null, title: 'Acciones', orderable: false, className: 'text-end pe-4',
                            render: function (data, type, row) {
                                const canEdit = hasPermission('comprobantes_editar');
                                return `
                                    <button class="btn btn-sm btn-info text-white me-2 btn-view" data-id="${row.id}" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                                    ${canEdit ? `<button class="btn btn-sm btn-secondary btn-edit" data-id="${row.id}" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                                `
                            }
                        }
                    ]}
                />
            </div>

            <ModalComprobante show={showModalEdit} handleClose={() => setShowModalEdit(false)} onSuccess={() => setReloadTable(prev => prev + 1)} editData={comprobanteActivo} />
            <ModalVerComprobante show={showModalView} handleClose={() => setShowModalView(false)} data={comprobanteActivo} />
        </div>
    </>
}