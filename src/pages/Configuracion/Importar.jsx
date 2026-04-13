import { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Card, Alert } from 'react-bootstrap';
import Swal from 'sweetalert2';

export const Importar = () => {
    const [step, setStep] = useState(1);
    
    // Archivo y Esquemas
    const [filePath, setFilePath] = useState(null);
    const [externalSchema, setExternalSchema] = useState({});
    const [internalSchema, setInternalSchema] = useState({});
    
    // Selecciones del usuario
    const [sourceTable, setSourceTable] = useState('');
    const [targetTable, setTargetTable] = useState('');
    const [mapping, setMapping] = useState({}); // { internalCol: externalCol }

    // Cargar el esquema interno al iniciar
    useEffect(() => {
        const loadInternal = async () => {
            const res = await window.api.getInternalSchema();
            if (res.success) setInternalSchema(res.schema);
        };
        loadInternal();
    }, []);

    // PASO 1: Leer el archivo
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const path = file.path; 
        setFilePath(path);

        // Mostrar un loading porque procesar un .sql puede tardar
        Swal.fire({ 
            title: 'Analizando archivo...', 
            text: 'Si es un archivo .sql muy pesado, esto podría tardar unos segundos.',
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        const res = await window.api.readExternalDb(path);
        
        Swal.close();

        if (res.success) {
            // Si el backend convirtió el .sql a un .db temporal, actualizamos la ruta en la memoria de React
            if (res.newPath) setFilePath(res.newPath);
            
            setExternalSchema(res.schema);
            setStep(2);
        } else {
            Swal.fire('Error', res.error, 'error');
            e.target.value = null; // Resetear input
        }
    };

    // Actualizar mapeo al cambiar un select
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

    // PASO FINAL: Ejecutar Importación
    const handleImport = async () => {
        if (Object.keys(mapping).length === 0) {
            return Swal.fire('Atención', 'Debe mapear al menos un campo para importar.', 'warning');
        }

        const confirm = await Swal.fire({
            title: '¿Iniciar Importación?',
            text: `Se importarán los datos a la tabla "${targetTable}". Esta acción no se puede deshacer fácilmente.`,
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
                mapping
            });

            if (res.success) {
                Swal.fire('¡Éxito!', `Se han importado ${res.rows} registros correctamente.`, 'success');
                // Resetear al paso 1
                setStep(1);
                setFilePath(null);
                setSourceTable('');
                setTargetTable('');
                setMapping({});
            } else {
                Swal.fire('Error en la importación', res.error, 'error');
            }
        }
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
                        <input type="file" accept=".db,.sqlite,.sqlite3,.sql" className="form-control w-50 mx-auto mt-3" onChange={handleFileSelect} />
                        <small className="text-muted d-block mt-2">Formatos soportados: Bases de datos SQLite (.db) o volcados de MySQL (.sql).</small>
                    </div>
                )}

                {/* PASO 2: Elegir Tablas */}
                {step === 2 && (
                    <div className="animate__animated animate__fadeIn">
                        <Alert variant="info"><i className="bi bi-info-circle me-2"></i>Archivo cargado. Seleccione las tablas a conectar.</Alert>
                        <Row>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-danger">Origen (Archivo Subido)</Form.Label>
                                    <Form.Select value={sourceTable} onChange={(e) => { setSourceTable(e.target.value); setMapping({}); }}>
                                        <option value="">-- Seleccionar Tabla de Origen --</option>
                                        {Object.keys(externalSchema).map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
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
                        <Alert variant="warning">
                            <strong>Instrucciones:</strong> Para cada campo de la tabla destino (Derecha), seleccione qué columna del archivo subido (Izquierda) le corresponde. Los campos vacíos se ignorarán o se llenarán con valores por defecto (ej: Fechas y IDs).
                        </Alert>
                        
                        <div className="bg-light p-3 rounded border" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <Row className="mb-2 border-bottom pb-2 fw-bold text-muted">
                                <Col md={5}>Campo Origen ({sourceTable})</Col>
                                <Col md={2} className="text-center"><i className="bi bi-arrow-right"></i></Col>
                                <Col md={5}>Campo Destino ({targetTable})</Col>
                            </Row>
                            
                            {/* Iteramos sobre los campos de la tabla destino de NUESTRO sistema */}
                            {internalSchema[targetTable]?.map(internalCol => (
                                <Row key={internalCol} className="mb-3 align-items-center">
                                    <Col md={5}>
                                        <Form.Select 
                                            size="sm" 
                                            value={mapping[internalCol] || ''} 
                                            onChange={(e) => handleMapChange(internalCol, e.target.value)}
                                        >
                                            <option value="">-- Ignorar este campo --</option>
                                            {externalSchema[sourceTable]?.map(extCol => (
                                                <option key={extCol} value={extCol}>{extCol}</option>
                                            ))}
                                        </Form.Select>
                                    </Col>
                                    <Col md={2} className="text-center text-primary"><i className="bi bi-link"></i></Col>
                                    <Col md={5}>
                                        <div className="p-2 bg-white border rounded small">
                                            {internalCol}
                                            {['id', 'date_created'].includes(internalCol) && <span className="ms-2 badge bg-secondary" style={{fontSize: '10px'}}>Autogenerado</span>}
                                        </div>
                                    </Col>
                                </Row>
                            ))}
                        </div>

                        <div className="mt-4 d-flex justify-content-between">
                            <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                            <Button variant="success" size="lg" onClick={handleImport}><i className="bi bi-check-circle me-2"></i>Iniciar Importación</Button>
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}