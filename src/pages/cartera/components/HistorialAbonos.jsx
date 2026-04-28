import { useEffect, useRef, useState } from 'react'
import DataTableComponent from '../../../components/DataTableComponent'
import { ImpresorAbono } from './ImpresorAbono'
import { formatCurrency } from '../../../utils/currencies'

export const TabHistorialAbonos = ({ abonosData, almacenConf, appConfig }) => {
    const tableAbonosRef = useRef(null);    
    const [showPreview, setShowPreview] = useState(false);
    const [abonoSeleccionado, setAbonoSeleccionado] = useState(null);

    useEffect(() => {
        const container = tableAbonosRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('.btn-print-abono');
            if (!btn) return;
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata));
                setAbonoSeleccionado(item);
                setShowPreview(true);
            } catch(err) { console.error(err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, [abonosData]);

    return (
        <div className="animation-fade-in">

            <div ref={tableAbonosRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    key={`historial-${appConfig.moneda}-${appConfig.formato_numero}`}
                    data={abonosData}
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
                            data: null, title: 'Recibo', orderable: false,
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                return `
                                    <button class="btn btn-sm btn-outline-dark btn-print-abono" data-alldata="${safeData}" title="Imprimir Recibo">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                `;
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