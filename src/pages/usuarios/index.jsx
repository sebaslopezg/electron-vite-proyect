import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalUsuario } from './components/ModalUsuario'
import { Button } from 'react-bootstrap'

export const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)

    const loadUsuarios = async () => {
        if (window.api && window.api.getUsuarios) {
            const res = await window.api.getUsuarios()
            if (res.success) {
                setUsuarios(res.data)
            } else {
                Swal.fire('Error', res.error, 'error')
            }
        }
    }

    useEffect(() => {
        loadUsuarios()
    }, [])

    const handleNuevo = () => {
        setEditData(null)
        setShowModal(true)
    }

    const handleEdit = (user) => {
        setEditData(user)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar usuario?',
            text: "El usuario perderá el acceso al sistema inmediatamente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            const res = await window.api.deleteUsuario(id)
            if (res.success) {
                Swal.fire('Eliminado', 'El usuario ha sido eliminado.', 'success')
                loadUsuarios()
            } else {
                Swal.fire('Atención', res.error, 'warning')
            }
        }
    }

    const columns = [
        { data: 'nombre_completo', title: 'Nombre Completo' },
        { 
            data: 'username', 
            title: 'Usuario de Acceso',
            render: (data) => `<span class="fw-bold text-primary">@${data}</span>`
        },
        { 
            data: 'rol', 
            title: 'Rol Asignado',
            render: (data) => `<span class="badge bg-secondary">${data}</span>`
        },
        { 
            data: 'date_created', 
            title: 'Fecha Creación',
            render: (data) => new Date(data).toLocaleDateString()
        },
        {
            data: null,
            title: 'Acciones',
            orderable: false,
            className: 'text-end',
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row))
                return `
                    <button class="btn btn-sm btn-outline-secondary me-2 btn-edit" data-alldata="${safeData}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${row.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                `
            }
        }
    ]

    useEffect(() => {
        const handleTableClick = (e) => {
            const target = e.target.closest('button')
            if (!target) return

            if (target.classList.contains('btn-edit')) {
                const rowData = JSON.parse(decodeURIComponent(target.dataset.alldata))
                handleEdit(rowData)
            }
            if (target.classList.contains('btn-delete')) {
                handleDelete(target.dataset.id)
            }
        }

        document.addEventListener('click', handleTableClick)
        return () => document.removeEventListener('click', handleTableClick)
    }, [])

    return (
        <>
            <div className="pagetitle">
                <h1><i className="bi bi-people-fill me-2"></i>Usuarios del Sistema</h1>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body pt-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button variant="primary" onClick={handleNuevo}>
                            <i className="bi bi-person-plus-fill me-2"></i>Nuevo Usuario
                        </Button>
                    </div>

                    <DataTableComponent 
                        key={`users-table-${usuarios.length}`} 
                        data={usuarios} 
                        columns={columns} 
                    />
                </div>
            </div>

            <ModalUsuario 
                show={showModal} 
                handleClose={() => setShowModal(false)} 
                editData={editData} 
                onSuccess={loadUsuarios} 
            />
        </>
    )
}