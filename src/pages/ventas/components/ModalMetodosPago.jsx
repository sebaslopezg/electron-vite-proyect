import { useState, useRef, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Form, ListGroup } from 'react-bootstrap'
import { ventasService } from '../../../services/ventasService'
import Swal from 'sweetalert2'

export const ModalMetodosPago = ({
    show,
    handleClose,
    metodosList,
    nuevoMetodo,
    setNuevoMetodo,
    handleAddMetodo,
    handleDeleteMetodo
}) => {
    const [localMetodos, setLocalMetodos] = useState([])
    const dragItem = useRef(null)
    const dragOverItem = useRef(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)

    useEffect(() => {
        setLocalMetodos([...metodosList])
    }, [metodosList])

    const handleSort = () => {
        let _metodos = [...localMetodos]
        const draggedItemContent = _metodos.splice(dragItem.current, 1)[0]
        _metodos.splice(dragOverItem.current, 0, draggedItemContent)

        dragItem.current = null
        dragOverItem.current = null

        setLocalMetodos(_metodos)
        guardarOrdenEnDB(_metodos)
    }

    const guardarOrdenEnDB = async (nuevaLista) => {
        setIsSavingOrder(true)
        const payload = nuevaLista.map((item, index) => ({
            id: item.id,
            orden: index + 1
        }))
        
        const res = await ventasService.reorderMetodosPago(payload)
        setIsSavingOrder(false)
        
        if (res.success) {
            window.dispatchEvent(new CustomEvent('metodos-pago-actualizados'))
        } else {
            Swal.fire('Error', res.error || 'No se pudo actualizar el orden', 'error')
        }
    }

    return <>
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-credit-card me-2"></i>Métodos de Pago
                </Modal.Title>
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

                <div className="d-flex justify-content-between align-items-end border-bottom pb-2 mb-2">
                    <h6 className="fw-bold mb-0">Métodos Actuales</h6>
                    {isSavingOrder && <span className="badge bg-warning text-dark"><i className="bi bi-arrow-repeat spin me-1"></i>Guardando orden...</span>}
                </div>
                <p className="text-muted small mb-2"><i className="bi bi-info-circle me-1"></i>Arrastra los elementos para cambiar el orden en que aparecen en el sistema.</p>
                
                <ListGroup variant="flush">
                    {localMetodos.length === 0 ? <p className="text-muted small text-center mt-3">No hay métodos registrados.</p> : null}
                    {localMetodos.map((metodo, index) => (
                        <ListGroup.Item 
                            key={metodo.id} 
                            className="d-flex justify-content-between align-items-center px-2 border rounded mb-2 shadow-sm"
                            draggable
                            onDragStart={() => (dragItem.current = index)}
                            onDragEnter={() => (dragOverItem.current = index)}
                            onDragEnd={handleSort}
                            onDragOver={(e) => e.preventDefault()}
                            style={{ cursor: 'grab', backgroundColor: '#f8f9fa' }}
                        >
                            <div>
                                <i className="bi bi-grip-vertical text-muted me-2" style={{ cursor: 'grab' }}></i>
                                <span className="fw-medium">{metodo.nombre}</span>
                            </div>
                            <Button variant="outline-danger" size="sm" className="border-0" onClick={() => handleDeleteMetodo(metodo.id)} title="Eliminar método">
                                <i className="bi bi-trash"></i>
                            </Button>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </Modal.Body>
        </Modal>
    </>
}