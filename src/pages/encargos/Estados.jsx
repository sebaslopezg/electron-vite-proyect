import { useEffect, useRef, useState, useMemo } from "react"
import CustomDataTable from "../../components/DataTableComponent"
import { 
    Button, 
    Col, 
    Form, 
    FormGroup, 
    Modal, 
    Row,
    InputGroup,
    Table
} from "react-bootstrap"
import Swal from "sweetalert2"
import { encargosService } from "../../services/encargosService"
import { ModalFormEstado } from "./components/ModalFormEstado"

const safeParse = (str) => {
    if (!str) return []
    try { 
        const parsed = JSON.parse(str)
        return Array.isArray(parsed) ? parsed : [{ nombre: str, can_assign: true, can_modify: true }]
    } catch { 
        return [{ nombre: str, can_assign: true, can_modify: true }]
    }
}

export const Estados = () => {
    const [show, setShow] = useState(false)
    const [reloadTable, setReloadTable] = useState(0)
    
    const [alcancePolitica, setAlcancePolitica] = useState('global')

    const [usuariosDB, setUsuariosDB] = useState([])
    const [rolesDB, setRolesDB] = useState([])

    const [usuariosForBuscador, setUsuariosForBuscador] = useState([])
    const [rolesForBuscador, setRolesForBuscador] = useState([])

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    
    const [form, setForm] = useState({
        titulo: '',
        descripcion: '',
        color: '#0d6efd',
        allow_calendar: 0,
        icon_data: 'bi-tag-fill',
    })

    const [asignacionesUsuarios, setAsignacionesUsuarios] = useState([])
    const [asignacionesRoles, setAsignacionesRoles] = useState([])
    
    const [newUserItem, setNewUserItem] = useState('')
    const [newRoleItem, setNewRoleItem] = useState('')

    const [editingId, setEditingId] = useState(null)

    const loadData = async () => {
        const data = await encargosService.getEstados()
        setItems(Array.isArray(data) ? data : [])
        setDataInTable(Array.isArray(data) ? data : [])
        
        try {
            const settings = await window.api.getEncargosSettings()
            if (settings && settings.alcance_estados) {
                setAlcancePolitica(settings.alcance_estados)
            }
        } catch (error) {}

        try {
            if (window.api.getUsuarios) {
                const usersResponse = await window.api.getUsuarios()
                let arrUsers = []
                if (Array.isArray(usersResponse)) arrUsers = usersResponse
                else if (usersResponse && typeof usersResponse === 'object') {
                    arrUsers = usersResponse.data || usersResponse.usuarios || Object.values(usersResponse)
                }
                if (Array.isArray(arrUsers)) {
                    setUsuariosDB(arrUsers);
                    setUsuariosForBuscador(arrUsers.map(u => ({
                        id: u.username || u.usuario || u.nombre_completo || u.id,
                        nombre: u.nombre_completo || u.nombre || u.username
                    })))
                }
            }
            if (window.api.getRoles) {
                const rolesResponse = await window.api.getRoles()
                let arrRoles = []
                if (Array.isArray(rolesResponse)) arrRoles = rolesResponse
                else if (rolesResponse && typeof rolesResponse === 'object') {
                    arrRoles = rolesResponse.data || rolesResponse.roles || Object.values(rolesResponse)
                }
                if (Array.isArray(arrRoles)) {
                    setRolesDB(arrRoles)
                    setRolesForBuscador(arrRoles.map(r => ({
                        id: r.nombre,
                        nombre: r.nombre
                    })))
                }
            }
        } catch (e) { 
            console.error("No se pudieron cargar catálogos", e) 
        }

        setReloadTable(prev => prev + 1)
    }

    const cleanForm = () => {
        setForm({
            titulo: '',
            descripcion: '',
            color: '#0d6efd',
            allow_calendar: 0,
            icon_data: 'bi-tag-fill',
        })
        setAsignacionesUsuarios([])
        setAsignacionesRoles([])
        setNewUserItem('')
        setNewRoleItem('')
    }

    useEffect(() => { 
        loadData()
        window.addEventListener('configuracion-estados-actualizada', loadData)
        return () => window.removeEventListener('configuracion-estados-actualizada', loadData)
    }, [])

    const isUserValid = useMemo(() => {
        if (!newUserItem) return false
        const search = newUserItem.trim().toLowerCase()
        return usuariosDB.some(u => 
            (u.nombre_completo || u.nombre || '').toLowerCase() === search || 
            (u.username || u.usuario || '').toLowerCase() === search
        )
    }, [newUserItem, usuariosDB])

    const isRoleValid = useMemo(() => {
        if (!newRoleItem) return false
        const search = newRoleItem.trim().toLowerCase()
        return rolesDB.some(r => (r.nombre || '').toLowerCase() === search)
    }, [newRoleItem, rolesDB])


    const handleAddAsignacion = (tipo) => {
        if (tipo === 'usuario' && isUserValid) {
            const search = newUserItem.trim().toLowerCase()
            const userObj = usuariosDB.find(u => 
                (u.nombre_completo || u.nombre || '').toLowerCase() === search || 
                (u.username || u.usuario || '').toLowerCase() === search
            )
            
            if (!userObj) return

            const nameToSave = userObj.nombre_completo || userObj.nombre || userObj.username

            if (asignacionesUsuarios.some(u => u.nombre.toLowerCase() === nameToSave.toLowerCase())) {
                return Swal.fire('Aviso', 'Este usuario ya está en la lista', 'info')
            }
            
            setAsignacionesUsuarios([...asignacionesUsuarios, {
                nombre: nameToSave,
                foto: userObj.foto_perfil || userObj.foto || userObj.avatar || null,
                can_assign: true,
                can_modify: true
            }])
            setNewUserItem('')

        } else if (tipo === 'rol' && isRoleValid) {
            const search = newRoleItem.trim().toLowerCase()
            const rolObj = rolesDB.find(r => (r.nombre || '').toLowerCase() === search)
            
            if (!rolObj) return

            if (asignacionesRoles.some(r => r.nombre.toLowerCase() === rolObj.nombre.toLowerCase())) {
                return Swal.fire('Aviso', 'Este rol ya está en la lista', 'info')
            }
            
            setAsignacionesRoles([...asignacionesRoles, {
                nombre: rolObj.nombre,
                can_assign: true,
                can_modify: true
            }])
            setNewRoleItem('')
        }
    }

    const updatePermiso = (index, campo, valor, tipo) => {
        if (tipo === 'usuario') {
            const nuevas = [...asignacionesUsuarios]
            nuevas[index][campo] = valor
            setAsignacionesUsuarios(nuevas)
        } else {
            const nuevas = [...asignacionesRoles]
            nuevas[index][campo] = valor
            setAsignacionesRoles(nuevas)
        }
    }

    const removeAsignacion = (index, tipo) => {
        if (tipo === 'usuario') {
            const nuevas = [...asignacionesUsuarios]
            nuevas.splice(index, 1)
            setAsignacionesUsuarios(nuevas)
        } else {
            const nuevas = [...asignacionesRoles]
            nuevas.splice(index, 1)
            setAsignacionesRoles(nuevas)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        let result
        
        const cleanIcon = form.icon_data.trim().replace(/^bi\s+/, '')
        
        const payload = { 
            ...form, 
            icon_data: cleanIcon,
            usuario_asignado: alcancePolitica === 'usuario' ? JSON.stringify(asignacionesUsuarios) : '',
            rol_asignado: alcancePolitica === 'rol' ? JSON.stringify(asignacionesRoles) : ''
        }

        if (editingId) {
            result = await encargosService.updateEstado({ ...payload, id: editingId })
        } else {
            result = await encargosService.addEstado(payload)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Estado guardado', icon: 'success', timer: 1500 })
            cleanForm()
            handleClose()
            loadData()
            window.dispatchEvent(new CustomEvent('estados-actualizados'))
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error')
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Eliminar Estado?",
            text: "Todos los encargos que tengan este estado asignado quedarán con estado nulo.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Sí, eliminar",
            denyButtonText: `Cancelar`
        })

        if (result.isConfirmed) {
            const res = await encargosService.deleteEstado(id)
            if (res.success) {
                loadData()
                window.dispatchEvent(new CustomEvent('estados-actualizados'))
            }
        }
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                e.preventDefault()
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)

                    setForm({
                        titulo: item.titulo || '',
                        descripcion: item.descripcion || '',
                        color: item.color || '#0d6efd',
                        allow_calendar: item.allow_calendar ? 1 : 0,
                        icon_data: item.icon_data || 'bi-tag-fill',
                    })

                    setAsignacionesUsuarios(safeParse(item.usuario_asignado))
                    setAsignacionesRoles(safeParse(item.rol_asignado))

                    setEditingId(item.id)
                    handleShow()
                } catch (err) { console.error("Error leyendo datos", err) }
            }

            const delBtn = e.target.closest('.btn-delete')
            if (delBtn) {
                e.preventDefault()
                handleDelete(delBtn.dataset.id)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    return <>
        <div className="mb-3">
            <button className='btn btn-primary' onClick={() => {
                setEditingId(null)
                cleanForm()
                handleShow()
            }}>
                Nuevo Estado
            </button>
        </div>

        <div ref={tableContainerRef} className="w-100 overflow-visible">
            <CustomDataTable
                tableId="dt-encargos-estados"
                reloadKey={reloadTable}
                data={dataInTable}
                columns={[
                    {
                        data: 'titulo',
                        title: 'Título',
                        render: (data, type, row) => {
                            let textColor = '#ffffff'
                            if (row.color) {
                                const hex = row.color.replace('#', '')
                                const r = parseInt(hex.substr(0, 2), 16)
                                const g = parseInt(hex.substr(2, 2), 16)
                                const b = parseInt(hex.substr(4, 2), 16)
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
                                textColor = (yiq >= 128) ? '#000000' : '#ffffff'
                            }
                            
                            const iconClass = row.icon_data && row.icon_data.startsWith('bi-') 
                                ? `bi ${row.icon_data}` 
                                : (row.icon_data || 'bi bi-tag-fill')

                            return `
                                <span class="badge" style="background-color: ${row.color || '#6c757d'}; color: ${textColor}; font-size: 13px;">
                                    <i class="${iconClass} me-1"></i> ${data}
                                </span>
                            `
                        }
                    },
                    { data: 'descripcion', title: 'Descripción' },
                    {
                        data: null,
                        title: 'Accesibilidad',
                        render: (data, type, row) => {
                            if (alcancePolitica === 'usuario' && row.usuario_asignado) {
                                const arr = safeParse(row.usuario_asignado)
                                const names = arr.map(u => u.nombre).join(', ')
                                return `<span title="${names}"> ${arr.length} Usuario(s)</span>`
                            }
                            if (alcancePolitica === 'rol' && row.rol_asignado) {
                                const arr = safeParse(row.rol_asignado)
                                const names = arr.map(r => r.nombre).join(', ')
                                return `<span title="${names}"> ${arr.length} Rol(es)</span>`
                            }
                            return `<span> Global</span>`
                        }
                    },
                    {
                        data: 'allow_calendar',
                        title: 'En calendario',
                        render: (data) => `${Number(data) > 0 ? 'Si' : 'No'}`
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        className: 'text-center',
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row))
                            return `
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
                                        <i class="bi bi-three-dots-vertical"></i>
                                    </button>
                                    <ul class="dropdown-menu shadow-sm">
                                        <li>
                                            <a class="dropdown-item btn-edit" href="#" data-alldata="${safeData}">
                                                <i class="bi bi-pencil me-2 text-primary"></i> Editar
                                            </a>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <button class="dropdown-item text-danger btn-delete" data-id="${row.id}">
                                                <i class="bi bi-trash3 me-2"></i> Eliminar
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            `
                        }
                    }
                ]}
            />
        </div>

        <ModalFormEstado 
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            editingId={editingId}
            form={form}
            setForm={setForm}
            alcancePolitica={alcancePolitica}
            usuariosForBuscador={usuariosForBuscador}
            newUserItem={newUserItem}
            setNewUserItem={setNewUserItem}
            isUserValid={isUserValid}
            handleAddAsignacion={handleAddAsignacion}
            asignacionesUsuarios={asignacionesUsuarios}
            rolesForBuscador={rolesForBuscador}
            newRoleItem={newRoleItem}
            setNewRoleItem={setNewRoleItem}
            isRoleValid={isRoleValid}
            asignacionesRoles={asignacionesRoles}
            updatePermiso={updatePermiso}
            removeAsignacion={removeAsignacion}
        />
    </>
}