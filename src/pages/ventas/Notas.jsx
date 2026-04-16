import { useState, useEffect, useRef } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import { NuevaNota } from './NuevaNota.jsx'

export const Notas = () => {
    const [notasData, setNotasData] = useState([])
    const [showForm, setShowForm] = useState(false) 

    const loadNotas = async () => {
        try {
            const data = await window.api.getNotas() 
            setNotasData(data || [])
        } catch (error) {
            console.error("Error cargando notas:", error)
        }
    }

    useEffect(() => {
        loadNotas()
    }, [])

    const handleViewDetails = (row) => {
        Swal.fire('Detalles', `Mostrando detalles de la nota ${row.prefijo}-${row.numero_nota}`, 'info');
    }

    const handlePrint = (row) => {
        Swal.fire('Imprimir', `Generando PDF para la nota ${row.prefijo}-${row.numero_nota}`, 'success');
    }

    const tableContainerRef = useRef(null);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-alldata]');
            if (!btn) return;

            try {
                const rawData = decodeURIComponent(btn.dataset.alldata);
                const item = JSON.parse(rawData);

                if (btn.classList.contains('btn-view')) handleViewDetails(item);
                else if (btn.classList.contains('btn-print')) handlePrint(item);
                
            } catch(err) { console.error("Error leyendo datos del botón", err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    if (showForm) {
        return <NuevaNota 
            onBack={() => setShowForm(false)} 
            onSuccess={() => {
                setShowForm(false);
                loadNotas();
            }} 
        />
    }

    return (
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title m-0">Gestión de Notas Crédito / Débito</h5>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="bi bi-plus-circle me-2"></i>Nueva Nota
                </button>
            </div>

            <div ref={tableContainerRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    data={notasData}
                    columns={[
                        { 
                            data: null, 
                            title: 'Número',
                            render: (data, type, row) => `<strong>${row.prefijo || ''}-${row.numero_nota}</strong>`
                        },
                        { 
                            data: 'tipo_nota', 
                            title: 'Tipo',
                            render: (data) => {
                                const badgeColor = data === 'Crédito' ? 'success' : 'danger'
                                return `<span class="badge bg-${badgeColor}">${data}</span>`
                            }
                        },
                        { 
                            data: null, 
                            title: 'Factura Relacionada',
                            render: (data, type, row) => {
                                const prefix = row.prefijo_factura ? row.prefijo_factura : '';
                                return `${prefix}${row.numero_factura || row.numero_factura_origen}`;
                            }
                        },
                        { 
                            data: 'date_created', 
                            title: 'Fecha',
                            render: (data) => new Date(data).toLocaleDateString('es-CO')
                        },
                        { data: 'motivo_dian', title: 'Motivo' },
                        { 
                            data: 'total_final', 
                            title: 'Total',
                            render: (data) => `<strong>$${parseFloat(data).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>`
                        },
                        {
                            data: null,
                            title: 'Acciones',
                            orderable: false,
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                return `
                                    <button class="btn btn-sm btn-info text-white me-2 btn-view" data-alldata="${safeData}" title="Ver Detalles">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary btn-print" data-alldata="${safeData}" title="Imprimir">
                                        <i class="bi bi-printer"></i>
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