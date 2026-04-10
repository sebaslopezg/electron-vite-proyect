import { useEffect, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { useFacturas } from "../../hooks/useFacturas"
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col } from 'react-bootstrap'

export const VerFacturas = () => {
    const { facturas, loading, reload } = useFacturas();
    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])
    
    // NUEVO ESTADO: Para guardar la información general de la factura
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)

    const handleClose = () => {
        setShow(false)
        setFacturaSeleccionada(null)
    }
    const handleShow = () => setShow(true)

    useEffect(() => {
        const handleClicks = (e) => {
            const id = e.target.getAttribute('data-id') || e.target.closest('button')?.getAttribute('data-id');
            if (!id) return;

            if (e.target.closest('.btn-see-item')) {
                verDetalle(id);
            }
        }
        document.addEventListener('click', handleClicks);
        return () => {
            document.removeEventListener('click', handleClicks)
        }
    }, [facturas]) // <-- Importante añadir 'facturas' aquí para que el click handler siempre tenga la data fresca

    const verDetalle = async (facturaId) => {
        // 1. Buscamos la información general de la factura en el estado actual
        const selected = facturas.find(f => f.id === facturaId)
        setFacturaSeleccionada(selected || null)

        // 2. Traemos los productos de esa factura
        const data = await window.api.getDetalle(facturaId)
        setDetalleData(data.data)
        handleShow()
    }

    return <>
        <button className="btn btn-outline-primary mb-3" onClick={reload}>
            <i className="bi bi-arrow-clockwise me-2"></i>Actualizar Listado
        </button>

        <DataTableComponent
            data={facturas}
            columns={[
                { data: 'date_created', title: 'Fecha' },
                { data: 'numero_factura', title: 'N° Factura' },
                { data: 'documento_cliente', title: 'Doc Cliente' },
                { data: 'nombre_cliente', title: 'Nombre Cliente' },
                {
                    data: null,
                    title: 'Estado',
                    orderable: false,
                    render: function (data, type, row) {
                        let badges = '';

                        if (row.metodo_pago === 'credito') {
                            if (!row.total_recibido || row.total_recibido === 0) {
                                badges += '<span class="badge bg-danger me-1">Crédito</span>';
                            } else if (row.saldo_pendiente > 0) {
                                badges += '<span class="badge bg-warning text-dark me-1">Crédito</span>';
                            } else {
                                badges += '<span class="badge bg-success me-1">Crédito</span>';
                            }
                        } else {
                            badges += '<span class="badge bg-secondary me-1">Contado</span>';
                        }

                        if (row.notas_aplicadas) {
                            if (row.notas_aplicadas.includes('Crédito')) {
                                badges += '<span class="badge bg-info text-dark me-1">Nota Crédito</span>';
                            }
                            if (row.notas_aplicadas.includes('Débito')) {
                                badges += '<span class="badge bg-secondary me-1">Nota Débito</span>';
                            }
                        }

                        return badges;
                    }
                },
                {
                    data: null,
                    title: 'Acciones',
                    orderable: false,
                    render: function (data, type, row) {
                        return `
                            <button class="btn btn-sm btn-secondary text-white btn-see-item" data-id="${row.id}" title="Ver Detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                        `;
                    }
                }
            ]}
            customRenders={{
                date_created: (data) => new Date(data).toLocaleDateString('es-ES')
            }}
        />

        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Detalles de la Factura {facturaSeleccionada ? `#${facturaSeleccionada.numero_factura}` : ''}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                
                {/* CABECERA DEL MODAL: Info del Cliente y Estado */}
                {facturaSeleccionada && (
                    <div className="bg-light p-3 rounded mb-3 border">
                        <Row>
                            <Col md={6}>
                                <p className="mb-1"><strong>Cliente:</strong> {facturaSeleccionada.nombre_cliente}</p>
                                <p className="mb-0"><strong>Documento:</strong> {facturaSeleccionada.documento_cliente}</p>
                            </Col>
                            <Col md={6} className="text-end">
                                <p className="mb-1">
                                    <strong>Método de Pago:</strong>{' '}
                                    <span className="badge bg-secondary text-capitalize">{facturaSeleccionada.metodo_pago}</span>
                                </p>
                                <p className="mb-0">
                                    <strong>Deuda Pendiente:</strong>{' '}
                                    <span className={facturaSeleccionada.saldo_pendiente > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                        ${(facturaSeleccionada.saldo_pendiente || 0).toLocaleString('es-CO')}
                                    </span>
                                </p>
                            </Col>
                        </Row>
                    </div>
                )}

                {/* TABLA DE PRODUCTOS */}
                <DataTableComponent
                    data={detalleData}
                    columns={[
                        { data: 'nombre_producto', title: 'Producto' },
                        { data: 'precio_producto', title: 'V. Unitario' },
                        { data: 'cantidad_producto', title: 'Cantidad' },
                        { data: 'total', title: 'Total' },
                    ]}
                    customRenders={{
                        precio_producto: (data) => `$${parseFloat(data).toLocaleString('es-CO')}`,
                        total: (data) => `<strong>$${parseFloat(data).toLocaleString('es-CO')}</strong>`
                    }}
                />

                {/* PIE DEL MODAL: Resumen Financiero */}
                {facturaSeleccionada && (
                    <div className="mt-3 p-3 bg-light rounded border text-end">
                        <p className="mb-1"><strong>Subtotal:</strong> ${(facturaSeleccionada.subtotal || 0).toLocaleString('es-CO')}</p>
                        <p className="mb-1 text-danger"><strong>Descuentos:</strong> -${(facturaSeleccionada.descuento || 0).toLocaleString('es-CO')}</p>
                        <p className="mb-2"><strong>IVA:</strong> ${(facturaSeleccionada.iva || 0).toLocaleString('es-CO')}</p>
                        <hr className="my-2" />
                        <h4 className="mb-0 text-primary"><strong>Total Factura:</strong> ${(facturaSeleccionada.total_factura || 0).toLocaleString('es-CO')}</h4>
                    </div>
                )}

            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}