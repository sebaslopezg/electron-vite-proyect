import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export const BaseImpresor = ({ 
    show, 
    onClose, 
    textoVolver = 'Cerrar', 
    titulo = 'Vista Previa', 
    renderPos, 
    renderA4 
}) => {
    const [tipoImpresion, setTipoImpresion] = useState('pos');

    const confirmarImpresion = () => {
        window.print();
    };

    if (!show) return null;

    return (
        <>
            <style>
                {`
                    .formato-pos { font-family: 'Courier New', Courier, monospace; font-size: 13px; color: black; }
                    .formato-pos table { width: 100%; }
                    .formato-pos th, .formato-pos td { border-bottom: 1px dashed #000; padding: 3px 0; }
                    .border-dashed { border-style: dashed !important; }
                    .formato-a4 { font-family: sans-serif; font-size: 14px; color: black; }

                    @media print {
                        body * { visibility: hidden; }
                        .modal, .modal-backdrop, .sidebar, .header { display: none !important; }
                        #zona-impresion, #zona-impresion * { visibility: visible; }
                        #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                        .formato-pos { width: 72mm; margin: 0 auto; }
                        .formato-a4 { width: 100%; margin: 0; }
                    }
                `}
            </style>

            <Modal show={show} onHide={onClose} size="lg" centered>
                <Modal.Header closeButton className="bg-light align-items-center">
                    <Modal.Title className="me-auto fs-5">
                        <i className="bi bi-printer text-muted me-2"></i>{titulo}
                    </Modal.Title>
                    <div className="me-4"> 
                        <div className="btn-group" role="group">
                            <input type="radio" className="btn-check" name={`tipoImpresion-${titulo}`} id={`posRadio-${titulo}`} 
                                checked={tipoImpresion === 'pos'} onChange={() => setTipoImpresion('pos')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor={`posRadio-${titulo}`}>
                                <i className="bi bi-receipt me-1"></i> Tirilla POS
                            </label>
                            <input type="radio" className="btn-check" name={`tipoImpresion-${titulo}`} id={`a4Radio-${titulo}`} 
                                checked={tipoImpresion === 'a4'} onChange={() => setTipoImpresion('a4')} />
                            <label className="btn btn-outline-primary btn-sm" htmlFor={`a4Radio-${titulo}`}>
                                <i className="bi bi-file-text me-1"></i> Tamaño A4
                            </label>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="bg-secondary d-flex justify-content-center align-items-start py-4" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                    <div className="bg-white shadow p-4" style={{ 
                        width: tipoImpresion === 'pos' ? '80mm' : '100%', 
                        minHeight: tipoImpresion === 'a4' ? '297mm' : 'auto',
                        height: 'max-content',
                        transition: 'width 0.3s ease-in-out'
                    }}>
                        {tipoImpresion === 'pos' ? renderPos() : renderA4()}
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="outline-secondary" onClick={onClose}>{textoVolver}</Button>
                    <Button variant="success" size="lg" onClick={confirmarImpresion}>
                        <i className="bi bi-printer-fill me-2"></i> Imprimir Ahora
                    </Button>
                </Modal.Footer>
            </Modal>

            <div id="zona-impresion" className="d-none d-print-block">
                {tipoImpresion === 'pos' ? renderPos() : renderA4()}
            </div>
        </>
    );
};