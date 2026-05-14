import { useState, useEffect, useRef } from 'react'
import { Button, Form, Row, Col, Card, Alert, Spinner } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { ModalPreviewTabla } from './components/ModalPreviewTabla'
import { ModalPreviewJson } from './components/ModalPreviewJson'
import { ModalConfigurarJoin } from './components/ModalConfigurarJoin'
import { Modal } from 'react-bootstrap'

// DICCIONARIO DE DATOS
const CAEDRO_DICTIONARY = {
    terceros: {
        tipo_documento: [
            { value: 'NIT', label: 'NIT' },
            { value: 'CC', label: 'CC (Cédula de Ciudadanía)' },
            { value: 'CE', label: 'CE (Cédula de Extranjería)' },
            { value: 'PAS', label: 'PAS (Pasaporte)' }
        ],
        tipo_persona: [
            { value: 'juridica', label: 'juridica (Empresa)' },
            { value: 'natural', label: 'natural (Persona)' }
        ],
        es_cliente: [{ value: '1', label: '1 (Sí)' }, { value: '0', label: '0 (No)' }],
        es_proveedor: [{ value: '1', label: '1 (Sí)' }, { value: '0', label: '0 (No)' }],
        estado: [{ value: '1', label: '1 (Activo)' }, { value: '0', label: '0 (Inactivo)' }]
    },
    producto: {
        tipo: [{ value: 'producto', label: 'Producto físico' }, { value: 'servicio', label: 'Servicio' }],
        estado: [{ value: '1', label: '1 (Activo)' }, { value: '0', label: '0 (Inactivo)' }],
        isEncargo: [{ value: '1', label: '1 (Es Encargo)' }, { value: '0', label: '0 (Stock Normal)' }]
    },
    ventasMaestro: {
        tipo_pago: [{ value: 'contado', label: 'Contado' }, { value: 'credito', label: 'Crédito' }],
        status: [{ value: '1', label: '1 (Activa)' }, { value: '0', label: '0 (Anulada)' }]
    }
};

