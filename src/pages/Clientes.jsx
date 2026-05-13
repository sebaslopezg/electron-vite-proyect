import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../components/DataTableComponent'
import { ModalTercero } from './contabilidad/components/ModalTercero'

export const Clientes = () => {
    const [showModal, setShowModal] = useState(false)
    const [terceroAEditar, setTerceroAEditar] = useState(null)
    const [reloadTable, setReloadTable] = useState(0)
    
    const tableContainerRef = useRef(null)

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
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
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
            if (!btn) return
            
            try {
                const rawData = decodeURIComponent(btn.dataset.alldata)
                const item = JSON.parse(rawData)
                
                if (btn.classList.contains('btn-edit')) {
                    handleEditar(item);
                } else if (btn.classList.contains('btn-delete')) {
                    const nombreVisual = item.tipo_persona === 'juridica' ? item.razon_social : `${item.nombres} ${item.apellidos}`
                    handleEliminar(item.id, nombreVisual)
                }
            } catch(err) {
                console.error("Error leyendo datos del botón", err)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return (
        <div>
            <div className="pagetitle">
                <h1><i className="bi bi-people me-2"></i>Clientes</h1>
            </div>

            <div className="card">
                <div className="card-body pt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="card-title mb-0">Listado de Clientes Activos</h5>
                        <button className="btn btn-primary" onClick={handleNuevo}>
                            <i className="bi bi-plus-circle me-2"></i>Nuevo Cliente
                        </button>
                    </div>

                    <div ref={tableContainerRef} className="w-100 overflow-hidden">
                        <CustomDataTable 
                            key={`clientes-${reloadTable}`} 
                            ajaxData={(params) => window.contaAPI.getTercerosPaginados({ ...params, soloClientes: true })}
                            columns={[
                                { 
                                    data: null, title: 'Documento',
                                    render: (data, type, row) => {
                                        const dv = row.digito_verificacion ? `-${row.digito_verificacion}` : '';
                                        return `<span class="fw-medium">${row.tipo_documento} ${row.numero_documento}</span>${dv}`;
                                    }
                                },
                                { 
                                    data: null, title: 'Nombre / Razón Social',
                                    render: (data, type, row) => {
                                        const icon = row.tipo_persona === 'juridica' ? 'bi-building' : 'bi-person';
                                        const nombre = row.tipo_persona === 'juridica' ? row.razon_social : `${row.nombres} ${row.apellidos}`;
                                        return `<i class="bi ${icon} text-secondary me-2"></i>${nombre || ''}`;
                                    }
                                },
                                { 
                                    data: null, title: 'Contacto',
                                    render: (data, type, row) => {
                                        let html = '';
                                        if (row.telefono) html += `<div><i class="bi bi-telephone me-1"></i>${row.telefono}</div>`;
                                        if (row.email) html += `<div><i class="bi bi-envelope me-1"></i>${row.email}</div>`;
                                        return `<div class="small text-muted">${html}</div>`;
                                    }
                                },
                                { 
                                    data: 'estado', title: 'Estado', className: 'text-center',
                                    render: (data) => {
                                        return data === 1 
                                            ? '<i class="bi bi-check-circle-fill text-success" title="Activo"></i>'
                                            : '<i class="bi bi-x-circle-fill text-danger" title="Inactivo"></i>';
                                    }
                                },
                                {
                                    data: null, title: 'Acciones', orderable: false, className: 'text-end pe-4',
                                    render: function (data, type, row) {
                                        const safeData = encodeURIComponent(JSON.stringify(row));
                                        return `
                                            <button class="btn btn-sm btn-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar">
                                                <i class="bi bi-pencil"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger btn-delete" data-alldata="${safeData}" title="Eliminar">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        `;
                                    }
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
            
            <ModalTercero 
                show={showModal} 
                handleClose={() => setShowModal(false)} 
                onSuccess={() => setReloadTable(prev => prev + 1)} 
                editData={terceroAEditar}
                forceCliente={true}
            />
        </div>
    )
}