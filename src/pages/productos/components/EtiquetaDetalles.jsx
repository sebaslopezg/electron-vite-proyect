import { Button, Modal, ListGroup } from "react-bootstrap"

export const EtiquetaDetalles = ({ show, handleClose, etiquetaData, categoriasDisponibles }) => {
    if (!etiquetaData) return null

    let textColor = '#ffffff'
    if (etiquetaData.color) {
        const hex = etiquetaData.color.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        textColor = (yiq >= 128) ? '#000000' : '#ffffff'
    }

    const linkedCatIds = etiquetaData.categorias_ids ? etiquetaData.categorias_ids.split(',') : ['general']
    const categoriasVinculadas = linkedCatIds.map(id => {
        const cat = categoriasDisponibles.find(c => c.id === id)
        return cat || { id, nombre: id === 'general' ? 'General' : 'Categoría Desconocida' }
    })

    return <>
        <Modal show={show} onHide={handleClose} size="md" centered scrollable className="shadow">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="bi bi-tags me-2"></i>Detalles de Etiqueta
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                <div className="text-center mb-4">
                    <span 
                        className="badge border py-2 px-4 fs-5 shadow-sm" 
                        style={{ 
                            backgroundColor: etiquetaData.color, 
                            color: textColor, 
                            borderColor: 'rgba(0,0,0,0.1) !important',
                            borderRadius: '12px'
                        }}
                    >
                        <i className="bi bi-tag-fill me-2"></i>{etiquetaData.nombre}
                    </span>
                </div>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary">Descripción</h6>
                <div className="bg-light p-3 rounded border mb-4">
                    <p className="mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                        {etiquetaData.descripcion || <span className="text-muted fst-italic">Sin descripción detallada.</span>}
                    </p>
                </div>

                <h6 className="text-uppercase small fw-bold mb-3 text-secondary border-bottom pb-2">
                    <i className="bi bi-diagram-3 me-2"></i>Visible en las Categorías
                </h6>
                <ListGroup variant="flush" className="border rounded shadow-sm">
                    {categoriasVinculadas.map((cat, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center py-2">
                            <div>
                                <span className="fw-medium text-dark">{cat.nombre}</span>
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </Modal.Body>

            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}