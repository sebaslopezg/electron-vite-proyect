import Modal from 'react-bootstrap/Modal'
import { Button, Form, ListGroup } from 'react-bootstrap'

export const ModalMetodosPago = ({
    show,
    handleClose,
    metodosList,
    nuevoMetodo,
    setNuevoMetodo,
    handleAddMetodo,
    handleDeleteMetodo
}) => {
    return <>
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5"><i className="bi bi-credit-card me-2"></i>Métodos de Pago</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleAddMetodo} className="mb-4">
                    <Form.Group>
                        <Form.Label className="fw-bold small">Añadir Nuevo Método</Form.Label>
                        <div className="d-flex gap-2">
                            <Form.Control 
                                type="text" 
                                value={nuevoMetodo} 
                                onChange={(e) => setNuevoMetodo(e.target.value)} 
                                placeholder="Ej. Nequi, Daviplata..." 
                                required 
                            />
                            <Button variant="primary" type="submit">Agregar</Button>
                        </div>
                    </Form.Group>
                </Form>

                <h6 className="fw-bold border-bottom pb-2">Métodos Actuales</h6>
                <ListGroup variant="flush">
                    {metodosList.length === 0 ? <p className="text-muted small">No hay métodos registrados.</p> : null}
                    {metodosList.map(metodo => (
                        <ListGroup.Item key={metodo.id} className="d-flex justify-content-between align-items-center px-0">
                            {metodo.nombre}
                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteMetodo(metodo.id)}>
                                <i className="bi bi-trash"></i>
                            </Button>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </Modal.Body>
        </Modal>
    </>
}