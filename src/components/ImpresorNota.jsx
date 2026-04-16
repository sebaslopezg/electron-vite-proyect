import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export const ImpresorNota = ({ show, onClose, nota, detalles, almacenConf, textoVolver = 'Cerrar' }) => {
    const [tipoImpresion, setTipoImpresion] = useState('pos');

    const confirmarImpresion = () => {
        window.print();
    };

    const renderRecibo = () => {
        if (!nota || !almacenConf) return null;

        const tituloNota = `NOTA ${nota.tipo_nota.toUpperCase()}`;
        const facturaRef = `${nota.prefijo_factura || ''}${nota.numero_factura || nota.numero_factura_origen}`;

        if (tipoImpresion === 'pos') {
            return (
                <div className="formato-pos text-black">
                    <div className="text-center mb-2">
                        <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                        <div>NIT: {almacenConf.nit_almacen}</div>
                        <div>{almacenConf.direccion_almacen}</div>
                        <div>Tel: {almacenConf.telefono_almacen}</div>
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
                                    <td className="text-end align-top">${(item.total).toLocaleString('es-CO')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-2 text-end">
                        <div>Subtotal: ${(nota.total_base || 0).toLocaleString('es-CO')}</div>
                        <div>IVA: ${(nota.total_iva || 0).toLocaleString('es-CO')}</div>
                        <h6 className="fw-bold mt-1 fs-6">TOTAL: ${(nota.total_final || 0).toLocaleString('es-CO')}</h6>
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
        } else {
            return (
                <div className="formato-a4 text-black">
                    <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-2 border-dark pb-3">
                        <div>
                            <h2 className="fw-bold text-uppercase">{almacenConf.nombre_almacen}</h2>
                            <div><strong>NIT:</strong> {almacenConf.nit_almacen}</div>
                            <div>{almacenConf.direccion_almacen} | Tel: {almacenConf.telefono_almacen}</div>
                            <div className="mt-1 text-muted"><small>{almacenConf.resolucionDian}</small></div>
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
                                    <td className="text-end">${(item.precio_unitario || 0).toLocaleString('es-CO')}</td>
                                    <td className="text-end fw-bold">${(item.total || 0).toLocaleString('es-CO')}</td>
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
                                    <tr><td><strong>Subtotal:</strong></td><td>${(nota.total_base || 0).toLocaleString('es-CO')}</td></tr>
                                    <tr><td><strong>IVA:</strong></td><td>${(nota.total_iva || 0).toLocaleString('es-CO')}</td></tr>
                                    <tr className="border-top border-dark border-2">
                                        <td className="fs-5"><strong>Total:</strong></td>
                                        <td className={`fs-5 fw-bold ${nota.tipo_nota === 'Crédito' ? 'text-danger' : 'text-primary'}`}>
                                            {nota.tipo_nota === 'Crédito' ? '-' : '+'}${(nota.total_final || 0).toLocaleString('es-CO')}
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
        }
    };

    if (!show) return null;

    return (
        <>
            <style>
                {`
                    .formato-pos { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: black; }
                    .formato-pos table { width: 100%; }
                    .formato-pos th, .formato-pos td { border-bottom: 1px dashed #000; padding: 3px 0; }
                    .border-dashed { border-style: dashed !important; }
                    .formato-a4 { font-family: sans-serif; font-size: 14px; color: black; }

                    @media print {
                        body * { visibility: hidden; }
                        .modal, .modal-backdrop, .sidebar, .header { display: none !important; }
                        #zona-impresion, #zona-impresion * { visibility: visible; }
                        #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                        .formato-pos { width: 72mm; margin: 0 auto; }
                        .formato-a4 { width: 100%; margin: 0; }
                    }
                `}
            </style>

            <Modal show={show} onHide={onClose} size="lg" centered>
                <Modal.Header closeButton className="bg-light align-items-center">
                    <Modal.Title className="me-auto fs-5">
                        <i className="bi bi-printer text-muted me-2"></i>Vista Previa
                    </Modal.Title>
                    <div className="me-4"> 
                        <div className="btn-group" role="group">
                            <input type="radio" className="btn-check" name="tipoImpresionNota" id="posRadioNota" 
                                checked={tipoImpresion === 'pos'} onChange={() => setTipoImpresion('pos')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="posRadioNota">
                                <i className="bi bi-receipt me-1"></i> Tirilla POS
                            </label>
                            <input type="radio" className="btn-check" name="tipoImpresionNota" id="a4RadioNota" 
                                checked={tipoImpresion === 'a4'} onChange={() => setTipoImpresion('a4')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="a4RadioNota">
                                <i className="bi bi-file-text me-1"></i> Tamaño A4
                            </label>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="bg-secondary d-flex justify-content-center py-4" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                    <div className="bg-white shadow p-4" style={{ 
                        width: tipoImpresion === 'pos' ? '80mm' : '100%', 
                        minHeight: tipoImpresion === 'a4' ? '297mm' : 'auto',
                        transition: 'width 0.3s ease-in-out'
                    }}>
                        {renderRecibo()}
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="outline-secondary" onClick={onClose}>{textoVolver}</Button>
                    <Button variant="success" size="lg" onClick={confirmarImpresion}>
                        <i className="bi bi-printer-fill me-2"></i> Imprimir Ahora
                    </Button>
                </Modal.Footer>
            </Modal>

            <div id="zona-impresion" className="d-none d-print-block">
                {renderRecibo()}
            </div>
        </>
    );
};