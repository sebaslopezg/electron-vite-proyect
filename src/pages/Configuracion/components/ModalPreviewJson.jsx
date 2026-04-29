import { Modal, Button } from 'react-bootstrap';

export const ModalPreviewJson = ({ 
    show, 
    onHide, 
    columnName, 
    isLoading, 
    jsonData 
}) => {
    return (
        <Modal show={show} onHide={onHide} size="lg" scrollable centered>
            <Modal.Header closeButton className="bg-dark text-white border-secondary">
                <Modal.Title className="fs-5">
                    <i className="bi bi-braces me-2 text-warning"></i>Estructura del JSON ({columnName})
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0 bg-dark text-light">
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-warning" role="status"></div>
                        <p className="mt-2 text-muted">Buscando y extrayendo...</p>
                    </div>
                ) : (
                    <pre className="p-3 m-0" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {jsonData}
                    </pre>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-dark border-secondary">
                <Button variant="outline-light" onClick={onHide}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    );
};