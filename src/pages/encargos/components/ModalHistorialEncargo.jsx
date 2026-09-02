import { Button, Modal } from "react-bootstrap"

export const ModalHistorialEncargo = ({ show, handleClose, historial = [], encargoData }) => {
    const getTextColor = (hexColor) => {
        if (!hexColor) return '#ffffff';
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    return (
        <>
            {/* Forzamos el z-index superior para que el cover tape la modal anterior */}
            {show && (
                <style>
                    {`
                        .modal-historial-front { z-index: 1060 !important; }
                        .backdrop-historial-front { z-index: 1055 !important; }
                    `}
                </style>
            )}

            <Modal 
                show={show} 
                onHide={handleClose} 
                size="md" 
                centered 
                className="shadow-lg modal-historial-front"
                backdropClassName="backdrop-historial-front"
            >
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5">
                        <i className="bi bi-clock-history me-2 text-primary"></i>Historial de Estados
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {encargoData && (
                        <div className="mb-4 text-center">
                            <h6 className="fw-bold mb-1">Encargo #{encargoData.encargo_numero}</h6>
                            <small className="text-muted">{encargoData.producto_nombre || 'Encargo General'}</small>
                        </div>
                    )}

                    {historial.length === 0 ? (
                        <div className="text-center text-muted p-4 bg-light rounded border border-dashed">
                            <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                            <p className="mb-0 small">No hay historial de cambios registrado para este encargo.</p>
                        </div>
                    ) : (
                        <div className="timeline-container px-2">
                            {historial.map((h, idx) => (
                                <div key={h.id} className="d-flex mb-4 position-relative">
                                    {/* Línea vertical conectora */}
                                    {idx !== historial.length - 1 && (
                                        <div className="position-absolute bg-secondary opacity-25" style={{ left: '20px', top: '40px', bottom: '-20px', width: '2px' }}></div>
                                    )}
                                    
                                    {/* Icono del estado nuevo */}
                                    <div 
                                        className="d-flex align-items-center justify-content-center rounded-circle text-white shadow-sm flex-shrink-0"
                                        style={{ width: '42px', height: '42px', zIndex: 2, backgroundColor: h.estado_nuevo_color || '#0d6efd', color: getTextColor(h.estado_nuevo_color) }}
                                    >
                                        <i className={`bi ${h.estado_nuevo_icon || 'bi-check-lg'} fs-5`}></i>
                                    </div>

                                    {/* Contenido */}
                                    <div className="ms-3 flex-grow-1 bg-light p-3 rounded border shadow-sm">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="mb-0 fw-bold" style={{ color: h.estado_nuevo_color || '#333' }}>
                                                {h.estado_nuevo_titulo || 'Estado modificado'}
                                            </h6>
                                        </div>
                                        
                                        <div className="small text-secondary mt-1">
                                            <i className="bi bi-calendar-event me-1"></i> {new Date(h.fecha).toLocaleString('es-CO')}
                                        </div>
                                        <div className="small text-secondary mt-1">
                                            <i className="bi bi-person-circle me-1"></i> Usuario: <strong>{h.usuario}</strong>
                                        </div>
                                        
                                        {h.estado_anterior_titulo && (
                                            <div className="small text-muted mt-2 pt-2 border-top border-secondary border-opacity-25">
                                                Estado anterior: <span className="fst-italic">{h.estado_anterior_titulo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="bg-light border-0">
                    <Button variant="secondary" onClick={handleClose}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}