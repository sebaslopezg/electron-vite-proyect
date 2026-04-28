import { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Card, Alert, Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';

const OPCIONES_PREDEFINIDAS = {
    tipo: [{ value: 'producto', label: 'Producto' }, { value: 'servicio', label: 'Servicio' }],
    status: [{ value: '1', label: 'Activo' }, { value: '2', label: 'Inactivo' }],
    allow_negative: [{ value: '0', label: 'No' }, { value: '1', label: 'Sí' }],
    unidad_medida: [{ value: 'Unidad', label: 'Unidad' }, { value: 'Kg', label: 'Kg' }, { value: 'Litro', label: 'Litros' }, { value: 'Caja', label: 'Cajas' }]
};

export const Importar = () => {
    const [step, setStep] = useState(1);
    
    const [filePath, setFilePath] = useState(null);
    const [externalSchema, setExternalSchema] = useState({});
    const [internalSchema, setInternalSchema] = useState({});
    
    // MODO DE IMPORTACIÓN ('simple', 'relacional', 'json')
    const [importMode, setImportMode] = useState('simple');

    // MODO ESTÁNDAR
    const [sourceTable, setSourceTable] = useState('');
    const [targetTable, setTargetTable] = useState('');
    const [mapping, setMapping] = useState({}); 
    const [defaultValues, setDefaultValues] = useState({});
    
    // MODO RELACIONAL
    const [relSourceMaestro, setRelSourceMaestro] = useState('');
    const [relSourceDetalle, setRelSourceDetalle] = useState('');
    const [relMapMaestro, setRelMapMaestro] = useState({});
    const [relMapDetalle, setRelMapDetalle] = useState({});

    // MODO JSON
    const [jsonSourceTable, setJsonSourceTable] = useState('');
    const [jsonColumn, setJsonColumn] = useState('');
    const [jsonMapMaestro, setJsonMapMaestro] = useState({});
    const [jsonMapDetalle, setJsonMapDetalle] = useState({});

    // ESTADOS PARA PREVISUALIZACIÓN DE TABLA
    const [showPreview, setShowPreview] = useState(false);
    const [previewCols, setPreviewCols] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [previewTotalRows, setPreviewTotalRows] = useState(0);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // NUEVOS ESTADOS PARA PREVISUALIZACIÓN DE JSON
    const [showJsonPreview, setShowJsonPreview] = useState(false);
    const [jsonPreviewData, setJsonPreviewData] = useState('');

    useEffect(() => {
        const loadInternal = async () => {
            const res = await window.api.getInternalSchema();
            if (res.success) setInternalSchema(res.schema);
        };
        loadInternal();
    }, []);

    const handleFileSelect = async () => {
        const fileResult = await window.api.selectDbFile();
        if (fileResult.canceled) return;

        setFilePath(fileResult.filePath);
        Swal.fire({ title: 'Analizando y depurando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await window.api.readExternalDb(fileResult.filePath);
        Swal.close();

        if (res.success) {
            if (res.newPath) setFilePath(res.newPath);
            setExternalSchema(res.schema || {});
            setStep(2);
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    const handleImportSimple = async () => {
        if (Object.keys(mapping).length === 0) return Swal.fire('Atención', 'Debe mapear campos.', 'warning');
        const confirm = await Swal.fire({ title: '¿Iniciar Importación Simple?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, importar' });
        
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await window.api.executeImport({ filePath, sourceTable, targetTable, mapping, defaultValues });
            
            if (res.success) {
                Swal.fire({ title: '¡Éxito!', html: `Importados <strong>${res.rows}</strong> registros.`, icon: 'success' });
                resetWizard();
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    const handleRelationalImport = async () => {
        if (!relMapMaestro.id_column || !relMapDetalle.foreign_key_column) return Swal.fire('Error', 'Faltan Llaves Foráneas.', 'error');
        const confirm = await Swal.fire({ title: '¿Ensamblar Relaciones?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, reconstruir' });
        
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Ensamblando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await window.api.importFacturasRelacionadas({
                filePath, tablaMaestroOrigen: relSourceMaestro, tablaDetalleOrigen: relSourceDetalle, mapMaestro: relMapMaestro, mapDetalle: relMapDetalle
            });

            if (res.success) {
                Swal.fire('¡Éxito!', `Facturas: ${res.facturasImportadas} | Ítems: ${res.detallesImportados}`, 'success');
                resetWizard();
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    const handleJsonImport = async () => {
        if (!jsonMapMaestro.numero_factura || !jsonMapDetalle.nombre_producto) return Swal.fire('Error', 'Faltan campos clave mapeados.', 'error');
        const confirm = await Swal.fire({ title: '¿Desempaquetar JSON?', text: 'Se extraerán los ítems del texto JSON.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, extraer' });
        
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Extrayendo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await window.api.importFacturasJson({
                filePath, sourceTable: jsonSourceTable, jsonColumn: jsonColumn, mapMaestro: jsonMapMaestro, mapDetalle: jsonMapDetalle
            });

            if (res.success) {
                Swal.fire('¡Éxito!', `Facturas: ${res.facturasImportadas} | Ítems extraídos: ${res.detallesImportados}`, 'success');
                resetWizard();
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    const resetWizard = () => {
        setStep(1); setFilePath(null); setImportMode('simple');
        setSourceTable(''); setTargetTable(''); setMapping({}); setDefaultValues({});
        setRelSourceMaestro(''); setRelSourceDetalle(''); setRelMapMaestro({}); setRelMapDetalle({});
        setJsonSourceTable(''); setJsonColumn(''); setJsonMapMaestro({}); setJsonMapDetalle({});
    };

    const handlePreview = async (tableToPreview) => {
        if (!tableToPreview) return;
        setIsLoadingPreview(true);
        setShowPreview(true);
        const res = await window.api.previewExternalTable({ filePath, tableName: tableToPreview });
        if (res.success) {
            setPreviewCols(res.columns || []); setPreviewData(res.data || []); setPreviewTotalRows(res.totalRows || 0);
        } else {
            setShowPreview(false); Swal.fire('Error', res.error, 'error');
        }
        setIsLoadingPreview(false);
    };

    // NUEVA FUNCIÓN: PREVISUALIZADOR DE JSON
    const handleJsonPreview = async () => {
        if (!jsonSourceTable || !jsonColumn) return;
        setIsLoadingPreview(true);
        setShowJsonPreview(true);
        setJsonPreviewData(''); // Limpiamos data anterior

        // Pedimos los datos de la tabla (solo trae 50 registros por defecto)
        const res = await window.api.previewExternalTable({ filePath, tableName: jsonSourceTable });

        if (res.success && res.data && res.data.length > 0) {
            // Buscamos la primera fila que no esté vacía en esa columna y parezca un JSON
            const rowWithJson = res.data.find(r => r[jsonColumn] && (String(r[jsonColumn]).trim().startsWith('{') || String(r[jsonColumn]).trim().startsWith('[')));
            
            if (rowWithJson) {
                try {
                    const parsed = JSON.parse(rowWithJson[jsonColumn]);
                    setJsonPreviewData(JSON.stringify(parsed, null, 4)); // Lo identamos a 4 espacios para que sea muy fácil de leer
                } catch (e) {
                    setJsonPreviewData(`Error al parsear el JSON de la base de datos: ${e.message}\n\nContenido crudo encontrado:\n${rowWithJson[jsonColumn]}`);
                }
            } else {
                setJsonPreviewData("No se encontró ningún JSON válido en los primeros 50 registros de esta tabla.\nRevisa que hayas seleccionado la columna correcta.");
            }
        } else {
            setShowJsonPreview(false);
            Swal.fire('Error', res.error || 'No hay datos en la tabla', 'error');
        }
        setIsLoadingPreview(false);
    };

    return (
        <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
                <h5 className="mb-4 text-primary"><i className="bi bi-cloud-arrow-up me-2"></i>Asistente de Importación de Datos</h5>
                
                <div className="d-flex justify-content-between mb-4 position-relative">
                    <div className="progress position-absolute" style={{ height: '2px', top: '15px', width: '100%', zIndex: 0 }}>
                        <div className="progress-bar bg-primary" role="progressbar" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                    </div>
                    {[1, 2, 3].map(num => (
                        <div key={num} className={`rounded-circle d-flex align-items-center justify-content-center fw-bold position-relative z-1 ${step >= num ? 'bg-primary text-white' : 'bg-light text-muted border'}`} style={{ width: '35px', height: '35px' }}>{num}</div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="text-center py-5 border rounded bg-light">
                        <i className="bi bi-database fs-1 text-muted mb-3 d-block"></i>
                        <h6>Seleccione el archivo a importar</h6>
                        <Button variant="outline-primary" size="lg" className="mt-3 px-5 py-3" onClick={handleFileSelect}>
                            <i className="bi bi-folder2-open me-2"></i> Buscar Archivo
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate__animated animate__fadeIn">
                        <Alert variant="info"><i className="bi bi-info-circle me-2"></i>Archivo cargado. ¿Qué tipo de importación desea realizar?</Alert>
                        
                        <div className="d-flex gap-3 mb-4 justify-content-center border-bottom pb-4">
                            <Button variant={importMode === 'simple' ? 'primary' : 'outline-secondary'} onClick={() => setImportMode('simple')}>
                                <i className="bi bi-table me-2"></i>Simple (1 Tabla)
                            </Button>
                            <Button variant={importMode === 'relacional' ? 'success' : 'outline-secondary'} onClick={() => setImportMode('relacional')}>
                                <i className="bi bi-diagram-3 me-2"></i>Facturas (2 Tablas)
                            </Button>
                            <Button variant={importMode === 'json' ? 'warning' : 'outline-secondary'} onClick={() => setImportMode('json')}>
                                <i className="bi bi-braces me-2"></i>Facturas (Detalles en JSON)
                            </Button>
                        </div>

                        {importMode === 'simple' && (
                            <Row>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger">Origen</Form.Label>
                                        <Form.Select value={sourceTable} onChange={(e) => { setSourceTable(e.target.value); setMapping({}); }}>
                                            <option value="">-- Tabla Origen --</option>
                                            {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Form.Select>
                                        <Button variant="link" size="sm" disabled={!sourceTable} onClick={() => handlePreview(sourceTable)}>Ver datos de origen</Button>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-success">Destino</Form.Label>
                                        <Form.Select value={targetTable} onChange={(e) => { setTargetTable(e.target.value); setMapping({}); }}>
                                            <option value="">-- Tabla Destino --</option>
                                            <option value="clientes">Clientes</option>
                                            <option value="producto">Productos y Servicios</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        {importMode === 'relacional' && (
                            <Row className="g-3 bg-light p-3 rounded border border-success">
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Tabla MAESTRO (Cabeceras)</Form.Label>
                                    <Form.Select value={relSourceMaestro} onChange={(e) => setRelSourceMaestro(e.target.value)}>
                                        <option value="">-- Ej. tbl_facturas --</option>
                                        {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
                                    <Button variant="link" size="sm" disabled={!relSourceMaestro} onClick={() => handlePreview(relSourceMaestro)}>Ver cabeceras</Button>
                                </Col>
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Tabla DETALLE (Ítems)</Form.Label>
                                    <Form.Select value={relSourceDetalle} onChange={(e) => setRelSourceDetalle(e.target.value)}>
                                        <option value="">-- Ej. tbl_detalle_factura --</option>
                                        {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
                                    <Button variant="link" size="sm" disabled={!relSourceDetalle} onClick={() => handlePreview(relSourceDetalle)}>Ver detalles</Button>
                                </Col>
                            </Row>
                        )}

                        {importMode === 'json' && (
                            <Row className="g-3 bg-light p-3 rounded border border-warning">
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Tabla de Facturas</Form.Label>
                                    <Form.Select value={jsonSourceTable} onChange={(e) => setJsonSourceTable(e.target.value)}>
                                        <option value="">-- Ej. invoices --</option>
                                        {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
                                    <Button variant="link" size="sm" disabled={!jsonSourceTable} onClick={() => handlePreview(jsonSourceTable)}>Ver tabla</Button>
                                </Col>
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Columna que contiene el JSON</Form.Label>
                                    <Form.Select value={jsonColumn} onChange={(e) => setJsonColumn(e.target.value)} disabled={!jsonSourceTable}>
                                        <option value="">-- Ej. bill_info --</option>
                                        {externalSchema[jsonSourceTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Form.Select>
                                </Col>
                            </Row>
                        )}

                        <div className="mt-4 text-end">
                            <Button variant="secondary" className="me-2" onClick={() => setStep(1)}>Atrás</Button>
                            <Button variant="primary" 
                                disabled={
                                    (importMode === 'simple' && (!sourceTable || !targetTable)) ||
                                    (importMode === 'relacional' && (!relSourceMaestro || !relSourceDetalle)) ||
                                    (importMode === 'json' && (!jsonSourceTable || !jsonColumn))
                                } 
                                onClick={() => setStep(3)}>
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate__animated animate__fadeIn">
                        
                        {importMode === 'simple' && (
                            <>
                                <Alert variant="warning"><small>Asocie las columnas.</small></Alert>
                                <div className="bg-light p-3 rounded border" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {internalSchema[targetTable]?.map(internalCol => (
                                        <Row key={internalCol} className="mb-3 align-items-center border-bottom pb-2">
                                            <Col md={5}>
                                                <Form.Select size="sm" value={mapping[internalCol] || ''} onChange={(e) => {
                                                    const newMap = {...mapping};
                                                    e.target.value ? newMap[internalCol] = e.target.value : delete newMap[internalCol];
                                                    setMapping(newMap);
                                                }} disabled={['id', 'date_created'].includes(internalCol)}>
                                                    <option value="">-- Valor por defecto --</option>
                                                    {externalSchema[sourceTable]?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                                </Form.Select>
                                            </Col>
                                            <Col md={2} className="text-center text-primary"><i className="bi bi-link"></i></Col>
                                            <Col md={5} className="fw-bold small">{internalCol}</Col>
                                        </Row>
                                    ))}
                                </div>
                                <div className="mt-4 d-flex justify-content-between">
                                    <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                    <Button variant="success" size="lg" onClick={handleImportSimple}>Importar Datos</Button>
                                </div>
                            </>
                        )}

                        {importMode === 'relacional' && (
                            <>
                                <h6 className="fw-bold text-success border-bottom pb-2">1. Maestro (Cabecera)</h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    {['id_column', 'numero_factura', 'nombre_cliente', 'documento_cliente', 'subtotal', 'descuento', 'iva', 'total_factura'].map(reqCol => (
                                        <Row key={`m-${reqCol}`} className="mb-2">
                                            <Col md={4} className="fw-bold pt-1 text-end">{reqCol} {['id_column', 'total_factura'].includes(reqCol) && '*'}</Col>
                                            <Col md={6}>
                                                <Form.Select size="sm" value={relMapMaestro[reqCol] || ''} onChange={(e) => setRelMapMaestro({...relMapMaestro, [reqCol]: e.target.value})}>
                                                    <option value="">Selecciona columna...</option>
                                                    {externalSchema[relSourceMaestro]?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                                </Form.Select>
                                            </Col>
                                        </Row>
                                    ))}
                                </div>

                                <h6 className="fw-bold text-danger border-bottom pb-2">2. Ítems (Detalle)</h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    {['foreign_key_column', 'nombre_producto', 'precio_producto', 'cantidad_producto', 'total'].map(reqCol => (
                                        <Row key={`d-${reqCol}`} className="mb-2">
                                            <Col md={4} className="fw-bold pt-1 text-end">{reqCol} *</Col>
                                            <Col md={6}>
                                                <Form.Select size="sm" value={relMapDetalle[reqCol] || ''} onChange={(e) => setRelMapDetalle({...relMapDetalle, [reqCol]: e.target.value})}>
                                                    <option value="">Selecciona columna...</option>
                                                    {externalSchema[relSourceDetalle]?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                                </Form.Select>
                                            </Col>
                                        </Row>
                                    ))}
                                </div>
                                <div className="mt-4 d-flex justify-content-between">
                                    <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                    <Button variant="success" size="lg" onClick={handleRelationalImport}>Importar y Ensamblar</Button>
                                </div>
                            </>
                        )}

                        {importMode === 'json' && (
                            <>
                                <Alert variant="warning">Dinos cómo se llamaban las columnas en la tabla base, y luego escribe <strong>exactamente</strong> cómo se llaman las "llaves" dentro del texto JSON para poder extraer los ítems.</Alert>
                                
                                <h6 className="fw-bold text-success border-bottom pb-2">1. Maestro (De las columnas de la tabla)</h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    {['numero_factura', 'nombre_cliente', 'documento_cliente', 'subtotal', 'descuento', 'iva', 'total_factura'].map(reqCol => (
                                        <Row key={`jm-${reqCol}`} className="mb-2">
                                            <Col md={4} className="fw-bold pt-1 text-end">{reqCol}</Col>
                                            <Col md={6}>
                                                <Form.Select size="sm" value={jsonMapMaestro[reqCol] || ''} onChange={(e) => setJsonMapMaestro({...jsonMapMaestro, [reqCol]: e.target.value})}>
                                                    <option value="">Selecciona columna de '{jsonSourceTable}'</option>
                                                    {externalSchema[jsonSourceTable]?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                                </Form.Select>
                                            </Col>
                                        </Row>
                                    ))}
                                </div>

                                {/* BOTONES AÑADIDOS EXACTAMENTE DONDE SE PIDIÓ */}
                                <div className="d-flex justify-content-between align-items-end border-bottom pb-2 mb-3">
                                    <h6 className="fw-bold text-warning m-0">2. Ítems (Extraídos del JSON)</h6>
                                    <div>
                                        <Button variant="outline-info" size="sm" className="me-2" disabled={!jsonSourceTable} onClick={() => handlePreview(jsonSourceTable)}>
                                            <i className="bi bi-table me-1"></i>Ver Tabla
                                        </Button>
                                        <Button variant="outline-warning" size="sm" disabled={!jsonSourceTable || !jsonColumn} onClick={handleJsonPreview}>
                                            <i className="bi bi-braces me-1"></i>Ver Estructura JSON
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-light p-3 rounded border mb-4">
                                    {['nombre_producto', 'precio_producto', 'cantidad_producto', 'total'].map(reqCol => (
                                        <Row key={`jd-${reqCol}`} className="mb-2">
                                            <Col md={4} className="fw-bold pt-1 text-end">{reqCol}</Col>
                                            <Col md={6}>
                                                <Form.Control 
                                                    size="sm" 
                                                    type="text"
                                                    placeholder="Ej. product_reference, price, etc."
                                                    value={jsonMapDetalle[reqCol] || ''} 
                                                    onChange={(e) => setJsonMapDetalle({...jsonMapDetalle, [reqCol]: e.target.value})}
                                                />
                                            </Col>
                                        </Row>
                                    ))}
                                </div>
                                <div className="mt-4 d-flex justify-content-between">
                                    <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                    <Button variant="warning" size="lg" onClick={handleJsonImport}><i className="bi bi-braces me-2"></i>Extraer e Importar JSON</Button>
                                </div>
                            </>
                        )}
                        
                    </div>
                )}
            </Card.Body>

            {/* MODAL DE PREVISUALIZACIÓN DE TABLA */}
            <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" scrollable centered>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5">
                        <i className="bi bi-table me-2 text-info"></i>Previsualización: <strong className="text-primary">{sourceTable || jsonSourceTable}</strong>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="table-responsive">
                        <table className="table table-hover table-bordered table-sm m-0" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                            <thead className="table-dark sticky-top">
                                <tr>{previewCols.map(col => <th key={col}>{col}</th>)}</tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, idx) => (
                                    <tr key={idx}>
                                        {previewCols.map(col => <td key={col}>{row[col] !== null ? String(row[col]).substring(0, 50) : 'NULL'}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPreview(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            {/* NUEVO MODAL DE PREVISUALIZACIÓN JSON */}
            <Modal show={showJsonPreview} onHide={() => setShowJsonPreview(false)} size="lg" scrollable centered>
                <Modal.Header closeButton className="bg-dark text-white border-secondary">
                    <Modal.Title className="fs-5">
                        <i className="bi bi-braces me-2 text-warning"></i>Estructura del JSON ({jsonColumn})
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 bg-dark text-light">
                    {isLoadingPreview ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-warning" role="status"></div>
                            <p className="mt-2 text-muted">Buscando y extrayendo...</p>
                        </div>
                    ) : (
                        <pre className="p-3 m-0" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {jsonPreviewData}
                        </pre>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark border-secondary">
                    <Button variant="outline-light" onClick={() => setShowJsonPreview(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

        </Card>
    );
}