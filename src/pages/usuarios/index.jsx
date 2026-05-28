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

export const Usuarios = ({ currentUser }) => {
    const [usuarios, setUsuarios] = useState([])
    const [roles, setRoles] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const tableContainerRef = useRef(null)

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
        
        if (resUsers.success) setUsuarios(resUsers.data)
        if (resRoles.success) setRoles(resRoles.data)
    }

    useEffect(() => { loadData() }, [])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return
        const handleTableClick = (e) => {
            const target = e.target.closest('button')
            if (!target || !container.contains(target)) return
            if (target.classList.contains('btn-edit')) {
                setEditData(JSON.parse(decodeURIComponent(target.dataset.alldata)))
                setShowModal(true)
            }
            if (target.classList.contains('btn-delete')) {
                Swal.fire({ title: '¿Eliminar Usuario?', text: 'Esta acción deshabilitará el acceso de esta cuenta.', icon: 'warning', showCancelButton: true }).then(r => {
                    if(r.isConfirmed) {
                        window.api.deleteUsuario(target.dataset.id).then((res) => {
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
        { data: 'nombre_completo', title: 'Nombre' },
        { data: 'username', title: 'Usuario', render: (d) => `<span class="text-primary fw-bold">@${d}</span>` },
        { data: 'rol', title: 'Rol', render: (d) => `<span class="badge bg-secondary">${d}</span>` },
        { 
            data: null, 
            title: 'Acciones', 
            orderable: false,
            render: (d, t, r) => {
                const safeData = encodeURIComponent(JSON.stringify(r))
                const canEdit = hasPermission('usuarios_editar')
                const canDelete = hasPermission('usuarios_eliminar')

                return `
                    ${canEdit ? `<button class="btn btn-sm btn-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                    ${canDelete ? `<button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}" title="Eliminar"><i class="bi bi-trash"></i></button>` : ''}
                `
            } 
        }
    ], [currentUser?.permisos])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-people me-2"></i>Usuarios</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body pt-4">
                <div ref={tableContainerRef}>

                    {hasPermission('usuarios_crear') && (
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button variant="primary" onClick={() => { setEditData(null); setShowModal(true) }}>
                                <i className="bi bi-person-plus-fill me-2"></i>Nuevo Usuario
                            </Button>
                        </div>
                    )}

                    <DataTableComponent 
                        tableId="dt-usuarios-maestro"
                        key={`users-table-${currentUser?.permisos?.length}`}
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