import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const CONFIG_KEY = 'global_printer_config';

const defaultConfig = { 
    fontSize: 13, 
    paperWidth: 72, 
    margin: 0, 
    fontFamily: "'Courier New', Courier, monospace" 
};

const getDefaultConfig = () => {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            return { ...defaultConfig, ...JSON.parse(saved) };
        }
        return defaultConfig;
    } catch {
        return defaultConfig;
    }
};

export const BaseImpresor = ({ 
    show, 
    onClose, 
    textoVolver = 'Cerrar', 
    titulo = 'Vista Previa', 
    renderPos, 
    renderA4 
}) => {
    const [tipoImpresion, setTipoImpresion] = useState('pos');
    
    // Estados de Configuración
    const [showConfig, setShowConfig] = useState(false);
    const [configData, setConfigData] = useState(getDefaultConfig());
    const [tempConfig, setTempConfig] = useState(configData);

    useEffect(() => {
        if (showConfig) {
            setTempConfig(configData);
        }
    }, [showConfig, configData]);

    const confirmarImpresion = () => {
        window.print();
    };

    const handleSaveConfig = () => {
        setConfigData(tempConfig);
        localStorage.setItem(CONFIG_KEY, JSON.stringify(tempConfig));
        setShowConfig(false);
    };

    if (!show) return null;

    return (
        <>
            <style>
                {`
                    /* Corrección de z-index para modales anidadas */
                    .custom-backdrop-zindex { z-index: 1055 !important; }
                    .custom-modal-zindex { z-index: 1060 !important; }

                    .formato-pos { 
                        font-family: ${configData.fontFamily}; 
                        font-size: ${configData.fontSize}px; 
                        color: black; 
                        padding: ${configData.margin}mm;
                    }
                    .formato-pos table { width: 100%; }
                    .formato-pos th, .formato-pos td { border-bottom: 1px dashed #000; padding: 3px 0; }
                    .border-dashed { border-style: dashed !important; }
                    .formato-a4 { font-family: sans-serif; font-size: 14px; color: black; }

                    @media print {
                        body * { visibility: hidden; }
                        .modal, .modal-backdrop, .sidebar, .header { display: none !important; }
                        #zona-impresion, #zona-impresion * { visibility: visible; }
                        #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                        .formato-pos { width: ${configData.paperWidth}mm; margin: 0 auto; }
                        .formato-a4 { width: 100%; margin: 0; }
                    }
                `}
            </style>

            {/* MODAL PRINCIPAL DE IMPRESIÓN */}
            <Modal show={show} onHide={onClose} size="lg" centered>
                <Modal.Header closeButton className="bg-light align-items-center">
                    <Modal.Title className="me-auto fs-5">
                        <i className="bi bi-printer text-muted me-2"></i>{titulo}
                    </Modal.Title>
                    <div className="me-4 d-flex align-items-center gap-2"> 
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
                        <Button variant="outline-secondary" size="sm" onClick={() => setShowConfig(true)} title="Configurar Impresora POS">
                            <i className="bi bi-gear-fill"></i>
                        </Button>
                    </div>
                </Modal.Header>
                <Modal.Body className="bg-secondary d-flex justify-content-center align-items-start py-4" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                    <div className="bg-white shadow p-4" style={{ 
                        width: tipoImpresion === 'pos' ? `${configData.paperWidth}mm` : '100%', 
                        minHeight: tipoImpresion === 'a4' ? '297mm' : 'auto',
                        height: 'max-content',
                        transition: 'width 0.3s ease-in-out'
                    }}>
                        {tipoImpresion === 'pos' ? renderPos() : renderA4()}
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={onClose}>{textoVolver}</Button>
                    <Button variant="primary" size="md" onClick={confirmarImpresion}>
                        <i className="bi bi-printer-fill me-2"></i> Imprimir Ahora
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* MODAL DE CONFIGURACIÓN GLOBAL */}
            <Modal 
                show={showConfig} 
                onHide={() => setShowConfig(false)} 
                size="sm" 
                centered 
                className="custom-modal-zindex"
                backdropClassName="custom-backdrop-zindex"
            >
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-6 fw-bold"><i className="bi bi-sliders me-2"></i>Ajustes de Tirilla POS</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold mb-1">Tipo de Letra</Form.Label>
                        <Form.Select 
                            size="sm"
                            value={tempConfig.fontFamily}
                            onChange={(e) => setTempConfig({ ...tempConfig, fontFamily: e.target.value })}
                        >
                            <option value="'Courier New', Courier, monospace">Courier New (Monoespaciada)</option>
                            <option value="'Lucida Console', Monaco, monospace">Lucida Console (Monoespaciada)</option>
                            <option value="Arial, sans-serif">Arial (Sin serifa)</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman (Con serifa)</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold mb-1">Tamaño de Letra (px)</Form.Label>
                        <Form.Control 
                            type="number" 
                            size="sm"
                            value={tempConfig.fontSize}
                            onChange={(e) => setTempConfig({ ...tempConfig, fontSize: Number(e.target.value) })}
                        />
                        <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>Normalmente entre 11 y 15</Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold mb-1">Ancho del Papel (mm)</Form.Label>
                        <Form.Control 
                            type="number" 
                            size="sm"
                            value={tempConfig.paperWidth}
                            onChange={(e) => setTempConfig({ ...tempConfig, paperWidth: Number(e.target.value) })}
                        />
                        <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>Impresoras comunes: 58 o 72</Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label className="small fw-bold mb-1">Márgenes (mm)</Form.Label>
                        <Form.Control 
                            type="number" 
                            size="sm"
                            value={tempConfig.margin}
                            onChange={(e) => setTempConfig({ ...tempConfig, margin: Number(e.target.value) })}
                        />
                        <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>Si el texto se corta a los lados, aumenta esto.</Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="bg-light p-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowConfig(false)}>Cancelar</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveConfig}>Guardar</Button>
                </Modal.Footer>
            </Modal>

            <div id="zona-impresion" className="d-none d-print-block">
                {tipoImpresion === 'pos' ? renderPos() : renderA4()}
            </div>
        </>
    );
};