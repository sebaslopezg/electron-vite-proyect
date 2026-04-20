import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { BaseImpresor } from '../../../components/BaseImpresor';

export const ImpresorFactura = ({ show, onClose, factura, detalles, almacenConf, textoVolver }) => {
    
    if (!factura || !almacenConf) return null;

    const numFactura = `${factura.prefijo || ''}${almacenConf.separador || ''}${factura.numero_factura}`;
    const totalRecibidoReal = factura.total_recibido_original ?? factura.total_recibido;
    const saldoPendienteReal = factura.saldo_pendiente_original ?? factura.saldo_pendiente;

    const PosTemplate = () => (
        <div className="formato-pos text-black">
            <div className="text-center mb-2">
                {almacenConf.logo_almacen && almacenConf.imprimir_logo_pos === 1 && (
                    <div className="mb-2 d-flex justify-content-center">
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                )}
                <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                <div>NIT: {almacenConf.nit_almacen}</div>
                <div>{almacenConf.direccion_almacen}</div>
                <div>Tel: {almacenConf.telefono_almacen}</div>
                {almacenConf.email_almacen && <div>Email: {almacenConf.email_almacen}</div>}
                <div className="mt-1"><small>{almacenConf.resolucionDian}</small></div>
                <div className="mt-2 fw-bold border-top border-bottom border-dark py-1">
                    {almacenConf.nombreFactura} N° {numFactura}
                </div>
                <div>{new Date(factura.date_created).toLocaleString('es-CO')}</div>
            </div>

            <div className="mb-2">
                <div><strong>Cliente:</strong> {factura.nombre_cliente}</div>
                <div><strong>CC/NIT:</strong> {factura.documento_cliente}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="text-start">Cant</th>
                        <th className="text-start">Producto</th>
                        <th className="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {detalles.map((item, idx) => (
                        <tr key={idx}>
                            <td className="text-start align-top">{item.cantidad_producto}</td>
                            <td className="text-start pe-1">{item.nombre_producto}</td>
                            <td className="text-end align-top">${(item.total).toLocaleString('es-CO')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-2 text-end border-bottom border-dark pb-2">
                <div>Subtotal: ${(factura.subtotal || 0).toLocaleString('es-CO')}</div>
                {factura.descuento > 0 && <div>Desc: -${(factura.descuento || 0).toLocaleString('es-CO')}</div>}
                <div>IVA: ${(factura.iva || 0).toLocaleString('es-CO')}</div>
                <h6 className="fw-bold mt-1 fs-6">TOTAL: ${(factura.total_factura || 0).toLocaleString('es-CO')}</h6>
            </div>

            <div className="mt-2">
                <div className="text-capitalize"><strong>Pago:</strong> {factura.tipo_pago} ({factura.metodo_pago})</div>
                <div>Recibido: ${(totalRecibidoReal || 0).toLocaleString('es-CO')}</div>
                <div>Cambio/Saldo: ${(saldoPendienteReal || 0).toLocaleString('es-CO')}</div>
            </div>

            <div className="text-center mt-3 border-top border-dark pt-2">
                <small>{almacenConf.footer_factura}</small>
            </div>
        </div>
    );

    const A4Template = () => (
        <div className="formato-a4 text-black">
            <div className="d-flex justify-content-between align-items-start mb-4 border-bottom border-2 border-dark pb-3">
                <div className="d-flex align-items-center">
                    {almacenConf.logo_almacen && (
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '80px', maxWidth: '150px' }} className="me-4 rounded" />
                    )}
                    <div>
                        <h2 className="fw-bold text-uppercase mb-1">{almacenConf.nombre_almacen}</h2>
                        <div><strong>NIT:</strong> {almacenConf.nit_almacen}</div>
                        <div>{almacenConf.direccion_almacen} | Tel: {almacenConf.telefono_almacen}</div>
                        {almacenConf.email_almacen && <div>Email: {almacenConf.email_almacen}</div>}
                        <div className="mt-1 text-muted"><small>{almacenConf.resolucionDian}</small></div>
                    </div>
                </div>
                <div className="text-end">
                    <h3 className="mb-0 text-secondary text-uppercase">{almacenConf.nombreFactura}</h3>
                    <h4 className="text-danger fw-bold">N° {numFactura}</h4>
                    <div>Fecha Emisión: {new Date(factura.date_created).toLocaleString('es-CO')}</div>
                </div>
            </div>

            <div className="card border-dark mb-4">
                <div className="card-body py-2">
                    <Row>
                        <Col sm={5}><strong>Cliente:</strong> {factura.nombre_cliente}</Col>
                        <Col sm={3}><strong>CC/NIT:</strong> {factura.documento_cliente}</Col>
                        <Col sm={2}><strong>Tipo:</strong> <span className="text-capitalize">{factura.tipo_pago}</span></Col>
                        <Col sm={2}><strong>Método:</strong> <span className="text-capitalize">{factura.metodo_pago}</span></Col>
                    </Row>
                </div>
            </div>

            <table className="table table-bordered border-dark table-sm mb-4 text-center align-middle">
                <thead className="table-light border-dark">
                    <tr>
                        <th>SKU</th>
                        <th className="text-start">Producto</th>
                        <th>Cant.</th>
                        <th className="text-end">V. Unitario</th>
                        <th className="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {detalles.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.sku_prefix || ''}{item.separador || ''}{item.sku}</td>
                            <td className="text-start">{item.nombre_producto}</td>
                            <td>{item.cantidad_producto}</td>
                            <td className="text-end">${(item.precio_producto || 0).toLocaleString('es-CO')}</td>
                            <td className="text-end fw-bold">${(item.total || 0).toLocaleString('es-CO')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <Row className="justify-content-end">
                <Col sm={5}>
                    <table className="table table-sm table-borderless text-end fs-6">
                        <tbody>
                            <tr><td><strong>Subtotal:</strong></td><td>${(factura.subtotal || 0).toLocaleString('es-CO')}</td></tr>
                            {factura.descuento > 0 && <tr><td><strong>Descuento:</strong></td><td className="text-danger">-${(factura.descuento || 0).toLocaleString('es-CO')}</td></tr>}
                            <tr><td><strong>IVA:</strong></td><td>${(factura.iva || 0).toLocaleString('es-CO')}</td></tr>
                            <tr className="border-top border-dark border-2"><td className="fs-5"><strong>Total:</strong></td><td className="fs-5 fw-bold">${(factura.total_factura || 0).toLocaleString('es-CO')}</td></tr>
                            <tr><td><strong className="text-muted fs-6">Recibido:</strong></td><td className="text-muted fs-6">${(totalRecibidoReal || 0).toLocaleString('es-CO')}</td></tr>
                            <tr><td><strong className="text-muted fs-6">Saldo/Cambio:</strong></td><td className="text-muted fs-6">${(saldoPendienteReal || 0).toLocaleString('es-CO')}</td></tr>
                        </tbody>
                    </table>
                </Col>
            </Row>

            <div className="text-center mt-5 pt-3 border-top border-dark">
                <p className="fw-bold fs-6">{almacenConf.footer_factura}</p>
            </div>
        </div>
    );

    return (
        <BaseImpresor 
            show={show} 
            onClose={onClose} 
            titulo="Vista Previa de Factura"
            textoVolver={textoVolver}
            renderPos={PosTemplate}
            renderA4={A4Template}
        />
    );
};