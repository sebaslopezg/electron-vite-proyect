import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalRol } from './components/ModalRol'
import { Button } from 'react-bootstrap'

const Toast = Swal.mixin({
    toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
})

export const Roles = () => {
    const [roles, setRoles] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const tableContainerRef = useRef(null)

    const loadRoles = async () => {
        if (window.api && window.api.getRoles) {
            const res = await window.api.getRoles()
            if (res.success) setRoles(res.data)
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
                Toast.fire({ icon: 'success', title: 'Rol eliminado.' })
                loadRoles()
            } else {
                Toast.fire({ icon: 'warning', title: res.error })
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
    }, [])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-shield-lock me-2"></i>Roles</h1>
        </div>

        <div className="card">
            <div className="card-body pt-4">

                <div ref={tableContainerRef}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button variant="primary" onClick={handleNuevo}>
                            <i className="bi bi-shield-plus me-2"></i>Nuevo Rol
                        </Button>
                    </div>
                    <DataTableComponent 
                        key={`roles-table-${roles.length}`} 
                        data={roles} 
                        columns={[
                            { 
                                data: 'nombre', 
                                title: 'Rol', 
                                render: (d, t, r) => `
                                    <strong>${d}</strong> ${r.is_system ? '<span class="badge bg-primary ms-1">Sistema</span>':''}
                                ` 
                            },
                            { 
                                data: 'descripcion', 
                                title: 'Descripción', 
                                render: (d) => d || '-' 
                            },
                            { 
                                data: 'permisos_json', 
                                title: 'Permisos', 
                                render: (d, t, r) => r.is_system ? '<span class="badge bg-success">Acceso Total</span>' : `<span class="badge bg-secondary">${JSON.parse(d).length}</span>` },
                            { 
                                data: null, 
                                title: 'Acciones', 
                                orderable: false, 
                                className: 'text-end',
                                render: (d, t, r) => `
                                    <button class="btn btn-sm btn-outline-secondary me-2 btn-edit" data-alldata="${encodeURIComponent(JSON.stringify(r))}">
                                        <i class="bi ${r.is_system ? 'bi-eye' : 'bi-pencil'}"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${r.id}" ${r.is_system ? 'disabled' : ''}>
                                        <i class="bi bi-trash"></i>
                                    </button>
                                `
                            }
                        ]} 
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