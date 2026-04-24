import { useState, useEffect } from 'react';
import { 
    Button, 
    Form, 
    Row, 
    Col, 
    Card, 
    Alert, 
    Modal 
} from 'react-bootstrap';
import Swal from 'sweetalert2';

// --- NUEVO: DICCIONARIO DE CAMPOS RESTRINGIDOS ---
// Aquí le decimos al sistema qué opciones exactas tiene cada columna
const OPCIONES_PREDEFINIDAS = {
    tipo: [
        { value: 'producto', label: 'Producto' },
        { value: 'servicio', label: 'Servicio' }
    ],
    status: [
        { value: '1', label: 'Activo (1)' },
        { value: '2', label: 'Inactivo (2)' }
    ],
    allow_negative: [
        { value: '0', label: 'No permitir negativos (0)' },
        { value: '1', label: 'Permitir negativos (1)' }
    ],
    unidad_medida: [
        { value: 'Unidad', label: 'Unidad' },
        { value: 'Kg', label: 'Kilogramos (Kg)' },
        { value: 'Litro', label: 'Litros' },
        { value: 'Caja', label: 'Cajas' }
    ]
};

export const Importar = () => {
    const [step, setStep] = useState(1);
    
    const [filePath, setFilePath] = useState(null);
    const [externalSchema, setExternalSchema] = useState({});
    const [internalSchema, setInternalSchema] = useState({});
    
    const [sourceTable, setSourceTable] = useState('');
    const [targetTable, setTargetTable] = useState('');
    const [mapping, setMapping] = useState({}); 
    const [defaultValues, setDefaultValues] = useState({});
    const [showPreview, setShowPreview] = useState(false);
    const [previewCols, setPreviewCols] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [previewTotalRows, setPreviewTotalRows] = useState(0);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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

        const path = fileResult.filePath; 
        const sizeBytes = fileResult.sizeBytes;
        const sizeFormatted = fileResult.sizeFormatted;

        // Calculamos un estimado de tiempo
        let estimatedTime = "unos segundos";
        const isSql = path.toLowerCase().endsWith('.sql');
        
        if (isSql) {
            const mb = sizeBytes / (1024 * 1024);
            if (mb > 100) estimatedTime = "varios minutos (Requiere mucha memoria)";
            else if (mb > 20) estimatedTime = "hasta un minuto";
            else estimatedTime = "unos segundos";
        } else {
            estimatedTime = "casi instantáneo";
        }

        const confirm = await Swal.fire({
            title: 'Confirmar Archivo',
            html: `
                <div class="text-start mt-3">
                    <p><b>Archivo:</b> <code class="text-primary">${path.split('\\').pop()}</code></p>
                    <p><b>Peso Total:</b> ${sizeFormatted}</p>
                    <p><b>Tiempo estimado:</b> <span class="text-warning">${estimatedTime}</span></p>
                    ${isSql ? '<small class="text-muted border-top pt-2 d-block"><i>Nota: Los archivos .sql requieren ser traducidos y depurados línea por línea.</i></small>' : ''}
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sí, leer archivo',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        setFilePath(path);

        Swal.fire({ 
            title: 'Analizando y depurando...', 
            text: 'Por favor, no cierres esta ventana.',
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        const res = await window.api.readExternalDb(path);
        
        Swal.close();

        if (res.success) {
            if (res.newPath) setFilePath(res.newPath);
            setExternalSchema(res.schema);
            setStep(2);
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    const handleMapChange = (internalCol, externalCol) => {
        setMapping(prev => {
            const newMap = { ...prev };
            if (!externalCol) {
                delete newMap[internalCol];
            } else {
                newMap[internalCol] = externalCol;
            }
            return newMap;
        });
    };

    const handleImport = async () => {
        if (Object.keys(mapping).length === 0) {
            return Swal.fire('Atención', 'Debe mapear al menos un campo para importar.', 'warning');
        }

        const confirm = await Swal.fire({
            title: '¿Iniciar Importación?',
            text: `Se importarán los datos a la tabla "${targetTable}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const res = await window.api.executeImport({
                filePath,
                sourceTable,
                targetTable,
                mapping,
                defaultValues
            });

            if (res.success) {
                let mensajeExito = `Se han importado <strong>${res.rows}</strong> registros correctamente.`;
                
                if (res.fixed > 0 || res.skipped > 0) {
                    mensajeExito += `<br/><br/><div class="text-start small text-muted">
                        ${res.fixed > 0 ? `<i class="bi bi-wrench-adjustable me-1 text-warning"></i> <b>${res.fixed}</b> registros fueron autocorregidos (duplicados o vacíos).<br/>` : ''}
                        ${res.skipped > 0 ? `<i class="bi bi-exclamation-triangle me-1 text-danger"></i> <b>${res.skipped}</b> registros fueron omitidos por errores incompatibles.` : ''}
                    </div>`;
                }

                Swal.fire({
                    title: '¡Éxito!',
                    html: mensajeExito,
                    icon: 'success'
                });

                setStep(1);
                setFilePath(null);
                setSourceTable('');
                setTargetTable('');
                setMapping({});
                setDefaultValues({});
            } else {
                Swal.fire('Error en la importación', res.error, 'error');
            }
        }
    };

    // --- NUEVA FUNCIÓN: Mostrar Preview ---
    const handlePreview = async () => {
        if (!sourceTable) return;
        
        setIsLoadingPreview(true);
        setShowPreview(true);
        
        const res = await window.api.previewExternalTable({ filePath, tableName: sourceTable });
        
        if (res.success) {
            setPreviewCols(res.columns);
            setPreviewData(res.data);
            setPreviewTotalRows(res.totalRows);
        } else {
            setShowPreview(false);
            Swal.fire('Error', res.error, 'error');
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
                        <div key={num} className={`rounded-circle d-flex align-items-center justify-content-center fw-bold position-relative z-1 ${step >= num ? 'bg-primary text-white' : 'bg-light text-muted border'}`} style={{ width: '35px', height: '35px' }}>
                            {num}
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="text-center py-5 border rounded bg-light">
                        <i className="bi bi-database fs-1 text-muted mb-3 d-block"></i>
                        <h6>Seleccione el archivo a importar</h6>
                        <Button variant="outline-primary" size="lg" className="mt-3 px-5 py-3" onClick={handleFileSelect}>
                            <i className="bi bi-folder2-open me-2"></i> Buscar Archivo
                        </Button>
                        <small className="text-muted d-block mt-3">Formatos soportados: Bases de datos SQLite (.db) o volcados de MySQL (.sql).</small>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate__animated animate__fadeIn">
                        <Alert variant="info"><i className="bi bi-info-circle me-2"></i>Archivo cargado. Seleccione las tablas a conectar.</Alert>
                        <Row>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-danger">Origen (Archivo Subido)</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select value={sourceTable} onChange={(e) => { setSourceTable(e.target.value); setMapping({}); }}>
                                            <option value="">-- Seleccionar Tabla de Origen --</option>
                                            {Object.keys(externalSchema).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Form.Select>
                                        
                                        {/* NUEVO BOTÓN DE PREVIEW */}
                                        <Button 
                                            variant="info" 
                                            className="text-white" 
                                            disabled={!sourceTable} 
                                            onClick={handlePreview}
                                            title="Ver datos de esta tabla"
                                        >
                                            <i className="bi bi-eye-fill"></i>
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-success">Destino (Sistema Caedro)</Form.Label>
                                    <Form.Select value={targetTable} onChange={(e) => { setTargetTable(e.target.value); setMapping({}); }}>
                                        <option value="">-- Seleccionar Tabla de Destino --</option>
                                        {Object.keys(internalSchema).map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="mt-4 text-end">
                            <Button variant="secondary" className="me-2" onClick={() => setStep(1)}>Atrás</Button>
                            <Button variant="primary" disabled={!sourceTable || !targetTable} onClick={() => setStep(3)}>Siguiente: Mapear Campos</Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate__animated animate__fadeIn">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Alert variant="warning" className="m-0 flex-grow-1 me-3 py-2">
                                <small><strong>Instrucciones:</strong> Asocie las columnas o asigne valores por defecto.</small>
                            </Alert>
                            
                            {/* REUTILIZAMOS EL BOTÓN DE PREVIEW AQUÍ TAMBIÉN */}
                            <Button 
                                variant="outline-info" 
                                size="sm" 
                                onClick={handlePreview}
                                title="Ver datos de origen para verificar columnas"
                            >
                                <i className="bi bi-eye-fill me-1"></i> Previsualizar Origen
                            </Button>
                        </div>
                        
                        <div className="bg-light p-3 rounded border" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <Row className="mb-2 border-bottom pb-2 fw-bold text-muted">
                                <Col md={5}>Campo Origen (<span className="text-danger">{sourceTable}</span>)</Col>
                                <Col md={2} className="text-center"><i className="bi bi-arrow-right"></i></Col>
                                <Col md={5}>Campo Destino (<span className="text-success">{targetTable}</span>)</Col>
                            </Row>
                            
                            {internalSchema[targetTable]?.map(internalCol => {
                                const isSystemField = ['id', 'date_created'].includes(internalCol);
                                const isMapped = !!mapping[internalCol];
                                const hasPredefinedOptions = OPCIONES_PREDEFINIDAS[internalCol] !== undefined;

                                return (
                                    <Row key={internalCol} className="mb-3 align-items-start border-bottom pb-2">
                                        <Col md={5}>
                                            <Form.Select 
                                                size="sm" 
                                                value={mapping[internalCol] || ''} 
                                                onChange={(e) => handleMapChange(internalCol, e.target.value)}
                                                disabled={isSystemField}
                                            >
                                                <option value="">-- Dejar vacío o usar valor por defecto --</option>
                                                {externalSchema[sourceTable]?.map(extCol => (
                                                    <option key={extCol} value={extCol}>{extCol}</option>
                                                ))}
                                            </Form.Select>

                                            {!isMapped && !isSystemField && (
                                                hasPredefinedOptions ? (
                                                    <Form.Select
                                                        size="sm"
                                                        className="mt-2 bg-white text-primary border-primary shadow-sm"
                                                        value={defaultValues[internalCol] || ''}
                                                        onChange={(e) => setDefaultValues({...defaultValues, [internalCol]: e.target.value})}
                                                    >
                                                        <option value="">Seleccione un valor seguro por defecto...</option>
                                                        {OPCIONES_PREDEFINIDAS[internalCol].map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </Form.Select>
                                                ) : (
                                                    <Form.Control
                                                        size="sm"
                                                        className="mt-2 bg-light text-primary"
                                                        placeholder={`Escriba un valor manual para ${internalCol}...`}
                                                        value={defaultValues[internalCol] || ''}
                                                        onChange={(e) => setDefaultValues({...defaultValues, [internalCol]: e.target.value})}
                                                    />
                                                )
                                            )}
                                        </Col>
                                        <Col md={2} className="text-center text-primary pt-1"><i className="bi bi-link"></i></Col>
                                        <Col md={5} className="pt-1">
                                            <div className="p-2 bg-white border rounded small fw-bold">
                                                {internalCol}
                                                {isSystemField && <span className="ms-2 badge bg-secondary" style={{fontSize: '10px'}}>Autogenerado</span>}
                                            </div>
                                        </Col>
                                    </Row>
                                )
                            })}
                        </div>

                        <div className="mt-4 d-flex justify-content-between">
                            <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                            <Button variant="success" size="lg" onClick={handleImport}><i className="bi bi-check-circle me-2"></i>Iniciar Importación</Button>
                        </div>
                    </div>
                )}
            </Card.Body>


            {/* --- MODAL DE PREVISUALIZACIÓN --- */}
            <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" scrollable centered>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5">
                        <i className="bi bi-table me-2 text-info"></i>
                        Previsualización: <strong className="text-primary">{sourceTable}</strong>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {isLoadingPreview ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-info" role="status"></div>
                            <p className="mt-2 text-muted">Cargando datos...</p>
                        </div>
                    ) : previewData.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                            Esta tabla está vacía.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover table-bordered table-sm table-striped m-0" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                <thead className="table-dark sticky-top">
                                    <tr>
                                        <th className="text-center text-muted" style={{width: '40px'}}>#</th>
                                        {previewCols.map(col => <th key={col}>{col}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            <td className="text-center text-muted bg-light">{rowIndex + 1}</td>
                                            {previewCols.map(col => (
                                                <td key={col}>
                                                    {/* Truncamos textos muy largos para que la tabla no se deforme */}
                                                    {row[col] !== null 
                                                        ? (String(row[col]).length > 50 ? String(row[col]).substring(0, 50) + '...' : String(row[col])) 
                                                        : <em className="text-muted">NULL</em>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light py-2">
                    <div className="text-muted me-auto small">
                        Mostrando muestra de <strong>{previewData.length}</strong> registros.<br/>
                        Total en tabla: <strong className="text-primary">{previewTotalRows.toLocaleString('es-CO')}</strong> registros.
                    </div>
                    <Button variant="secondary" onClick={() => setShowPreview(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

        </Card>
    );
}