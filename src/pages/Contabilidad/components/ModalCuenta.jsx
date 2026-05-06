import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

export const ModalCuenta = ({ show, handleClose, onSuccess, editData }) => {
    const defaultData = {
        id: '', 
        nombre: '', 
        tipo: '', 
        naturaleza: '', 
        exige_tercero: 1, 
        estado: 1
    }
    const [formData, setFormData] = useState(defaultData)
    const [nivelVisual, setNivelVisual] = useState('')
    const [esAuxiliar, setEsAuxiliar] = useState(0)

    useEffect(() => {
        if (editData) {
            setFormData(editData)
        } else {
            setFormData(defaultData)
        }
    }, [editData, show])

    useEffect(() => {
        const codigo = formData.id.toString().trim()
        const length = codigo.length

        if (length === 1) { setNivelVisual('Clase'); setEsAuxiliar(0); }
        else if (length === 2) { setNivelVisual('Grupo'); setEsAuxiliar(0); }
        else if (length === 4) { setNivelVisual('Cuenta'); setEsAuxiliar(0); }
        else if (length >= 6) { setNivelVisual('Subcuenta / Auxiliar'); setEsAuxiliar(1); }
        else { setNivelVisual('Longitud no estándar'); setEsAuxiliar(0); }

        if (!editData) {
            if (codigo.startsWith('1')) setFormData(prev => ({ ...prev, tipo: 'activo', naturaleza: 'debito' }))
            else if (codigo.startsWith('2')) setFormData(prev => ({ ...prev, tipo: 'pasivo', naturaleza: 'credito' }))
            else if (codigo.startsWith('3')) setFormData(prev => ({ ...prev, tipo: 'patrimonio', naturaleza: 'credito' }))
            else if (codigo.startsWith('4')) setFormData(prev => ({ ...prev, tipo: 'ingreso', naturaleza: 'credito' }))
            else if (codigo.startsWith('5')) setFormData(prev => ({ ...prev, tipo: 'gasto', naturaleza: 'debito' }))
            else if (codigo.startsWith('6')) setFormData(prev => ({ ...prev, tipo: 'costo', naturaleza: 'debito' }))
            else if (codigo === '') setFormData(prev => ({ ...prev, tipo: '', naturaleza: '' }))
        }
    }, [formData.id, editData])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.tipo || !formData.naturaleza) {
            Swal.fire('Error', 'El código debe empezar por un número válido (1 al 6)', 'warning')
            return
        }

        const dataToSave = { ...formData, es_auxiliar: esAuxiliar }

        let res
        if (editData) {
            res = await window.contaAPI.actualizarCuenta(dataToSave)
        } else {
            res = await window.contaAPI.crearCuenta(dataToSave)
        }

        if (res.success) {
            Swal.fire({ 
                title: editData ? '¡Actualizada!' : '¡Creada!', 
                text: 'Operación exitosa', 
                icon: 'success', 
                timer: 1500,
                showConfirmButton: false 
            })
            onSuccess()
            handleClose()
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    if (!show) return null;

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-light">
                        <h5 className="modal-title">
                            <i className={`bi ${editData ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                            {editData ? `Editar Cuenta: ${formData.id}` : 'Nueva Cuenta Contable'}
                        </h5>
                        <button type="button" className="btn-close" onClick={handleClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row mb-3">
                                <div className="col-md-5">
                                    <label className="form-label fw-bold">Código (ID)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={formData.id}
                                        onChange={(e) => setFormData({...formData, id: e.target.value})}
                                        disabled={editData != null}
                                        required 
                                        autoFocus={!editData}
                                    />
                                    <div className="form-text text-primary">Nivel: <strong>{nivelVisual || '...'}</strong></div>
                                </div>
                                <div className="col-md-7">
                                    <label className="form-label fw-bold">Nombre de la Cuenta</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                        autoFocus={!!editData}
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Clasificación</label>
                                    <input type="text" className="form-control text-capitalize" value={formData.tipo} disabled />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Naturaleza</label>
                                    <input type="text" className="form-control text-capitalize" value={formData.naturaleza} disabled />
                                </div>
                            </div>

                            {editData && (
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Estado</label>
                                    <select 
                                        className="form-select" 
                                        value={formData.estado} 
                                        onChange={(e) => setFormData({...formData, estado: parseInt(e.target.value)})}
                                    >
                                        <option value={1}>Activa</option>
                                        <option value={0}>Inactiva</option>
                                    </select>
                                </div>
                            )}

                            {esAuxiliar === 1 && (
                                <div className="alert alert-info py-2 d-flex align-items-center">
                                    <div className="form-check form-switch mb-0">
                                        <input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            id="exigeTercero"
                                            checked={formData.exige_tercero === 1}
                                            onChange={(e) => setFormData({...formData, exige_tercero: e.target.checked ? 1 : 0})}
                                        />
                                        <label className="form-check-label ms-2" htmlFor="exigeTercero">
                                            Exigir Tercero (NIT/Cédula) al usar esta cuenta
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">
                                <i className="bi bi-save me-2"></i>{editData ? 'Actualizar' : 'Guardar Cuenta'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};