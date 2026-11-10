import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Row, Col, InputGroup } from 'react-bootstrap'

export const ModalExportSingleFactura = ({ show, handleClose, onExport, factura, defaultFilename }) => {
    const [fileName, setFileName] = useState(defaultFilename || 'Factura')
    const [pdfFormat, setPdfFormat] = useState('a4')

    useEffect(() => {
        if (show) {
            setFileName(defaultFilename || 'Factura')
            setPdfFormat('a4')
        }
    }, [show, defaultFilename])

    const handleExport = (exportType) => {
        onExport(exportType, pdfFormat, fileName.trim())
        handleClose()
    }

    if (!factura) return null;

    return (
        <Modal show={show} onHide={handleClose} centered size="md">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-file-earmark-arrow-down me-2 text-primary"></i>
                    Exportar Factura Individual
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                
                <div className="mb-4 bg-white p-3 border rounded shadow-sm">
                    <Form.Group>
                        <Form.Label className="fw-bold text-secondary mb-1">
                            Nombre del archivo
                        </Form.Label>
                        <InputGroup>
                            <Form.Control 
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="Escribe el nombre del archivo..."
                            />
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Exportando Factura N° {factura.prefijo || ''}{factura.separador || ''}{factura.numero_factura}
                        </Form.Text>
                    </Form.Group>
                </div>

                <div className="bg-white p-3 border rounded shadow-sm mb-3">
                     <h6 className="fw-bold mb-3 text-secondary">Formato de Documento PDF</h6>
                     <Form>
                        <Row>
                            <Col xs={6}>
                                <div 
                                    className={`border rounded p-3 text-center ${pdfFormat === 'a4' ? 'border-primary bg-light' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setPdfFormat('a4')}
                                >
                                    <Form.Check 
                                        type="radio"
                                        id="format-a4"
                                        name="pdf-format"
                                        label="Formato A4"
                                        className="fw-medium mb-2 d-flex justify-content-center"
                                        checked={pdfFormat === 'a4'}
                                        onChange={() => setPdfFormat('a4')}
                                    />
                                    <i className="bi bi-file-earmark-text text-secondary" style={{ fontSize: '2rem' }}></i>
                                </div>
                            </Col>
                            <Col xs={6}>
                                <div 
                                    className={`border rounded p-3 text-center ${pdfFormat === 'pos' ? 'border-primary bg-light' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setPdfFormat('pos')}
                                >
                                    <Form.Check 
                                        type="radio"
                                        id="format-pos"
                                        name="pdf-format"
                                        label="Formato Tirilla"
                                        className="fw-medium mb-2 d-flex justify-content-center"
                                        checked={pdfFormat === 'pos'}
                                        onChange={() => setPdfFormat('pos')}
                                    />
                                    <i className="bi bi-receipt text-secondary" style={{ fontSize: '2rem' }}></i>
                                </div>
                            </Col>
                        </Row>
                     </Form>
                </div>

            </Modal.Body>
            <Modal.Footer className="bg-light border-0 justify-content-between">
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <div>
                     <Button variant="success" className="me-2" onClick={() => handleExport('excel')}>
                        <i className="bi bi-file-earmark-excel me-2"></i>Excel
                    </Button>
                    {/* CORRECCIÓN DE TEXTO EN EL BOTÓN */}
                    <Button variant="danger" onClick={() => handleExport('pdf')}>
                        <i className="bi bi-file-earmark-pdf me-2"></i>PDF
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}