import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

export const ModalSeleccionItemNota = ({
    show,
    handleClose,
    productosDisponibles,
    itemForm,
    setItemForm,
    handleConfirmAddItem
}) => {
    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>Agregar Producto a Nota</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Producto Facturado</Form.Label>
                        <Form.Select 
                            value={itemForm.id_producto} 
                            onChange={(e) => setItemForm({...itemForm, id_producto: e.target.value})}
                        >
                            {productosDisponibles.map((prod, idx) => (
                                <option key={idx} value={prod.id_producto}>
                                    {prod.sku_prefix ? `${prod.sku_prefix}${prod.separador || ''}` : ''}{prod.sku || ''} - {prod.nombre_producto} (Vendidos: {prod.cantidad_producto})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Cantidad a devolver/ajustar</Form.Label>
                        <Form.Control 
                            type="number" 
                            min="0.1" 
                            step="0.1"
                            value={itemForm.cantidad} 
                            onChange={(e) => setItemForm({...itemForm, cantidad: e.target.value})}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" onClick={handleConfirmAddItem}>Agregar a la Nota</Button>
            </Modal.Footer>
        </Modal>
    )
}