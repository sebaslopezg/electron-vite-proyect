import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export const ImpresorAbono = ({ show, onClose, abono, almacenConf, textoVolver = 'Cerrar' }) => {
    const [tipoImpresion, setTipoImpresion] = useState('pos');

    const confirmarImpresion = () => {
        window.print();
    };

    const renderRecibo = () => {
        if (!abono || !almacenConf) return null;

        const facturaRef = `${abono.prefijo || ''}${abono.numero_factura}`;

        if (tipoImpresion === 'pos') {
            return (
                <div className="formato-pos text-black">
                    <div className="text-center mb-3">
                        <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                        <div>NIT: {almacenConf.nit_almacen}</div>
                        <div>{almacenConf.direccion_almacen}</div>
                        <div>Tel: {almacenConf.telefono_almacen}</div>
                        <div className="mt-2 fw-bold border-top border-bottom border-dark py-1 fs-6">
                            RECIBO DE CAJA
                        </div>
                        <div>Fecha: {new Date(abono.date_created).toLocaleString('es-CO')}</div>
                    </div>

                    <div className="mb-3">
                        <div><strong>Cliente:</strong> {abono.nombre_cliente}</div>
                        <div><strong>CC/NIT:</strong> {abono.documento_cliente}</div>
                        <div className="mt-1 border-top border-dashed pt-1">
                            <strong>Abono a Factura N°:</strong> {facturaRef}
                        </div>
                    </div>

                    <div className="border border-dark p-2 mb-2 bg-light text-center">
                        <div className="fs-6 mb-1">VALOR RECIBIDO</div>
                        <h4 className="fw-bold m-0">${(abono.valor || 0).toLocaleString('es-CO')}</h4>
                    </div>

                    <div className="mb-3 mt-2">
                        <div><strong>Método de Pago:</strong> {abono.metodo_pago}</div>
                        <div><strong>Cajero:</strong> {abono.usuario}</div>
                        {abono.observaciones && (
                            <div className="mt-1"><strong>Obs:</strong> <small>{abono.observaciones}</small></div>
                        )}
                    </div>

                    <div className="text-center mt-4 pt-4 border-top border-dark">
                        <div>_________________________</div>
                        <div className="fw-bold">Firma de Recibido</div>
                    </div>

                    <div className="text-center mt-3 pt-2">
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
                        </div>
                        <div className="text-end">
                            <h3 className="mb-0 text-success text-uppercase fw-bold">Recibo de Caja</h3>
                            <div>Fecha: {new Date(abono.date_created).toLocaleString('es-CO')}</div>
                        </div>
                    </div>

                    <Row className="mb-4">
                        <Col sm={7}>
                            <div className="card border-dark h-100">
                                <div className="card-body py-2">
                                    <p className="mb-1"><strong>Cliente:</strong> {abono.nombre_cliente}</p>
                                    <p className="mb-1"><strong>CC/NIT:</strong> {abono.documento_cliente}</p>
                                    <p className="mb-1"><strong>Método de Pago:</strong> {abono.metodo_pago}</p>
                                    {abono.observaciones && <p className="mb-0 text-muted fst-italic">Obs: {abono.observaciones}</p>}
                                </div>
                            </div>
                        </Col>
                        <Col sm={5}>
                            <div className="card border-success h-100 bg-light">
                                <div className="card-body text-center d-flex flex-column justify-content-center">
                                    <p className="mb-1 fw-bold text-secondary">Abono a Factura N° {facturaRef}</p>
                                    <h2 className="text-success fw-bold m-0">${(abono.valor || 0).toLocaleString('es-CO')}</h2>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mt-5 pt-5">
                        <Col sm={6} className="text-center">
                            <div className="w-75 mx-auto border-top border-dark">
                                <p className="mt-2 fw-bold">Firma Cajero ({abono.usuario})</p>
                            </div>
                        </Col>
                        <Col sm={6} className="text-center">
                            <div className="w-75 mx-auto border-top border-dark">
                                <p className="mt-2 fw-bold">Firma Cliente</p>
                            </div>
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
                    .formato-pos { font-family: 'Courier New', Courier, monospace; font-size: 13px; color: black; }
                    .formato-pos table { width: 100%; }
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
                        <i className="bi bi-printer text-muted me-2"></i>Vista Previa de Recibo
                    </Modal.Title>
                    <div className="me-4"> 
                        <div className="btn-group" role="group">
                            <input type="radio" className="btn-check" name="tipoImpresionAbono" id="posRadioAbono" 
                                checked={tipoImpresion === 'pos'} onChange={() => setTipoImpresion('pos')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="posRadioAbono">
                                <i className="bi bi-receipt me-1"></i> Tirilla POS
                            </label>
                            <input type="radio" className="btn-check" name="tipoImpresionAbono" id="a4RadioAbono" 
                                checked={tipoImpresion === 'a4'} onChange={() => setTipoImpresion('a4')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="a4RadioAbono">
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
                        <i className="bi bi-printer-fill me-2"></i> Imprimir Recibo
                    </Button>
                </Modal.Footer>
            </Modal>

            <div id="zona-impresion" className="d-none d-print-block">
                {renderRecibo()}
            </div>
        </>
    );
};