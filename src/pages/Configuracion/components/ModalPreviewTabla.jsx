import { Modal, Button } from 'react-bootstrap';

export const ModalPreviewTabla = ({ 
    show, 
    onHide, 
    tableName, 
    isLoading, 
    columns, 
    data, 
    totalRows 
}) => {
    return (
        <Modal show={show} onHide={onHide} size="xl" scrollable centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">
                    <i className="bi bi-table me-2 text-info"></i>
                    Previsualización: <strong className="text-primary">{tableName}</strong>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-info" role="status"></div>
                        <p className="mt-2 text-muted">Cargando datos...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                        Esta tabla está vacía.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover table-bordered table-sm table-striped m-0" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                            <thead className="table-dark sticky-top">
                                <tr>
                                    <th className="text-center text-muted" style={{width: '40px'}}>#</th>
                                    {columns.map(col => <th key={col}>{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <td className="text-center text-muted bg-light">{rowIndex + 1}</td>
                                        {columns.map(col => (
                                            <td key={col}>
                                                {row[col] !== null 
                                                    ? (String(row[col]).length > 50 ? String(row[col]).substring(0, 50) + '...' : String(row[col])) 
                                                    : <em className="text-muted">NULL</em>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light py-2">
                <div className="text-muted me-auto small">
                    Mostrando muestra de <strong>{data.length}</strong> registros.<br/>
                    Total en tabla: <strong className="text-primary">{totalRows.toLocaleString('es-CO')}</strong> registros.
                </div>
                <Button variant="secondary" onClick={onHide}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    );
};