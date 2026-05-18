import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col } from 'react-bootstrap'
import DataTableComponent from '../../../components/DataTableComponent'
import { formatCurrency } from '../../../utils/currencies'

export const ModalDetalleNota = ({
    show,
    handleClose,
    notaSeleccionada,
    detalleData,
    handlePrepararImpresion,
    appConfig
}) => {

    const _formatCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
    }

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
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
                          render: (data) => _formatCurrency(data)
                        },
                        { data: 'iva_percent', title: 'IVA' },
                        { 
                          data: 'total', 
                          title: 'Total',
                          render: (data) => `<strong>${_formatCurrency(data)}</strong>`
                        },
                    ]}
                    customRenders={{
                        iva_percent: (data) => `${(parseFloat(data) * 100).toFixed(0)}%`,
                    }}
                />

                {notaSeleccionada && (
                    <div className="mt-3 p-3 bg-light rounded border text-end">
                        <p className="mb-1"><strong>Subtotal:</strong> {_formatCurrency(notaSeleccionada.total_base)}</p>
                        <p className="mb-2"><strong>IVA:</strong> {_formatCurrency(notaSeleccionada.total_iva)}</p>
                        <hr className="my-2" />
                        <h4 className={`mb-0 ${notaSeleccionada.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                            <strong>Total {notaSeleccionada.tipo_nota === 'Crédito' ? 'a favor del cliente' : 'a cobrar'}:</strong> 
                            {' '}{notaSeleccionada.tipo_nota === 'Crédito' ? '-' : '+'}{_formatCurrency(notaSeleccionada.total_final)}
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
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    </>
}