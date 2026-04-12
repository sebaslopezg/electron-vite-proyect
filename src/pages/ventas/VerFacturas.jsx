import { useEffect, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { useFacturas } from "../../hooks/useFacturas"
import Modal from 'react-bootstrap/Modal'
import { Button, Row, Col, Table } from 'react-bootstrap'

export const VerFacturas = () => {
    const { facturas, loading, reload } = useFacturas();
    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    
    const [notasFactura, setNotasFactura] = useState([])

    const handleClose = () => {
        setShow(false)
        setFacturaSeleccionada(null)
        setNotasFactura([]) 
    }
    const handleShow = () => setShow(true)

    // NUEVO EFECTO: Escuchar cuando se crea una factura para recargar automáticamente
    useEffect(() => {
        const handleNuevaFactura = () => {
            reload(); // Ejecuta la función de recarga de tu hook
        };
        window.addEventListener('factura-creada', handleNuevaFactura);
        
        // Limpiar el evento cuando el componente se desmonte
        return () => {
            window.removeEventListener('factura-creada', handleNuevaFactura);
        }
    }, [reload])

    // EFECTO EXISTENTE: Clics en la tabla
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
    }, [facturas]) 

    const verDetalle = async (facturaId) => {
        const selected = facturas.find(f => f.id === facturaId)
        setFacturaSeleccionada(selected || null)

        const response = await window.api.getDetalle(facturaId)
        if (response.success) {
            setDetalleData(response.data)
            setNotasFactura(response.notas || []) 
            handleShow()
        }
    }

    return <>
        {/* EL BOTÓN DE ACTUALIZAR FUE ELIMINADO */}

        <DataTableComponent
            data={facturas}
            columns={[
                { data: 'date_created', title: 'Fecha' },
                { 
                    data: null, 
                    title: 'N° Factura',
                    render: (data, type, row) => `<strong>${row.prefijo || ''}${row.numero_factura}</strong>`
                },
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
                                badges += '<span class="badge bg-danger me-1">Crédito (Sin Abonos)</span>';
                            } else if (row.saldo_pendiente > 0) {
                                badges += '<span class="badge bg-warning text-dark me-1">Crédito (Abonado)</span>';
                            } else {
                                badges += '<span class="badge bg-success me-1">Crédito (Pagado)</span>';
                            }
                        } else {
                            badges += '<span class="badge bg-primary me-1">Contado</span>';
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
                    Detalles de la Factura {facturaSeleccionada ? `${facturaSeleccionada.prefijo || ''}${facturaSeleccionada.numero_factura}` : ''}                
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                
                {/* CABECERA DEL MODAL */}
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

                {/* NUEVA SECCIÓN: NOTAS APLICADAS */}
                {notasFactura.length > 0 && (
                    <div className="mt-4">
                        <h6 className="text-danger fw-bold border-bottom pb-2">
                            <i className="bi bi-file-earmark-minus me-2"></i>Notas Aplicadas a esta Factura
                        </h6>
                        <Table size="sm" bordered hover className="mt-2 text-center align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>N° Nota</th>
                                    <th>Tipo</th>
                                    <th>Fecha</th>
                                    <th>Motivo DIAN</th>
                                    <th>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notasFactura.map((nota, idx) => (
                                    <tr key={idx}>
                                        <td>{nota.prefijo}-{nota.numero_nota}</td>
                                        <td>
                                            <span className={`badge ${nota.tipo_nota === 'Crédito' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                Nota {nota.tipo_nota}
                                            </span>
                                        </td>
                                        <td>{new Date(nota.date_created).toLocaleDateString('es-CO')}</td>
                                        <td><small>{nota.motivo_dian}</small></td>
                                        <td className={nota.tipo_nota === 'Crédito' ? 'text-danger fw-bold' : 'text-primary fw-bold'}>
                                            {nota.tipo_nota === 'Crédito' ? '-' : '+'}${(nota.total_final || 0).toLocaleString('es-CO')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
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