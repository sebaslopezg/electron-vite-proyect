import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { Modal, Button, Form, Row, Col, Table, ListGroup } from 'react-bootstrap'
import { comprasService } from '../../../services/comprasService'
import { contabilidadService } from '../../../services/contabilidadService'

export const ModalCompra = ({ show, handleClose, onSuccess }) => {
    const [maestro, setMaestro] = useState({
        proveedor_id: '', 
        documento_proveedor: '', 
        nombre_proveedor: '', 
        numero_factura: '', 
        fecha_factura: new Date().toISOString().split('T')[0], 
        fecha_vencimiento: new Date().toISOString().split('T')[0], 
        concepto: '',
        tipo_pago: 'contado', 
        descuento_global: 0
    })

    const rowInitialState = { 
        id: Date.now(), 
        tipo_item: 'gasto', 
        cuenta_puc_id: '', 
        cuenta_search: '', 
        show_cuenta_results: false,
        producto_id: '', 
        producto_search: '', 
        show_producto_results: false,
        descripcion: '', 
        cantidad: 1, 
        precio_unitario: '', 
        iva_percent: 0 
    }

    const [detalles, setDetalles] = useState([{ ...rowInitialState }])

    const [proveedoresTotales, setProveedoresTotales] = useState([])
    const [busquedaProveedor, setBusquedaProveedor] = useState('')
    const [resultadosProveedor, setResultadosProveedor] = useState([])
    const [mostrarResultados, setMostrarResultados] = useState(false)

    const [cuentasPuc, setCuentasPuc] = useState([])
    const [productos, setProductos] = useState([])

    useEffect(() => {
        if (show) {
            cargarCatalogos()
            setMaestro({ 
                proveedor_id: '', 
                documento_proveedor: '', 
                nombre_proveedor: '', 
                numero_factura: '', 
                fecha_factura: new Date().toISOString().split('T')[0], 
                fecha_vencimiento: new Date().toISOString().split('T')[0], 
                concepto: '',
                tipo_pago: 'contado', 
                descuento_global: 0 
            })
            setDetalles([{ ...rowInitialState, id: Date.now() + Math.random() }])
            setBusquedaProveedor('')
            setResultadosProveedor([])
        }
    }, [show])

    const cargarCatalogos = async () => {
        const resTerceros = await contabilidadService.getTerceros()
        if (resTerceros.success) setProveedoresTotales(resTerceros.data)

        const resCuentas = await contabilidadService.getCuentasAuxiliares()
        if (resCuentas.success) setCuentasPuc(resCuentas.data)

        const resProductos = await comprasService.getAllProductos()
        setProductos(resProductos || [])
    }

    // ==========================================
    // BUSCADOR PROVEEDORES
    // ==========================================
    const handleBuscarProveedor = (e) => {
        const texto = e.target.value;
        setBusquedaProveedor(texto);
        
        if (texto.trim() === '') {
            setResultadosProveedor([]);
            setMostrarResultados(false);
            setMaestro({ 
                ...maestro, 
                proveedor_id: '', 
                documento_proveedor: '', 
                nombre_proveedor: '' 
            })
            return
        }

        const textoLower = texto.toLowerCase()
        const filtrados = proveedoresTotales.filter(p => {
            const nombreCompleto = p.tipo_persona === 'juridica' ? p.razon_social : `${p.nombres || ''} ${p.apellidos || ''}`
            return (p.numero_documento && String(p.numero_documento).toLowerCase().includes(textoLower)) || 
                   (nombreCompleto && nombreCompleto.toLowerCase().includes(textoLower))
        }).slice(0, 10)

        setResultadosProveedor(filtrados)
        setMostrarResultados(true)
    }

    const handleSeleccionarProveedor = (prov) => {
        const nombreDisplay = prov.tipo_persona === 'juridica' ? prov.razon_social : `${prov.nombres || ''} ${prov.apellidos || ''}`;
        setMaestro({ 
            ...maestro, proveedor_id: prov.id, documento_proveedor: prov.numero_documento, nombre_proveedor: nombreDisplay 
        })
        setBusquedaProveedor(`${prov.numero_documento} - ${nombreDisplay}`)
        setMostrarResultados(false)
    }

    // ==========================================
    // BUSCADOR DE CUENTAS PUC (En las filas)
    // ==========================================
    const handleBuscarCuenta = (idFila, texto) => {
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                if (texto.trim() === '') return { ...d, cuenta_search: texto, show_cuenta_results: false, cuenta_puc_id: '' }
                return { ...d, cuenta_search: texto, show_cuenta_results: true, cuenta_puc_id: '' }
            }
            return { ...d, show_cuenta_results: false }
        }))
    }

    const handleSeleccionarCuenta = (idFila, cuenta) => {
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                return { 
                    ...d, 
                    cuenta_puc_id: cuenta.id, 
                    cuenta_search: `${cuenta.id} - ${cuenta.nombre}`, 
                    show_cuenta_results: false 
                }
            }
            return d
        }))
    }

    // ==========================================
    // BUSCADOR DE PRODUCTOS (En las filas)
    // ==========================================
    const handleBuscarProducto = (idFila, texto) => {
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                if (texto.trim() === '') return { 
                    ...d, 
                    producto_search: texto, 
                    show_producto_results: false, 
                    producto_id: '', 
                    descripcion: '' 
                }
                return { 
                    ...d, 
                    producto_search: texto, 
                    show_producto_results: true, 
                    producto_id: '', 
                    descripcion: '' 
                }
            }
            return { ...d, show_producto_results: false }
        }))
    }

    const handleSeleccionarProducto = (idFila, prod) => {
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                return { 
                    ...d, 
                    producto_id: prod.id, 
                    producto_search: `${prod.sku} - ${prod.nombre_producto}`, 
                    descripcion: prod.ref_name || prod.nombre_producto,
                    show_producto_results: false 
                }
            }
            return d
        }))
    }

    // ==========================================
    // MANEJO DE LA TABLA
    // ==========================================
    const handleAddRow = () => {
        setDetalles([...detalles, { ...rowInitialState, id: Date.now() + Math.random() }])
    }

    const handleRemoveRow = (id) => {
        if (detalles.length === 1) return
        setDetalles(detalles.filter(d => d.id !== id))
    }

    const handleChangeRow = (id, field, value) => {
        setDetalles(detalles.map(d => {
            if (d.id === id) {
                if (field === 'tipo_item') {
                    return { 
                        ...d, [field]: value, 
                        cuenta_puc_id: '', 
                        cuenta_search: '', 
                        producto_id: '', 
                        producto_search: '', 
                        descripcion: '' 
                    }
                }
                return { ...d, [field]: value }
            }
            return d
        }))
    }

    const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)

    const subtotal = detalles.reduce((acc, item) => acc + ((Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)), 0)
    const ivaTotal = detalles.reduce((acc, item) => {
        const sub = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
        return acc + (sub * (Number(item.iva_percent) || 0) / 100)
    }, 0)
    const descuentoTotal = Number(maestro.descuento_global) || 0
    const totalFactura = subtotal + ivaTotal - descuentoTotal

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!maestro.proveedor_id) return Swal.fire('Error', 'Debe buscar y seleccionar un proveedor válido.', 'error')
        if (detalles.some(d => d.tipo_item === 'gasto' && !d.cuenta_puc_id)) return Swal.fire('Error', 'Seleccione una cuenta contable válida de la lista para los gastos.', 'error')
        if (detalles.some(d => d.tipo_item === 'inventario' && !d.producto_id)) return Swal.fire('Error', 'Seleccione un producto de inventario válido de la lista.', 'error')

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

        const res = await comprasService.crearCompra(payload)
        if (res.success) {
            Swal.fire({ title: '¡Compra Registrada!', text: 'La factura ha sido guardada.', icon: 'success', timer: 1500, showConfirmButton: false })
            onSuccess()
            handleClose()
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    return <>
        <Modal show={show} onHide={handleClose} size="xl" centered backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5"><i className="bi bi-cart-check-fill me-2 text-success"></i>Registrar Factura de Compra / Gasto</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-light pb-5">
                <Form id="formCompra" onSubmit={handleSubmit}>
                    <div className="card shadow-sm mb-3">
                        <div className="card-body py-3">
                            <Row className="g-3">
                                <Col md={4} className="position-relative">
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Proveedor (NIT o Nombre) <span className="text-danger">*</span></Form.Label>
                                        <Form.Control 
                                            type="text" size="sm" placeholder="Escriba para buscar proveedor..." 
                                            value={busquedaProveedor} onChange={handleBuscarProveedor} autoComplete="off"
                                            className={maestro.proveedor_id ? "border-success bg-light text-success fw-bold" : "border-primary"}
                                        />
                                        {mostrarResultados && resultadosProveedor.length > 0 && (
                                            <ListGroup className="position-absolute w-100 shadow" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto', top: '100%'}}>
                                                {resultadosProveedor.map(p => (
                                                    <ListGroup.Item key={p.id} action onClick={() => handleSeleccionarProveedor(p)} className="py-1 px-2 small border-bottom">
                                                        <strong>{p.numero_documento}</strong> <br/>
                                                        <span className="text-muted">{p.tipo_persona === 'juridica' ? p.razon_social : `${p.nombres || ''} ${p.apellidos || ''}`}</span>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                        {mostrarResultados && busquedaProveedor.length > 0 && resultadosProveedor.length === 0 && (
                                            <ListGroup className="position-absolute w-100 shadow" style={{zIndex: 1000, top: '100%'}}>
                                                <ListGroup.Item className="py-2 text-center text-muted small">No se encontraron resultados.</ListGroup.Item>
                                            </ListGroup>
                                        )}
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
                            <Table responsive hover size="sm" className="mb-0 align-middle pb-5" style={{overflow: 'visible'}}>
                                <thead className="table-dark">
                                    <tr>
                                        <th width="12%">Destino</th>
                                        <th width="22%">Cuenta o Producto</th>
                                        <th width="23%">Descripción del ítem</th>
                                        <th width="8%">Cant.</th>
                                        <th width="12%">V. Unitario</th>
                                        <th width="8%">IVA %</th>
                                        <th width="12%" className="text-end">Subtotal</th>
                                        <th width="3%"></th>
                                    </tr>
                                </thead>
                                <tbody style={{overflow: 'visible'}}>
                                    {detalles.map((row) => {
                                        const queryCuentaLower = (row.cuenta_search || '').toLowerCase();
                                        const cuentasFiltradas = cuentasPuc.filter(c => 
                                            String(c.id).includes(queryCuentaLower) || 
                                            c.nombre.toLowerCase().includes(queryCuentaLower)
                                        ).slice(0, 10);

                                        const queryProdLower = (row.producto_search || '').toLowerCase();
                                        const productosFiltrados = productos.filter(p => 
                                            (p.sku && p.sku.toLowerCase().includes(queryProdLower)) || 
                                            (p.nombre_producto && p.nombre_producto.toLowerCase().includes(queryProdLower))
                                        ).slice(0, 10);

                                        return (
                                            <tr key={row.id}>
                                                <td>
                                                    <Form.Select size="sm" value={row.tipo_item} onChange={(e) => handleChangeRow(row.id, 'tipo_item', e.target.value)}>
                                                        <option value="gasto">Gasto (PUC)</option>
                                                        <option value="inventario">Inventario</option>
                                                    </Form.Select>
                                                </td>
                                                <td className="position-relative">
                                                    {row.tipo_item === 'gasto' ? (
                                                        <>
                                                            <Form.Control 
                                                                type="text" size="sm" placeholder="Buscar código o cuenta..." 
                                                                value={row.cuenta_search || ''} onChange={(e) => handleBuscarCuenta(row.id, e.target.value)} 
                                                                autoComplete="off"
                                                                className={row.cuenta_puc_id ? "border-success bg-light text-success fw-bold" : "border-primary"}
                                                            />
                                                            {row.show_cuenta_results && row.cuenta_search && (
                                                                <ListGroup className="position-absolute shadow w-100" style={{zIndex: 1050, maxHeight: '160px', overflowY: 'auto', top: '100%', left: 0}}>
                                                                    {cuentasFiltradas.length > 0 ? (
                                                                        cuentasFiltradas.map(c => (
                                                                            <ListGroup.Item key={c.id} action onClick={() => handleSeleccionarCuenta(row.id, c)} className="py-1 px-2 small border-bottom bg-white">
                                                                                <strong>{c.id}</strong> - {c.nombre}
                                                                            </ListGroup.Item>
                                                                        ))
                                                                    ) : (
                                                                        <ListGroup.Item className="py-2 text-center text-muted small bg-white">No hay resultados.</ListGroup.Item>
                                                                    )}
                                                                </ListGroup>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Form.Control 
                                                                type="text" size="sm" placeholder="Buscar código o producto..." 
                                                                value={row.producto_search || ''} onChange={(e) => handleBuscarProducto(row.id, e.target.value)} 
                                                                autoComplete="off"
                                                                className={row.producto_id ? "border-success bg-light text-success fw-bold" : "border-primary"}
                                                            />
                                                            {row.show_producto_results && row.producto_search && (
                                                                <ListGroup className="position-absolute shadow w-100" style={{zIndex: 1050, maxHeight: '160px', overflowY: 'auto', top: '100%', left: 0}}>
                                                                    {productosFiltrados.length > 0 ? (
                                                                        productosFiltrados.map(p => (
                                                                            <ListGroup.Item key={p.id} action onClick={() => handleSeleccionarProducto(row.id, p)} className="py-1 px-2 small border-bottom bg-white">
                                                                                <strong>{p.sku}</strong> - {p.nombre_producto}
                                                                            </ListGroup.Item>
                                                                        ))
                                                                    ) : (
                                                                        <ListGroup.Item className="py-2 text-center text-muted small bg-white">No hay resultados.</ListGroup.Item>
                                                                    )}
                                                                </ListGroup>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                                <td><Form.Control size="sm" type="text" value={row.descripcion || ''} onChange={(e) => handleChangeRow(row.id, 'descripcion', e.target.value)} required /></td>
                                                <td><Form.Control size="sm" type="number" min="0.1" step="0.1" value={row.cantidad} onChange={(e) => handleChangeRow(row.id, 'cantidad', e.target.value)} required /></td>
                                                <td><Form.Control size="sm" type="number" min="0" value={row.precio_unitario} onChange={(e) => handleChangeRow(row.id, 'precio_unitario', e.target.value)} required /></td>
                                                <td><Form.Control size="sm" type="number" min="0" max="100" value={row.iva_percent} onChange={(e) => handleChangeRow(row.id, 'iva_percent', e.target.value)} /></td>
                                                <td className="text-end fw-medium">{formatMoney((Number(row.cantidad) || 0) * (Number(row.precio_unitario) || 0))}</td>
                                                <td className="text-center">
                                                    <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveRow(row.id)}><i className="bi bi-trash-fill"></i></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                            <div className="p-2 border-top bg-white rounded-bottom">
                                <Button variant="outline-primary" size="sm" onClick={handleAddRow}><i className="bi bi-plus-lg me-1"></i> Agregar Ítem</Button>
                            </div>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light d-flex justify-content-between position-relative z-3">
                <div className="d-flex gap-4 align-items-center">
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
    </>
}