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
    return (
        <Modal show={show} onHide={handleClose} size="sm" centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-6">{modalInfo.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="cantidad">{modalInfo.description}</Form.Label>
                        <Form.Control 
                            id="cantidad" 
                            value={form.cantidad} 
                            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                            type="number" 
                            step="0.01" 
                            min="0" 
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
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
            </Modal.Footer>
        </Modal>
    )
}