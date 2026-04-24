import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { BaseImpresor } from './BaseImpresor';
import { getCurrencySymbol } from '../utils/currencies';

export const ImpresorNota = ({ show, onClose, nota, detalles, almacenConf, textoVolver }) => {
    
    if (!nota || !almacenConf) return null;

    const formatCurrency = (val) => {
        const numeroFormateado = new Intl.NumberFormat(almacenConf.formato_numero || 'es-CO', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val || 0);

        const simbolo = getCurrencySymbol(almacenConf.moneda || 'COP');
        return `${simbolo}${numeroFormateado}`;
    };

    const tituloNota = `NOTA ${nota.tipo_nota.toUpperCase()}`;
    const facturaRef = `${nota.prefijo_factura || ''}${almacenConf.separador || ''}${nota.numero_factura || nota.numero_factura_origen}`;

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
                    {tituloNota} N° {nota.prefijo}-{nota.numero_nota}
                </div>
                <div>{new Date(nota.date_created).toLocaleString('es-CO')}</div>
            </div>

            <div className="mb-2">
                <div><strong>Cliente:</strong> {nota.nombre_cliente}</div>
                <div><strong>CC/NIT:</strong> {nota.documento_cliente}</div>
                <div className="mt-1 border-top border-dashed pt-1">
                    <strong>Aplica a Fac:</strong> {facturaRef}
                </div>
                <div><strong>Motivo:</strong> {nota.motivo_dian}</div>
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
                            <td className="text-start align-top">{item.cantidad}</td>
                            <td className="text-start pe-1">{item.nombre_producto}</td>
                            <td className="text-end align-top">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-2 text-end">
                <div>Subtotal: {formatCurrency(nota.total_base)}</div>
                <div>IVA: {formatCurrency(nota.total_iva)}</div>
                <h6 className="fw-bold mt-1 fs-6">TOTAL: {formatCurrency(nota.total_final)}</h6>
            </div>

            {nota.observaciones && (
                <div className="mt-2 text-start">
                    <strong>Obs:</strong> <small>{nota.observaciones}</small>
                </div>
            )}

            <div className="text-center mt-3 border-top border-dark pt-2">
                <small>{almacenConf.footer_factura}</small>
            </div>
        </div>
    );

    const A4Template = () => (
        <div className="formato-a4 text-black">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-2 border-dark pb-3">
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
                    <h3 className="mb-0 text-secondary text-uppercase">{tituloNota}</h3>
                    <h4 className="text-danger fw-bold">N° {nota.prefijo}-{nota.numero_nota}</h4>
                    <div>Fecha Emisión: {new Date(nota.date_created).toLocaleString('es-CO')}</div>
                </div>
            </div>

            <div className="card border-dark mb-4">
                <div className="card-body py-2">
                    <Row>
                        <Col sm={6}><strong>Cliente:</strong> {nota.nombre_cliente}</Col>
                        <Col sm={6}><strong>CC/NIT:</strong> {nota.documento_cliente}</Col>
                        <Col sm={6}><strong>Aplica a Factura:</strong> <span className="badge bg-primary fs-6">{facturaRef}</span></Col>
                        <Col sm={6}><strong>Motivo:</strong> {nota.motivo_dian}</Col>
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
                            <td>{item.cantidad}</td>
                            <td className="text-end">{formatCurrency(item.precio_unitario)}</td>
                            <td className="text-end fw-bold">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <Row className="justify-content-between">
                <Col sm={6}>
                    {nota.observaciones && (
                        <div>
                            <strong>Observaciones:</strong>
                            <p className="text-muted fst-italic border p-2 rounded">{nota.observaciones}</p>
                        </div>
                    )}
                </Col>
                <Col sm={5}>
                    <table className="table table-sm table-borderless text-end fs-6">
                        <tbody>
                            <tr><td><strong>Subtotal:</strong></td><td>{formatCurrency(nota.total_base)}</td></tr>
                            <tr><td><strong>IVA:</strong></td><td>{formatCurrency(nota.total_iva)}</td></tr>
                            <tr className="border-top border-dark border-2">
                                <td className="fs-5"><strong>Total:</strong></td>
                                <td className={`fs-5 fw-bold ${nota.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                                    {nota.tipo_nota === 'Crédito' ? '-' : '+'}{formatCurrency(nota.total_final).replace(getCurrencySymbol(almacenConf.moneda || 'COP'), '')}
                                </td>
                            </tr>
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
            titulo="Vista Previa de Nota"
            textoVolver={textoVolver}
            renderPos={PosTemplate}
            renderA4={A4Template}
        />
    );
};