import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

export const ModalConfigurarJoin = ({ show, onHide, targetField, sourceColumns, externalSchema, existingJoin, onSave }) => {
    const [form, setForm] = useState({ fkCol: '', extTable: '', pkCol: '', extCol: '' });

    useEffect(() => {
        if (show) setForm(existingJoin || { fkCol: '', extTable: '', pkCol: '', extCol: '' });
    }, [show, existingJoin]);

    const handleSave = () => {
        onSave(targetField, form);
        onHide();
    };

    const handleClear = () => {
        onSave(targetField, null);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5"><i className="bi bi-diagram-3 me-2 text-success"></i>Cruce Dinámico (Join)</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted small mb-4">
                    Buscaremos un ID en una tabla externa y extraeremos su valor para el campo destino: <strong className="text-primary">{targetField}</strong>.
                </p>
                
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">1. ¿Qué dato usamos para buscar? (Llave en la fila actual)</Form.Label>
                    {sourceColumns && sourceColumns.length > 0 ? (
                        <Form.Select size="sm" value={form.fkCol} onChange={e => setForm({...form, fkCol: e.target.value})}>
                            <option value="">Selecciona columna de origen...</option>
                            {sourceColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </Form.Select>
                    ) : (
                        <Form.Control size="sm" type="text" placeholder="Escribe la llave (Ej. client_id, product_reference)" value={form.fkCol} onChange={e => setForm({...form, fkCol: e.target.value})} />
                    )}
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">2. ¿En qué tabla externa lo buscamos?</Form.Label>
                    <Form.Select size="sm" value={form.extTable} onChange={e => setForm({...form, extTable: e.target.value, pkCol: '', extCol: ''})}>
                        <option value="">Selecciona tabla...</option>
                        {Object.keys(externalSchema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                    </Form.Select>
                </Form.Group>

                {form.extTable && (
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">3. Columna ID (En la tabla ext.)</Form.Label>
                                <Form.Select size="sm" value={form.pkCol} onChange={e => setForm({...form, pkCol: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {externalSchema[form.extTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">4. Columna a Extraer</Form.Label>
                                <Form.Select size="sm" value={form.extCol} onChange={e => setForm({...form, extCol: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {externalSchema[form.extTable]?.map(c => <option key={c} value={c}>{c}</option>)}
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