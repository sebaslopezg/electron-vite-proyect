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
    appConfig,
    almacenConf,
    canPrint
}) => {

    const _formatCurrency = (val) => {
        return formatCurrency(val, appConfig?.formato_numero || 'es-CO', appConfig?.moneda || 'COP')
    }

    const clienteNombre = notaSeleccionada?.nombre_cliente || notaSeleccionada?.cliente_nombre || 'Consumidor Final';
    const clienteDoc = notaSeleccionada?.documento_cliente || notaSeleccionada?.cliente_documento || '222222222222';
    const clienteTelefono = notaSeleccionada?.telefono_cliente || notaSeleccionada?.cliente_telefono || notaSeleccionada?.telefono;

    return <>
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-journal-text me-2 text-primary"></i>
                    Detalles de la Nota {notaSeleccionada ? `${notaSeleccionada.prefijo || 'NC'}-${notaSeleccionada.numero_nota}` : ''}                
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <div className="d-flex justify-content-end mb-3">
                    {canPrint && (
                        <Button variant="primary" onClick={handlePrepararImpresion} className="shadow-sm">
                            <i className="bi bi-printer me-2"></i> Imprimir Tirilla
                        </Button>
                    )}
                </div>

                {notaSeleccionada && (
                    <div className="bg-light p-3 rounded mb-4 border border-secondary border-opacity-25">
                        <Row>
                            <Col md={6}>
                                <p className="mb-1"><span className="text-muted">Cliente:</span> <strong className="fs-6">{clienteNombre}</strong></p>
                                <p className="mb-0"><span className="text-muted">Documento:</span> <strong>{clienteDoc}</strong></p>
                                
                                {clienteTelefono && (
                                    <p className="mb-0 mt-1"><span className="text-muted">Teléfono:</span> <strong>{clienteTelefono}</strong></p>
                                )}
                            </Col>
                            <Col md={6} className="text-end border-start">
                                <div className="mb-2">
                                    <span className="text-muted me-2">Aplica a Factura:</span>
                                    <span className="badge bg-primary shadow-sm text-capitalize">
                                        {notaSeleccionada.prefijo_factura || ''}{almacenConf?.separador || '-'}{notaSeleccionada.numero_factura || notaSeleccionada.numero_factura_origen}
                                    </span>
                                </div>
                                <div className="mb-0">
                                    <span className="text-muted d-block mb-1">Motivo DIAN:</span>
                                    <span className="text-dark fw-bold fst-italic">
                                        {notaSeleccionada.motivo_dian || 'Sin Especificar'}
                                    </span>
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}

                <h6 className="fw-bold border-bottom pb-2 mb-3">Ítems de la Nota</h6>
                <DataTableComponent
                    key={`detalle-nota-${appConfig?.moneda}-${appConfig?.formato_numero}-${notaSeleccionada?.id}`}
                    data={detalleData}
                    columns={[
                        { 
                          data: null, title: 'SKU',
                          render: (data, type, row) => {
                            if (!row.sku) return '<span class="text-muted" title="Producto eliminado o importado">Genérico</span>'
                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : ''
                            const skuVal = String(row.sku).toUpperCase()
                            const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`
                            return `<strong>${finalSku}</strong>`
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
                          render: (data) => `<strong class="text-success">${_formatCurrency(data)}</strong>`
                        },
                    ]}
                    customRenders={{
                        iva_percent: (data) => `${(parseFloat(data || 0) * 100).toFixed(0)}%`,
                    }}
                />

                {notaSeleccionada && (
                    <Row className="mt-4 align-items-stretch">
                        <Col md={6}>
                            {notaSeleccionada.observaciones && (
                                <div>
                                    <h6 className="fw-bold text-secondary mb-2">Observaciones</h6>
                                    <div className="p-2 bg-light rounded border fst-italic text-muted h-100">
                                        {notaSeleccionada.observaciones}
                                    </div>
                                </div>
                            )}
                        </Col>
                        <Col md={6}>
                            <div className="p-2 rounded border border-secondary border-opacity-25 h-100">
                                <table className="table table-sm table-borderless m-0 text-end">
                                    <tbody>
                                        <tr><td className="text-muted">Subtotal:</td><td className="fw-bold">{_formatCurrency(notaSeleccionada.total_base)}</td></tr>
                                        <tr><td className="text-muted">IVA:</td><td className="fw-bold">{_formatCurrency(notaSeleccionada.total_iva)}</td></tr>
                                        <tr className="border-top">
                                            <td className="pt-2 fw-bold text-dark fs-6">TOTAL {notaSeleccionada.tipo_nota === 'Crédito' ? 'A FAVOR' : 'A COBRAR'}:</td>
                                            <td className={`pt-2 fw-bold fs-5 ${notaSeleccionada.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                                                {notaSeleccionada.tipo_nota === 'Crédito' ? '-' : '+'}
                                                {_formatCurrency(notaSeleccionada.total_final)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Col>
                    </Row>
                )}

            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    </>
}