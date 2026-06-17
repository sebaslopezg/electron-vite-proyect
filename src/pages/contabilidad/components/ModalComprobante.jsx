import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col, Table, ListGroup } from 'react-bootstrap'
import { contabilidadService } from '../../../services/contabilidadService'

export const ModalComprobante = ({ show, handleClose, onSuccess, editData }) => {
    const [cabecera, setCabecera] = useState({
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        documento_referencia: ''
    })

    const [detalles, setDetalles] = useState([])
    const [cuentas, setCuentas] = useState([])
    
    const [tercerosTotales, setTercerosTotales] = useState([])

    const rowInitialState = { 
        id: Date.now(), 
        cuenta_id: '', 
        tercero_id: '', 
        tercero_search: '', 
        show_tercero_results: false, 
        descripcion_linea: '', 
        debito: '', 
        credito: '' 
    };

    useEffect(() => {
        if (show) {
            cargarCatalogos()
            if (editData && editData.cabecera) {
                try {
                    const fechaSegura = editData.cabecera.fecha ? editData.cabecera.fecha.substring(0, 10) : new Date().toISOString().split('T')[0]
                    
                    setCabecera({
                        fecha: fechaSegura,
                        concepto: editData.cabecera.concepto || '',
                        documento_referencia: editData.cabecera.documento_referencia || ''
                    })
                    
                    const dts = editData.detalles.map((d, index) => ({
                        ...d,
                        id: Date.now() + index,
                        debito: d.debito > 0 ? d.debito : '',
                        credito: d.credito > 0 ? d.credito : '',
                        tercero_search: d.tercero_id && d.tercero_nombre ? `${d.numero_documento} - ${d.tercero_nombre}` : '',
                        show_tercero_results: false
                    }));
                    setDetalles(dts)
                } catch (error) {
                    console.error("Error cargando los datos en la modal:", error)
                }
            } else {
                setDetalles([
                    { ...rowInitialState, id: Date.now() + 1 },
                    { ...rowInitialState, id: Date.now() + 2 }
                ])
                setCabecera({ fecha: new Date().toISOString().split('T')[0], concepto: '', documento_referencia: '' })
            }
        }
    }, [show, editData])

    const cargarCatalogos = async () => {
        const resCuentas = await contabilidadService.getCuentasAuxiliares()
        if (resCuentas.success) setCuentas(resCuentas.data)

        const resTerceros = await contabilidadService.getTerceros()
        if (resTerceros.success) setTercerosTotales(resTerceros.data)
    }

    const handleBuscarTercero = (idFila, texto) => {
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                if (texto.trim() === '') return { ...d, tercero_search: texto, show_tercero_results: false, tercero_id: '' };
                return { ...d, tercero_search: texto, show_tercero_results: true, tercero_id: '' };
            }
            return { ...d, show_tercero_results: false };
        }));
    };

    const handleSeleccionarTercero = (idFila, t) => {
        const nombreDisplay = t.tipo_persona === 'juridica' ? t.razon_social : `${t.nombres || ''} ${t.apellidos || ''}`;
        setDetalles(detalles.map(d => {
            if (d.id === idFila) {
                return { 
                    ...d, 
                    tercero_id: t.id, 
                    tercero_search: `${t.numero_documento} - ${nombreDisplay}`, 
                    show_tercero_results: false 
                };
            }
            return d;
        }));
    };

    const handleAddRow = () => {
        setDetalles([...detalles, { ...rowInitialState, id: Date.now() }]);
    }

    const handleRemoveRow = (id) => {
        if (detalles.length <= 2) {
            Swal.fire('Atención', 'Un comprobante debe tener al menos 2 líneas', 'warning')
            return
        }
        setDetalles(detalles.filter(d => d.id !== id))
    }

    const handleChangeRow = (id, field, value) => {
        setDetalles(detalles.map(d => {
            if (d.id === id) {
                const updatedRow = { ...d, [field]: value };
                if (field === 'debito' && value > 0) updatedRow.credito = ''
                if (field === 'credito' && value > 0) updatedRow.debito = ''
                return updatedRow
            }
            return d
        }))
    }

    const totalDebito = detalles.reduce((acc, curr) => acc + (Number(curr.debito) || 0), 0)
    const totalCredito = detalles.reduce((acc, curr) => acc + (Number(curr.credito) || 0), 0)
    const diferencia = Math.abs(totalDebito - totalCredito)
    const cuadra = diferencia < 0.01 && totalDebito > 0

    const formatMoneda = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!cuadra) {
            Swal.fire('Asiento Descuadrado', 'La suma de los débitos debe ser exactamente igual a los créditos.', 'error')
            return
        }

        for (let i = 0; i < detalles.length; i++) {
            const linea = detalles[i]
            if (!linea.cuenta_id) {
                Swal.fire('Error', `La línea ${i + 1} no tiene una cuenta seleccionada.`, 'error')
                return
            }
            const cuentaConfig = cuentas.find(c => c.id === linea.cuenta_id)
            if (cuentaConfig?.exige_tercero === 1 && !linea.tercero_id) {
                Swal.fire('Tercero Faltante', 
                    `La cuenta ${cuentaConfig.id} (${cuentaConfig.nombre}) exige un tercero. Por favor búscalo y selecciónalo en la línea ${i + 1}.`, 
                    'warning')
                return
            }
        }

        let res
        if (editData) {
            res = await contabilidadService.actualizarComprobante({ 
                id: editData.cabecera.id, 
                cabecera, 
                detalles 
            })
        } else {
            res = await contabilidadService.crearComprobante({ cabecera, detalles })
        }

        if (res.success) {
            Swal.fire({ 
                title: editData ? '¡Actualizado!' : '¡Asentado!', 
                text: 'Comprobante guardado con éxito.', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false 
            })
            onSuccess()
            handleClose()
        } else {
            Swal.fire('Error', res.error, 'error')
        }
    }

    return <>
        <Modal show={show} onHide={handleClose} size="xl" centered scrollable backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="h5">
                    <i className="bi bi-journal-text me-2 text-primary"></i>
                    {editData ? 'Editar Comprobante Contable' : 'Nuevo Comprobante Contable'}
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body className="bg-light pb-0">
                <Form id="comprobanteForm" onSubmit={handleSubmit}>
                    
                    <div className="card shadow-sm mb-3 border-0">
                        <div className="card-body py-3">
                            <Row>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Fecha</Form.Label>
                                        <Form.Control 
                                            type="date" 
                                            size="sm" 
                                            value={cabecera.fecha} onChange={(e) => setCabecera({...cabecera, fecha: e.target.value})} required 
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Doc. Referencia (Opcional)</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            size="sm" 
                                            placeholder="Ej: FAC-1002" 
                                            value={cabecera.documento_referencia} onChange={(e) => setCabecera({
                                                ...cabecera, 
                                                documento_referencia: e.target.value
                                            })} 
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small mb-1">Concepto General</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            size="sm" 
                                            placeholder="Ej: Pago de arriendo mayo" 
                                            value={cabecera.concepto} onChange={(e) => setCabecera({
                                                ...cabecera, 
                                                concepto: e.target.value
                                            })} 
                                            required 
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0 mb-5" style={{ overflow: 'visible' }}>
                        <div className="card-body p-0" style={{ overflow: 'visible' }}>
                            <Table hover size="sm" className="mb-0 align-middle table-layout-fixed" style={{ overflow: 'visible' }}>
                                <thead className="table-dark">
                                    <tr>
                                        <th width="5%" className="text-center">#</th>
                                        <th width="25%">Cuenta Contable</th>
                                        <th width="25%">Tercero (NIT/Cédula)</th>
                                        <th width="20%">Detalle Línea (Opcional)</th>
                                        <th width="12%" className="text-end">Débito</th>
                                        <th width="12%" className="text-end">Crédito</th>
                                        <th width="3%" className="text-center"></th>
                                    </tr>
                                </thead>
                                <tbody style={{ overflow: 'visible' }}>
                                    {detalles.map((row, index) => {
                                        const cuentaActual = cuentas.find(c => c.id === row.cuenta_id);
                                        const exigeTercero = cuentaActual?.exige_tercero === 1;

                                        const queryLower = (row.tercero_search || '').toLowerCase();
                                        const tercerosFiltrados = tercerosTotales.filter(t => {
                                            const nombreCompleto = t.tipo_persona === 'juridica' ? t.razon_social : `${t.nombres || ''} ${t.apellidos || ''}`;
                                            return (t.numero_documento && t.numero_documento.toLowerCase().includes(queryLower)) || 
                                                   (nombreCompleto && nombreCompleto.toLowerCase().includes(queryLower));
                                        }).slice(0, 10);

                                        return (
                                            <tr key={row.id} style={{ overflow: 'visible' }}>
                                                <td className="text-center text-muted small">{index + 1}</td>
                                                <td>
                                                    <Form.Select 
                                                        size="sm" 
                                                        value={row.cuenta_id} onChange={(e) => handleChangeRow(
                                                            row.id, 
                                                            'cuenta_id', 
                                                            e.target.value
                                                        )} 
                                                        required
                                                    >
                                                        <option value="">Seleccione cuenta...</option>
                                                        {cuentas.map(c => (
                                                            <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>
                                                        ))}
                                                    </Form.Select>
                                                </td>
                                                <td className="position-relative" style={{ overflow: 'visible' }}>
                                                    <Form.Control
                                                        size="sm"
                                                        type="text"
                                                        placeholder="Escriba documento o nombre..."
                                                        value={row.tercero_search || ''}
                                                        onChange={(e) => handleBuscarTercero(row.id, e.target.value)}
                                                        autoComplete="off"
                                                        className={row.tercero_id ? "border-success bg-light text-success fw-bold" : (exigeTercero ? "border-warning" : "border-primary")}
                                                    />
                                                    {row.show_tercero_results && row.tercero_search && tercerosFiltrados.length > 0 && (
                                                        <ListGroup className="position-absolute shadow border border-1 border-secondary" style={{ zIndex: 9999, maxHeight: '200px', overflowY: 'auto', top: '100%', left: 0, width: '100%' }}>
                                                            {tercerosFiltrados.map(t => {
                                                                const nombre = t.tipo_persona === 'juridica' ? t.razon_social : `${t.nombres || ''} ${t.apellidos || ''}`;
                                                                return (
                                                                    <ListGroup.Item 
                                                                        key={t.id} 
                                                                        action 
                                                                        onClick={() => handleSeleccionarTercero(row.id, t)} 
                                                                        className="py-1 px-2 small border-bottom bg-white"
                                                                    >
                                                                        <strong className="text-primary">{t.numero_documento}</strong><br/>
                                                                        <span className="text-muted">{nombre}</span>
                                                                    </ListGroup.Item>
                                                                )
                                                            })}
                                                        </ListGroup>
                                                    )}
                                                    {row.show_tercero_results && row.tercero_search && tercerosFiltrados.length === 0 && (
                                                        <ListGroup className="position-absolute shadow w-100" style={{ zIndex: 9999, top: '100%', left: 0 }}>
                                                            <ListGroup.Item className="py-2 text-center text-muted small bg-white">No se encontraron resultados.</ListGroup.Item>
                                                        </ListGroup>
                                                    )}
                                                </td>
                                                <td>
                                                    <Form.Control 
                                                        size="sm" 
                                                        type="text" 
                                                        placeholder="Concepto línea..." 
                                                        value={row.descripcion_linea} 
                                                        onChange={(e) => handleChangeRow(row.id, 'descripcion_linea', e.target.value)} 
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control 
                                                        size="sm" 
                                                        type="number" 
                                                        min="0" 
                                                        step="0.01" 
                                                        className="text-end" 
                                                        value={row.debito} 
                                                        onChange={(e) => handleChangeRow(row.id, 'debito', e.target.value)} 
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control 
                                                        size="sm" 
                                                        type="number" 
                                                        min="0" 
                                                        step="0.01" 
                                                        className="text-end" 
                                                        value={row.credito} 
                                                        onChange={(e) => handleChangeRow(row.id, 'credito', e.target.value)} 
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-link text-danger p-0" 
                                                        onClick={() => handleRemoveRow(row.id)} 
                                                        title="Eliminar línea"
                                                    >
                                                        <i className="bi bi-trash-fill"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </Table>
                            <div className="p-2 border-top bg-white rounded-bottom">
                                <Button variant="outline-primary" size="sm" onClick={handleAddRow}>
                                    <i className="bi bi-plus-lg me-1"></i> Agregar Línea
                                </Button>
                            </div>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            
            <Modal.Footer className="d-flex justify-content-between bg-light border-top-0 pt-3 position-relative z-3">
                <div className="d-flex gap-4">
                    <div>
                        <span className="text-muted small d-block">Total Débitos</span>
                        <strong className={`fs-5 ${cuadra ? 'text-success' : 'text-danger'}`}>{formatMoneda(totalDebito)}</strong>
                    </div>
                    <div>
                        <span className="text-muted small d-block">Total Créditos</span>
                        <strong className={`fs-5 ${cuadra ? 'text-success' : 'text-danger'}`}>{formatMoneda(totalCredito)}</strong>
                    </div>
                    {!cuadra && totalDebito > 0 && (
                        <div className="bg-warning text-dark px-3 py-1 rounded d-flex flex-column justify-content-center shadow-sm">
                            <span className="small fw-bold mb-0">Diferencia</span>
                            <span className="fw-bold mb-0">{formatMoneda(diferencia)}</span>
                        </div>
                    )}
                </div>
                
                <div>
                    <Button variant="secondary" onClick={handleClose} className="me-2">Cancelar</Button>
                    <Button variant={cuadra ? "success" : "secondary"} type="submit" form="comprobanteForm" disabled={!cuadra}>
                        <i className="bi bi-check-lg me-1"></i> Asentar Comprobante
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    </>
}