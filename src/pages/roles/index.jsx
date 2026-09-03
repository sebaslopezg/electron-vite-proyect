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
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                e.preventDefault()
                handleEdit(JSON.parse(decodeURIComponent(editBtn.dataset.alldata)))
            }
            
            const delBtn = e.target.closest('.btn-delete')
            if (delBtn && !delBtn.disabled) {
                e.preventDefault()
                handleDelete(delBtn.dataset.id)
            }
        }
        
        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser])

    const getTextColor = (hexColor) => {
        if (!hexColor) return '#ffffff'
        const hex = hexColor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? '#000000' : '#ffffff'
    }

    const columnasTabla = useMemo(() => [
        { 
            data: 'nombre', 
            title: 'Rol', 
            render: (d, t, r) => {
                const color = r.color || '#6c757d';
                const textColor = getTextColor(color);
                const badge = `<span class="badge me-2" style="background-color: ${color}; color: ${textColor}; padding: 6px 12px; border-radius: 12px;"><i class="bi bi-shield-check me-1"></i>${d}</span>`;
                return `${badge} ${r.is_system ? '<span class="badge bg-primary ms-1">Sistema</span>':''}`;
            } 
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
            className: 'text-center pe-4',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                const canEdit = hasPermission('roles_editar')
                const canDelete = hasPermission('roles_eliminar')

                let menuItems = ''

                if (canEdit) {
                    menuItems += `
                        <li>
                            <a class="dropdown-item btn-edit" href="#" data-alldata="${safeData}">
                                <i class="bi ${row.is_system ? 'bi-eye text-info' : 'bi-pencil text-primary'} me-2"></i> ${row.is_system ? 'Ver Detalles' : 'Editar Rol'}
                            </a>
                        </li>
                    `
                }

                if (canDelete) {
                    if (canEdit) menuItems += `<li><hr class="dropdown-divider"></li>`
                    menuItems += `
                        <li>
                            <button class="dropdown-item text-danger btn-delete" data-id="${row.id}" ${row.is_system ? 'disabled' : ''}>
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
    ], [currentUser?.permisos])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-shield-lock me-2"></i>Roles</h1>
        </div>

        <div className="card shadow-sm border-0">
            <div className="card-body pt-4">
                <div ref={tableContainerRef} style={{ overflow: 'visible' }}>
                    
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