export const Importar = () => {
    const [step, setStep] = useState(1)
    const [fileType, setFileType] = useState(null)
    const [filePath, setFilePath] = useState(null)
    const [externalSchema, setExternalSchema] = useState({})
    const [internalSchema, setInternalSchema] = useState({})

    //Estado de consola (Ahora guardará objetos { time, text })
    const [showConsole, setShowConsole] = useState(false)
    const [consoleLogs, setConsoleLogs] = useState([])
    const logsEndRef = useRef(null)
    
    // Modo de importacion
    const [importMode, setImportMode] = useState('simple')
    const [idPrefix, setIdPrefix] = useState('old_')

    // Estados globales
    const [sourceTable, setSourceTable] = useState('')
    const [targetTable, setTargetTable] = useState('')
    const [mapping, setMapping] = useState({})
    const [defaultValues, setDefaultValues] = useState({})
    
    // Estados en avanzado
    const [customQuery, setCustomQuery] = useState('')
    const [queryCols, setQueryCols] = useState([])
    const [jsonColumn, setJsonColumn] = useState('')
    const [jsonKeysMapping, setJsonKeysMapping] = useState({})

    // Estados en relacional
    const [relSourceMaestro, setRelSourceMaestro] = useState('')
    const [relSourceDetalle, setRelSourceDetalle] = useState('')
    const [relMapMaestro, setRelMapMaestro] = useState({})
    const [relMapDetalle, setRelMapDetalle] = useState({})

    // Modales y preview (componetizar)
    const [showPreview, setShowPreview] = useState(false)
    const [previewCols, setPreviewCols] = useState([])
    const [previewData, setPreviewData] = useState([])
    const [previewTotalRows, setPreviewTotalRows] = useState(0)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const [showJsonPreview, setShowJsonPreview] = useState(false)
    const [jsonPreviewData, setJsonPreviewData] = useState('')

    const [fieldJoins, setFieldJoins] = useState({})
    const [joinModalConfig, setJoinModalConfig] = useState({ show: false, targetField: '', sourceColumns: [] })

    useEffect(() => {
        const loadInternal = async () => {
            const res = await window.api.getInternalSchema()
            if (res.success) setInternalSchema(res.schema)
        }
        loadInternal()

        if (window.api.onImportLog) {
            window.api.onImportLog((msg) => {
                // Almacenamos el timestamp fijo al momento de recibir el log
                setConsoleLogs(prevLogs => [...prevLogs, { time: new Date().toLocaleTimeString(), text: msg }])
            })
        }

        return () => {
            if (window.api.removeAllImportLogs) window.api.removeAllImportLogs()
        }
    }, [])

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [consoleLogs])

    const handleFileSelect = async (type) => {
        setFileType(type)

        let fileResult;
        if (type === 'csv') {
            fileResult = await window.api.selectCsvFile()
        } else {
            fileResult = await window.api.selectDbFile()
        }

        if (fileResult.canceled) {
            setFileType(null)
            return
        }

        setFilePath(fileResult.filePath)
        
        setConsoleLogs([{ time: new Date().toLocaleTimeString(), text: `[SISTEMA] Iniciando lectura de archivo ${type.toUpperCase()}...` }])
        setShowConsole(true)
        
        try {
            let res
            if (type === 'csv') {
                res = await window.api.readCsvFile(fileResult.filePath)
            } else {
                res = await window.api.readExternalDb(fileResult.filePath)
            }
            
            if (res.success) {
                setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[SISTEMA] Lectura completada. Pasando al siguiente paso...` }])
                
                setTimeout(() => {
                    setShowConsole(false)
                    if (type === 'csv') {
                        setExternalSchema({ "Datos_CSV": res.columns })
                        setSourceTable("Datos_CSV")
                        setPreviewCols(res.columns)
                        setPreviewData(res.data)
                        setPreviewTotalRows(res.totalRows)
                    } else {
                        if (res.newPath) setFilePath(res.newPath)
                        setExternalSchema(res.schema || {})
                    }
                    setStep(2)
                }, 1500)

            } else {
                setFileType(null)
                setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[SISTEMA] X ERROR: ${res.error}` }])
            }
        } catch (err) {
            setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[SISTEMA] X ERROR CRÍTICO de conexión.` }])
        }
    }

    const executeUniversalImport = async (type) => {

        if (Object.keys(mapping).length === 0 && Object.keys(fieldJoins).length === 0 && Object.keys(defaultValues).length === 0) {
            return Swal.fire('Atención', 'Debe mapear o fijar al menos un campo.', 'warning')
        }

        let actionMethod
        let finalPayload = { filePath, targetTable, mapping, defaultValues, idPrefix, joins: fieldJoins }
        let title = '¿Iniciar Importación Simple?'

        if (fileType === 'csv') {
            actionMethod = window.api.executeImportCsv
        } else {
             if (type === 'simple') {
                actionMethod = window.api.executeImport
                finalPayload.sourceTable = sourceTable
            } else if (type === 'avanzado') {
                if (jsonColumn) {
                    title = '¿Ejecutar SQL y Extraer JSON?'
                    actionMethod = window.api.executeImportJson
                    finalPayload.query = customQuery
                    finalPayload.jsonColumn = jsonColumn
                    finalPayload.jsonKeysMapping = jsonKeysMapping
                } else {
                    title = '¿Iniciar Importación desde SQL?'
                    actionMethod = window.api.executeImportQuery
                    finalPayload.query = customQuery
                }
            }
        }

        const confirm = await Swal.fire({ title, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, importar' })  

        if (confirm.isConfirmed) {
            setConsoleLogs([{ time: new Date().toLocaleTimeString(), text: "[SISTEMA] Iniciando asistente de migración..." }])
            setShowConsole(true)

            try {
                const res = await actionMethod(finalPayload)
                
                if (res.success) {
                    setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: "[SISTEMA] ✓ Guardado completado con éxito. Cerrando consola en 3 segundos..." }])
                    
                    setTimeout(() => {
                        setShowConsole(false)
                        let msg = `Importados <strong>${res.rows}</strong> registros.`
                        if(res.fixed > 0) msg += `<br>Corregidos: ${res.fixed}`
                        if(res.skipped > 0) msg += `<br>Ignorados: ${res.skipped}`
                        Swal.fire({ title: '¡Migración Exitosa!', html: msg, icon: 'success' })
                        resetWizard(false)
                    }, 3000)

                } else {
                    setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[SISTEMA] X ERROR: ${res.error}` }])
                }
            } catch (err) {
                setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[SISTEMA] X ERROR CRÍTICO: Hubo un error de conexión.` }]);
            }
        }
    };

    const handleRelationalImport = async () => {
        if (!relMapMaestro.id_column || !relMapDetalle.foreign_key_column) return Swal.fire('Error', 'Faltan Llaves Foráneas.', 'error');
        const confirm = await Swal.fire({ 
            title: '¿Ensamblar Relaciones?', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonText: 'Sí, reconstruir' 
        })
        if (confirm.isConfirmed) {
            Swal.fire({ 
                title: 'Ensamblando...', 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading() 
            })
            const res = await window.api.importFacturasRelacionadas({
                filePath, 
                tablaMaestroOrigen: relSourceMaestro, 
                tablaDetalleOrigen: relSourceDetalle, 
                mapMaestro: relMapMaestro, 
                mapDetalle: relMapDetalle, 
                joins: fieldJoins, 
                defaultValues
            })
            if (res.success) {
                Swal.fire('¡Éxito!', `Facturas: ${res.facturasImportadas} | Ítems: ${res.detallesImportados}`, 'success')
                resetWizard()
            } else Swal.fire('Error', res.error, 'error')
        }
    }

    const resetWizard = (fullReset = true) => {
        if (fullReset) {
            setStep(1)
            setFilePath(null)
            setFileType(null)
        } else {
            setStep(2)
        }
        setImportMode('simple'); 
        setSourceTable(fileType === 'csv' ? 'Datos_CSV' : '')
        setTargetTable('')
        setMapping({})
        setDefaultValues({})
        setJsonKeysMapping({})
        setRelSourceMaestro('')
        setRelSourceDetalle('')
        setRelMapMaestro({})
        setRelMapDetalle({})
        setJsonColumn('')
        setFieldJoins({})
        setCustomQuery('')
        setQueryCols([])
    }

    const handlePreview = async (tableToPreview) => {
        if (!tableToPreview) return
        setIsLoadingPreview(true)
        setShowPreview(true)

        if (tableToPreview === "Datos_CSV") {
            setIsLoadingPreview(false)
            return
        }

        const res = await window.api.previewExternalTable({ filePath, tableName: tableToPreview })
        if (res.success) { 
            setPreviewCols(res.columns || [])
            setPreviewData(res.data || [])
            setPreviewTotalRows(res.totalRows || 0)
        } else {
            setShowPreview(false)
            Swal.fire('Error', res.error, 'error')
        }
        setIsLoadingPreview(false)
    }

    const handlePreviewQuery = async () => {
        if (!customQuery.trim()) return
        setIsLoadingPreview(true); setShowPreview(true)
        const res = await window.api.previewExternalQuery({ filePath, query: customQuery })
        if (res.success) { 
            setPreviewCols(res.columns || [])
            setPreviewData(res.data || [])
            setPreviewTotalRows(res.totalRows || 0)
            setQueryCols(res.columns || [])
        } 
        else { 
            setShowPreview(false)
            Swal.fire('Error de Sintaxis SQL', res.error, 'error') 
        }
        setIsLoadingPreview(false)
    }

    const handleJsonPreview = async () => {
        if (!customQuery || !jsonColumn) return
        setIsLoadingPreview(true)
        setShowJsonPreview(true)
        setJsonPreviewData('')
        const res = await window.api.previewExternalQuery({ filePath, query: customQuery })
        if (res.success && res.data && res.data.length > 0) {
            const rowWithJson = res.data.find(r => r[jsonColumn] && (String(r[jsonColumn]).trim().includes('{') || String(r[jsonColumn]).trim().includes('[')))
            if (rowWithJson) {
                try {
                    let rawStr = String(rowWithJson[jsonColumn])
                    if (rawStr.startsWith('"') && rawStr.endsWith('"')) rawStr = rawStr.slice(1, -1)
                    rawStr = rawStr.replace(/\\"/g, '"')
                    const parsed = JSON.parse(rawStr)
                    setJsonPreviewData(JSON.stringify(parsed, null, 4))
                } catch (e) { setJsonPreviewData(`Error al parsear JSON: ${e.message}\n\nCrudo Limpio:\n${String(rowWithJson[jsonColumn]).replace(/\\"/g, '"')}`)}
            } else setJsonPreviewData("No se encontró ningún JSON válido en los resultados de la consulta.")
        } else { setShowJsonPreview(false); Swal.fire('Error', res.error || 'No hay datos', 'error')}
        setIsLoadingPreview(false)
    };

    const handleAutoMap = () => {
        if (!targetTable) return;
        
        let sourceCols = [];
        if (importMode === 'avanzado') {
            sourceCols = queryCols || [];
        } else {
             sourceCols = externalSchema[sourceTable] || [];
        }

        if (sourceCols.length === 0) {
            Swal.fire('Atención', 'No hay columnas de origen disponibles para mapear. ¿Cargaste una tabla o consulta?', 'warning');
            return;
        }

        const newMapping = { ...mapping };
        let matchedCount = 0;

        const internalCols = internalSchema[targetTable] || [];
        
        internalCols.forEach(internalCol => {
            if (sourceCols.includes(internalCol)) {
                newMapping[internalCol] = internalCol;
                matchedCount++;
            }
        });

        if (matchedCount > 0) {
            setMapping(newMapping);
            Swal.fire({
                title: 'Mapeo Exitoso',
                text: `Se asociaron ${matchedCount} columnas automáticamente.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
             Swal.fire('Sin Coincidencias', 'No se encontraron columnas con el mismo nombre entre el origen y el destino.', 'info');
        }
    };

    const renderMappingRow = (reqCol, isRequired, sourceColsArray, mapState, setMapState, isJsonDetalle = false) => {
        const joinActive = fieldJoins[reqCol]
        const isMapped = !!mapState[reqCol]
        const isJsonMapped = mapState[reqCol] === '__JSON__'
        const isSystemRestricted = ['foreign_key_column'].includes(reqCol)
        const isIdField = reqCol === 'id' || reqCol === 'id_column'
        const isDateCreated = reqCol === 'date_created'

        return (
            <Row key={reqCol} className="mb-3 border-bottom pb-3">
                <Col md={5} className="fw-bold pt-1 text-end">
                    {reqCol} {isRequired && <span className="text-danger">*</span>}
                    {isIdField && <span className="d-block text-muted fw-normal" style={{fontSize: '11px'}}>(Permite prefijo)</span>}
                </Col>
                <Col md={6}>
                    <div className="d-flex flex-column gap-2">
                        <div className="d-flex gap-2">
                            {joinActive ? (
                                <div className="form-control form-control-sm bg-light text-success fw-bold border-success d-flex align-items-center" style={{fontSize: '0.85rem'}}>
                                    <i className="bi bi-diagram-3-fill me-2"></i> {joinActive.isInternal ? 'DB_INTERNA' : 'ARCHIVO'}: {joinActive.extTable}.{joinActive.extCol}
                                </div>
                            ) : isJsonDetalle ? (
                                <Form.Control size="sm" type="text" placeholder="Llave en JSON" value={mapState[reqCol] || ''} onChange={(e) => setMapState({...mapState, [reqCol]: e.target.value})} />
                            ) : (
                                <Form.Select size="sm" value={mapState[reqCol] || ''} onChange={(e) => {
                                    const newMap = {...mapState};
                                    e.target.value ? newMap[reqCol] = e.target.value : delete newMap[reqCol];
                                    setMapState(newMap);
                                }} disabled={isSystemRestricted}>
                                    <option value="">-- {isIdField ? 'Auto Generar / Manual' : isDateCreated ? 'Auto (Fecha Actual) / Manual' : 'Usar Valor Fijo Manual'} --</option>
                                    {importMode === 'avanzado' && jsonColumn && <option value="__JSON__" className="text-warning fw-bold">-- Extraer de llave JSON --</option>}
                                    {sourceColsArray?.map(extCol => <option key={extCol} value={extCol}>{extCol}</option>)}
                                </Form.Select>
                            )}
                            
                            {!isSystemRestricted && fileType !== 'csv' && (
                                <Button variant={joinActive ? "success" : "outline-success"} size="sm" title="Cruzar con otra tabla" 
                                        onClick={() => setJoinModalConfig({ show: true, targetField: reqCol, sourceColumns: sourceColsArray })}>
                                    <i className="bi bi-link"></i>
                                </Button>
                            )}
                        </div>

                        {isJsonMapped && !joinActive && (
                            <div className="d-flex align-items-center mt-1 animate__animated animate__fadeIn">
                                <span className="small text-warning fw-bold me-2" style={{whiteSpace: 'nowrap'}}><i className="bi bi-braces"></i> Llave JSON:</span>
                                <Form.Control size="sm" type="text" className="bg-warning bg-opacity-10 border-warning text-dark fw-bold" placeholder="Ej. price, nombre..." value={jsonKeysMapping[reqCol] || ''} onChange={(e) => setJsonKeysMapping({...jsonKeysMapping, [reqCol]: e.target.value})} />
                            </div>
                        )}
                        
                        {isIdField && !isJsonMapped && (
                            <div className="d-flex align-items-center mt-1 animate__animated animate__fadeIn">
                                <span className="small text-danger fw-bold me-2" style={{whiteSpace: 'nowrap'}}>Prefijo de Seguridad:</span>
                                <Form.Control size="sm" type="text" className="bg-warning bg-opacity-10 border-warning text-danger fw-bold" placeholder="Ej. old_" value={idPrefix} onChange={(e) => setIdPrefix(e.target.value)} />
                            </div>
                        )}

                        {!joinActive && !isMapped && !isSystemRestricted && !isJsonDetalle && (
                            <>
                                {CAEDRO_DICTIONARY[targetTable] && CAEDRO_DICTIONARY[targetTable][reqCol] ? (
                                    <Form.Select 
                                        size="sm" 
                                        className="bg-light text-primary border-primary border-opacity-50 fw-bold" 
                                        value={defaultValues[reqCol] || ''} 
                                        onChange={(e) => setDefaultValues({...defaultValues, [reqCol]: e.target.value})}
                                    >
                                        <option value="">-- Seleccione una opción fija --</option>
                                        {CAEDRO_DICTIONARY[targetTable][reqCol].map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </Form.Select>
                                ) : (
                                    <Form.Control 
                                        size="sm" 
                                        type="text" 
                                        className="bg-light text-primary border-primary border-opacity-50" 
                                        placeholder={isIdField ? 'Dejar vacío para autogenerar id...' : `Escribir valor fijo manual para ${reqCol}...`} 
                                        value={defaultValues[reqCol] || ''} 
                                        onChange={(e) => setDefaultValues({...defaultValues, [reqCol]: e.target.value})} 
                                    />
                                )}
                            </>
                        )}
                    </div>
                </Col>
            </Row>
        );
    };

return <>

        <h5 className="mb-4 card-title">
            <i className="bi bi-cloud-arrow-up me-2"></i>Asistente de Importación
            <p className="text-muted small m-0">Herramienta de importación de datos</p>
            {fileType && <span className="text-muted ms-2 fs-6">({fileType.toUpperCase()})</span>}
        </h5>
                
        <div className="d-flex justify-content-between mb-4 position-relative">
            <div className="progress position-absolute" style={{ height: '2px', top: '15px', width: '100%', zIndex: 0 }}>
                <div className="progress-bar bg-primary" role="progressbar" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
            </div>
            {[1, 2, 3].map(num => (
                <div key={num} className={`rounded-circle d-flex align-items-center justify-content-center fw-bold position-relative z-1 ${step >= num ? 'bg-primary text-white' : 'bg-light text-muted border'}`} style={{ width: '35px', height: '35px' }}>{num}</div>
            ))}
        </div>

        {step === 1 && (
            <div className="animate__animated animate__fadeIn">
                <Alert variant="info" className="mb-4">
                    <i className="bi bi-info-circle me-2"></i>Seleccione el formato de su base de datos origen.
                </Alert>
                <Row className="g-4">
                    {/* CSV */}
                    <Col md={6}>
                        <div className="text-center p-4 border rounded bg-light h-100 d-flex flex-column justify-content-center hover-shadow transition" style={{cursor: 'pointer'}} onClick={() => handleFileSelect('csv')}>
                            <i className="bi bi-filetype-csv fs-1 text-success mb-3 d-block"></i>
                            <h6 className="fw-bold">Importar Archivo CSV</h6>
                            <p className="small text-muted mb-0">Importa desde CSV plano sin alteraciones</p>
                        </div>
                    </Col>

                    {/* SQL */}
                    <Col md={6}>
                        <div className="text-center p-4 border rounded bg-light h-100 d-flex flex-column justify-content-center hover-shadow transition" style={{cursor: 'pointer'}} onClick={() => handleFileSelect('sql')}>
                            <i className="bi bi-filetype-sql fs-1 text-danger mb-3 d-block"></i>
                            <h6 className="fw-bold">Importar Base de Datos SQL / SQLite</h6>
                            <p className="small text-muted mb-0">Con soporte para Mysql y SQLlite</p>
                        </div>
                    </Col>
                </Row>
            </div>
        )}

        {step === 2 && (
            <div className="animate__animated animate__fadeIn">
                <Alert variant="success"><i className="bi bi-check-circle me-2"></i>Archivo {fileType?.toUpperCase()} cargado correctamente.</Alert>
                
                {/* btns importacion */}
                <div className="d-flex gap-3 mb-4 justify-content-center border-bottom pb-4 flex-wrap">
                    <Button variant={importMode === 'simple' ? 'primary' : 'outline-primary'} onClick={() => setImportMode('simple')}><i className="bi bi-table me-2"></i>Simple (Tabla a Tabla)</Button>
                    
                    {fileType === 'sql' && (
                        <>
                            <Button variant={importMode === 'avanzado' ? 'dark' : 'outline-dark'} onClick={() => setImportMode('avanzado')}><i className="bi bi-magic me-2"></i>Avanzado (SQL + JSON)</Button>
                            <Button variant={importMode === 'relacional' ? 'success' : 'outline-success'} onClick={() => setImportMode('relacional')}><i className="bi bi-diagram-3 me-2"></i>Facturas (Auto-Ensamblar)</Button>
                        </>
                    )}
                </div>

                {importMode === 'simple' && (
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-danger">Origen</Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Select value={sourceTable} onChange={(e) => { setSourceTable(e.target.value); setMapping({}); setFieldJoins({}); setJsonColumn(''); }}>
                                        {fileType === 'csv' ? (
                                            <option value="Datos_CSV">Datos_CSV</option>
                                        ) : (
                                            <>
                                                <option value="">-- Tabla Origen --</option>
                                                {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                            </>
                                        )}
                                    </Form.Select>
                                    <Button variant="info" className="text-white" disabled={!sourceTable} onClick={() => handlePreview(sourceTable)}><i className="bi bi-eye-fill"></i></Button>
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-success">Destino (Sistema Caedro)</Form.Label>
                                <Form.Select value={targetTable} onChange={(e) => { setTargetTable(e.target.value); setMapping({}); setFieldJoins({}); }}>
                                    <option value="">-- Tabla Destino --</option>
                                    {Object.keys(internalSchema).map(t => <option key={t} value={t}>{t}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                )}

                {importMode === 'avanzado' && (
                    <Row className="g-3 bg-light p-3 rounded border border-dark">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-danger"><i className="bi bi-terminal me-2"></i>Consulta SQL (Origen)</Form.Label>
                                <Form.Control 
                                    as="textarea" rows={4} 
                                    value={customQuery} 
                                    onChange={e => setCustomQuery(e.target.value)} 
                                    placeholder="SELECT id, details_json, total FROM bills WHERE status = 1" 
                                    className="font-monospace bg-dark text-light"
                                />
                                <div className="mt-2 text-end">
                                    <Button variant="info" className="text-white" disabled={!customQuery} onClick={handlePreviewQuery}>
                                        <i className="bi bi-play-fill me-1"></i> Ejecutar y Previsualizar
                                    </Button>
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="animate__animated animate__fadeIn">
                                <Form.Label className="fw-bold text-warning"><i className="bi bi-braces me-1"></i>Extraer Detalles desde JSON (Opcional)</Form.Label>
                                <Form.Select value={jsonColumn} onChange={(e) => setJsonColumn(e.target.value)} disabled={queryCols.length === 0}>
                                    <option value="">-- Ninguna --</option>
                                    {queryCols.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                                <Form.Text className="text-muted small">Selecciona una columna si el resultado SQL contiene ítems empaquetados.</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-success">Destino (Sistema Caedro)</Form.Label>
                                <Form.Select value={targetTable} onChange={(e) => { setTargetTable(e.target.value); setMapping({}); setFieldJoins({}); }}>
                                    <option value="">-- Seleccionar Tabla Destino --</option>
                                    {Object.keys(internalSchema).map(t => <option key={t} value={t}>{t}</option>)}
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

                        <div className="mt-4 text-end">
                            <Button variant="secondary" className="me-2" onClick={() => resetWizard(true)}>Cancelar</Button>
                            <Button variant="primary" disabled={
                                (importMode === 'simple' && (!sourceTable || !targetTable)) || 
                                (importMode === 'avanzado' && (!customQuery || !targetTable || queryCols.length === 0)) || 
                                (importMode === 'relacional' && (!relSourceMaestro || !relSourceDetalle))} 
                                onClick={() => setStep(3)}>Siguiente</Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate__animated animate__fadeIn">
                    {(importMode === 'simple' || importMode === 'avanzado') && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <Alert variant="warning" className="mb-0 flex-grow-1 me-3 py-2">
                                    <small>Asocie las columnas, extraiga de otras tablas <i className="bi bi-link"></i> o escriba un <strong>valor fijo</strong>.</small>
                                </Alert>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-success" size="sm" onClick={handleAutoMap} title="Mapear automáticamente columnas con nombres idénticos">
                                        <i className="bi bi-magic me-1"></i> Auto Mapear
                                    </Button>
                                    
                                    <Button variant="outline-info" size="sm" onClick={importMode === 'avanzado' ? handlePreviewQuery : () => handlePreview(sourceTable)}>
                                        <i className="bi bi-table me-2"></i>Ver Datos Origen
                                    </Button>
                                    {importMode === 'avanzado' && jsonColumn && (
                                        <Button variant="outline-warning" size="sm" onClick={handleJsonPreview}>
                                            <i className="bi bi-braces me-1"></i>Ver Estructura JSON
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="bg-light p-3 rounded border" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                {internalSchema[targetTable]?.map(internalCol => 
                                    renderMappingRow(
                                        internalCol, 
                                        false, 
                                        importMode === 'avanzado' ? queryCols : externalSchema[sourceTable], 
                                        mapping, 
                                        setMapping
                                    )
                                )}
                            </div>
                            <div className="mt-4 d-flex justify-content-between">
                                <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                <Button variant="success" size="lg" onClick={() => executeUniversalImport(importMode)}>
                                    <i className="bi bi-check-circle me-2"></i> Importar Datos
                                </Button>
                            </div>
                        </>
                    )}

                    {importMode === 'relacional' && (
                        <>
                            <h6 className="fw-bold text-success border-bottom pb-2">1. Maestro (Cabecera)</h6>
                            <div className="bg-light p-3 rounded border mb-4">
                                {['id_column', 'numero_factura', 'prefijo', 'separador', 'date_created', 'nombre_cliente', 'documento_cliente', 'subtotal', 'descuento', 'iva', 'total_factura'].map(reqCol => renderMappingRow(reqCol, ['id_column', 'total_factura'].includes(reqCol), externalSchema[relSourceMaestro], relMapMaestro, setRelMapMaestro))}
                            </div>

                            <h6 className="fw-bold text-danger border-bottom pb-2">2. Ítems (Detalle)</h6>
                            <div className="bg-light p-3 rounded border mb-4">
                                {['foreign_key_column', 'nombre_producto', 'precio_producto', 'cantidad_producto', 'total'].map(reqCol => renderMappingRow(reqCol, true, externalSchema[relSourceDetalle], relMapDetalle, setRelMapDetalle, true))}
                            </div>
                            <div className="mt-4 d-flex justify-content-between">
                                <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                <Button variant="success" size="lg" onClick={handleRelationalImport}>Importar y Ensamblar</Button>
                            </div>
                        </>
                    )}
                </div>
            )}

        <ModalPreviewTabla show={showPreview} onHide={() => setShowPreview(false)} tableName={importMode === 'avanzado' ? 'Consulta SQL' : (sourceTable || relSourceMaestro || relSourceDetalle || 'Consulta')} isLoading={isLoadingPreview} columns={previewCols} data={previewData} totalRows={previewTotalRows} />
        <ModalPreviewJson show={showJsonPreview} onHide={() => setShowJsonPreview(false)} columnName={jsonColumn} isLoading={isLoadingPreview} jsonData={jsonPreviewData} />
            
        <ModalConfigurarJoin 
            show={joinModalConfig.show} 
            onHide={() => setJoinModalConfig({ ...joinModalConfig, show: false })}
            targetField={joinModalConfig.targetField}
            sourceColumns={joinModalConfig.sourceColumns}
            externalSchema={externalSchema}
            internalSchema={internalSchema}
            existingJoin={fieldJoins[joinModalConfig.targetField]}
            onSave={(field, config) => {
                const newJoins = { ...fieldJoins };
                if (config) newJoins[field] = config;
                else delete newJoins[field];
                setFieldJoins(newJoins);
            }}
        />

        <Modal show={showConsole} backdrop="static" keyboard={false} size="lg">
            <Modal.Header className="bg-light border-bottom border-secondary">
                <Modal.Title className="fs-5">
                    <Spinner className="me-2" variant="primary" animation="border" role="status" size="sm"></Spinner> 
                    Migración de datos
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-dark text-success font-monospace p-3" style={{ height: '350px', overflowY: 'auto', fontSize: '0.85rem' }}>
                {consoleLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                        <span className="text-secondary">{log.time}</span> <span className="text-light">{">"}</span> {log.text}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </Modal.Body>
            <Modal.Footer className="border-top border-secondary p-2">
                <span className="text-muted small w-100 text-center">Por favor, no cierre la aplicación mientras se ejecuta este proceso.</span>
            </Modal.Footer>
        </Modal>

    </>
}