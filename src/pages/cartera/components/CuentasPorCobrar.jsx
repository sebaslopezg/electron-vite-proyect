import { useEffect, useRef } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'
import { formatCurrency } from '../../../utils/currencies'

export const TabCuentasPorCobrar = ({ reloadKey, onOpenModal, appConfig, currentUser }) => {
    const tableCobrarRef = useRef(null);

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    useEffect(() => {
        const container = tableCobrarRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-pay-item')
            if (!btn || !container.contains(btn)) return
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata))
                onOpenModal(item);
            } catch(err) { console.error(err) }
        };

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [onOpenModal, currentUser]);

    return (
        <div className="animation-fade-in">
            <div ref={tableCobrarRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    tableId="dt-cartera-cuentas-por-cobrar"
                    key={`cobrar-${appConfig.moneda}-${appConfig.formato_numero}-${currentUser?.permisos?.length}`}
                    reloadKey={reloadKey}
                    ajaxData={(params) => window.api.getCarteraPaginada(params)}
                    columns={[
                        { 
                            data: null, title: 'N° Factura',
                            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.numero_factura}</strong>`
                        },
                        { data: 'documento_cliente', title: 'Doc / NIT' },
                        { data: 'nombre_cliente', title: 'Cliente' },
                        { 
                            data: 'date_created', title: 'Fecha Venta',
                            render: (data) => new Date(data).toLocaleDateString(appConfig.formato_numero)
                        },
                        { 
                            data: 'total_factura', title: 'Total Venta',
                            render: (data) => formatCurrency(data, appConfig.formato_numero, appConfig.moneda)
                        },
                        { 
                            data: 'saldo_pendiente', title: 'Deuda Pendiente',
                            render: (data) => `<strong class="text-danger fs-6">${formatCurrency(data, appConfig.formato_numero, appConfig.moneda)}</strong>`
                        },
                        {
                            data: null, title: 'Acciones', orderable: false, className: 'text-center',
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                const canAbonar = hasPermission('cartera_abonar');

                                return canAbonar ? `
                                    <button class="btn btn-sm btn-success text-white btn-pay-item" data-alldata="${safeData}" title="Registrar Pago">
                                        <i class="bi bi-cash-coin me-1"></i> Abonar
                                    </button>
                                ` : '<span class="text-muted small fst-italic">Solo Lectura</span>';
                            }
                        }
                    ]}
                />
            </div>
        </div>
    )
}