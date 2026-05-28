import { useEffect, useRef, useState } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'
import { ImpresorAbono } from './ImpresorAbono'
import { formatCurrency } from '../../../utils/currencies'

export const TabHistorialAbonos = ({ reloadKey, almacenConf, appConfig, currentUser }) => {
    const tableAbonosRef = useRef(null);    
    const [showPreview, setShowPreview] = useState(false);
    const [abonoSeleccionado, setAbonoSeleccionado] = useState(null);

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    useEffect(() => {
        const container = tableAbonosRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-print-abono');
            if (!btn || !container.contains(btn)) return;
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata));
                setAbonoSeleccionado(item);
                setShowPreview(true);
            } catch(err) { console.error(err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, [currentUser]);

    return (
        <div className="animation-fade-in">
            <div ref={tableAbonosRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    tableId="dt-cartera-historial-abonos"
                    key={`historial-${appConfig.moneda}-${appConfig.formato_numero}-${currentUser?.permisos?.length}`}
                    reloadKey={reloadKey}
                    ajaxData={(params) => window.api.getAbonosPaginados(params)}
                    columns={[
                        { 
                            data: 'date_created', title: 'Fecha Abono',
                            render: (data) => new Date(data).toLocaleString(appConfig.formato_numero, { dateStyle: 'short', timeStyle: 'short' })
                        },
                        { 
                            data: null, title: 'Factura Pagada',
                            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.numero_factura}</strong>`
                        },
                        { data: 'nombre_cliente', title: 'Cliente' },
                        { 
                            data: 'metodo_pago', title: 'Método',
                            render: (data) => `<span class="badge bg-secondary">${data}</span>`
                        },
                        { 
                            data: 'valor', title: 'Valor Abonado',
                            render: (data) => `<strong class="text-success fs-6">+${formatCurrency(data, appConfig.formato_numero, appConfig.moneda)}</strong>`
                        },
                        { data: 'usuario', title: 'Cajero' },
                        {
                            data: null, title: 'Recibo', orderable: false, className: 'text-center',
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                const canPrint = hasPermission('cartera_abono_imprimir');

                                return canPrint ? `
                                    <button class="btn btn-sm btn-outline-dark btn-print-abono" data-alldata="${safeData}" title="Imprimir Recibo">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                ` : '<i class="bi bi-lock-fill text-muted" title="Sin permiso de impresión"></i>';
                            }
                        }
                    ]}
                />
            </div>

            <ImpresorAbono 
                show={showPreview} 
                onClose={() => setShowPreview(false)} 
                abono={abonoSeleccionado} 
                almacenConf={almacenConf} 
            />
        </div>
    )
}