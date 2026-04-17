import { useEffect, useRef } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'

export const TabCuentasPorCobrar = ({ carteraData, onOpenModal }) => {
    const tableCobrarRef = useRef(null);

    useEffect(() => {
        const container = tableCobrarRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-pay-item');
            if (!btn) return;
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata));
                onOpenModal(item);
            } catch(err) { console.error(err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, [carteraData, onOpenModal]);

    return (
        <div className="animation-fade-in">
            <div ref={tableCobrarRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    data={carteraData}
                    columns={[
                        { 
                            data: null, title: 'N° Factura',
                            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.numero_factura}</strong>`
                        },
                        { data: 'documento_cliente', title: 'Doc / NIT' },
                        { data: 'nombre_cliente', title: 'Cliente' },
                        { 
                            data: 'date_created', title: 'Fecha Venta',
                            render: (data) => new Date(data).toLocaleDateString('es-CO')
                        },
                        { 
                            data: 'total_factura', title: 'Total Venta',
                            render: (data) => `$${parseFloat(data).toLocaleString('es-CO')}`
                        },
                        { 
                            data: 'saldo_pendiente', title: 'Deuda Pendiente',
                            render: (data) => `<strong class="text-danger fs-6">$${parseFloat(data).toLocaleString('es-CO')}</strong>`
                        },
                        {
                            data: null, title: 'Acciones', orderable: false,
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                return `
                                    <button class="btn btn-sm btn-success text-white btn-pay-item" data-alldata="${safeData}" title="Registrar Pago">
                                        <i class="bi bi-cash-coin me-1"></i> Abonar
                                    </button>
                                `;
                            }
                        }
                    ]}
                />
            </div>
        </div>
    )
}