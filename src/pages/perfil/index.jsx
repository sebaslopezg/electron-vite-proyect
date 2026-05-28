import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'

export const Perfil = ({ currentUser }) => {
    const [formData, setFormData] = useState({
        id: '',
        nombre_completo: '',
        username: '',
        rol: '',
        foto_perfil: ''
    })

    const [passData, setPassData] = useState({
        newPassword: '',
        renewPassword: ''
    })

    const fileInputRef = useRef(null)

    useEffect(() => {
        if (currentUser) {
            setFormData({
                id: currentUser.id,
                nombre_completo: currentUser.nombre_completo || '',
                username: currentUser.username || '',
                rol: currentUser.rol || '',
                foto_perfil: formData.foto_perfil || currentUser.foto_perfil || ''
            })
        }
    }, [currentUser])

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData({ ...formData, foto_perfil: reader.result });
            reader.readAsDataURL(file);
        }
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        if (!formData.nombre_completo) return

        const res = await window.api.updateMiPerfil(formData)
        if (res.success) {
            Swal.fire('Actualizado', 'Tus datos han sido guardados exitosamente.', 'success')
            window.dispatchEvent(new CustomEvent('perfil-actualizado', { detail: res.user }))
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        
        if (passData.newPassword !== passData.renewPassword) {
            return Swal.fire('Error', 'Las contraseñas no coinciden.', 'warning')
        }
        if (passData.newPassword.length < 6) {
            return Swal.fire('Error', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning')
        }

        const payload = {
            ...formData,
            password: passData.newPassword
        }

        const res = await window.api.updateMiPerfil(payload)
        if (res.success) {
            Swal.fire('Contraseña actualizada', 'Tu clave ha sido cambiada de forma segura.', 'success')
            setPassData({ newPassword: '', renewPassword: '' })
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    if (!currentUser) return null

    return (
        <>
            <div className="pagetitle">
                <h1>Mi Perfil</h1>
            </div>

            <section className="section profile">
                <div className="row">
                    <div className="col-xl-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-body profile-card pt-4 d-flex flex-column align-items-center">
                                
                                <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center mb-3 border border-2 border-primary shadow-sm" 
                                    style={{ width: '120px', height: '120px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#f6f9ff' }}
                                    onClick={() => fileInputRef.current.click()}
                                    title="Click para cambiar foto"
                                >
                                    {formData.foto_perfil ? (
                                        <img src={formData.foto_perfil} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span className="text-primary" style={{ fontSize: '3rem' }}>
                                            {formData.nombre_completo ? formData.nombre_completo.charAt(0).toUpperCase() : 'U'}
                                        </span>
                                    )}
                                </div>
                                <input type="file" accept="image/*" className="d-none" ref={fileInputRef} onChange={handleImageChange}/>
                                
                                <h2 className="fs-5 text-center">{formData.nombre_completo}</h2>
                                <h3 className="text-muted fs-6 mb-1">{formData.rol}</h3>
                                <span className="badge bg-light text-primary border border-primary mt-2 px-3 py-2 fs-6">@{formData.username}</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-8">
                        <div className="card shadow-sm border-0">
                            <div className="card-body pt-3">
                                <ul className="nav nav-tabs nav-tabs-bordered">
                                    <li className="nav-item">
                                        <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#profile-edit">Editar Perfil</button>
                                    </li>
                                    <li className="nav-item">
                                        <button className="nav-link text-danger" data-bs-toggle="tab" data-bs-target="#profile-change-password"><i className="bi bi-shield-lock me-1"></i>Cambiar Contraseña</button>
                                    </li>
                                </ul>

                                <div className="tab-content pt-4">
                                    <div className="tab-pane fade show active profile-edit" id="profile-edit">
                                        <form onSubmit={handleUpdateProfile}>
                                            <div className="row mb-3">
                                                <label className="col-md-4 col-lg-3 col-form-label text-secondary">Nombre Completo</label>
                                                <div className="col-md-8 col-lg-9">
                                                    <input 
                                                        name="fullName" type="text" className="form-control" id="fullName" 
                                                        value={formData.nombre_completo} 
                                                        onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} 
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <div className="row mb-3">
                                                <label className="col-md-4 col-lg-3 col-form-label text-secondary">Usuario de Acceso</label>
                                                <div className="col-md-8 col-lg-9">
                                                    <input 
                                                        name="username" type="text" className="form-control bg-light text-muted" 
                                                        value={formData.username} 
                                                        disabled 
                                                    />
                                                    <small className="text-muted d-block mt-1"><i className="bi bi-info-circle me-1"></i>El nombre de usuario (login) no puede ser alterado.</small>
                                                </div>
                                            </div>

                                            <div className="row mb-3">
                                                <label className="col-md-4 col-lg-3 col-form-label text-secondary">Rol Actual</label>
                                                <div className="col-md-8 col-lg-9">
                                                    <input type="text" className="form-control bg-light text-muted" value={formData.rol} disabled />
                                                </div>
                                            </div>

                                            <div className="text-end mt-4 border-top pt-3">
                                                <button type="submit" className="btn btn-primary px-4">Guardar Cambios</button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="tab-pane fade pt-3" id="profile-change-password">
                                        <form onSubmit={handleChangePassword}>
                                            <div className="row mb-3">
                                                <label className="col-md-4 col-lg-4 col-form-label">Nueva Contraseña</label>
                                                <div className="col-md-8 col-lg-8">
                                                    <input 
                                                        name="newpassword" type="password" className="form-control" 
                                                        value={passData.newPassword} 
                                                        onChange={(e) => setPassData({...passData, newPassword: e.target.value})} 
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <div className="row mb-3">
                                                <label className="col-md-4 col-lg-4 col-form-label">Confirmar Contraseña</label>
                                                <div className="col-md-8 col-lg-8">
                                                    <input 
                                                        name="renewpassword" type="password" className="form-control" 
                                                        value={passData.renewPassword} 
                                                        onChange={(e) => setPassData({...passData, renewPassword: e.target.value})} 
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-end mt-4 border-top pt-3">
                                                <button type="submit" className="btn btn-danger px-4"><i className="bi bi-key me-2"></i>Actualizar Contraseña</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}