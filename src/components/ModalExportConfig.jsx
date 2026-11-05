import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Badge, Row, Col, InputGroup } from 'react-bootstrap'

export const ModalExportConfig = ({ show, handleClose, onExport, title, defaultFilename, totalRecords, totalFiltered, availableColumns }) => {
    const [exportType, setExportType] = useState('all') // 'all', 'filtered', 'limit'
    const [customLimit, setCustomLimit] = useState(50)
    const [fileName, setFileName] = useState(defaultFilename || 'Archivo')
    
    // Estado para guardar las claves de las columnas seleccionadas
    const [selectedColumns, setSelectedColumns] = useState([])

    useEffect(() => {
        if (show) {
            setFileName(defaultFilename || 'Archivo_Exportado')
            if (availableColumns) {
                const initialSelection = availableColumns
                    .filter(col => col.defaultChecked !== false)
                    .map(col => col.key)
                setSelectedColumns(initialSelection)
            }
        }
    }, [show, availableColumns, defaultFilename])

    const handleColumnToggle = (columnKey) => {
        setSelectedColumns(prev => {
            if (prev.includes(columnKey)) {
                return prev.filter(key => key !== columnKey)
            } else {
                return [...prev, columnKey]
            }
        })
    }

    const handleSelectAllColumns = (selectAll) => {
        if (selectAll) {
            setSelectedColumns(availableColumns.map(col => col.key))
        } else {
            setSelectedColumns([])
        }
    }

    const handleExport = () => {
        if (availableColumns && selectedColumns.length === 0) {
            alert('Debes seleccionar al menos una columna para exportar.');
            return;
        }

        let limitToExport = null;
        if (exportType === 'limit') {
            limitToExport = customLimit;
        }

        // Export type nos dirá si ignoramos filtros (all) o exportamos la tabla filtrada (filtered/limit)
        onExport(limitToExport, selectedColumns, fileName.trim(), exportType)
        handleClose()
    }

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-file-earmark-arrow-down me-2 text-primary"></i>
                    Configurar Exportación
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                
                {/* INPUT PARA EL NOMBRE DEL ARCHIVO */}
                <div className="mb-4 bg-white p-3 border rounded shadow-sm">
                    <Form.Group>
                        <Form.Label className="fw-bold text-secondary mb-1">
                            <i className="bi bi-fonts me-2"></i>Nombre del archivo
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
                            {title ? `Exportando reporte de: ${title}` : 'Configura los registros y columnas que deseas exportar.'}
                        </Form.Text>
                    </Form.Group>
                </div>

                <Row>
                    {/* Columna Izquierda: Cantidad de Registros */}
                    <Col md={5} className="border-end pe-4">
                        <h6 className="fw-bold mb-3 text-secondary">1. Cantidad de Registros</h6>
                        <Form>
                            <Form.Check 
                                type="radio"
                                id="export-all"
                                name="export-options"
                                label={
                                    <span>
                                        Todos los registros 
                                        {totalRecords !== undefined && (
                                            <Badge bg="secondary" className="ms-2">{totalRecords}</Badge>
                                        )}
                                    </span>
                                }
                                className="mb-3 fw-medium"
                                checked={exportType === 'all'}
                                onChange={() => setExportType('all')}
                            />
                            
                            <Form.Check 
                                type="radio"
                                id="export-filtered"
                                name="export-options"
                                label={
                                    <span>
                                        Todos los filtrados
                                        {totalFiltered !== undefined && (
                                            <Badge bg="info" className="ms-2 text-dark">{totalFiltered}</Badge>
                                        )}
                                    </span>
                                }
                                className="mb-3 fw-medium"
                                checked={exportType === 'filtered'}
                                onChange={() => setExportType('filtered')}
                            />

                            <div className="d-flex align-items-center mb-3">
                                <Form.Check 
                                    type="radio"
                                    id="export-limit"
                                    name="export-options"
                                    label="Los últimos:"
                                    className="fw-medium me-3"
                                    checked={exportType === 'limit'}
                                    onChange={() => setExportType('limit')}
                                />
                                <Form.Select 
                                    size="sm" 
                                    style={{ width: '90px' }}
                                    value={customLimit}
                                    onChange={(e) => {
                                        setExportType('limit')
                                        setCustomLimit(Number(e.target.value))
                                    }}
                                    disabled={exportType !== 'limit'}
                                >
                                    <option value="10">10</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="500">500</option>
                                    <option value="1000">1000</option>
                                </Form.Select>
                            </div>
                        </Form>
                    </Col>

                    {/* Columna Derecha: Selección de Columnas (Solo si se pasan availableColumns) */}
                    <Col md={7} className="ps-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0 text-secondary">2. Columnas a Exportar</h6>
                            {availableColumns && availableColumns.length > 0 && (
                                <div>
                                    <Button variant="link" size="sm" className="text-decoration-none p-0 me-2" onClick={() => handleSelectAllColumns(true)}>
                                        Todas
                                    </Button>
                                    |
                                    <Button variant="link" size="sm" className="text-decoration-none p-0 ms-2 text-danger" onClick={() => handleSelectAllColumns(false)}>
                                        Ninguna
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-white border rounded shadow-sm" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <Row>
                                {availableColumns && availableColumns.map((col) => (
                                    <Col xs={6} key={col.key} className="mb-2">
                                        <Form.Check 
                                            type="checkbox"
                                            id={`col-${col.key}`}
                                            label={col.label}
                                            checked={selectedColumns.includes(col.key)}
                                            onChange={() => handleColumnToggle(col.key)}
                                            className="small"
                                        />
                                    </Col>
                                ))}
                                {(!availableColumns || availableColumns.length === 0) && (
                                    <Col xs={12}>
                                        <span className="text-muted small fst-italic">No hay columnas configurables para este reporte.</span>
                                    </Col>
                                )}
                            </Row>
                        </div>
                    </Col>
                </Row>

                <Alert variant="info" className="mb-0 mt-4 py-2 small">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    Si eliges "Todos los registros", se ignorarán los filtros de fecha.
                </Alert>
            </Modal.Body>
            <Modal.Footer className="bg-light border-0">
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleExport} disabled={availableColumns && selectedColumns.length === 0}>
                    <i className="bi bi-download me-2"></i>Generar Archivo
                </Button>
            </Modal.Footer>
        </Modal>
    )
}