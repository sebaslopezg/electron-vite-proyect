import { useEffect, useRef, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { Button } from "react-bootstrap"
import Swal from "sweetalert2"
import { EncargoDetalles } from "./components/EncargoDetalles"
import { ModalFormEncargo } from "./components/ModalFormEncargo"
import { ModalBuscarFactura } from "./components/ModalBuscarFactura"
import { encargosService } from "../../services/encargosService"
import { ventasService } from "../../services/ventasService"

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
})

export const Encargos = () => {
    const [show, setShow] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [showSearchFactura, setShowSearchFactura] = useState(false)

    const handleClose = () => setShow(false) || setShowInfo(false)
    const handleShow = () => setShow(true)
    const handleShowInfo = () => setShowInfo(true)

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])
    
    const [form, setForm] = useState({
        fecha_entrega: '',
        descripcion: '',
        estado_id: '',
        titulo_personalizado: '',
        producto_id: '',
        producto_nombre: '',
        custom_data: {}
    })
    
    const [editingId, setEditingId] = useState(null)
    const [estados, setEstados] = useState([])
    const [camposFormulario, setCamposFormulario] = useState([])
    const [encargoSel, setEncargoSel] = useState([])

    const [busquedaFactura, setBusquedaFactura] = useState('')
    const [facturaOrigen, setFacturaOrigen] = useState(null)

    const tableContainerRef = useRef(null)

    const load = async () => {
        const data = await encargosService.getEncargos()
        setItems(data)
        setDataInTable(data)
    }

    const loadSelectData = async () => {
        const dataEstados = await encargosService.getEstados()
        const dataCampos = await encargosService.getEncargosCampos()
        setEstados(dataEstados)
        setCamposFormulario(dataCampos || [])
    }

    const cleanForm = () => {
        setForm({ 
            fecha_entrega: '', descripcion: '', estado_id: '', 
            titulo_personalizado: '', producto_id: '', producto_nombre: '', 
            custom_data: {} 
        })
        setBusquedaFactura('')
        setFacturaOrigen(null)
    }

    const handleSearchFactura = async (numToSearch) => {
        const busquedaExacta = (numToSearch || busquedaFactura).trim()
        if (!busquedaExacta) {
            setShowSearchFactura(true)
            return
        }

        const result = await ventasService.searchFactura(busquedaExacta)
        
        if (result.success) {
            setFacturaOrigen(result.maestro)
            setBusquedaFactura(`${result.maestro.prefijo || ''}${result.maestro.separador || ''}${result.maestro.numero_factura}`)
            setShowSearchFactura(false)
            Toast.fire({ icon: 'success', title: 'Factura Encontrada' })
        } else {
            setShowSearchFactura(true)
        }
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        
        let result;

        if (editingId) {
            const payload = { ...form, id: editingId, custom_data: JSON.stringify(form.custom_data || {}) }
            result = await encargosService.updateEncargo(payload)
        } else {
            if (!facturaOrigen) return Swal.fire('Error', 'Debes buscar y seleccionar una factura', 'error')

            const payload = {
                factura_id: facturaOrigen.id,
                producto_id: '',
                estado_id: form.estado_id || 'pendiente',
                almacen_id: facturaOrigen.almacen_id || 'general',
                cliente_id: facturaOrigen.cliente_id || '',
                cliente_nombre: facturaOrigen.nombre_cliente,
                cliente_documento: facturaOrigen.documento_cliente,
                factura_numero: facturaOrigen.numero_factura,
                producto_cantidad: 1, 
                titulo_personalizado: form.titulo_personalizado || '',
                encargo_numero: 0,
                fecha_entrega: form.fecha_entrega,
                descripcion: form.descripcion,
                custom_data: JSON.stringify(form.custom_data || {}),
                status: 1
            }
            result = await encargosService.addEncargo(payload)
        }

        if (result && result.success) {
            Swal.fire({ title: '¡Éxito!', text: 'Encargo agendado correctamente', icon: 'success', timer: 1500 })
            cleanForm()
            handleClose()
            load()
            window.dispatchEvent(new CustomEvent('encargos-actualizados'))
        } else {
            Swal.fire('Error', result?.error || 'No se pudo guardar', 'error')
        }
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
    }

    const handleInfo = (item) => {
        setEncargoSel(item)
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "¿Seguro que desea eliminar el registro?",
            showDenyButton: true,
            confirmButtonText: "Sí",
            denyButtonText: `No`
        });

        if (result.isConfirmed) {
            await encargosService.deleteEncargo(id)
            load()
            window.dispatchEvent(new CustomEvent('encargos-actualizados'))
        }
    }

    useEffect(() => {
        load()
        loadSelectData()

        const handleEstadosUpdate = () => loadSelectData()
        
        window.addEventListener('estados-actualizados', handleEstadosUpdate)
        window.addEventListener('formulario-encargos-actualizado', handleEstadosUpdate)
        
        return () => {
            window.removeEventListener('estados-actualizados', handleEstadosUpdate)
            window.removeEventListener('formulario-encargos-actualizado', handleEstadosUpdate)
        }
    }, [])

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const editBtn = e.target.closest('.btn-edit')
            if (editBtn) {
                try {
                    const rawData = decodeURIComponent(editBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    setForm({
                        fecha_entrega: item.fecha_entrega || '',
                        descripcion: item.descripcion || '',
                        estado_id: item.estado_id || 'pendiente',
                        titulo_personalizado: item.titulo_personalizado || '',
                        producto_id: item.producto_id || '',
                        producto_nombre: item.producto_nombre || '',
                        custom_data: item.custom_data ? JSON.parse(item.custom_data) : {}
                    });
                    setEditingId(item.id)
                    handleShow()
                } catch (err) { console.error("Error leyendo datos", err) }
            }

            const infoBtn = e.target.closest('.btn-info')
            if (infoBtn) {
                const rawData = decodeURIComponent(infoBtn.dataset.alldata)
                const item = JSON.parse(rawData)
                handleInfo(item)
                handleShowInfo()
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    const getBadgeClassForDate = (dateString) => {
        if (!dateString) return ''
        
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        
        const [year, month, day] = dateString.split('-');
        const fechaEntrega = new Date(year, month - 1, day);
        fechaEntrega.setHours(0, 0, 0, 0);

        if (fechaEntrega.getTime() === hoy.getTime()) {
            return 'bg-warning text-dark'
        } else if (fechaEntrega < hoy) {
            return 'bg-danger'
        } else {
            return 'bg-secondary'
        }
    };

    const formatToLocalString = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    return <>
        <div className="d-flex justify-content-between align-items-center mb-3">
            <Button variant="primary" onClick={() => { cleanForm(); setEditingId(null); handleShow(); }}>
                <i className="bi bi-plus-circle me-2"></i>Nuevo Encargo
            </Button>
        </div>

        <div ref={tableContainerRef} className="w-100">
            <DataTableComponent
                tableId="dt-encargos-maestro"
                data={dataInTable}
                columns={[
                    { data: 'encargo_numero', title: 'N° encargo' },
                    { 
                        data: 'factura_numero', 
                        title: 'N° Factura',
                        render: (data, type, row) => {
                            const prefix = row.prefijo ? `${row.prefijo}-` : '';
                            return `<strong>${prefix}${data}</strong>`
                        }
                    },
                    {
                        data: 'estado_titulo',
                        title: 'Estado',
                        render: (data, type, row) => {
                            let textColor = '#ffffff';
                            if (row.estado_color) {
                                const hex = row.estado_color.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                            }

                            return `
                                <span class="badge" style="background-color: ${row.estado_color || '#6c757d'}; color: ${textColor}; font-size: 13px;">
                                    <i class="${row.icon || 'bi bi-tag-fill'} me-1"></i> ${data || 'Pendiente'}
                                </span>
                            `
                        }
                    },
                    { data: 'cliente_nombre', title: 'Cliente' },
                    { data: 'cliente_documento', title: 'Documento cliente' },
                    {
                        data: 'fecha_entrega',
                        title: 'Fecha de entrega',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            
                            if (row.fecha_entrega) {
                                const badgeClass = getBadgeClassForDate(row.fecha_entrega);
                                const formattedDate = formatToLocalString(row.fecha_entrega);
                                return `<span class="badge rounded-pill ${badgeClass} fs-6 fw-normal">${formattedDate}</span>`;
                            } else {
                                return `<button class="btn btn-sm btn-primary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}">
                                            Agendar
                                        </button>`;
                            }
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            return `
                                <button class="btn btn-sm btn-secondary me-2 btn-edit" data-id="${row.id}" data-alldata="${safeData}" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-info me-2 btn-info text-white" data-id="${row.id}" data-alldata="${safeData}" title="Ver Detalles">
                                    <i class="bi bi-eye"></i>
                                </button>
                            `
                        }
                    }
                ]}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShow={handleShow}
                customRenders={{
                    date_created: (data) => new Date(data).toLocaleDateString('es-ES'),
                    date_modify: (data) => new Date(data).toLocaleDateString('es-ES')
                }}
            />
            
            <ModalFormEncargo 
                show={show}
                handleClose={handleClose}
                handleSubmit={handleSubmit}
                editingId={editingId}
                form={form}
                setForm={setForm}
                busquedaFactura={busquedaFactura}
                setBusquedaFactura={setBusquedaFactura}
                handleSearchFactura={handleSearchFactura}
                facturaOrigen={facturaOrigen}
                estados={estados}
                camposDinamicos={camposFormulario}
            />
            
            <ModalBuscarFactura 
                show={showSearchFactura}
                handleClose={() => setShowSearchFactura(false)}
                handleSearchFactura={handleSearchFactura}
            />

            <EncargoDetalles
                show={showInfo}
                handleClose={handleClose}
                encargoData={encargoSel}
            />
        </div>
    </>
}