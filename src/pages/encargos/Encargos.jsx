import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import DataTableComponent from "../../components/DataTableComponent"
import { Button } from "react-bootstrap"
import Swal from "sweetalert2"
import { EncargoDetalles } from "./components/EncargoDetalles"
import { ModalFormEncargo } from "./components/ModalFormEncargo"
import { ModalBuscarFactura } from "./components/ModalBuscarFactura"
import { ModalHistorialEncargo } from "./components/ModalHistorialEncargo"
import { encargosService } from "../../services/encargosService"
import { ventasService } from "../../services/ventasService"
import { ModalDetalleFactura } from "../ventas/components/ModalDetalleFactura"
import { ImpresorFactura } from "../ventas/components/ImpresorFactura"

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
})

export const Encargos = ({ currentUser: initialUser }) => {
    const [searchParams, setSearchParams] = useSearchParams()

    const [show, setShow] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [showSearchFactura, setShowSearchFactura] = useState(false)

    const [showFacturaModal, setShowFacturaModal] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [detalleData, setDetalleData] = useState([])
    const [notasFactura, setNotasFactura] = useState([])
    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [abiertoDesdeDetalles, setAbiertoDesdeDetalles] = useState(false)
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    // Manejo robusto de la sesión
    const [currentUser, setCurrentUser] = useState(initialUser)

    useEffect(() => {
        if (initialUser) {
            setCurrentUser(initialUser)
        } else if (window.api && window.api.getCurrentUser) {
            window.api.getCurrentUser().then(res => {
                if (res.success && res.data) {
                    setCurrentUser(res.data)
                }
            })
        }
    }, [initialUser])

    const hasPermission = (permissionKey) => {
        const u = currentUser || initialUser;
        if (!u) return false;
        if (u.permisos?.includes('ALL')) return true;
        return u.permisos?.includes(permissionKey);
    }

    const canCreate = hasPermission('encargos_crear');
    const canEditAction = hasPermission('encargos_editar');
    const canDeleteAction = hasPermission('encargos_eliminar');

    const handleClose = () => setShow(false) || setShowInfo(false)
    const handleShow = () => setShow(true)
    const handleShowInfo = () => setShowInfo(true)

    const handleCloseFacturaModal = () => {
        setShowFacturaModal(false)
        setFacturaSeleccionada(null)
        setDetalleData([])
        setNotasFactura([])
    }

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
    const [initialEstadoId, setInitialEstadoId] = useState(null)
    const [estados, setEstados] = useState([])
    const [camposFormulario, setCamposFormulario] = useState([])
    const [encargoSel, setEncargoSel] = useState([])
    const [historialEncargo, setHistorialEncargo] = useState([])

    const [alcancePolitica, setAlcancePolitica] = useState('global')

    const [busquedaFactura, setBusquedaFactura] = useState('')
    const [facturaOrigen, setFacturaOrigen] = useState(null)

    const tableContainerRef = useRef(null)

    const loadConfig = async () => {
        const configData = await ventasService.getConfiguracion()
        const confAppRaw = configData.find(c => c.key === 'confApp')
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value)
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                })
            } catch(e) {}
        }
    }

    const load = async () => {
        const data = await encargosService.getEncargos()
        setItems(data)
        setDataInTable(data)

        try {
            const settings = await window.api.getEncargosSettings()
            if (settings && settings.alcance_estados) {
                setAlcancePolitica(settings.alcance_estados)
            }
        } catch (e) { console.error('Error cargando permisos', e) }
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
        setInitialEstadoId(null)
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

    const handleVerFactura = async (busquedaExacta) => {
        const result = await ventasService.searchFactura(busquedaExacta)
        if (result.success) {
            setFacturaSeleccionada(result.maestro)
            
            const det = await ventasService.getDetalleFactura(result.maestro.id)
            if (det.success) {
                setDetalleData(det.data)
                setNotasFactura(det.notes || [])
                setAlmacenConf(det.configuracion || null)
                setShowFacturaModal(true)
            }
        } else {
            Toast.fire({ icon: 'error', title: 'La factura ya no existe o fue eliminada' })
        }
    }

    const handlePrepararImpresion = () => {
        setShowFacturaModal(false)
        setAbiertoDesdeDetalles(true)
        setShowPreview(true)
    }

    const handleCerrarPreview = () => {
        setShowPreview(false)
        if (abiertoDesdeDetalles) {
            setShowFacturaModal(true)
        } else {
            setFacturaSeleccionada(null)
            setDetalleData([])
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

    const handleInfo = async (item) => {
        setEncargoSel(item)
        if (window.api.getEncargoHistory) {
            const historyRes = await window.api.getEncargoHistory(item.id);
            if (historyRes.success) {
                setHistorialEncargo(historyRes.data);
            }
        }
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
        loadConfig()
        window.addEventListener('config-actualizada', loadConfig)
        return () => window.removeEventListener('config-actualizada', loadConfig)
    }, [])

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
        const handleRequestFactura = (e) => {
            handleVerFactura(e.detail)
        }
        window.addEventListener('request-ver-factura', handleRequestFactura)
        return () => window.removeEventListener('request-ver-factura', handleRequestFactura)
    }, [])

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
                        fecha_entrega: item.fecha_entrega || '',
                        descripcion: item.descripcion || '',
                        estado_id: item.estado_id || 'pendiente',
                        titulo_personalizado: item.titulo_personalizado || '',
                        producto_id: item.producto_id || '',
                        producto_nombre: item.producto_nombre || '',
                        custom_data: item.custom_data ? JSON.parse(item.custom_data) : {}
                    });
                    setEditingId(item.id)
                    setInitialEstadoId(item.estado_id || 'pendiente')
                    handleShow()
                } catch (err) { console.error("Error leyendo datos", err) }
            }

            const infoBtn = e.target.closest('.btn-info')
            if (infoBtn) {
                e.preventDefault()
                const rawData = decodeURIComponent(infoBtn.dataset.alldata)
                const item = JSON.parse(rawData)
                handleInfo(item)
                handleShowInfo()
            }

            const historyBtn = e.target.closest('.btn-history')
            if (historyBtn) {
                e.preventDefault()
                try {
                    const rawData = decodeURIComponent(historyBtn.dataset.alldata)
                    const item = JSON.parse(rawData)
                    handleInfo(item).then(() => {
                        setShowHistoryModal(true)
                    })
                } catch (err) { console.error("Error cargando historial", err) }
            }

            const btnFactura = e.target.closest('.btn-ver-factura')
            if (btnFactura) {
                e.preventDefault()
                handleVerFactura(btnFactura.dataset.fullnum)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [])

    useEffect(() => {
        const verId = searchParams.get('ver_id')
        
        if (verId && items.length > 0) {
            const encargoSeleccionado = items.find(i => String(i.id) === String(verId))
            
            if (encargoSeleccionado) {
                setTimeout(() => {
                    handleInfo(encargoSeleccionado)
                    handleShowInfo()
                }, 150)
            } else {
                Toast.fire({ icon: 'info', title: 'El encargo ya no existe o fue archivado' })
            }

            const newParams = new URLSearchParams(searchParams)
            newParams.delete('ver_id')
            setSearchParams(newParams, { replace: true })
        }
    }, [searchParams, items, setSearchParams])

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
        if (!dateString) return ''
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
    }

    return <>
        {canCreate && (
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Button variant="primary" onClick={() => { cleanForm(); setEditingId(null); handleShow(); }}>
                    <i className="bi bi-plus-circle me-2"></i>Nuevo Encargo
                </Button>
            </div>
        )}

        <div ref={tableContainerRef} className="w-100" style={{ overflow: 'visible' }}>
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
                            const fullNum = `${prefix}${data}`;
                            return `<a href="#" class="text-primary fw-bold btn-ver-factura text-decoration-underline" data-fullnum="${fullNum}" onclick="event.preventDefault()">${fullNum}</a>`
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
                                if (canEditAction) {
                                    return `<button class="btn btn-sm btn-primary btn-edit" data-id="${row.id}" data-alldata="${safeData}">Agendar</button>`;
                                } else {
                                    return `<span class="badge bg-secondary">Sin agendar</span>`;
                                }
                            }
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        className: 'text-center',
                        render: function (data, type, row) {
                            const safeData = encodeURIComponent(JSON.stringify(row));
                            let menuItems = '';

                            if (canEditAction) {
                                menuItems += `
                                    <li>
                                        <a class="dropdown-item btn-edit" href="#" data-alldata="${safeData}">
                                            <i class="bi bi-pencil me-2 text-primary"></i> Editar Encargo
                                        </a>
                                    </li>
                                `;
                            }

                            menuItems += `
                                <li>
                                    <a class="dropdown-item btn-info" href="#" data-alldata="${safeData}">
                                        <i class="bi bi-eye me-2 text-info"></i> Ver Detalles
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item btn-history" href="#" data-alldata="${safeData}">
                                        <i class="bi bi-clock-history me-2 text-secondary"></i> Historial de Estados
                                    </a>
                                </li>
                            `;

                            if (canDeleteAction) {
                                menuItems += `
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <button class="dropdown-item text-danger btn-delete" data-id="${row.id}">
                                            <i class="bi bi-trash3 me-2"></i> Eliminar
                                        </button>
                                    </li>
                                `;
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
                currentUser={currentUser}
                alcancePolitica={alcancePolitica}
                initialEstadoId={initialEstadoId}
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
                onShowHistory={() => setShowHistoryModal(true)}
                onVerFactura={(numeroFactura) => {
                    handleVerFactura(numeroFactura)
                }}
            />

            <ModalHistorialEncargo 
                show={showHistoryModal}
                handleClose={() => setShowHistoryModal(false)}
                historial={historialEncargo}
                encargoData={encargoSel}
            />

            <ModalDetalleFactura
                show={showFacturaModal}
                handleClose={handleCloseFacturaModal}
                facturaSeleccionada={facturaSeleccionada}
                detalleData={detalleData}
                notasFactura={notasFactura}
                handlePrepararImpresion={handlePrepararImpresion}
                appConfig={appConfig}
            />
            
            <ImpresorFactura 
                show={showPreview} 
                onClose={handleCerrarPreview} 
                factura={facturaSeleccionada} 
                detalles={detalleData} 
                almacenConf={almacenConf} 
                textoVolver={abiertoDesdeDetalles ? 'Volver a Detalles' : 'Cerrar'} 
            />
        </div>
    </>
}