import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import { Row, Col, Table } from 'react-bootstrap'
import { contabilidadService } from '../../../services/contabilidadService'

export const ModalVerComprobante = ({ show, handleClose, data }) => {
    const [cuentas, setCuentas] = useState([])
    const [terceros, setTerceros] = useState([])

    useEffect(() => {
        if (show && data) {
            cargarCatalogos()
        }
    }, [show, data])

    const cargarCatalogos = async () => {
        const resCuentas = await contabilidadService.getCuentasAuxiliares()
        if (resCuentas.success) setCuentas(resCuentas.data)

        const resTerceros = await contabilidadService.getTerceros()
        if (resTerceros.success) setTerceros(resTerceros.data)
    }

    if (!data) return null

    const { cabecera, detalles } = data
    const formatMoneda = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)

    const totalDebito = detalles.reduce((acc, curr) => acc + (Number(curr.debito) || 0), 0)
    const totalCredito = detalles.reduce((acc, curr) => acc + (Number(curr.credito) || 0), 0)

    return <>
        <Modal show={show} onHide={handleClose} size="xl" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className="bi bi-file-earmark-text me-2 text-info"></i>
                    Detalle del Comprobante #{cabecera.numero_comprobante}
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body className="p-4">
                <div className="mb-4 pb-3 border-bottom">
                    <Row>
                        <Col md={4}>
                            <p className="text-muted mb-1 small">Fecha del Asiento</p>
                            <h6 className="fw-bold">{new Date(cabecera.fecha).toLocaleDateString('es-CO')}</h6>
                        </Col>
                        <Col md={4}>
                            <p className="text-muted mb-1 small">Doc. Referencia</p>
                            <h6 className="fw-bold">{cabecera.documento_referencia || 'N/A'}</h6>
                        </Col>
                        <Col md={4}>
                            <p className="text-muted mb-1 small">Estado</p>
                            {cabecera.estado === 1 
                                ? <span className="badge bg-success">Asentado</span> 
                                : <span className="badge bg-danger">Anulado</span>
                            }
                        </Col>
                    </Row>
                    <Row className="mt-3">
                        <Col md={12}>
                            <p className="text-muted mb-1 small">Concepto General</p>
                            <p className="mb-0">{cabecera.concepto}</p>
                        </Col>
                    </Row>
                </div>

                <h6 className="fw-bold mb-3">Líneas del Asiento</h6>
                <Table responsive bordered hover size="sm" className="align-middle">
                    <thead className="table-light">
                        <tr>
                            <th width="5%" className="text-center">#</th>
                            <th width="25%">Cuenta Contable</th>
                            <th width="25%">Tercero</th>
                            <th width="21%">Detalle</th>
                            <th width="12%" className="text-end">Débito</th>
                            <th width="12%" className="text-end">Crédito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detalles.map((row, index) => {
                            const cuenta = cuentas.find(c => c.id === row.cuenta_id);
                            const tercero = terceros.find(t => t.id === row.tercero_id);
                            const nombreTercero = tercero 
                                ? (tercero.tipo_persona === 'juridica' ? tercero.razon_social : `${tercero.nombres} ${tercero.apellidos}`)
                                : '-';

                            return (
                                <tr key={row.id}>
                                    <td className="text-center text-muted">{index + 1}</td>
                                    <td>
                                        <span className="fw-medium">{row.cuenta_id}</span>
                                        {cuenta && <span className="d-block small text-muted">{cuenta.nombre}</span>}
                                    </td>
                                    <td>
                                        {tercero ? (
                                            <>
                                                <span className="d-block small text-truncate">{nombreTercero}</span>
                                                <span className="badge bg-light text-dark border">{tercero.numero_documento}</span>
                                            </>
                                        ) : <span className="text-muted">-</span>}
                                    </td>
                                    <td className="small text-muted">{row.descripcion_linea || '-'}</td>
                                    <td className="text-end fw-medium">{row.debito > 0 ? formatMoneda(row.debito) : ''}</td>
                                    <td className="text-end fw-medium">{row.credito > 0 ? formatMoneda(row.credito) : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                        <tr>
                            <td colSpan="4" className="text-end">TOTALES:</td>
                            <td className="text-end text-success">{formatMoneda(totalDebito)}</td>
                            <td className="text-end text-success">{formatMoneda(totalCredito)}</td>
                        </tr>
                    </tfoot>
                </Table>
            </Modal.Body>
            
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}