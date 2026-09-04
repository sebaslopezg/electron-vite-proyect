import { useState, useEffect, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalUsuario } from './components/ModalUsuario'
import { Button } from 'react-bootstrap'

const Toast = Swal.mixin({
    toast: true, 
    position: 'bottom-end', 
    showConfirmButton: false, 
    timer: 5000, 
    timerProgressBar: true
})

const getTextColor = (hexColor) => {
    if (!hexColor) return '#ffffff'
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#000000' : '#ffffff'
}

export const Usuarios = ({ currentUser }) => {
    const [usuarios, setUsuarios] = useState([])
    const [roles, setRoles] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const tableContainerRef = useRef(null)
    
    const usuariosRef = useRef([])

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const loadData = async () => {
        const [resUsers, resRoles] = await Promise.all([
            window.api.getUsuarios(),
            window.api.getRoles()
        ])
        
        if (resRoles.success) setRoles(resRoles.data)

        if (resUsers.success) {
            setUsuarios(resUsers.data)
            usuariosRef.current = resUsers.data

            if (window.api.getUsuariosFotos) {
                window.api.getUsuariosFotos().then(resFotos => {
                    if (resFotos.success && resFotos.data.length > 0) {
                        const fotosMap = {}
                        resFotos.data.forEach(f => fotosMap[f.id] = f.foto_perfil)
                        
                        setUsuarios(prev => {
                            const newArr = prev.map(u => ({ ...u, foto_perfil: fotosMap[u.id] || null }));
                            usuariosRef.current = newArr;
                            return newArr;
                        })

                        resFotos.data.forEach(f => {
                            const containers = document.querySelectorAll(`.avatar-lazy-${f.id}`)
                            containers.forEach(container => {
                                container.innerHTML = `<img src="${f.foto_perfil}" alt="Avatar" class="rounded-circle object-fit-cover shadow-sm animate__animated animate__fadeIn" width="30" height="30" />`
                            })
                        })
                    }
                })
            }
        }
    }

    useEffect(() => { loadData() }, [])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return
        
        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn && container.contains(editBtn)) {
                e.preventDefault()
                const id = editBtn.dataset.id
                const updatedUser = usuariosRef.current.find(u => u.id === id)
                
                if (updatedUser) {
                    setEditData(updatedUser)
                } else {
                    setEditData(JSON.parse(decodeURIComponent(editBtn.dataset.alldata)))
                }
                setShowModal(true)
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn && container.contains(delBtn) && !delBtn.disabled) {
                e.preventDefault()
                Swal.fire({ 
                    title: '¿Eliminar Usuario?', 
                    text: 'Esta acción deshabilitará el acceso de esta cuenta.', 
                    icon: 'warning', 
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar' 
                }).then(r => {
                    if(r.isConfirmed) {
                        window.api.deleteUsuario(delBtn.dataset.id).then((res) => {
                            if (res && !res.success) {
                                Toast.fire({ icon: 'error', title: res.error || 'No se pudo eliminar' })
                            } else {
                                Toast.fire({ icon: 'success', title: 'Usuario eliminado correctamente' })
                                loadData()
                            }
                        })
                    }
                })
            }
        }
        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    const columnasTabla = useMemo(() => [
        { 
            data: 'nombre_completo', 
            title: 'Nombre',
            render: (data, type, row) => {
                return `
                    <div class="d-flex align-items-center">
                        <div class="avatar-lazy-${row.id} me-2 d-flex align-items-center justify-content-center" style="width:30px; height:30px;">
                            ${row.foto_perfil 
                                ? `<img src="${row.foto_perfil}" alt="Avatar" class="rounded-circle object-fit-cover shadow-sm" width="30" height="30" />`
                                : `<i class="bi bi-person-circle fs-4 text-secondary"></i>`
                            }
                        </div>
                        <span>${data}</span>
                    </div>
                `
            }
        },
        { 
            data: 'username', 
            title: 'Usuario', 
            render: (d) => `<span class="text-primary fw-bold">@${d}</span>` 
        },
        { 
            data: 'rol', 
            title: 'Rol', 
            render: (d) => {
                const rolInfo = roles.find(r => r.nombre === d);
                const bgColor = rolInfo?.color || '#6c757d';
                const textColor = getTextColor(bgColor);
                return `<span class="badge" style="background-color: ${bgColor}; color: ${textColor}; padding: 6px 12px; border-radius: 12px;">${d}</span>`
            } 
        },
        { 
            data: null, 
            title: 'Acciones', 
            orderable: false,
            className: 'text-center pe-4',
            render: (d, t, r) => {
                const safeData = encodeURIComponent(JSON.stringify(r))
                const canEdit = hasPermission('usuarios_editar')
                const canDelete = hasPermission('usuarios_eliminar')

                let menuItems = ''

                if (canEdit) {
                    menuItems += `
                        <li>
                            <a class="dropdown-item btn-edit" href="#" data-id="${r.id}" data-alldata="${safeData}">
                                <i class="bi bi-pencil me-2 text-primary"></i> Editar Usuario
                            </a>
                        </li>
                    `
                }

                if (canDelete) {
                    if (canEdit) menuItems += `<li><hr class="dropdown-divider"></li>`
                    menuItems += `
                        <li>
                            <button class="dropdown-item text-danger btn-delete" data-id="${r.id}" ${r.username === 'admin' ? 'disabled' : ''}>
                                <i class="bi bi-trash3 me-2"></i> Eliminar
                            </button>
                        </li>
                    `
                }

                if (!menuItems) {
                    return '<span class="text-muted small">Sin acciones</span>'
                }

                return `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu shadow-sm">
                            ${menuItems}
                        </ul>
                    </div>
                `
            } 
        }
    ], [currentUser?.permisos, roles])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-people me-2"></i>Usuarios</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body pt-4">
                <div ref={tableContainerRef} style={{ overflow: 'visible' }}>

                    {hasPermission('usuarios_crear') && (
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button variant="primary" onClick={() => { setEditData(null); setShowModal(true) }}>
                                <i className="bi bi-plus-circle me-2"></i>Nuevo Usuario
                            </Button>
                        </div>
                    )}

                    <DataTableComponent 
                        tableId="dt-usuarios-maestro"
                        key={`users-table-${currentUser?.permisos?.length}-${roles.length}`}
                        data={usuarios} 
                        columns={columnasTabla} 
                    />
                    
                    <ModalUsuario 
                        show={showModal} 
                        handleClose={() => setShowModal(false)} 
                        editData={editData} 
                        onSuccess={loadData} 
                        rolesDisponibles={roles} 
                    />
                </div>
            </div>
        </div>
    </>
}