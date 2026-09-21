import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import { ModalTercero } from '../contabilidad/components/ModalTercero'
import { ModalDetalleTercero } from '../contabilidad/components/ModalDetalleTercero'
import { clientesService } from '../../services/clientesService'

export const ClientesActivos = ({ activeUser }) => {
    const [showModal, setShowModal] = useState(false)
    const [terceroAEditar, setTerceroAEditar] = useState(null)
    
    const [showDetalle, setShowDetalle] = useState(false)
    const [terceroVer, setTerceroVer] = useState(null)

    const [reloadTable, setReloadTable] = useState(0)
    const tableContainerRef = useRef(null)

    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (activeUser) {
            setIsLoading(false)
        } else {
            const timer = setTimeout(() => setIsLoading(false), 1000)
            return () => clearTimeout(timer)
        }
    }, [activeUser])

    const hasPermission = (permissionKey) => {
        if (!activeUser) return false
        if (activeUser.permisos?.includes('ALL')) return true
        return activeUser.permisos?.includes(permissionKey)
    }

    const handleNuevo = () => {
      setTerceroAEditar(null)
      setShowModal(true)
    }

    const handleEditar = (tercero) => {
      setTerceroAEditar(tercero)
      setShowModal(true)
    }

    const handleVerDetalles = (tercero) => {
      setTerceroVer(tercero)
      setShowDetalle(true)
    }

    const handleDesactivar = (id, nombre) => {
        Swal.fire({
            title: '¿Desactivar Cliente?',
            text: `El cliente "${nombre}" pasará a la lista de inactivos y no aparecerá en las búsquedas principales.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ffc107', confirmButtonText: 'Sí, desactivar', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await clientesService.desactivarTercero(id)
                if (res.success) {
                    Swal.fire('¡Desactivado!', 'El cliente ha sido desactivado exitosamente.', 'success')
                    setReloadTable(prev => prev + 1)
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        })
    }

    const handleEliminar = (id, nombre) => {
        Swal.fire({
            title: '¿Eliminar Cliente?',
            text: `Borrarás definitivamente a "${nombre}". Las facturas antiguas se mantendrán, pero ya no aparecerá en las búsquedas ni podrás facturarle.`,
            icon: 'error', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await clientesService.eliminarTercero(id)
                if (res.success) {
                    Swal.fire('¡Eliminado!', 'El cliente ha sido borrado del sistema.', 'success')
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
            const actionEl = e.target.closest('[data-alldata], .btn-desactivar, .btn-delete')
            if (!actionEl || !container.contains(actionEl)) return
            
            e.preventDefault()
            try {
                if (actionEl.classList.contains('btn-desactivar')) {
                    const id = actionEl.dataset.id
                    const nombre = actionEl.dataset.nombre
                    handleDesactivar(id, nombre)
                    return
                }

                if (actionEl.classList.contains('btn-delete')) {
                    const id = actionEl.dataset.id
                    const nombre = actionEl.dataset.nombre
                    handleEliminar(id, nombre)
                    return
                }

                const item = JSON.parse(decodeURIComponent(actionEl.dataset.alldata))
                if (actionEl.classList.contains('btn-view')) handleVerDetalles(item)
                else if (actionEl.classList.contains('btn-edit')) handleEditar(item)
            } catch(err) { console.error(err) }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [activeUser, isLoading])

    return <>
        <div className="position-relative" style={{ minHeight: isLoading ? '60vh' : 'auto' }}>
            
            {isLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white" style={{ zIndex: 10 }}>
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            )}

            <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.4s ease-in-out', pointerEvents: isLoading ? 'none' : 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">
                        <i className="bi bi-person-check text-primary me-2"></i>
                         Listado de Clientes Activos
                    </h5>
                    
                    {hasPermission('clientes_crear') && (
                        <button className="btn btn-primary" onClick={handleNuevo}>
                            <i className="bi bi-plus-circle me-2"></i>Nuevo Cliente
                        </button>
                    )}
                </div>

                <div ref={tableContainerRef} className="w-100 overflow-visible">
                    <CustomDataTable 
                        tableId="dt-clientes-activos"
                        key={`clientes-activos-${reloadTable}-${activeUser?.permisos?.length}`} 
                        ajaxData={(params) => clientesService.getClientesPaginados({ ...params, estado: 1 })}
                        columns={[
                            { 
                                data: null, title: 'Documento',
                                render: (data, type, row) => `${row.tipo_documento} ${row.numero_documento}${row.digito_verificacion ? `-${row.digito_verificacion}` : ''}`
                            },
                            { 
                                data: null, title: 'Nombre / Razón Social',
                                render: (data, type, row) => `<i class="bi ${row.tipo_persona === 'juridica' ? 'bi-building':'bi-person'} text-secondary me-2"></i>${row.tipo_persona === 'juridica' ? row.razon_social : `${row.nombres}${row.apellidos}`}`
                            },
                            { 
                                data: null, title: 'Contacto',
                                render: (data, type, row) => `<div class="small text-muted">${row.telefono ? `<div><i class="bi bi-telephone me-1"></i>${row.telefono}</div>`:''}${row.email ? `<div><i class="bi bi-envelope me-1"></i>${row.email}</div>`:''}</div>`
                            },
                            {
                                data: null, title: 'Acciones', orderable: false, className: 'text-center',
                                render: function (data, type, row) {
                                    const safeData = encodeURIComponent(JSON.stringify(row));
                                    const nombreCliente = row.tipo_persona === 'juridica' ? row.razon_social : `${row.nombres} ${row.apellidos}`;
                                    
                                    const canEdit = hasPermission('clientes_editar');
                                    const canDesactivar = hasPermission('clientes_desactivar');
                                    const canDelete = hasPermission('clientes_eliminar');

                                    return `
                                        <div class="dropdown">
                                            <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                                                <i class="bi bi-three-dots-vertical"></i>
                                            </button>
                                            <ul class="dropdown-menu shadow-sm">
                                                <li>
                                                    <a class="dropdown-item btn-view" href="#" data-alldata="${safeData}">
                                                        <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                                                    </a>
                                                </li>
                                                ${canEdit ? `
                                                <li>
                                                    <a class="dropdown-item btn-edit" href="#" data-alldata="${safeData}">
                                                        <i class="bi bi-pencil me-2 text-secondary"></i> Editar
                                                    </a>
                                                </li>
                                                ` : ''}
                                                ${canDesactivar ? `
                                                <li>
                                                    <a class="dropdown-item btn-desactivar text-warning" href="#" data-id="${row.id}" data-nombre="${nombreCliente}">
                                                        <i class="bi bi-person-down me-2"></i> Desactivar
                                                    </a>
                                                </li>
                                                ` : ''}
                                                ${canDelete ? `
                                                <li><hr class="dropdown-divider"></li>
                                                <li>
                                                    <a class="dropdown-item btn-delete text-danger" href="#" data-id="${row.id}" data-nombre="${nombreCliente}">
                                                        <i class="bi bi-trash3 me-2"></i> Eliminar
                                                    </a>
                                                </li>
                                                ` : ''}
                                            </ul>
                                        </div>
                                    `;
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
        
        {/* MODALES FUERA DEL CONTENEDOR */}
        <ModalTercero show={showModal} handleClose={() => setShowModal(false)} onSuccess={() => setReloadTable(prev => prev + 1)} editData={terceroAEditar} forceCliente={true} />
        <ModalDetalleTercero show={showDetalle} handleClose={() => setShowDetalle(false)} terceroData={terceroVer} />
    </>
}