import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Modal, Button, Form, Row, Col, Table } from 'react-bootstrap';

export const ModalCompra = ({ show, handleClose, onSuccess }) => {
    const [maestro, setMaestro] = useState({
        proveedor_id: '', documento_proveedor: '', nombre_proveedor: '', 
        numero_factura: '', fecha_factura: new Date().toISOString().split('T')[0], 
        fecha_vencimiento: new Date().toISOString().split('T')[0], concepto: '',
        tipo_pago: 'contado', descuento_global: 0
    });

    const [detalles, setDetalles] = useState([
        { id: Date.now(), tipo_item: 'gasto', cuenta_puc_id: '', producto_id: '', descripcion: '', cantidad: 1, precio_unitario: '', iva_percent: 0 }
    ]);

    const [proveedores, setProveedores] = useState([]);
    const [cuentasPuc, setCuentasPuc] = useState([]);
    const [productos, setProductos] = useState([]);

    useEffect(() => {
        if (show) {
            cargarCatalogos();
            setMaestro({ ...maestro, numero_factura: '', concepto: '', descuento_global: 0 });
            setDetalles([{ id: Date.now(), tipo_item: 'gasto', cuenta_puc_id: '', producto_id: '', descripcion: '', cantidad: 1, precio_unitario: '', iva_percent: 0 }]);
        }
    }, [show]);

    const cargarCatalogos = async () => {
        if (window.contaAPI && window.api) {
            const resTerceros = await window.contaAPI.getTerceros();
            if (resTerceros.success) setProveedores(resTerceros.data);

            const resCuentas = await window.contaAPI.getCuentasAuxiliares();
            if (resCuentas.success) setCuentasPuc(resCuentas.data);

            const resProductos = await window.api.getAllProductos();
            setProductos(resProductos || []);
        }
    };

    const handleProveedorChange = (e) => {
        const prov = proveedores.find(p => p.id === e.target.value);
        if (prov) {
            setMaestro({ 
                ...maestro, 
                proveedor_id: prov.id, 
                documento_proveedor: prov.numero_documento, 
                nombre_proveedor: prov.tipo_persona === 'juridica' ? prov.razon_social : `${prov.nombres} ${prov.apellidos}` 
            });
        } else {
            setMaestro({ ...maestro, proveedor_id: '', documento_proveedor: '', nombre_proveedor: '' });
        }
    };

    const handleAddRow = () => {
        setDetalles([...detalles, { id: Date.now(), tipo_item: 'gasto', cuenta_puc_id: '', producto_id: '', descripcion: '', cantidad: 1, precio_unitario: '', iva_percent: 0 }]);
    };

    const handleRemoveRow = (id) => {
        if (detalles.length === 1) return;
        setDetalles(detalles.filter(d => d.id !== id));
    };

    const handleChangeRow = (id, field, value) => {
        setDetalles(detalles.map(d => {
            if (d.id === id) {
                const updated = { ...d, [field]: value };
                if (field === 'producto_id') {
                    const prod = productos.find(p => p.id === value);
                    if (prod) updated.descripcion = prod.nombre_producto;
                }
                return updated;
            }
            return d;
        }));
    };

    // Cálculos
    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0);

    const subtotal = detalles.reduce((acc, item) => acc + ((Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)), 0);
    const ivaTotal = detalles.reduce((acc, item) => {
        const sub = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
        return acc + (sub * (Number(item.iva_percent) || 0) / 100);
    }, 0);
    const descuentoTotal = Number(maestro.descuento_global) || 0;
    const totalFactura = subtotal + ivaTotal - descuentoTotal;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!maestro.proveedor_id) return Swal.fire('Error', 'Seleccione un proveedor.', 'error');
        if (detalles.some(d => d.tipo_item === 'gasto' && !d.cuenta_puc_id)) return Swal.fire('Error', 'Seleccione una cuenta contable para los gastos.', 'error');
        if (detalles.some(d => d.tipo_item === 'inventario' && !d.producto_id)) return Swal.fire('Error', 'Seleccione el producto de inventario.', 'error');

        // Preparamos los datos
        const payload = {
            maestro: {
                ...maestro,
                subtotal,
                descuento: descuentoTotal,
                iva: ivaTotal,
                total_factura: totalFactura,
                total_pagado: maestro.tipo_pago === 'contado' ? totalFactura : 0,
                saldo_pendiente: maestro.tipo_pago === 'credito' ? totalFactura : 0,
                estado: maestro.tipo_pago === 'contado' ? 'pagada' : 'pendiente'
            },
            detalles: detalles.map(d => ({
                ...d,
                subtotal: (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0),
                total: ((Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0)) * (1 + (Number(d.iva_percent) || 0) / 100)
            }))
        };

        const res = await window.comprasAPI.crearCompra(payload);
        if (res.success) {
            Swal.fire({ title: '¡Compra Registrada!', text: 'La factura ha sido guardada.', icon: 'success', timer: 1500, showConfirmButton: false });
            onSuccess();
            handleClose();
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5"><i className="bi bi-cart-check-fill me-2 text-success"></i>Registrar Factura de Compra / Gasto</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-light">
                <Form id="formCompra" onSubmit={handleSubmit}>
                    <div className="card shadow-sm mb-3">
                        <div className="card-body py-3">
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Proveedor (Tercero)</Form.Label>
                                        <Form.Select size="sm" value={maestro.proveedor_id} onChange={handleProveedorChange} required>
                                            <option value="">Seleccione...</option>
                                            {proveedores.map(p => (
                                                <option key={p.id} value={p.id}>{p.numero_documento} - {p.tipo_persona === 'juridica' ? p.razon_social : `${p.nombres} ${p.apellidos}`}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">N° Factura Física</Form.Label>
                                        <Form.Control type="text" size="sm" required placeholder="Ej: FV-890" value={maestro.numero_factura} onChange={(e) => setMaestro({...maestro, numero_factura: e.target.value})} />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Fecha Emisión</Form.Label>
                                        <Form.Control type="date" size="sm" required value={maestro.fecha_factura} onChange={(e) => setMaestro({...maestro, fecha_factura: e.target.value})} />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Fecha Vencimiento</Form.Label>
                                        <Form.Control type="date" size="sm" required value={maestro.fecha_vencimiento} onChange={(e) => setMaestro({...maestro, fecha_vencimiento: e.target.value})} />
                                    </Form.Group>
                                </Col>
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Concepto General</Form.Label>
                                        <Form.Control type="text" size="sm" placeholder="Ej: Compra de mercancía de Diciembre" value={maestro.concepto} onChange={(e) => setMaestro({...maestro, concepto: e.target.value})} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1 text-primary">Forma de Pago</Form.Label>
                                        <Form.Select size="sm" value={maestro.tipo_pago} onChange={(e) => setMaestro({...maestro, tipo_pago: e.target.value})}>
                                            <option value="contado">Contado (Pagado ya)</option>
                                            <option value="credito">Crédito (A pagar después)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body p-0">
                            <Table responsive hover size="sm" className="mb-0 align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th width="12%">Destino</th>
                                        <th width="20%">Cuenta o Producto</th>
                                        <th width="25%">Descripción del ítem</th>
                                        <th width="8%">Cant.</th>
                                        <th width="12%">V. Unitario</th>
                                        <th width="8%">IVA %</th>
                                        <th width="12%" className="text-end">Subtotal</th>
                                        <th width="3%"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalles.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <Form.Select size="sm" value={row.tipo_item} onChange={(e) => handleChangeRow(row.id, 'tipo_item', e.target.value)}>
                                                    <option value="gasto">Gasto (PUC)</option>
                                                    <option value="inventario">Inventario</option>
                                                </Form.Select>
                                            </td>
                                            <td>
                                                {row.tipo_item === 'gasto' ? (
                                                    <Form.Select size="sm" value={row.cuenta_puc_id} onChange={(e) => handleChangeRow(row.id, 'cuenta_puc_id', e.target.value)} required>
                                                        <option value="">Seleccione cuenta...</option>
                                                        {cuentasPuc.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                                                    </Form.Select>
                                                ) : (
                                                    <Form.Select size="sm" value={row.producto_id} onChange={(e) => handleChangeRow(row.id, 'producto_id', e.target.value)} required>
                                                        <option value="">Seleccione producto...</option>
                                                        {productos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nombre_producto}</option>)}
                                                    </Form.Select>
                                                )}
                                            </td>
                                            <td><Form.Control size="sm" type="text" value={row.descripcion} onChange={(e) => handleChangeRow(row.id, 'descripcion', e.target.value)} required /></td>
                                            <td><Form.Control size="sm" type="number" min="0.1" step="0.1" value={row.cantidad} onChange={(e) => handleChangeRow(row.id, 'cantidad', e.target.value)} required /></td>
                                            <td><Form.Control size="sm" type="number" min="0" value={row.precio_unitario} onChange={(e) => handleChangeRow(row.id, 'precio_unitario', e.target.value)} required /></td>
                                            <td><Form.Control size="sm" type="number" min="0" max="100" value={row.iva_percent} onChange={(e) => handleChangeRow(row.id, 'iva_percent', e.target.value)} /></td>
                                            <td className="text-end fw-medium">{formatMoney((Number(row.cantidad) || 0) * (Number(row.precio_unitario) || 0))}</td>
                                            <td className="text-center">
                                                <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveRow(row.id)}><i className="bi bi-trash-fill"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <div className="p-2 border-top bg-white">
                                <Button variant="outline-primary" size="sm" onClick={handleAddRow}><i className="bi bi-plus-lg me-1"></i> Agregar Ítem</Button>
                            </div>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light d-flex justify-content-between">
                <div className="d-flex gap-4">
                    <div><span className="text-muted small d-block">Subtotal</span><strong className="fs-6">{formatMoney(subtotal)}</strong></div>
                    <div><span className="text-muted small d-block">IVA</span><strong className="fs-6">{formatMoney(ivaTotal)}</strong></div>
                    <div>
                        <span className="text-muted small d-block">Descuento Global</span>
                        <input type="number" className="form-control form-control-sm w-75 d-inline" value={maestro.descuento_global} onChange={(e) => setMaestro({...maestro, descuento_global: e.target.value})} min="0" />
                    </div>
                    <div><span className="text-primary small d-block fw-bold">TOTAL FACTURA</span><strong className="fs-5 text-primary">{formatMoney(totalFactura)}</strong></div>
                </div>
                <div>
                    <Button variant="secondary" onClick={handleClose} className="me-2">Cancelar</Button>
                    <Button variant="success" type="submit" form="formCompra"><i className="bi bi-check-lg me-1"></i> Guardar Factura</Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}