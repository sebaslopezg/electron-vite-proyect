import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { ModalCuenta } from './components/ModalCuenta'

export const Puc = () => {
    const [cuentas, setCuentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [cuentaAEditar, setCuentaAEditar] = useState(null)

    useEffect(() => {
        cargarCuentas()
    }, [])

    const cargarCuentas = async () => {
        setLoading(true);
        if (window.contaAPI) {
            const res = await window.contaAPI.getPuc()
            if (res.success) {
                setCuentas(res.data)
            } else {
                console.error("Error al cargar PUC:", res.error);
            }
        }
        setLoading(false)
    }

    const handleNuevo = () => {
        setCuentaAEditar(null);
        setShowModal(true);
    };

    const handleEditar = (cuenta) => {
        setCuentaAEditar(cuenta);
        setShowModal(true);
    };

    const handleEliminar = (id, nombre) => {
        Swal.fire({
            title: `¿Eliminar la cuenta ${id}?`,
            text: `Estás a punto de borrar "${nombre}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await window.contaAPI.eliminarCuenta(id);
                if (res.success) {
                    Swal.fire('¡Eliminada!', 'La cuenta ha sido borrada.', 'success');
                    cargarCuentas();
                } else {
                    Swal.fire('No se pudo eliminar', res.error, 'error');
                }
            }
        });
    };

    const getIndentStyle = (id) => {
        const length = id.toString().length
        const padding = length === 1 ? 0 : length === 2 ? 20 : length === 4 ? 40 : 60
        return { paddingLeft: `${padding}px` }
    }

    return <>
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Gestión de Cuentas Contables</h5>
                <button className="btn btn-primary" onClick={handleNuevo}>
                    <i className="bi bi-plus-circle me-2"></i>Nueva Cuenta
                </button>
            </div>

            {loading ? (
                <div className="text-center p-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Cargando árbol de cuentas...</p>
                </div>
            ) : (
                <div className="table-responsive" style={{ maxHeight: '65vh' }}>
                    <table className="table table-hover table-sm mb-0 align-middle">
                        <thead className="table-light sticky-top">
                            <tr>
                                <th className="ps-4">Código</th>
                                <th>Nombre de la Cuenta</th>
                                <th>Naturaleza</th>
                                <th>Tipo</th>
                                <th className="text-center">Estado</th>
                                <th className="text-end pe-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cuentas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-4 text-muted">
                                        No hay cuentas registradas. Comienza creando las clases (1, 2, 3...).
                                    </td>
                                </tr>
                            ) : (
                                cuentas.map((cuenta) => (
                                    <tr key={cuenta.id} className={cuenta.es_auxiliar === 0 ? 'table-light' : ''}>
                                        <td className="ps-4">
                                            <span className={cuenta.es_auxiliar === 0 ? 'fw-bold' : ''}>
                                                {cuenta.id}
                                            </span>
                                        </td>
                                        <td style={getIndentStyle(cuenta.id)}>
                                            <span className={cuenta.es_auxiliar === 0 ? 'fw-bold' : ''}>
                                                {cuenta.es_auxiliar === 0 ? <i className="bi bi-folder-fill text-warning me-2"></i> : <i className="bi bi-file-earmark-text text-secondary me-2"></i>}
                                                {cuenta.nombre}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${cuenta.naturaleza === 'debito' ? 'bg-success' : 'bg-danger'}`}>
                                                {cuenta.naturaleza.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="text-capitalize text-muted small">{cuenta.tipo}</td>
                                        <td className="text-center">
                                            {cuenta.estado === 1 ? 
                                                <i className="bi bi-check-circle-fill text-success" title="Activa"></i> : 
                                                <i className="bi bi-x-circle-fill text-danger" title="Inactiva"></i>
                                            }
                                        </td>
                                        <td className="text-end pe-4">
                                            <button 
                                                className="btn btn-sm btn-secondary me-2" 
                                                onClick={() => handleEditar(cuenta)}
                                                title="Editar"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger" 
                                                onClick={() => handleEliminar(cuenta.id, cuenta.nombre)}
                                                title="Eliminar"
                                            >
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
        </div>
        <ModalCuenta 
            show={showModal} 
            handleClose={() => setShowModal(false)} 
            onSuccess={cargarCuentas}
            editData={cuentaAEditar}
        />
    </>
};