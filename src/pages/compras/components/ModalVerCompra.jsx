import React from 'react';
import { Modal, Button, Row, Col, Table, Badge } from 'react-bootstrap'

export const ModalVerCompra = ({ show, handleClose, data }) => {
    if (!data || !data.maestro) return null;

    const { maestro, detalles } = data;
    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className="bi bi-receipt me-2 text-info"></i>
                    Detalles de la Compra / Gasto
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <div className="bg-light p-3 rounded border mb-4">
                    <Row className="gy-2">
                        <Col md={6}>
                            <p className="mb-1 text-muted small">Proveedor</p>
                            <h6 className="fw-bold mb-0">{maestro.nombre_proveedor}</h6>
                            <small className="text-muted">NIT/CC: {maestro.documento_proveedor}</small>
                        </Col>
                        <Col md={6} className="text-md-end">
                            <p className="mb-1 text-muted small">Factura N°</p>
                            <h6 className="fw-bold mb-0 text-primary">#{maestro.numero_factura}</h6>
                            <small className="text-muted">Emitida: {new Date(maestro.fecha_factura).toLocaleDateString('es-CO')}</small>
                        </Col>
                        <Col md={12} className="mt-3 border-top pt-2">
                            <Row>
                                <Col md={8}>
                                    <span className="text-muted small d-block">Concepto</span>
                                    <span className="fw-medium">{maestro.concepto || 'Sin concepto específico'}</span>
                                </Col>
                                <Col md={4} className="text-md-end">
                                    <span className="text-muted small d-block">Estado</span>
                                    {maestro.estado === 'pagada' ? (
                                        <Badge bg="success">Pagada (Contado)</Badge>
                                    ) : (
                                        <Badge bg="warning" text="dark">Pendiente (Crédito)</Badge>
                                    )}
                                    {maestro.estado === 'pendiente' && (
                                        <small className="d-block text-danger mt-1">Vence: {new Date(maestro.fecha_vencimiento).toLocaleDateString('es-CO')}</small>
                                    )}
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </div>

                {/* TABLA DE ÍTEMS */}
                <h6 className="fw-bold text-secondary mb-3 border-bottom pb-2">Ítems de la Factura</h6>
                <div className="table-responsive">
                    <Table bordered hover size="sm" className="align-middle text-center mb-0">
                        <thead className="table-light">
                            <tr>
                                <th width="10%">Cant.</th>
                                <th width="40%" className="text-start">Descripción / Producto</th>
                                <th width="15%">V. Unitario</th>
                                <th width="10%">IVA</th>
                                <th width="25%" className="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item) => (
                                <tr key={item.id}>
                                    <td className="fw-medium">{item.cantidad}</td>
                                    <td className="text-start">
                                        <span className="d-block">{item.descripcion}</span>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {item.producto_id 
                                                ? <><i className="bi bi-box-seam me-1"></i>Inv: {item.sku}</> 
                                                : <><i className="bi bi-journal-text me-1"></i>PUC: {item.cuenta_puc_id}</>
                                            }
                                        </small>
                                    </td>
                                    <td>{formatMoney(item.precio_unitario)}</td>
                                    <td>{item.iva_percent}%</td>
                                    <td className="text-end fw-medium">{formatMoney(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                {/* TOTALES */}
                <Row className="mt-4 justify-content-end">
                    <Col md={6}>
                        <Table borderless size="sm" className="text-end mb-0 fs-6">
                            <tbody>
                                <tr>
                                    <td className="text-muted">Subtotal:</td>
                                    <td className="fw-medium">{formatMoney(maestro.subtotal)}</td>
                                </tr>
                                {maestro.descuento > 0 && (
                                    <tr>
                                        <td className="text-muted">Descuento:</td>
                                        <td className="text-danger">-{formatMoney(maestro.descuento)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="text-muted">IVA:</td>
                                    <td className="fw-medium">{formatMoney(maestro.iva)}</td>
                                </tr>
                                <tr className="border-top border-dark border-2">
                                    <td className="fw-bold text-primary fs-5 pt-2">TOTAL FACTURA:</td>
                                    <td className="fw-bold text-primary fs-5 pt-2">{formatMoney(maestro.total_factura)}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted pt-3">Pagado:</td>
                                    <td className="text-success pt-3">{formatMoney(maestro.total_pagado)}</td>
                                </tr>
                                {maestro.saldo_pendiente > 0 && (
                                    <tr>
                                        <td className="fw-bold text-danger">Saldo Pendiente:</td>
                                        <td className="fw-bold text-danger">{formatMoney(maestro.saldo_pendiente)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
};