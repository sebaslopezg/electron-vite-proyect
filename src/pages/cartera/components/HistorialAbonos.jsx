import { useEffect, useRef, useState } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'
import { ImpresorAbono } from './ImpresorAbono'
import { formatCurrency } from '../../../utils/currencies'
import { carteraService } from '../../../services/carteraService'
import { ventasService } from '../../../services/ventasService'
import { ModalDetalleFactura } from '../../ventas/components/ModalDetalleFactura'
import { ImpresorFactura } from '../../ventas/components/ImpresorFactura'
import Swal from 'sweetalert2'

export const TabHistorialAbonos = ({ reloadKey, almacenConf, appConfig, currentUser }) => {
    const tableAbonosRef = useRef(null)
    const [showPreview, setShowPreview] = useState(false)
    const [abonoSeleccionado, setAbonoSeleccionado] = useState(null)

    const [isLoading, setIsLoading] = useState(true)

    const [showFacturaModal, setShowFacturaModal] = useState(false)
    const [showImpresorFactura, setShowImpresorFactura] = useState(false)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [detalleFacturaData, setDetalleFacturaData] = useState([])
    const [notasFactura, setNotasFactura] = useState([])

    useEffect(() => {
        if (currentUser) {
            setIsLoading(false)
        } else {
            const timer = setTimeout(() => setIsLoading(false), 800)
            return () => clearTimeout(timer)
        }
    }, [currentUser])

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const handleVerFactura = async (numFactura) => {
        const result = await ventasService.searchFactura(numFactura)
        if (result.success) {
            setFacturaSeleccionada(result.maestro)
            const det = await ventasService.getDetalleFactura(result.maestro.id)
            if (det.success) {
                setDetalleFacturaData(det.data || [])
                setNotasFactura(det.notes || [])
                setShowFacturaModal(true)
            }
        } else {
            Swal.fire('Error', 'La factura no existe o fue eliminada', 'error')
        }
    }

    const handlePrepararImpresionFactura = () => {
        setShowFacturaModal(false)
        setShowImpresorFactura(true)
    }

    useEffect(() => {
        const container = tableAbonosRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btnAbono = e.target.closest('.btn-print-abono')
            if (btnAbono && container.contains(btnAbono)) {
                e.preventDefault()
                try {
                    const item = JSON.parse(decodeURIComponent(btnAbono.dataset.alldata))
                    setAbonoSeleccionado(item)
                    setShowPreview(true)
                } catch(err) { console.error(err) }
            }

            const btnFactura = e.target.closest('.btn-ver-factura')
            if (btnFactura && container.contains(btnFactura)) {
                e.preventDefault()
                handleVerFactura(btnFactura.dataset.fullnum)
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [currentUser, isLoading])

    return <>
        <div className="position-relative animation-fade-in" style={{ minHeight: isLoading ? '50vh' : 'auto' }}>
            
            {isLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white" style={{ zIndex: 10 }}>
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            )}

            <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.4s ease-in-out', pointerEvents: isLoading ? 'none' : 'auto' }}>
                <div ref={tableAbonosRef} className="w-100 overflow-hidden">
                    <DataTableComponent 
                        tableId="dt-cartera-historial-abonos"
                        key={`historial-${appConfig.moneda}-${appConfig.formato_numero}-${currentUser?.permisos?.length}`}
                        reloadKey={reloadKey}
                        ajaxData={(params) => carteraService.getHistorialAbonosPaginados(params)}
                        columns={[
                            { 
                                data: 'date_created', title: 'Fecha Abono',
                                render: (data) => new Date(data).toLocaleString(appConfig.formato_numero, { dateStyle: 'short', timeStyle: 'short' })
                            },
                            { 
                                data: null, title: 'Factura Pagada',
                                render: (data, type, row) => {
                                    const finalFactura = `${row.prefijo || ''}${row.separador || ''}${row.numero_factura}`
                                    return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-ver-factura" data-fullnum="${finalFactura}">${finalFactura}</a>`
                                }
                            },
                            { data: 'nombre_cliente', title: 'Cliente' },
                            { 
                                data: 'metodo_pago', title: 'Método',
                                render: (data) => `<span class="badge bg-secondary">${data}</span>`
                            },
                            { 
                                data: 'valor', title: 'Valor Abonado',
                                render: (data) => `<strong class="text-success fs-6">${formatCurrency(data, appConfig.formato_numero, appConfig.moneda)}</strong>`
                            },
                            { data: 'usuario', title: 'Cajero' },
                            {
                                data: null, title: 'Recibo', orderable: false, className: 'text-center',
                                render: function (data, type, row) {
                                    const safeData = encodeURIComponent(JSON.stringify(row))
                                    const canPrint = hasPermission('cartera_abono_imprimir')

                                    return canPrint ? `
                                        <button class="btn btn-sm btn-secondary btn-print-abono" data-alldata="${safeData}" title="Imprimir Recibo">
                                            <i class="bi bi-printer"></i> 
                                        </button>
                                    ` : '<i class="bi bi-lock-fill text-muted" title="Sin permiso de impresión"></i>'
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>

        <ImpresorAbono 
            show={showPreview} 
            onClose={() => setShowPreview(false)} 
            abono={abonoSeleccionado} 
            almacenConf={almacenConf} 
        />

        <ModalDetalleFactura 
            show={showFacturaModal}
            handleClose={() => setShowFacturaModal(false)}
            facturaSeleccionada={facturaSeleccionada}
            detalleData={detalleFacturaData}
            notasFactura={notasFactura}
            handlePrepararImpresion={handlePrepararImpresionFactura}
            appConfig={appConfig}
            canPrint={hasPermission('ventas_imprimir')}
        />

        <ImpresorFactura 
            show={showImpresorFactura}
            onClose={() => setShowImpresorFactura(false)}
            factura={facturaSeleccionada}
            detalles={detalleFacturaData}
            almacenConf={almacenConf}
            textoVolver="Cerrar"
        />
    </>
}