import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export const ModalCuenta = ({ show, handleClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        id: '',
        nombre: '',
        tipo: '',
        naturaleza: '',
        exige_tercero: 1 // Por defecto exigimos tercero para mayor control
    });

    const [nivelVisual, setNivelVisual] = useState('');
    const [esAuxiliar, setEsAuxiliar] = useState(0);

    // MAGIA CONTABLE: Detectar propiedades automáticamente según el código
    useEffect(() => {
        const codigo = formData.id.trim();
        const length = codigo.length;

        // 1. Determinar el Nivel y si es Auxiliar
        if (length === 1) { setNivelVisual('Clase'); setEsAuxiliar(0); }
        else if (length === 2) { setNivelVisual('Grupo'); setEsAuxiliar(0); }
        else if (length === 4) { setNivelVisual('Cuenta'); setEsAuxiliar(0); }
        else if (length >= 6) { setNivelVisual('Subcuenta / Auxiliar'); setEsAuxiliar(1); }
        else { setNivelVisual('Longitud no estándar (1, 2, 4, 6+)'); setEsAuxiliar(0); }

        // 2. Determinar Tipo y Naturaleza según el primer dígito (NIIF Colombia)
        if (codigo.startsWith('1')) {
            setFormData(prev => ({ ...prev, tipo: 'activo', naturaleza: 'debito' }));
        } else if (codigo.startsWith('2')) {
            setFormData(prev => ({ ...prev, tipo: 'pasivo', naturaleza: 'credito' }));
        } else if (codigo.startsWith('3')) {
            setFormData(prev => ({ ...prev, tipo: 'patrimonio', naturaleza: 'credito' }));
        } else if (codigo.startsWith('4')) {
            setFormData(prev => ({ ...prev, tipo: 'ingreso', naturaleza: 'credito' }));
        } else if (codigo.startsWith('5')) {
            setFormData(prev => ({ ...prev, tipo: 'gasto', naturaleza: 'debito' }));
        } else if (codigo.startsWith('6')) {
            setFormData(prev => ({ ...prev, tipo: 'costo', naturaleza: 'debito' }));
        } else if (codigo === '') {
            setFormData(prev => ({ ...prev, tipo: '', naturaleza: '' }));
        }
    }, [formData.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.tipo || !formData.naturaleza) {
            Swal.fire('Error', 'El código debe empezar por un número válido (1 al 6)', 'warning');
            return;
        }

        const dataToSave = {
            ...formData,
            es_auxiliar: esAuxiliar
        };

        const res = await window.contaAPI.crearCuenta(dataToSave);
        if (res.success) {
            Swal.fire({ title: '¡Creada!', text: 'Cuenta registrada con éxito', icon: 'success', timer: 2000 });
            setFormData({ id: '', nombre: '', tipo: '', naturaleza: '', exige_tercero: 1 }); // Limpiar form
            onSuccess(); // Recargar la tabla
            handleClose(); // Cerrar modal
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    if (!show) return null;

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-light">
                            <h5 className="modal-title"><i className="bi bi-plus-circle me-2"></i>Nueva Cuenta Contable</h5>
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
                                            placeholder="Ej: 110505"
                                            required 
                                            autoFocus
                                        />
                                        <div className="form-text text-primary">
                                            Nivel: <strong>{nivelVisual || '...'}</strong>
                                        </div>
                                    </div>
                                    <div className="col-md-7">
                                        <label className="form-label fw-bold">Nombre de la Cuenta</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                            placeholder="Ej: Caja General"
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">Clasificación Automática</label>
                                        <input 
                                            type="text" 
                                            className="form-control text-capitalize" 
                                            value={formData.tipo} 
                                            disabled 
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">Naturaleza</label>
                                        <input 
                                            type="text" 
                                            className="form-control text-capitalize" 
                                            value={formData.naturaleza} 
                                            disabled 
                                        />
                                    </div>
                                </div>

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
                                    <i className="bi bi-save me-2"></i>Guardar Cuenta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};