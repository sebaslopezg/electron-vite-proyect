import { useEffect, useState, useRef, useMemo } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Form } from 'react-bootstrap'
import { ImpresorFactura } from "./components/ImpresorFactura"
import { getCurrencySymbol, formatCurrency } from '../../utils/currencies'

export const VerFacturas = () => {
    const [reloadTable, setReloadTable] = useState(0);

    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [notasFactura, setNotasFactura] = useState([])
    
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

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

    useEffect(() => {
        loadConfig();
        window.addEventListener('config-actualizada', loadConfig);
        return () => window.removeEventListener('config-actualizada', loadConfig);
    }, []);

    const _formatCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda);
    };

    const handleClose = () => {
        setShow(false)
        setFacturaSeleccionada(null)
        setNotasFactura([]) 
    }
    const handleShow = () => setShow(true)

    useEffect(() => {
        const handleNuevaFactura = () => setReloadTable(prev => prev + 1);
        window.addEventListener('factura-creada', handleNuevaFactura);
        return () => window.removeEventListener('factura-creada', handleNuevaFactura);
    }, [])

    const tableContainerRef = useRef(null);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const btnSee = e.target.closest('.btn-see-item');
            if (btnSee) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnSee.dataset.alldata));
                    verDetalle(item);
                } catch(err) { console.error(err); }
            }

            const btnPrint = e.target.closest('.btn-print-item');
            if (btnPrint) {
                try {
                    const item = JSON.parse(decodeURIComponent(btnPrint.dataset.alldata));
                    imprimirDirecto(item);
                } catch(err) { console.error(err); }
            }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, []);

    const verDetalle = async (factura) => {
        setFacturaSeleccionada(factura)

        const response = await window.api.getDetalle(factura.id)
        if (response.success) {
            setDetalleData(response.data)
            setNotasFactura(response.notas || []) 
            setAlmacenConf(response.configuracion || null)
            handleShow()
        }
    }

    const imprimirDirecto = async (factura) => {
        setFacturaSeleccionada(factura)

        const response = await window.api.getDetalle(factura.id)
        if (response.success) {
            setDetalleData(response.data)
            setNotasFactura(response.notas || []) 
            setAlmacenConf(response.configuracion || null)
            
            setAbiertoDesdeDetalles(false);
            setShowPreview(true);
        }
    }

    const handlePrepararImpresion = () => {
        setShow(false); 
        setAbiertoDesdeDetalles(true);
        setShowPreview(true);
    }

    const handleCerrarPreview = () => {
        setShowPreview(false);
        if (abiertoDesdeDetalles) {
            setShow(true);
        } else {
            setFacturaSeleccionada(null);
            setDetalleData([]);
        }
    }

    const getBadgeClassPago = (factura) => {
        if (!factura) return 'bg-primary';
        if (factura.tipo_pago === 'credito') {
            if (!factura.total_recibido || factura.total_recibido === 0) return 'bg-danger';
            if (factura.saldo_pendiente > 0) return 'bg-warning text-dark';
            return 'bg-success';
        }
        return 'bg-primary';
    };

    const columnasTabla = useMemo(() => [
        { 
            data: 'date_created', 
            title: 'Fecha',
            render: (data) => {
                if (!data) return '-';
                return new Date(data).toLocaleString(appConfig.formato_numero, {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                });
            }
        },
        { 
            data: null, title: 'N° Factura',
            render: (data, type, row) => `<strong>${row.prefijo || ''}${row.separador || ''}${row.numero_factura}</strong>`
        },
        { data: 'documento_cliente', title: 'Doc Cliente' },
        { data: 'nombre_cliente', title: 'Nombre Cliente' },
        {
            data: null, title: 'Estado', orderable: false,
            render: function (data, type, row) {
                let badges = '';
                if (row.tipo_pago === 'credito') {
                    if (!row.total_recibido || row.total_recibido === 0) badges += '<span class="badge bg-danger me-1">Crédito (Sin Abonos)</span>';
                    else if (row.saldo_pendiente > 0) badges += '<span class="badge bg-warning text-dark me-1">Crédito (Abonado)</span>';
                    else badges += '<span class="badge bg-success me-1">Crédito (Pagado)</span>';
                } else {
                    badges += '<span class="badge bg-primary me-1">Contado</span>';
                }
                if (row.notas_aplicadas) {
                    if (row.notas_aplicadas.includes('Crédito')) badges += '<span class="badge bg-info text-dark me-1">Nota Crédito</span>';
                    if (row.notas_aplicadas.includes('Débito')) badges += '<span class="badge bg-secondary me-1">Nota Débito</span>';
                }
                return badges;
            }
        },
        {
            data: null, title: 'Acciones', orderable: false,
            render: function (data, type, row) {
                const safeData = encodeURIComponent(JSON.stringify(row));
                return `
                    <button class="btn btn-sm btn-secondary text-white btn-see-item me-1" data-alldata="${safeData}" title="Ver Detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary text-white btn-print-item" data-alldata="${safeData}" title="Imprimir Factura">
                        <i class="bi bi-printer"></i>
                    </button>
                `;
            }
        }
    ], [appConfig]);

    return <>
        <div className="bg-light p-3 rounded mb-4 border">
            <Row className="align-items-end">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Desde:</small></Form.Label>
                        <Form.Control type="date" size="sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="fw-bold text-muted mb-1"><small><i className="bi bi-calendar-event me-1"></i>Hasta:</small></Form.Label>
                        <Form.Control type="date" size="sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Button 
                        variant="outline-secondary" size="sm"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        disabled={!startDate && !endDate}
                    >
                        <i className="bi bi-x-circle me-1"></i> Limpiar Filtro
                    </Button>
                </Col>
            </Row>
        </div>

        <div ref={tableContainerRef}>
            <div className="card-body p-3 w-100 overflow-hidden">
                <DataTableComponent
                    key={`facturas-main-${appConfig.moneda}-${appConfig.formato_numero}-${startDate}-${endDate}-${reloadTable}`}
                    reloadKey={reloadTable}
                    ajaxData={(params) => {
                        params.startDate = startDate;
                        params.endDate = endDate;
                        return window.api.getFacturasPaginadas(params);
                    }}
                    columns={columnasTabla}
                />
            </div>
        </div>

        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-receipt me-2 text-primary"></i>
                    Detalles de la Factura {facturaSeleccionada ? `${facturaSeleccionada.prefijo || ''}${facturaSeleccionada.separador || ''}${facturaSeleccionada.numero_factura}` : ''}                
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <div className="d-flex justify-content-end mb-3">
                    <Button variant="primary" onClick={handlePrepararImpresion} className="shadow-sm">
                        <i className="bi bi-printer me-2"></i> Imprimir Copia
                    </Button>
                </div>

                {facturaSeleccionada && (
                    <div className="bg-light p-3 rounded mb-4 border border-secondary border-opacity-25">
                        <Row>
                            <Col md={6}>
                                <p className="mb-1"><span className="text-muted">Cliente:</span> <strong className="fs-6">{facturaSeleccionada.nombre_cliente}</strong></p>
                                <p className="mb-0"><span className="text-muted">Documento:</span> <strong>{facturaSeleccionada.documento_cliente}</strong></p>
                            </Col>
                            <Col md={6} className="text-end border-start">
                                <p className="mb-2">
                                    <span className="text-muted">Estado del Pago:</span>{' '}
                                    <span className={`badge ${getBadgeClassPago(facturaSeleccionada)} text-capitalize fs-6 px-3 py-2 ms-1 shadow-sm`}>
                                        {facturaSeleccionada.tipo_pago}
                                    </span>
                                </p>
                                <p className="mb-1">
                                    <span className="text-muted">Método:</span> <span className="badge bg-secondary text-capitalize">{facturaSeleccionada.metodo_pago}</span>
                                </p>
                                <p className="mb-0">
                                    <span className="text-muted">Deuda Pendiente:</span>{' '}
                                    <span className={facturaSeleccionada.saldo_pendiente > 0 ? 'text-danger fw-bold fs-5 ms-1' : 'text-success fw-bold fs-5 ms-1'}>
                                        {_formatCurrency(facturaSeleccionada.saldo_pendiente)}
                                    </span>
                                </p>
                            </Col>
                        </Row>
                    </div>
                )}

                <h6 className="fw-bold border-bottom pb-2 text-primary mb-3">Ítems de la Factura</h6>
                <DataTableComponent
                    key={`detalle-${appConfig.moneda}-${appConfig.formato_numero}-${facturaSeleccionada?.id}`}
                    data={detalleData}
                    columns={[
                        { 
                          data: null, title: 'SKU',
                          render: (data, type, row) => {
                            if (!row.sku) return '<span class="text-muted" title="Producto eliminado o importado">Generico</span>'; 
                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                            return `<strong>${prefix}${row.sku.toUpperCase()}</strong>`;
                          }
                        },
                        { data: 'nombre_producto', title: 'Producto' },
                        { 
                          data: 'precio_producto', 
                          title: 'V. Unitario',
                          render: (data) => _formatCurrency(data)
                        },
                        { data: 'cantidad_producto', title: 'Cantidad' },
                        { 
                          data: 'total', 
                          title: 'Total',
                          render: (data) => `<strong class="text-success">${_formatCurrency(data)}</strong>`
                        },
                    ]}
                />

                {facturaSeleccionada && (
                    <Row className="mt-4 justify-content-end">
                        <Col md={5}>
                            <div className="p-3 bg-light rounded border border-secondary border-opacity-25 shadow-sm">
                                <table className="table table-sm table-borderless m-0 text-end">
                                    <tbody>
                                        <tr><td className="text-muted">Subtotal:</td><td className="fw-bold">{_formatCurrency(facturaSeleccionada.subtotal)}</td></tr>
                                        {facturaSeleccionada.descuento > 0 && <tr><td className="text-muted">Descuentos:</td><td className="text-danger fw-bold">-{_formatCurrency(facturaSeleccionada.descuento)}</td></tr>}
                                        <tr><td className="text-muted">IVA:</td><td className="fw-bold">{_formatCurrency(facturaSeleccionada.iva)}</td></tr>
                                        <tr className="border-top"><td className="pt-2 fw-bold text-primary fs-5">TOTAL:</td><td className="pt-2 fw-bold text-primary fs-5">{_formatCurrency(facturaSeleccionada.total_factura)}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </Col>
                    </Row>
                )}
                
                {notasFactura.length > 0 && (
                    <div className="mt-5 animate__animated animate__fadeIn">
                        <h6 className="text-danger fw-bold border-bottom border-danger pb-2">
                            <i className="bi bi-file-earmark-minus me-2"></i>Notas Relacionadas
                        </h6>
                        <div className="table-responsive shadow-sm rounded border">
                            <table className="table table-sm table-hover m-0 text-center align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-2">N° Nota</th>
                                        <th>Tipo</th>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                        <th className="text-end pe-3">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notasFactura.map((nota, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-bold">{nota.prefijo}-{nota.numero_nota}</td>
                                            <td>
                                                <span className={`badge ${nota.tipo_nota === 'Crédito' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                    Nota {nota.tipo_nota}
                                                </span>
                                            </td>
                                            <td>
                                                {new Date(nota.date_created).toLocaleString(appConfig.formato_numero, {
                                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                                })}
                                            </td>
                                            <td><small className="text-muted">{nota.motivo_dian}</small></td>
                                            <td className={`text-end pe-3 ${nota.tipo_nota === 'Crédito' ? 'text-danger fw-bold' : 'text-primary fw-bold'}`}>
                                                {nota.tipo_nota === 'Crédito' ? '-' : '+'}
                                                {_formatCurrency(nota.total_final)} 
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="outline-secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>

        <ImpresorFactura 
            show={showPreview} 
            onClose={handleCerrarPreview} 
            factura={facturaSeleccionada} 
            detalles={detalleData} 
            almacenConf={almacenConf} 
            textoVolver={abiertoDesdeDetalles ? 'Volver a Detalles' : 'Cerrar'} 
        />
    </>
}