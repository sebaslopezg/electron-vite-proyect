import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

export const ModalAjusteStock = ({ 
    show, 
    handleClose, 
    modalInfo, 
    form, 
    setForm, 
    selectedProduct, 
    handleSave 
}) => {
    return <>
        <Modal show={show} onHide={handleClose} size="sm" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-6 fw-bold">{modalInfo.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="cantidad" className="fw-bold small">{modalInfo.description}</Form.Label>
                        <Form.Control 
                            id="cantidad" 
                            value={form.cantidad} 
                            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                            type="number" 
                            step="0.01" 
                            min="0.01" 
                            placeholder="Cantidad" 
                            required 
                            autoFocus
                        />
                        {selectedProduct && (
                            <Form.Text className="text-muted">
                                Stock actual: <strong>{selectedProduct.stock}</strong> {selectedProduct.unidad_medida || ''}
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label htmlFor="notas" className="fw-bold small">Motivo / Descripción <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            id="notas" 
                            as="textarea"
                            rows={2}
                            value={form.notes || ''} 
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Ej. Ingreso nueva mercancía, producto dañado..." 
                            required 
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="bg-light p-2">
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancelar</Button>
                <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={!form.cantidad || !form.notes || form.notes.trim() === ''}
                >
                    Guardar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}