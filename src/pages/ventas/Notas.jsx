import { useState, useEffect, useRef } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import { NuevaNota } from './NuevaNota.jsx'
import { ImpresorNota } from './components/ImpresorNota'
import { formatCurrency } from '../../utils/currencies'
import { ModalDetalleNota } from './components/ModalDetalleNota'
import { ModalDetalleFactura } from './components/ModalDetalleFactura'
import { ImpresorFactura } from './components/ImpresorFactura'
import { ventasService } from '../../services/ventasService'
import { exportToExcel, exportToPDF, exportNotaPDF } from '../../utils/exporter'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const Notas = ({ currentUser }) => {
    // 1. Estado local para garantizar que siempre tengamos la sesión cargada
    const [activeUser, setActiveUser] = useState(currentUser)

    const [notasData, setNotasData] = useState([])
    const [showForm, setShowForm] = useState(false) 

    const [showModal, setShowModal] = useState(false)
    const [notaSeleccionada, setNotaSeleccionada] = useState(null)
    const [detalleData, setDetalleData] = useState([])

    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [abiertoDesdeDetalles, setAbiertoDesdeDetalles] = useState(false)

    const [showModalFactura, setShowModalFactura] = useState(false)
    const [showImpresorFactura, setShowImpresorFactura] = useState(false)
    const [facturaVer, setFacturaVer] = useState(null)
    const [detalleFacturaData, setDetalleFacturaData] = useState([])
    const [notasFacturaList, setNotasFacturaList] = useState([])

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
        if (currentUser) {
            setActiveUser(currentUser)
        } else if (window.api && window.api.getCurrentUser) {
            window.api.getCurrentUser().then(res => {
                if (res.success && res.data) {
                    setActiveUser(res.data)
                }
            })
        }
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        const u = activeUser || currentUser;
        if (!u) return false;
        if (u.permisos?.includes('ALL')) return true;
        return u.permisos?.includes(permissionKey);
    }

    const canCrearCredito = hasPermission('notas_credito_crear');
    const canCrearDebito = hasPermission('notas_debito_crear');
    
    const canCreateAnyNota = canCrearCredito || canCrearDebito;

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

    const loadAlmacenInfo = async () => {
        try {
            const data = await ventasService.getAllConfAlmacen()
            if (data && data.length > 0) setAlmacenConf(data[0])
        } catch (error) {
            console.error("Error cargando info de almacén", error)
        }
    }

    const _formatCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
    }

    const loadNotas = async () => {
        try {
            const data = await ventasService.getNotas() 
            setNotasData(data || [])
        } catch (error) {
            console.error("Error cargando notas:", error)
        }
    }

    useEffect(() => {
        loadAlmacenInfo()
        loadNotas()
        loadConfig()
        window.addEventListener('config-actualizada', loadConfig)
        return () => window.removeEventListener('config-actualizada', loadConfig)
    }, [])

    const handleCloseModal = () => {
        setShowModal(false)
        setNotaSeleccionada(null)
        setDetalleData([])
    }

    const handleViewDetails = async (row) => {
        setNotaSeleccionada(row)
        
        const response = await ventasService.getNotaDetalle(row.id)
        if (response.success) {
            setDetalleData(response.data)
            setAlmacenConf(response.configuracion || null)
            setShowModal(true)
        } else {
            Toast.fire({ icon: 'error', title: 'No se pudieron cargar los detalles de la nota' })
        }
    }

    const imprimirDirecto = async (row) => {
        setNotaSeleccionada(row)
        
        const response = await ventasService.getNotaDetalle(row.id)
        if (response.success) {
            setDetalleData(response.data)
            setAlmacenConf(response.configuracion || null)
            
            setAbiertoDesdeDetalles(false)
            setShowPreview(true)
        }
    }

    const handlePrepararImpresion = () => {
        setShowModal(false)
        setAbiertoDesdeDetalles(true)
        setShowPreview(true)
    }

    const handleCerrarPreview = () => {
        setShowPreview(false)
        if (abiertoDesdeDetalles) {
            setShowModal(true)
        } else {
            setNotaSeleccionada(null)
            setDetalleData([])
        }
    }

    const handleViewFactura = async (nota) => {
        let numFactura = nota.numero_factura || nota.numero_factura_origen;
        if (!numFactura) return;

        try {
            let searchRes = await ventasService.searchFactura(numFactura);
            
            if (!searchRes.success && isNaN(Number(numFactura))) {
                 const cleanNum = numFactura.replace(/\D/g, '');
                 if (cleanNum) searchRes = await ventasService.searchFactura(cleanNum);
            }

            if (searchRes.success && searchRes.maestro) {
                setFacturaVer(searchRes.maestro);
                
                const result = await ventasService.getDetalleFactura(searchRes.maestro.id);
                if (Array.isArray(result)) {
                    setDetalleFacturaData(result);
                    setNotasFacturaList([]);
                } else if (result && (result.success || result.data || result.detalles)) {
                    setDetalleFacturaData(result.data || result.detalles || []);
                    setNotasFacturaList(result.notes || result.notas || []);
                } else {
                    setDetalleFacturaData(searchRes.detalles || []);
                    setNotasFacturaList([]);
                }
                
                setShowModalFactura(true);
            } else {
                Toast.fire({ icon: 'warning', title: 'No se encontró la factura original en el sistema' });
            }
        } catch (error) {
            console.error("Error buscando factura", error);
            Toast.fire({ icon: 'error', title: 'Error al buscar la factura' });
        }
    }

    const handleCloseModalFactura = () => {
        setShowModalFactura(false);
        setFacturaVer(null);
        setDetalleFacturaData([]);
        setNotasFacturaList([]);
    }

    const handlePrepararImpresionFactura = () => {
        setShowModalFactura(false);
        setShowImpresorFactura(true);
    }

    const handleExportAllExcel = () => {
        if (notasData.length === 0) return Swal.fire('Error', 'No hay notas para exportar', 'warning')

        const dataToExport = notasData.map(n => ({
            'Fecha': new Date(n.date_created).toLocaleString(appConfig.formato_numero),
            'Número Nota': `${n.prefijo || ''}-${n.numero_nota}`,
            'Tipo': `Nota ${n.tipo_nota}`,
            'Factura Relacionada': `${n.prefijo_factura || ''}${almacenConf?.separador || '-'}${n.numero_factura || n.numero_factura_origen || ''}`.replace(/^\D+/, n.prefijo_factura || ''),
            'Motivo DIAN': n.motivo_dian,
            'Total': (n.tipo_nota === 'Crédito' ? -Math.abs(n.total_final) : Math.abs(n.total_final))
        }))

        exportToExcel(dataToExport, `Historial_Notas_${new Date().toISOString().split('T')[0]}`, "Notas")
    }

    const handleExportAllPDF = () => {
        if (notasData.length === 0) return Swal.fire('Error', 'No hay notas para exportar', 'warning')

        const tableColumn = ["Fecha", "N° Nota", "Tipo", "Factura", "Motivo", "Total"];
        const tableRows = notasData.map(n => {
            const numFacturaVisual = `${n.prefijo_factura || ''}${almacenConf?.separador || '-'}${n.numero_factura || n.numero_factura_origen || ''}`.replace(/^\D+/, n.prefijo_factura || '');
            const sign = n.tipo_nota === 'Crédito' ? '-' : '+';
            return [
                new Date(n.date_created).toLocaleDateString(appConfig.formato_numero),
                `${n.prefijo || ''}-${n.numero_nota}`,
                `Nota ${n.tipo_nota}`,
                numFacturaVisual,
                n.motivo_dian,
                `${sign}${_formatCurrency(n.total_final)}`
            ]
        });

        exportToPDF({
            title: 'Historial General de Notas Crédito / Débito',
            subtitle: 'Todas las notas registradas en el sistema',
            columns: tableColumn,
            data: tableRows,
            filename: `Historial_Notas_${new Date().toISOString().split('T')[0]}`
        })
    }

    const handleExportSingleExcel = async (nota) => {
        Swal.fire({ title: 'Procesando...', text: 'Extrayendo detalles', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await ventasService.getNotaDetalle(nota.id)
        Swal.close()

        if (!response.success) return Swal.fire('Error', 'No se pudieron extraer los detalles de la nota', 'error')

        const itemsExport = response.data.map(d => ({
            'Ref / Artículo': d.nombre_producto,
            'Cantidad': d.cantidad_producto,
            'Precio Unitario': d.precio_producto,
            'Total': d.total
        }))

        itemsExport.push({ 'Ref / Artículo': '', 'Cantidad': '', 'Precio Unitario': '', 'Total': '' })
        itemsExport.push({ 
            'Ref / Artículo': 'TOTAL NOTA', 
            'Cantidad': '', 
            'Precio Unitario': '', 
            'Total': nota.tipo_nota === 'Crédito' ? -Math.abs(nota.total_final) : Math.abs(nota.total_final) 
        })

        exportToExcel(itemsExport, `Nota_${nota.prefijo || ''}-${nota.numero_nota}`, "Detalle")
    }

    const handleExportSinglePDF = async (nota) => {
        Swal.fire({ title: 'Generando Documento...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await ventasService.getNotaDetalle(nota.id)
        Swal.close()

        if (!response.success) return Swal.fire('Error', 'No se pudieron extraer los detalles', 'error')

        exportNotaPDF({
            nota: nota,
            detalles: response.data,
            configuracion: response.configuracion || almacenConf || {},
            moneda: appConfig.moneda,
            formato_numero: appConfig.formato_numero
        });
    }

    const tableContainerRef = useRef(null)

    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-alldata], a[data-alldata]')
            if (!btn) return
            e.preventDefault()

            try {
                const rawData = decodeURIComponent(btn.dataset.alldata)
                const item = JSON.parse(rawData)

                if (btn.classList.contains('btn-view')) handleViewDetails(item)
                else if (btn.classList.contains('btn-print')) imprimirDirecto(item)
                else if (btn.classList.contains('btn-view-factura')) handleViewFactura(item)
                else if (btn.classList.contains('btn-export-single-excel')) handleExportSingleExcel(item)
                else if (btn.classList.contains('btn-export-single-pdf')) handleExportSinglePDF(item)
                
            } catch(err) { console.error("Error leyendo datos del botón", err) }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
        
    }, [showForm, notasData])

    if (showForm) {
        return <NuevaNota 
            onBack={() => setShowForm(false)} 
            onSuccess={() => {
                setShowForm(false)
                loadNotas() 
            }} 
            canCrearCredito={canCrearCredito}
            canCrearDebito={canCrearDebito}
        />
    }

    return <>
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title m-0">Gestión de Notas Crédito / Débito</h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-danger" onClick={handleExportAllPDF} disabled={notasData.length === 0} title="Exportar Todo a PDF">
                        <i className="bi bi-file-earmark-pdf"></i>
                    </button>
                    <button className="btn btn-outline-success" onClick={handleExportAllExcel} disabled={notasData.length === 0} title="Exportar Todo a Excel">
                        <i className="bi bi-file-earmark-excel"></i>
                    </button>
                    {canCreateAnyNota && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <i className="bi bi-plus-circle me-2"></i>Nueva Nota
                        </button>
                    )}
                </div>
            </div>

            <div ref={tableContainerRef} className="w-100">
                <DataTableComponent 
                    tableId="dt-gestion-notas-maestro"
                    key={`notas-main-${appConfig.moneda}-${appConfig.formato_numero}-${almacenConf?.separador}`}
                    data={notasData}
                    columns={[
                        { 
                            data: null, 
                            title: 'Número',
                            render: (data, type, row) => {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                const numVisual = `${row.prefijo || 'NC'}-${row.numero_nota}`;
                                return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view" data-alldata="${safeData}">${numVisual}</a>`;
                            }
                        },
                        { 
                            data: 'tipo_nota',
                            title: 'Tipo',
                            render: (data) => {
                                const badgeColor = data === 'Crédito' ? 'warning text-dark' : 'secondary'
                                return `<span class="badge bg-${badgeColor}">Nota ${data}</span>`
                            }
                        },
                        { 
                            data: null, 
                            title: 'Factura Relacionada',
                            render: (data, type, row) => {
                                const separador = almacenConf?.separador || '-';
                                let rawNum = String(row.numero_factura || row.numero_factura_origen || '');
                                
                                const onlyNums = rawNum.replace(/^\D+/g, '');
                                
                                let finalPrefix = row.prefijo_factura;
                                if (!finalPrefix) {
                                    const match = rawNum.match(/^([A-Za-z]+)/);
                                    if(match) finalPrefix = match[1];
                                }
                                
                                const finalFactura = finalPrefix ? `${finalPrefix}${separador}${onlyNums}` : onlyNums;
                                
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view-factura" data-alldata="${safeData}">${finalFactura}</a>`;
                            }
                        },
                        { 
                            data: 'date_created', 
                            title: 'Fecha',
                            render: (data) => {
                                if (!data) return '-';
                                return new Date(data).toLocaleString(appConfig.formato_numero, {
                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                });
                            }
                        },
                        { data: 'motivo_dian', title: 'Motivo' },
                        { 
                            data: 'total_final', 
                            title: 'Total',
                            render: (data, type, row) => {
                                const color = row.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'
                                const sign = row.tipo_nota === 'Crédito' ? '-' : '+'
                                return `<strong class="${color}">${sign}${_formatCurrency(data)}</strong>`
                            }
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
                                                <button class="dropdown-item btn-view" data-alldata="${safeData}">
                                                    <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
                                                </button>
                                            </li>
                                            <li>
                                                <button class="dropdown-item btn-print" data-alldata="${safeData}">
                                                    <i class="bi bi-printer me-2 text-primary"></i> Imprimir Tirilla
                                                </button>
                                            </li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li>
                                                <button class="dropdown-item btn-export-single-pdf" data-alldata="${safeData}">
                                                    <i class="bi bi-file-earmark-pdf me-2 text-danger"></i> Descargar en PDF
                                                </button>
                                            </li>
                                            <li>
                                                <button class="dropdown-item btn-export-single-excel" data-alldata="${safeData}">
                                                    <i class="bi bi-file-earmark-excel me-2 text-success"></i> Exportar a Excel
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

            <ModalDetalleNota
                show={showModal}
                handleClose={handleCloseModal}
                notaSeleccionada={notaSeleccionada}
                detalleData={detalleData}
                handlePrepararImpresion={handlePrepararImpresion}
                appConfig={appConfig}
                almacenConf={almacenConf}
            />
            
            <ImpresorNota 
                show={showPreview} 
                onClose={handleCerrarPreview} 
                nota={notaSeleccionada} 
                detalles={detalleData} 
                almacenConf={almacenConf} 
                textoVolver={abiertoDesdeDetalles ? 'Volver a Detalles' : 'Cerrar'} 
            />

            <ModalDetalleFactura 
                show={showModalFactura}
                handleClose={handleCloseModalFactura}
                facturaSeleccionada={facturaVer}
                detalleData={detalleFacturaData}
                notasFactura={notasFacturaList}
                handlePrepararImpresion={handlePrepararImpresionFactura}
                appConfig={appConfig}
            />

            <ImpresorFactura 
                show={showImpresorFactura}
                onClose={() => setShowImpresorFactura(false)}
                factura={facturaVer}
                detalles={detalleFacturaData}
                almacenConf={almacenConf}
                textoVolver="Volver a Notas"
            />
        </div>
    </>
}