import { useState, useEffect, useRef } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import { NuevaNota } from './NuevaNota.jsx'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col } from 'react-bootstrap'
// IMPORTAMOS EL NUEVO COMPONENTE
import { ImpresorNota } from '../../components/ImpresorNota'

export const Notas = () => {
    const [notasData, setNotasData] = useState([])
    const [showForm, setShowForm] = useState(false) 

    // --- ESTADOS PARA EL MODAL DE DETALLES ---
    const [showModal, setShowModal] = useState(false)
    const [notaSeleccionada, setNotaSeleccionada] = useState(null)
    const [detalleData, setDetalleData] = useState([])

    // --- NUEVOS ESTADOS PARA IMPRESIÓN ---
    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [abiertoDesdeDetalles, setAbiertoDesdeDetalles] = useState(false)

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

    const handleCloseModal = () => {
        setShowModal(false)
        setNotaSeleccionada(null)
        setDetalleData([])
    }

    const handleViewDetails = async (row) => {
        setNotaSeleccionada(row)
        
        const response = await window.api.getNotaDetalle(row.id)
        if (response.success) {
            setDetalleData(response.data)
            setAlmacenConf(response.configuracion || null) // Guardamos la config
            setShowModal(true)
        } else {
            Swal.fire('Error', 'No se pudieron cargar los detalles de la nota', 'error')
        }
    }

    // NUEVA FUNCIÓN: Imprimir directamente desde la tabla principal
    const imprimirDirecto = async (row) => {
        setNotaSeleccionada(row)
        
        const response = await window.api.getNotaDetalle(row.id)
        if (response.success) {
            setDetalleData(response.data)
            setAlmacenConf(response.configuracion || null)
            
            setAbiertoDesdeDetalles(false);
            setShowPreview(true);
        }
    }

    // Cierra detalles y abre Preview
    const handlePrepararImpresion = () => {
        setShowModal(false); 
        setAbiertoDesdeDetalles(true);
        setShowPreview(true);
    }

    // Cierra Preview de forma inteligente
    const handleCerrarPreview = () => {
        setShowPreview(false);
        if (abiertoDesdeDetalles) {
            setShowModal(true);
        } else {
            setNotaSeleccionada(null);
            setDetalleData([]);
        }
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
                else if (btn.classList.contains('btn-print')) imprimirDirecto(item); // Cambiado a imprimirDirecto
                
            } catch(err) { console.error("Error leyendo datos del botón", err); }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
        
    }, [showForm, notasData]); 

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
                                const badgeColor = data === 'Crédito' ? 'warning text-dark' : 'secondary'
                                return `<span class="badge bg-${badgeColor}">Nota ${data}</span>`
                            }
                        },
                        { 
                            data: null, 
                            title: 'Factura Relacionada',
                            render: (data, type, row) => {
                                const prefix = row.prefijo_factura ? row.prefijo_factura : '';
                                return `<strong>${prefix}${row.numero_factura || row.numero_factura_origen}</strong>`;
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
                            render: (data, type, row) => {
                                const color = row.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary';
                                const sign = row.tipo_nota === 'Crédito' ? '-' : '+';
                                return `<strong class="${color}">${sign}$${parseFloat(data).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>`;
                            }
                        },
                        {
                            data: null,
                            title: 'Acciones',
                            orderable: false,
                            render: function (data, type, row) {
                                const safeData = encodeURIComponent(JSON.stringify(row));
                                return `
                                    <button class="btn btn-sm btn-secondary text-white me-1 btn-view" data-alldata="${safeData}" title="Ver Detalles">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary text-white btn-print" data-alldata="${safeData}" title="Imprimir">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                `;
                            }
                        }
                    ]}
                />
            </div>

            {/* ==================================================================== */}
            {/* MODAL DE DETALLES DE LA NOTA */}
            {/* ==================================================================== */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title>
                        Detalles de la Nota {notaSeleccionada ? `${notaSeleccionada.prefijo}-${notaSeleccionada.numero_nota}` : ''}                
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* BOTÓN ÚNICO DE IMPRESIÓN */}
                    <div className="d-flex justify-content-end mb-3">
                        <Button variant="primary" onClick={handlePrepararImpresion}>
                            <i className="bi bi-printer me-2"></i> Imprimir Nota
                        </Button>
                    </div>

                    {notaSeleccionada && (
                        <div className="bg-light p-3 rounded mb-3 border">
                            <Row>
                                <Col md={6}>
                                    <p className="mb-1"><strong>Cliente:</strong> {notaSeleccionada.nombre_cliente}</p>
                                    <p className="mb-0"><strong>Documento:</strong> {notaSeleccionada.documento_cliente}</p>
                                </Col>
                                <Col md={6} className="text-end">
                                    <p className="mb-1">
                                        <strong>Aplica a Factura:</strong>{' '}
                                        <span className="badge bg-primary fs-6">
                                            {notaSeleccionada.prefijo_factura || ''}{notaSeleccionada.numero_factura || notaSeleccionada.numero_factura_origen}
                                        </span>
                                    </p>
                                    <p className="mb-0">
                                        <strong>Motivo:</strong> {notaSeleccionada.motivo_dian}
                                    </p>
                                </Col>
                            </Row>
                        </div>
                    )}

                    <DataTableComponent
                        data={detalleData}
                        columns={[
                            { 
                              data: null, title: 'SKU',
                              render: (data, type, row) => {
                                if (!row.sku) return '<span class="text-muted" title="Producto eliminado">Sin SKU</span>'; 
                                const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                                return `<strong>${prefix}${row.sku.toUpperCase()}</strong>`;
                              }
                            },
                            { data: 'nombre_producto', title: 'Producto' },
                            { data: 'cantidad', title: 'Cant.' },
                            { data: 'precio_unitario', title: 'V. Unitario' },
                            { data: 'iva_percent', title: 'IVA' },
                            { data: 'total', title: 'Total' },
                        ]}
                        customRenders={{
                            precio_unitario: (data) => `$${parseFloat(data).toLocaleString('es-CO')}`,
                            iva_percent: (data) => `${(parseFloat(data) * 100).toFixed(0)}%`,
                            total: (data) => `<strong>$${parseFloat(data).toLocaleString('es-CO')}</strong>`
                        }}
                    />

                    {notaSeleccionada && (
                        <div className="mt-3 p-3 bg-light rounded border text-end">
                            <p className="mb-1"><strong>Subtotal:</strong> ${(notaSeleccionada.total_base || 0).toLocaleString('es-CO')}</p>
                            <p className="mb-2"><strong>IVA:</strong> ${(notaSeleccionada.total_iva || 0).toLocaleString('es-CO')}</p>
                            <hr className="my-2" />
                            <h4 className={`mb-0 ${notaSeleccionada.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                                <strong>Total {notaSeleccionada.tipo_nota === 'Crédito' ? 'a favor del cliente' : 'a cobrar'}:</strong> 
                                {' '}{notaSeleccionada.tipo_nota === 'Crédito' ? '-' : '+'}${(notaSeleccionada.total_final || 0).toLocaleString('es-CO')}
                            </h4>
                        </div>
                    )}

                    {notaSeleccionada && notaSeleccionada.observaciones && (
                        <div className="mt-3">
                            <strong>Observaciones:</strong>
                            <p className="text-muted fst-italic">{notaSeleccionada.observaciones}</p>
                        </div>
                    )}

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            {/* INVOCAMOS AL NUEVO COMPONENTE EXTERNO */}
            <ImpresorNota 
                show={showPreview} 
                onClose={handleCerrarPreview} 
                nota={notaSeleccionada} 
                detalles={detalleData} 
                almacenConf={almacenConf} 
                textoVolver={abiertoDesdeDetalles ? 'Volver a Detalles' : 'Cerrar'} 
            />
        </div>
    )
}