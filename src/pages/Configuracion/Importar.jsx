import { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Card, Alert } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { ModalPreviewTabla } from './components/ModalPreviewTabla';
import { ModalPreviewJson } from './components/ModalPreviewJson';
import { ModalConfigurarJoin } from './components/ModalConfigurarJoin';

export const Importar = () => {
    const [step, setStep] = useState(1);
    const [filePath, setFilePath] = useState(null);
    const [externalSchema, setExternalSchema] = useState({});
    const [internalSchema, setInternalSchema] = useState({});
    const [importMode, setImportMode] = useState('simple');

    const [sourceTable, setSourceTable] = useState('');
    const [targetTable, setTargetTable] = useState('');
    const [mapping, setMapping] = useState({}); 
    const [defaultValues, setDefaultValues] = useState({});
    
    const [relSourceMaestro, setRelSourceMaestro] = useState('');
    const [relSourceDetalle, setRelSourceDetalle] = useState('');
    const [relMapMaestro, setRelMapMaestro] = useState({});
    const [relMapDetalle, setRelMapDetalle] = useState({});

    const [jsonSourceTable, setJsonSourceTable] = useState('');
    const [jsonColumn, setJsonColumn] = useState('');
    const [jsonMapMaestro, setJsonMapMaestro] = useState({});
    const [jsonMapDetalle, setJsonMapDetalle] = useState({});

    const [showPreview, setShowPreview] = useState(false);
    const [previewCols, setPreviewCols] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [previewTotalRows, setPreviewTotalRows] = useState(0);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const [showJsonPreview, setShowJsonPreview] = useState(false);
    const [jsonPreviewData, setJsonPreviewData] = useState('');

    // --- NUEVO: ESTADOS PARA CRUCES DINÁMICOS ---
    const [fieldJoins, setFieldJoins] = useState({});
    const [joinModalConfig, setJoinModalConfig] = useState({ show: false, targetField: '', sourceColumns: [] });

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
        } else Swal.fire('Error', res.error, 'error');
    };

    const handleImportSimple = async () => {
        if (Object.keys(mapping).length === 0 && Object.keys(fieldJoins).length === 0) return Swal.fire('Atención', 'Debe mapear campos.', 'warning');
        const confirm = await Swal.fire({ title: '¿Iniciar Importación Simple?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, importar' });
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await window.api.executeImport({ filePath, sourceTable, targetTable, mapping, defaultValues, joins: fieldJoins });
            if (res.success) {
                let msg = `Importados <strong>${res.rows}</strong> registros.`;
                if(res.fixed > 0) msg += `<br>Corregidos: ${res.fixed}`;
                if(res.skipped > 0) msg += `<br>Ignorados: ${res.skipped}`;
                Swal.fire({ title: '¡Éxito!', html: msg, icon: 'success' });
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
                filePath, tablaMaestroOrigen: relSourceMaestro, tablaDetalleOrigen: relSourceDetalle, mapMaestro: relMapMaestro, mapDetalle: relMapDetalle, joins: fieldJoins
            });
            if (res.success) {
                Swal.fire('¡Éxito!', `Facturas: ${res.facturasImportadas} | Ítems: ${res.detallesImportados}`, 'success');
                resetWizard();
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    const handleJsonImport = async () => {
        if (!jsonMapMaestro.numero_factura || (!jsonMapDetalle.nombre_producto && !fieldJoins['nombre_producto'])) return Swal.fire('Error', 'Faltan campos clave mapeados.', 'error');
        const confirm = await Swal.fire({ title: '¿Desempaquetar JSON?', text: 'Se extraerán los ítems del texto JSON.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, extraer' });
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Extrayendo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await window.api.importFacturasJson({
                filePath, sourceTable: jsonSourceTable, jsonColumn: jsonColumn, mapMaestro: jsonMapMaestro, mapDetalle: jsonMapDetalle, joins: fieldJoins
            });
            if (res.success) {
                Swal.fire('¡Éxito!', `Facturas: ${res.facturasImportadas} | Ítems extraídos: ${res.detallesImportados}`, 'success');
                resetWizard();
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    const resetWizard = () => {
        setStep(1); setFilePath(null); setImportMode('simple'); setSourceTable(''); setTargetTable('');
        setMapping({}); setDefaultValues({}); setRelSourceMaestro(''); setRelSourceDetalle(''); 
        setRelMapMaestro({}); setRelMapDetalle({}); setJsonSourceTable(''); setJsonColumn(''); 
        setJsonMapMaestro({}); setJsonMapDetalle({}); setFieldJoins({});
    };

    const handlePreview = async (tableToPreview) => {
        if (!tableToPreview) return;
        setIsLoadingPreview(true); setShowPreview(true);
        const res = await window.api.previewExternalTable({ filePath, tableName: tableToPreview });
        if (res.success) { setPreviewCols(res.columns || []); setPreviewData(res.data || []); setPreviewTotalRows(res.totalRows || 0); } 
        else { setShowPreview(false); Swal.fire('Error', res.error, 'error'); }
        setIsLoadingPreview(false);
    };

    const handleJsonPreview = async () => {
        if (!jsonSourceTable || !jsonColumn) return;
        setIsLoadingPreview(true); setShowJsonPreview(true); setJsonPreviewData('');
        const res = await window.api.previewExternalTable({ filePath, tableName: jsonSourceTable });
        if (res.success && res.data && res.data.length > 0) {
            const rowWithJson = res.data.find(r => r[jsonColumn] && (String(r[jsonColumn]).trim().includes('{') || String(r[jsonColumn]).trim().includes('[')));
            if (rowWithJson) {
                try {
                    let rawStr = String(rowWithJson[jsonColumn]);
                    if (rawStr.startsWith('"') && rawStr.endsWith('"')) rawStr = rawStr.slice(1, -1);
                    rawStr = rawStr.replace(/\\"/g, '"');
                    const parsed = JSON.parse(rawStr);
                    setJsonPreviewData(JSON.stringify(parsed, null, 4));
                } catch (e) { setJsonPreviewData(`Error al parsear JSON: ${e.message}\n\nCrudo Limpio:\n${String(rowWithJson[jsonColumn]).replace(/\\"/g, '"')}`); }
            } else setJsonPreviewData("No se encontró ningún JSON válido en los primeros 50 registros.");
        } else { setShowJsonPreview(false); Swal.fire('Error', res.error || 'No hay datos', 'error'); }
        setIsLoadingPreview(false);
    };

    // Función que renderiza la fila (input + boton Join) para cada campo
    const renderMappingRow = (reqCol, isRequired, sourceColsArray, mapState, setMapState, isJsonDetalle = false) => {
        const joinActive = fieldJoins[reqCol];
        return (
            <Row key={reqCol} className="mb-2">
                <Col md={4} className="fw-bold pt-1 text-end">{reqCol} {isRequired && <span className="text-danger">*</span>}</Col>
                <Col md={6}>
                    <div className="d-flex gap-2">
                        {joinActive ? (
                            <div className="form-control form-control-sm bg-light text-success fw-bold border-success d-flex align-items-center" style={{fontSize: '0.85rem'}}>
                                <i className="bi bi-diagram-3-fill me-2"></i> {joinActive.extTable}.{joinActive.extCol}
                            </div>
                        ) : isJsonDetalle ? (
                            <Form.Control size="sm" type="text" placeholder="Llave en JSON (Ej. product_reference)" value={mapState[reqCol] || ''} onChange={(e) => setMapState({...mapState, [reqCol]: e.target.value})} />
                        ) : (
                            <Form.Select size="sm" value={mapState[reqCol] || ''} onChange={(e) => setMapState({...mapState, [reqCol]: e.target.value})}>
                                <option value="">Selecciona columna origen...</option>
                                {sourceColsArray?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                            </Form.Select>
                        )}
                        
                        <Button variant={joinActive ? "success" : "outline-success"} size="sm" title="Cruzar con otra tabla" 
                                onClick={() => setJoinModalConfig({ show: true, targetField: reqCol, sourceColumns: sourceColsArray })}>
                            <i className="bi bi-link"></i>
                        </Button>
                    </div>
                </Col>
            </Row>
        );
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
                            <Button variant={importMode === 'simple' ? 'primary' : 'outline-secondary'} onClick={() => setImportMode('simple')}>Simple (1 Tabla)</Button>
                            <Button variant={importMode === 'relacional' ? 'success' : 'outline-secondary'} onClick={() => setImportMode('relacional')}>Facturas (2 Tablas)</Button>
                            <Button variant={importMode === 'json' ? 'warning' : 'outline-secondary'} onClick={() => setImportMode('json')}>Facturas (Detalles en JSON)</Button>
                        </div>
                        {importMode === 'simple' && (
                            <Row>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger">Origen</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Select value={sourceTable} onChange={(e) => { setSourceTable(e.target.value); setMapping({}); setFieldJoins({}); }}>
                                                <option value="">-- Tabla Origen --</option>
                                                {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                            </Form.Select>
                                            <Button variant="info" className="text-white" disabled={!sourceTable} onClick={() => handlePreview(sourceTable)}><i className="bi bi-eye-fill"></i></Button>
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-success">Destino</Form.Label>
                                        <Form.Select value={targetTable} onChange={(e) => { setTargetTable(e.target.value); setMapping({}); setFieldJoins({}); }}>
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
                                    <div className="d-flex gap-2">
                                        <Form.Select value={relSourceMaestro} onChange={(e) => setRelSourceMaestro(e.target.value)}>
                                            <option value="">-- Ej. tbl_facturas --</option>
                                            {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Form.Select>
                                        <Button variant="info" className="text-white" disabled={!relSourceMaestro} onClick={() => handlePreview(relSourceMaestro)}><i className="bi bi-eye-fill"></i></Button>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Tabla DETALLE (Ítems)</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select value={relSourceDetalle} onChange={(e) => setRelSourceDetalle(e.target.value)}>
                                            <option value="">-- Ej. tbl_detalle_factura --</option>
                                            {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Form.Select>
                                        <Button variant="info" className="text-white" disabled={!relSourceDetalle} onClick={() => handlePreview(relSourceDetalle)}><i className="bi bi-eye-fill"></i></Button>
                                    </div>
                                </Col>
                            </Row>
                        )}
                        {importMode === 'json' && (
                            <Row className="g-3 bg-light p-3 rounded border border-warning">
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Tabla de Facturas</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select value={jsonSourceTable} onChange={(e) => setJsonSourceTable(e.target.value)}>
                                            <option value="">-- Ej. invoices --</option>
                                            {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Form.Select>
                                        <Button variant="info" className="text-white" disabled={!jsonSourceTable} onClick={() => handlePreview(jsonSourceTable)}><i className="bi bi-eye-fill"></i></Button>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <Form.Label className="fw-bold text-danger">Columna JSON</Form.Label>
                                    <Form.Select value={jsonColumn} onChange={(e) => setJsonColumn(e.target.value)} disabled={!jsonSourceTable}>
                                        <option value="">-- Ej. bill_info --</option>
                                        {externalSchema[jsonSourceTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Form.Select>
                                </Col>
                            </Row>
                        )}
                        <div className="mt-4 text-end">
                            <Button variant="secondary" className="me-2" onClick={() => setStep(1)}>Atrás</Button>
                            <Button variant="primary" disabled={(importMode === 'simple' && (!sourceTable || !targetTable)) || (importMode === 'relacional' && (!relSourceMaestro || !relSourceDetalle)) || (importMode === 'json' && (!jsonSourceTable || !jsonColumn))} onClick={() => setStep(3)}>Siguiente</Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate__animated animate__fadeIn">
                        {importMode === 'simple' && (
                            <>
                                <Alert variant="warning"><small>Asocie las columnas y use el botón <i className="bi bi-link text-success"></i> para extraer datos de otras tablas.</small></Alert>
                                <div className="bg-light p-3 rounded border" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {internalSchema[targetTable]?.map(internalCol => {
                                        const isSystemField = ['id', 'date_created'].includes(internalCol);
                                        return (
                                            <Row key={internalCol} className="mb-3 align-items-center border-bottom pb-2">
                                                <Col md={5}>
                                                    <div className="d-flex gap-2">
                                                        {fieldJoins[internalCol] ? (
                                                            <div className="form-control form-control-sm bg-light text-success fw-bold border-success d-flex align-items-center" style={{fontSize: '0.85rem'}}>
                                                                <i className="bi bi-diagram-3-fill me-2"></i> {fieldJoins[internalCol].extTable}.{fieldJoins[internalCol].extCol}
                                                            </div>
                                                        ) : (
                                                            <Form.Select size="sm" value={mapping[internalCol] || ''} onChange={(e) => {
                                                                const newMap = {...mapping};
                                                                e.target.value ? newMap[internalCol] = e.target.value : delete newMap[internalCol];
                                                                setMapping(newMap);
                                                            }} disabled={isSystemField}>
                                                                <option value="">-- Valor por defecto --</option>
                                                                {externalSchema[sourceTable]?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                                            </Form.Select>
                                                        )}
                                                        {!isSystemField && (
                                                            <Button variant={fieldJoins[internalCol] ? "success" : "outline-success"} size="sm" onClick={() => setJoinModalConfig({ show: true, targetField: internalCol, sourceColumns: externalSchema[sourceTable] })}>
                                                                <i className="bi bi-link"></i>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </Col>
                                                <Col md={2} className="text-center text-primary"><i className="bi bi-arrow-right"></i></Col>
                                                <Col md={5}><div className="p-2 bg-white border rounded small fw-bold">{internalCol} {isSystemField && <span className="ms-2 badge bg-secondary">Auto</span>}</div></Col>
                                            </Row>
                                        )
                                    })}
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
                                    {['id_column', 'numero_factura', 'nombre_cliente', 'documento_cliente', 'subtotal', 'descuento', 'iva', 'total_factura'].map(reqCol => renderMappingRow(reqCol, ['id_column', 'total_factura'].includes(reqCol), externalSchema[relSourceMaestro], relMapMaestro, setRelMapMaestro))}
                                </div>

                                <h6 className="fw-bold text-danger border-bottom pb-2">2. Ítems (Detalle)</h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    {['foreign_key_column', 'nombre_producto', 'precio_producto', 'cantidad_producto', 'total'].map(reqCol => renderMappingRow(reqCol, true, externalSchema[relSourceDetalle], relMapDetalle, setRelMapDetalle))}
                                </div>
                                <div className="mt-4 d-flex justify-content-between">
                                    <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                    <Button variant="success" size="lg" onClick={handleRelationalImport}>Importar y Ensamblar</Button>
                                </div>
                            </>
                        )}

                        {importMode === 'json' && (
                            <>
                                <h6 className="fw-bold text-success border-bottom pb-2">1. Maestro (Columnas de la tabla base)</h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    {['numero_factura', 'nombre_cliente', 'documento_cliente', 'subtotal', 'descuento', 'iva', 'total_factura'].map(reqCol => renderMappingRow(reqCol, false, externalSchema[jsonSourceTable], jsonMapMaestro, setJsonMapMaestro))}
                                </div>

                                <div className="d-flex justify-content-between align-items-end border-bottom pb-2 mb-3">
                                    <h6 className="fw-bold text-warning m-0">2. Ítems (Extraídos del JSON)</h6>
                                    <div>
                                        <Button variant="outline-info" size="sm" className="me-2" onClick={() => handlePreview(jsonSourceTable)}><i className="bi bi-table me-1"></i>Ver Tabla</Button>
                                        <Button variant="outline-warning" size="sm" onClick={handleJsonPreview}><i className="bi bi-braces me-1"></i>Ver JSON</Button>
                                    </div>
                                </div>

                                <div className="bg-light p-3 rounded border mb-4">
                                    {/* Pasamos isJsonDetalle=true y array vacío para que el Join y el mapping usen inputs de texto */}
                                    {['nombre_producto', 'precio_producto', 'cantidad_producto', 'total'].map(reqCol => renderMappingRow(reqCol, false, [], jsonMapDetalle, setJsonMapDetalle, true))}
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

            <ModalPreviewTabla show={showPreview} onHide={() => setShowPreview(false)} tableName={sourceTable || jsonSourceTable || relSourceMaestro || relSourceDetalle} isLoading={isLoadingPreview} columns={previewCols} data={previewData} totalRows={previewTotalRows} />
            <ModalPreviewJson show={showJsonPreview} onHide={() => setShowJsonPreview(false)} columnName={jsonColumn} isLoading={isLoadingPreview} jsonData={jsonPreviewData} />
            
            <ModalConfigurarJoin 
                show={joinModalConfig.show} 
                onHide={() => setJoinModalConfig({ ...joinModalConfig, show: false })}
                targetField={joinModalConfig.targetField}
                sourceColumns={joinModalConfig.sourceColumns}
                externalSchema={externalSchema}
                existingJoin={fieldJoins[joinModalConfig.targetField]}
                onSave={(field, config) => {
                    const newJoins = { ...fieldJoins };
                    if (config) newJoins[field] = config;
                    else delete newJoins[field];
                    setFieldJoins(newJoins);
                }}
            />
        </Card>
    );
}