import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { ModalTercero } from './components/ModalTercero'

export const Terceros = () => {
    const [terceros, setTerceros] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [terceroAEditar, setTerceroAEditar] = useState(null)

    useEffect(() => {
        cargarTerceros()
    }, [])

    const cargarTerceros = async () => {
        setLoading(true)
        if (window.contaAPI) {
            const res = await window.contaAPI.getTerceros()
            if (res.success) setTerceros(res.data)
            else console.error("Error al cargar Terceros:", res.error)
        }
        setLoading(false)
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
            title: '¿Eliminar tercero?',
            text: `Borrarás a "${nombre}". Esto no afectará facturas antiguas, pero no podrás usarlo en transacciones nuevas.`,
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
                    Swal.fire('¡Eliminado!', 'El tercero ha sido borrado.', 'success')
                    cargarTerceros()
                } else {
                    Swal.fire('Error', res.error, 'error')
                }
            }
        })
    }

    const getNombreVisual = (t) => {
        return t.tipo_persona === 'juridica' ? t.razon_social : `${t.nombres} ${t.apellidos}`
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Directorio de Terceros</h5>
                <button className="btn btn-primary btn-sm" onClick={handleNuevo}>
                    <i className="bi bi-plus-lg me-2"></i>Nuevo Tercero
                </button>
            </div>

            {loading ? (
                <div className="text-center p-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Cargando terceros...</p>
                </div>
            ) : (
                <div className="table-responsive" style={{ maxHeight: '65vh' }}>
                    <table className="table table-hover table-sm mb-0 align-middle">
                        <thead className="table-light sticky-top">
                            <tr>
                                <th>Documento</th>
                                <th>Nombre / Razón Social</th>
                                <th>Roles</th>
                                <th>Contacto</th>
                                <th className="text-center">Estado</th>
                                <th className="text-end pe-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {terceros.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-4 text-muted">
                                        No hay terceros registrados.
                                    </td>
                                </tr>
                            ) : (
                                terceros.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <span className="fw-medium">{t.tipo_documento} {t.numero_documento}</span>
                                            {t.digito_verificacion && `-${t.digito_verificacion}`}
                                        </td>
                                        <td>
                                            <i className={`bi ${t.tipo_persona === 'juridica' ? 'bi-building' : 'bi-person'} text-secondary me-2`}></i>
                                            {getNombreVisual(t)}
                                        </td>
                                        <td>
                                            {t.es_cliente === 1 && <span className="badge bg-info me-1">Cliente</span>}
                                            {t.es_proveedor === 1 && <span className="badge bg-warning text-dark">Proveedor</span>}
                                        </td>
                                        <td className="small text-muted">
                                            {t.telefono && <div><i className="bi bi-telephone me-1"></i>{t.telefono}</div>}
                                            {t.email && <div><i className="bi bi-envelope me-1"></i>{t.email}</div>}
                                        </td>
                                        <td className="text-center">
                                            {t.estado === 1 ? 
                                                <i className="bi bi-check-circle-fill text-success" title="Activo"></i> : 
                                                <i className="bi bi-x-circle-fill text-danger" title="Inactivo"></i>
                                            }
                                        </td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-sm btn-light me-1 text-primary" onClick={() => handleEditar(t)}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn btn-sm btn-light text-danger" onClick={() => handleEliminar(t.id, getNombreVisual(t))}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            <ModalTercero 
                show={showModal} 
                handleClose={() => setShowModal(false)} 
                onSuccess={cargarTerceros}
                editData={terceroAEditar}
            />
        </div>
    )
}