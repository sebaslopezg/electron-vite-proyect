import { useState, useEffect, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalRol } from './components/ModalRol'
import { Button } from 'react-bootstrap'

const Toast = Swal.mixin({
    toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
})

export const Roles = ({ currentUser }) => {
    const [roles, setRoles] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const tableContainerRef = useRef(null)

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const loadRoles = async () => {
        if (window.api && window.api.getRoles) {
            const res = await window.api.getRoles()
            if (res.success) {
                setRoles(res.data)
            } else {
                Toast.fire({ icon: 'error', title: res.error || 'Error al obtener los roles' })
            }
        }
    }

    useEffect(() => { loadRoles() }, [])

    const handleNuevo = () => { setEditData(null); setShowModal(true) }
    const handleEdit = (rol) => { setEditData(rol); setShowModal(true) }

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar Rol?',
            text: "No podrás eliminarlo si hay usuarios asignados a él.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        })
        if (confirm.isConfirmed) {
            const res = await window.api.deleteRol(id)
            if (res.success) {
                Toast.fire({ icon: 'success', title: 'Rol eliminado con éxito.' })
                loadRoles()
            } else {
                Toast.fire({ icon: 'warning', title: res.error || 'No se pudo eliminar el rol' })
            }
        }
    }

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return
        const handleTableClick = (e) => {
            const target = e.target.closest('button')
            if (!target || !container.contains(target)) return
            if (target.classList.contains('btn-edit')) handleEdit(JSON.parse(decodeURIComponent(target.dataset.alldata)))
            if (target.classList.contains('btn-delete')) handleDelete(target.dataset.id)
        }
        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    const columnasTabla = useMemo(() => [
        { 
            data: 'nombre', 
            title: 'Rol', 
            render: (d, t, r) => `<strong>${d}</strong> ${r.is_system ? '<span class="badge bg-primary ms-1">Sistema</span>':''}` 
        },
        { 
            data: 'descripcion', 
            title: 'Descripción', 
            render: (d) => d || '-' 
        },
        { 
            data: 'permisos_json', 
            title: 'Permisos', 
            render: (d, t, r) => r.is_system ? '<span class="badge bg-success">Acceso Total</span>' : `<span class="badge bg-secondary">${JSON.parse(d).length}</span>` 
        },
        {
            data: null, 
            title: 'Acciones', 
            orderable: false, 
            className: 'text-end pe-4',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                const canEdit = hasPermission('roles_editar')
                const canDelete = hasPermission('roles_eliminar')

                return `
                    ${canEdit ? `<button class="btn btn-sm btn-secondary me-2 btn-edit" data-alldata="${safeData}" title="Editar"><i class="bi ${row.is_system ? 'bi-eye' : 'bi-pencil'}"></i></button>` : ''}
                    ${canDelete ? `<button class="btn btn-sm btn-danger btn-delete" data-id="${row.id}" ${row.is_system ? 'disabled' : ''} title="Eliminar"><i class="bi bi-trash"></i></button>` : ''}
                `
            }
        }
    ], [currentUser?.permisos])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-shield-lock me-2"></i>Roles</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body pt-4">
                <div ref={tableContainerRef}>
                    
                    {hasPermission('roles_crear') && (
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button variant="primary" onClick={handleNuevo}>
                                <i className="bi bi-plus-circle me-2"></i>Nuevo Rol
                            </Button>
                        </div>
                    )}

                    <DataTableComponent 
                        tableId="dt-roles-maestro"
                        key={`roles-table-${currentUser?.permisos?.length}`} 
                        data={roles} 
                        columns={columnasTabla} 
                    />
                    
                    <ModalRol 
                        show={showModal} 
                        handleClose={() => setShowModal(false)} 
                        editData={editData} 
                        onSuccess={loadRoles} 
                    />
                </div>
            </div>
        </div>
    </>
}