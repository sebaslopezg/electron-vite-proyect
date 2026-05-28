import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'
import { formatCurrency } from '../../../utils/currencies'

export const ModalDetalleFactura = ({ 
    show, 
    handleClose, 
    facturaSeleccionada, 
    detalleData, 
    notasFactura, 
    handlePrepararImpresion, 
    appConfig 
}) => {

    const _formatCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda);
    };

    const getBadgeClassPago = (factura) => {
        if (!factura) return 'bg-primary'
        if (factura.tipo_pago === 'credito') {
            if (!factura.total_recibido || factura.total_recibido === 0) return 'bg-danger'
            if (factura.saldo_pendiente > 0) return 'bg-warning text-dark'
            return 'bg-success'
        }
        return 'bg-primary'
    }

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
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
                                    <span className={`badge ${getBadgeClassPago(facturaSeleccionada)} text-capitalize  shadow-sm`}>
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
                            
                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}`.toUpperCase() : '';
                            const skuVal = String(row.sku).toUpperCase();
                            
                            const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`;
                            return `<strong>${finalSku}</strong>`;
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

                {facturaSeleccionada && facturaSeleccionada.observaciones && (
                    <div className="mt-4">
                        <h6 className="fw-bold text-secondary mb-2">Observaciones</h6>
                        <div className="p-3 bg-light rounded border fst-italic text-muted">
                            {facturaSeleccionada.observaciones}
                        </div>
                    </div>
                )}

                {facturaSeleccionada && (
                    <Row className="mt-4 justify-content-end">
                        <Col md={6}>
                            <div className="p-2 rounded border border-secondary border-opacity-25">
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
                                <thead className="table-dark">
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
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    )
}