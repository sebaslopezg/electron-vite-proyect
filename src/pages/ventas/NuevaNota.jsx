import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import DataTableComponent from '../../components/DataTableComponent';
import { formatCurrency } from '../../utils/currencies';

export const NuevaNota = ({ onBack, onSuccess }) => {
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const loadConfig = async () => {
        const configData = await window.api.getConfiguracion();
        const confAppRaw = configData.find(c => c.key === 'confApp');
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value);
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                });
            } catch(e) {}
        }
    };

    useEffect(() => { loadConfig(); }, []);

    const [formData, setFormData] = useState({
        tipo_nota: 'Crédito',
        motivo_dian: 'Devolución de parte de los bienes',
        numero_factura_origen: '',
        observaciones: '',
        afecta_inventario: true
    });

    const [facturaCargada, setFacturaCargada] = useState(null);
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [items, setItems] = useState([]);
    
    const [showModal, setShowModal] = useState(false);
    const [itemForm, setItemForm] = useState({ id_producto: '', cantidad: 1 });

    const motivosCredito = ["Devolución de parte de los bienes", "Anulación de factura electrónica", "Rebaja total", "Descuento parcial"];
    const motivosDebito = ["Intereses", "Gastos por cobrar", "Cambio del valor"];

    const totales = items.reduce((acc, item) => {
        return {
            base: acc.base + (item.subtotal || 0),
            iva: acc.iva + ((item.subtotal * item.iva_percent) || 0),
            final: acc.final + (item.total || 0)
        };
    }, { base: 0, iva: 0, final: 0 });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSearchFactura = async () => {
        if (!formData.numero_factura_origen) {
            Swal.fire('Atención', 'Ingrese un número de factura', 'warning');
            return;
        }

        const numeroLimpio = formData.numero_factura_origen.replace(/\D/g, '');

        if (!numeroLimpio) {
            Swal.fire('Atención', 'Asegúrese de incluir el número de la factura', 'warning');
            return;
        }

        const result = await window.api.searchFactura(numeroLimpio);
        
        if (result.success) {
            setFacturaCargada(result.maestro);
            setProductosDisponibles(result.detalles);
            setItems([]);
            Swal.fire({ icon: 'success', title: 'Factura Encontrada', text: `Cliente: ${result.maestro.nombre_cliente}`, timer: 1500 });
        } else {
            Swal.fire('Error', result.message || 'Factura no encontrada', 'error');
            setFacturaCargada(null);
            setProductosDisponibles([]);
        }
    };

    const handleCloseModal = () => setShowModal(false);
    const handleOpenModal = () => {
        if(productosDisponibles.length > 0) {
            setItemForm({ id_producto: productosDisponibles[0].id_producto, cantidad: 1 });
        }
        setShowModal(true);
    };

    const handleConfirmAddItem = () => {
        const prodFactura = productosDisponibles.find(p => p.id_producto === itemForm.id_producto);
        if (!prodFactura) return;

        const cantAAgregar = parseFloat(itemForm.cantidad);

        if (cantAAgregar <= 0) {
            Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error'); return;
        }
        if (cantAAgregar > prodFactura.cantidad_producto) {
            Swal.fire('Error', `La cantidad supera lo vendido (${prodFactura.cantidad_producto})`, 'error'); return;
        }
        if (items.some(i => i.id_producto === prodFactura.id_producto)) {
            Swal.fire('Atención', 'Este producto ya está en la nota', 'warning'); return;
        }

        const newItem = {
            id: prodFactura.id_producto, 
            id_producto: prodFactura.id_producto,
            sku: prodFactura.sku,
            sku_prefix: prodFactura.sku_prefix,
            separador: prodFactura.separador,
            nombre_producto: prodFactura.nombre_producto,
            cantidad: cantAAgregar,
            precio_unitario: prodFactura.precio_producto,
            iva_percent: (prodFactura.iva || 19) / 100,
            get subtotal() { return this.cantidad * this.precio_unitario; },
            get total() { return this.subtotal * (1 + this.iva_percent); }
        };

        setItems([...items, newItem]);
        handleCloseModal();
    };

    const handleDeleteItem = (id_producto_eliminar) => {
        setItems(prevItems => prevItems.filter(item => item.id !== id_producto_eliminar));
    };

    const tableContainerRef = useRef(null);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleTableClick = (e) => {
            const delBtn = e.target.closest('.btn-delete-item');
            if (delBtn) {
                const id = delBtn.dataset.id;
                handleDeleteItem(id);
            }
        };

        container.addEventListener('click', handleTableClick);
        return () => container.removeEventListener('click', handleTableClick);
    }, [items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) {
            Swal.fire('Error', 'Debe agregar al menos un producto', 'error'); return;
        }

        const payload = {
            tipo_nota: formData.tipo_nota,
            prefijo: formData.tipo_nota === 'Crédito' ? 'NC' : 'ND',
            numero_nota: Math.floor(Math.random() * 1000) + 1,
            id_factura_origen: facturaCargada.id, 
            numero_factura_origen: facturaCargada.numero_factura.toString(),

            documento_cliente: facturaCargada.documento_cliente || '',
            nombre_cliente: facturaCargada.nombre_cliente || 'Cliente Mostrador',

            motivo_dian: formData.motivo_dian,
            observaciones: formData.observaciones,
            total_base: totales.base,
            total_iva: totales.iva,
            total_final: totales.final,
            moneda: appConfig.moneda,
            formato_numero: appConfig.formato_numero,
            afecta_inventario: formData.afecta_inventario,
            usuario: "Admin",
            items: items.map(item => ({
                id_producto: item.id_producto,
                nombre_producto: item.nombre_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                iva_percent: item.iva_percent,
                subtotal: item.subtotal,
                total: item.total
            }))
        };

        const result = await window.api.addNota(payload);
        if (result.success) {
            Swal.fire('¡Éxito!', 'La nota ha sido registrada', 'success');
            onSuccess(); 
        } else {
            Swal.fire('Error', result.error, 'error');
        }
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-primary">Nueva Nota</h5>
                <button className="btn btn-outline-secondary btn-sm" onClick={onBack}>Volver</button>
            </div>
            
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Tipo de Nota</label>
                            <select className="form-select" name="tipo_nota" value={formData.tipo_nota} onChange={handleChange}>
                                <option value="Crédito">Nota Crédito (Resta)</option>
                                <option value="Débito">Nota Débito (Suma)</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">N° Factura Origen</label>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="numero_factura_origen" 
                                    value={formData.numero_factura_origen} 
                                    onChange={handleChange} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearchFactura();
                                        }
                                    }}
                                    placeholder="Ej: F-123"
                                    required 
                                />
                                <button className="btn btn-primary" type="button" onClick={handleSearchFactura}>
                                    <i className="bi bi-search"></i>
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Motivo (DIAN)</label>
                            <select className="form-select" name="motivo_dian" value={formData.motivo_dian} onChange={handleChange}>
                                {(formData.tipo_nota === 'Crédito' ? motivosCredito : motivosDebito).map((m, i) => <option key={i} value={m}>{m}</option>)}
                            </select>
                        </div>
                        
                        {facturaCargada && (
                            <div className="col-12 mt-2">
                                <div className="alert alert-info py-2 m-0">
                                    <strong>Factura Seleccionada:</strong> {facturaCargada.prefijo || ''}{facturaCargada.separador || ''}{facturaCargada.numero_factura} | 
                                    <strong> Cliente:</strong> {facturaCargada.nombre_cliente} | 
                                    <strong> Total Original:</strong> {
                                        formatCurrency(
                                            productosDisponibles.reduce((sum, item) => sum + (item.total || 0), 0),
                                            appConfig.formato_numero,
                                            appConfig.moneda
                                        )
                                    }
                                </div>
                            </div>
                        )}

                        <div className="col-md-9">
                            <label className="form-label fw-bold">Observaciones</label>
                            <input type="text" className="form-control" name="observaciones" value={formData.observaciones} onChange={handleChange} />
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                            <div className="form-check form-switch fs-5">
                                <input className="form-check-input" type="checkbox" name="afecta_inventario" id="inventarioSwitch" checked={formData.afecta_inventario} onChange={handleChange} />
                                <label className="form-check-label fs-6 ms-2" htmlFor="inventarioSwitch">Afecta Inventario</label>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-end mb-2">
                            <h6 className="fw-bold mb-0">Detalle de la Nota</h6>
                            <button type="button" className="btn btn-success btn-sm" disabled={!facturaCargada} onClick={handleOpenModal}>
                                <i className="bi bi-plus me-1"></i> Agregar Ítem
                            </button>
                        </div>
                        
                        <div ref={tableContainerRef}>
                            <DataTableComponent 
                                data={items}
                                columns={[
                                    { 
                                        data: 'sku', 
                                        title: 'SKU',
                                        render: (data, type, row) => {
                                            if (!data) return '-'; 
                                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                                            return `<strong>${prefix}${data.toUpperCase()}</strong>`;
                                        }
                                    },
                                    { data: 'nombre_producto', title: 'Producto' },
                                    { data: 'cantidad', title: 'Cant.' },
                                    { data: 'precio_unitario', title: 'V. Unitario' },
                                    { data: 'iva_percent', title: 'IVA' },
                                    { data: 'total', title: 'Total' },
                                    { 
                                        data: null, 
                                        title: 'Acciones', 
                                        orderable: false,
                                        render: function (data, type, row) {
                                            return `
                                                <button type="button" class="btn btn-sm btn-danger btn-delete-item" data-id="${row.id}">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            `;
                                        }
                                    }
                                ]}
                                customRenders={{
                                    precio_unitario: (data) => formatCurrency(data, appConfig.formato_numero, appConfig.moneda),
                                    iva_percent: (data) => `${(parseFloat(data) * 100).toFixed(0)}%`,
                                    total: (data) => `<strong>${formatCurrency(data, appConfig.formato_numero, appConfig.moneda)}</strong>`
                                }}
                            />
                        </div>
                    </div>

                    <div className="row justify-content-end">
                        <div className="col-md-4">
                            <table className="table table-sm table-borderless text-end fs-5">
                                <tbody>
                                    <tr><td className="fw-bold">Subtotal:</td><td>{formatCurrency(totales.base, appConfig.formato_numero, appConfig.moneda)}</td></tr>
                                    <tr><td className="fw-bold">IVA:</td><td>{formatCurrency(totales.iva, appConfig.formato_numero, appConfig.moneda)}</td></tr>
                                    <tr className="border-top border-2 border-dark">
                                        <td className="fw-bold fs-4">Total:</td><td className="fw-bold fs-4 text-primary">{formatCurrency(totales.final, appConfig.formato_numero, appConfig.moneda)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="d-grid mt-3">
                                <button type="submit" className="btn btn-primary btn-lg">Generar Nota</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Agregar Producto a Nota</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Producto Facturado</Form.Label>
                            <Form.Select 
                                value={itemForm.id_producto} 
                                onChange={(e) => setItemForm({...itemForm, id_producto: e.target.value})}
                            >
                                {productosDisponibles.map((prod, idx) => (
                                    <option key={idx} value={prod.id_producto}>
                                        {prod.sku_prefix ? `${prod.sku_prefix}${prod.separador || ''}` : ''}{prod.sku || ''} - {prod.nombre_producto} (Vendidos: {prod.cantidad_producto})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Cantidad a devolver/ajustar</Form.Label>
                            <Form.Control 
                                type="number" 
                                min="0.1" 
                                step="0.1"
                                value={itemForm.cantidad} 
                                onChange={(e) => setItemForm({...itemForm, cantidad: e.target.value})}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                    <Button variant="primary" onClick={handleConfirmAddItem}>Agregar a la Nota</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};