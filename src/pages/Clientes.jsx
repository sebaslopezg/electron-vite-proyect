import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../components/DataTableComponent'
import { ModalTercero } from './contabilidad/components/ModalTercero'

export const Clientes = ({ currentUser }) => {
    const [showModal, setShowModal] = useState(false)
    const [terceroAEditar, setTerceroAEditar] = useState(null)
    const [reloadTable, setReloadTable] = useState(0)
    const tableContainerRef = useRef(null)

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const handleNuevo = () => {
      setTerceroAEditar(null)
      setShowModal(true)
    }

    const handleEditar = (tercero) => {
      setTerceroAEditar(tercero)
      setShowModal(true)
    }

    const handleEliminar = (id, nombre) => {
        Swal.fire({
            title: '¿Desactivar Cliente?',
            text: `Borrarás a "${nombre}". Las facturas antiguas se mantendrán, pero no podrás facturarle nuevamente.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await window.contaAPI.eliminarTercero(id)
                if (res.success) {
                    Swal.fire('¡Eliminado!', 'El cliente ha sido borrado.', 'success')
                    setReloadTable(prev => prev + 1)
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        })
    }

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-alldata]')
            if (!btn || !container.contains(btn)) return
            
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata))
                if (btn.classList.contains('btn-edit')) handleEditar(item)
                else if (btn.classList.contains('btn-delete')) handleEliminar(item.id, item.tipo_persona === 'juridica' ? item.razon_social : `${item.nombres} ${item.apellidos}`)
            } catch(err) { console.error(err) }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    return (
        <div>
            <div className="pagetitle">
                <h1><i className="bi bi-people me-2"></i>Clientes</h1>
            </div>

            <div className="card">
                <div className="card-body pt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="card-title mb-0">Listado de Clientes Activos</h5>
                        
                        {hasPermission('clientes_crear') && (
                            <button className="btn btn-primary" onClick={handleNuevo}>
                                <i className="bi bi-plus-circle me-2"></i>Nuevo Cliente
                            </button>
                        )}
                    </div>

                    <div ref={tableContainerRef} className="w-100 overflow-hidden">
                        <CustomDataTable 
                            key={`clientes-${reloadTable}-${currentUser?.permisos?.length}`} 
                            ajaxData={(params) => window.contaAPI.getTercerosPaginados({ ...params, soloClientes: true })}
                            columns={[
                                { 
                                    data: null, title: 'Documento',
                                    render: (data, type, row) => `${row.tipo_documento} ${row.numero_documento}${row.digito_verificacion ? `-${row.digito_verificacion}` : ''}`
                                },
                                { 
                                    data: null, title: 'Nombre / Razón Social',
                                    render: (data, type, row) => `<i class="bi ${row.tipo_persona === 'juridica' ? 'bi-building':'bi-person'} text-secondary me-2"></i>${row.tipo_persona === 'juridica' ? row.razon_social : `${row.nombres} ${row.apellidos}`}`
                                },
                                { 
                                    data: null, title: 'Contacto',
                                    render: (data, type, row) => `<div class="small text-muted">${row.telefono ? `<div><i class="bi bi-telephone me-1"></i>${row.telefono}</div>`:''}${row.email ? `<div><i class="bi bi-envelope me-1"></i>${row.email}</div>`:''}</div>`
                                },
                                { 
                                    data: 'estado', title: 'Estado', className: 'text-center',
                                    render: (d) => d === 1 ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>'
                                },
                                {
                                    data: null, title: 'Acciones', orderable: false, className: 'text-end pe-4',
                                    render: function (data, type, row) {
                                        const safeData = encodeURIComponent(JSON.stringify(row));
                                        
                                        const canEdit = hasPermission('clientes_editar');
                                        const canDelete = hasPermission('clientes_eliminar');

                                        return `
                                            ${canEdit ? `<button class="btn btn-sm btn-outline-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                                            ${canDelete ? `<button class="btn btn-sm btn-outline-danger btn-delete" data-alldata="${safeData}" title="Eliminar"><i class="bi bi-trash"></i></button>` : ''}
                                        `;
                                    }
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
            
            <ModalTercero show={showModal} handleClose={() => setShowModal(false)} onSuccess={() => setReloadTable(prev => prev + 1)} editData={terceroAEditar} forceCliente={true} />
        </div>
    )
}