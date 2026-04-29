import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, ButtonGroup, ToggleButton } from 'react-bootstrap';

export const ModalConfigurarJoin = ({ show, onHide, targetField, sourceColumns, externalSchema, internalSchema, existingJoin, onSave }) => {
    const [form, setForm] = useState({ fkCol: '', extTable: '', pkCol: '', extCol: '', isInternal: false });

    useEffect(() => {
        if (show) setForm(existingJoin || { fkCol: '', extTable: '', pkCol: '', extCol: '', isInternal: false });
    }, [show, existingJoin]);

    const handleSave = () => {
        onSave(targetField, form);
        onHide();
    };

    const handleClear = () => {
        onSave(targetField, null);
        onHide();
    };

    const activeSchema = form.isInternal ? internalSchema : externalSchema;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton className={form.isInternal ? "bg-success text-white" : "bg-light"}>
                <Modal.Title className="fs-5">
                    <i className={`bi bi-diagram-3 me-2 ${form.isInternal ? 'text-white' : 'text-success'}`}></i>
                    Cruce Dinámico (Join)
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted small mb-3">
                    Buscaremos un valor de la tabla origen y lo cruzaremos para extraer el campo: <strong className="text-primary">{targetField}</strong>.
                </p>

                <div className="d-flex justify-content-center mb-4">
                    <ButtonGroup>
                        <ToggleButton
                            id="toggle-external" type="radio" variant="outline-primary" name="radio"
                            checked={!form.isInternal} onChange={() => setForm({...form, isInternal: false, extTable: '', pkCol: '', extCol: ''})}
                        >
                            <i className="bi bi-file-earmark-arrow-up me-2"></i>Buscar en Archivo Subido
                        </ToggleButton>
                        <ToggleButton
                            id="toggle-internal" type="radio" variant="outline-success" name="radio"
                            checked={form.isInternal} onChange={() => setForm({...form, isInternal: true, extTable: '', pkCol: '', extCol: ''})}
                        >
                            <i className="bi bi-database-fill me-2"></i>Buscar en Sistema Caedro (Interno)
                        </ToggleButton>
                    </ButtonGroup>
                </div>
                
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">1. Llave en la tabla origen</Form.Label>
                            {sourceColumns && sourceColumns.length > 0 ? (
                                <Form.Select size="sm" value={form.fkCol} onChange={e => setForm({...form, fkCol: e.target.value})}>
                                    <option value="">Columna a buscar...</option>
                                    {sourceColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            ) : (
                                <Form.Control size="sm" type="text" placeholder="Ej. client_id" value={form.fkCol} onChange={e => setForm({...form, fkCol: e.target.value})} />
                            )}
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">2. Tabla de Destino ({form.isInternal ? 'Caedro' : 'Archivo'})</Form.Label>
                            <Form.Select size="sm" value={form.extTable} onChange={e => setForm({...form, extTable: e.target.value, pkCol: '', extCol: ''})}>
                                <option value="">Selecciona tabla...</option>
                                {Object.keys(activeSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                {form.extTable && (
                    <Row className="p-3 bg-light border rounded mt-2">
                        <Col md={6}>
                            <Form.Group className="mb-3 mb-md-0">
                                <Form.Label className="fw-bold small text-danger">3. Columna que debe coincidir</Form.Label>
                                <Form.Select size="sm" value={form.pkCol} onChange={e => setForm({...form, pkCol: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {activeSchema[form.extTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold small text-success">4. Columna que queremos extraer</Form.Label>
                                <Form.Select size="sm" value={form.extCol} onChange={e => setForm({...form, extCol: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {activeSchema[form.extTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                )}
            </Modal.Body>
            <Modal.Footer>
                {existingJoin && <Button variant="outline-danger" className="me-auto" onClick={handleClear}><i className="bi bi-trash"></i> Quitar Cruce</Button>}
                <Button variant="secondary" onClick={onHide}>Cancelar</Button>
                <Button variant="success" onClick={handleSave} disabled={!form.fkCol || !form.extTable || !form.pkCol || !form.extCol}>Guardar Cruce</Button>
            </Modal.Footer>
        </Modal>
    );
};