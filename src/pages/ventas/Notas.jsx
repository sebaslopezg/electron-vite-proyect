import { useState, useEffect, useRef } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import { NuevaNota } from './NuevaNota.jsx'
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col } from 'react-bootstrap'
import { ImpresorNota } from './components/ImpresorNota'
import { getCurrencySymbol } from '../../utils/currencies'

export const Notas = () => {
    const [notasData, setNotasData] = useState([])
    const [showForm, setShowForm] = useState(false) 

    const [showModal, setShowModal] = useState(false)
    const [notaSeleccionada, setNotaSeleccionada] = useState(null)
    const [detalleData, setDetalleData] = useState([])

    const [almacenConf, setAlmacenConf] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [abiertoDesdeDetalles, setAbiertoDesdeDetalles] = useState(false)

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const loadConfig = async () => {
        const configData = await window.api.getConfiguracion();
        const confAppRaw = configData.find(c => c.key === 'confApp');
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value);
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                });
            } catch(e) {}
        }
    };

    const formatCurrency = (val) => {
        const numeroFormateado = new Intl.NumberFormat(appConfig.formato_numero, { 
            style: 'decimal', 
            minimumFractionDigits: 0,
            maximumFractionDigits: 2 
        }).format(val || 0);
        
        const simbolo = getCurrencySymbol(appConfig.moneda);
        return `${simbolo}${numeroFormateado}`;
    };

    const loadNotas = async () => {
        try {
            const data = await window.api.getNotas() 
            setNotasData(data || [])
        } catch (error) {
            console.error("Error cargando notas:", error)
        }
    }

    useEffect(() => {
        loadNotas();
        loadConfig();
        window.addEventListener('config-actualizada', loadConfig);
        return () => window.removeEventListener('config-actualizada', loadConfig);
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
            setAlmacenConf(response.configuracion || null)
            setShowModal(true)
        } else {
            Swal.fire('Error', 'No se pudieron cargar los detalles de la nota', 'error')
        }
    }

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

    const handlePrepararImpresion = () => {
        setShowModal(false); 
        setAbiertoDesdeDetalles(true);
        setShowPreview(true);
    }

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
                else if (btn.classList.contains('btn-print')) imprimirDirecto(item); 
                
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
                    key={`notas-main-${appConfig.moneda}-${appConfig.formato_numero}`}
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
                                const color = row.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary';
                                const sign = row.tipo_nota === 'Crédito' ? '-' : '+';
                                return `<strong class="${color}">${sign}${formatCurrency(data)}</strong>`;
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

            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title>
                        Detalles de la Nota {notaSeleccionada ? `${notaSeleccionada.prefijo}-${notaSeleccionada.numero_nota}` : ''}                
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
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
                        key={`detalle-nota-${appConfig.moneda}-${appConfig.formato_numero}-${notaSeleccionada?.id}`}
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
                            { 
                              data: 'precio_unitario', 
                              title: 'V. Unitario',
                              render: (data) => formatCurrency(data)
                            },
                            { data: 'iva_percent', title: 'IVA' },
                            { 
                              data: 'total', 
                              title: 'Total',
                              render: (data) => `<strong>${formatCurrency(data)}</strong>`
                            },
                        ]}
                        customRenders={{
                            iva_percent: (data) => `${(parseFloat(data) * 100).toFixed(0)}%`,
                        }}
                    />

                    {notaSeleccionada && (
                        <div className="mt-3 p-3 bg-light rounded border text-end">
                            <p className="mb-1"><strong>Subtotal:</strong> {formatCurrency(notaSeleccionada.total_base)}</p>
                            <p className="mb-2"><strong>IVA:</strong> {formatCurrency(notaSeleccionada.total_iva)}</p>
                            <hr className="my-2" />
                            <h4 className={`mb-0 ${notaSeleccionada.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                                <strong>Total {notaSeleccionada.tipo_nota === 'Crédito' ? 'a favor del cliente' : 'a cobrar'}:</strong> 
                                {' '}{notaSeleccionada.tipo_nota === 'Crédito' ? '-' : '+'}{formatCurrency(notaSeleccionada.total_final)}
                            </h4>
                        </div>
                    )}

                    {notaSeleccionada && notaSeleccionada.observaciones && (
                        <div className="mt-3">
                            <strong>Observaciones:</strong>
                            <p className="text-muted fst-italic border p-2 mt-1 rounded bg-white">{notaSeleccionada.observaciones}</p>
                        </div>
                    )}

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
            
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