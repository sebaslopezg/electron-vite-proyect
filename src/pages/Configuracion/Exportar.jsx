import { useState, useEffect } from "react";
import { Button, Card, Form, Row, Col } from "react-bootstrap";
import Swal from 'sweetalert2';

export const Exportar = ({ currentUser }) => {
    const [perfiles, setPerfiles] = useState([]);
    const [selectedFilename, setSelectedFilename] = useState('');
    const [formato, setFormato] = useState('db');

    useEffect(() => {
        const loadPerfiles = async () => {
            if (window.api && window.api.getPerfiles) {
                const data = await window.api.getPerfiles();
                setPerfiles(data || []);
                const activo = data.find(p => p.is_active === 1);
                
                if (activo) {
                    setSelectedFilename(activo.filename);
                } else if (data.length > 0) {
                    setSelectedFilename(data[0].filename);
                }
            }
        };
        loadPerfiles();
    }, []);

    const handleExport = async () => {
        const hasPermission = currentUser?.permisos?.includes('ALL') || currentUser?.permisos?.includes('exportar_datos')
        if (!hasPermission) return Swal.fire('Bloqueado', 'Tu rol no te permite respaldar/exportar el sistema', 'error')

        if (!selectedFilename) return Swal.fire('Error', 'Selecciona un perfil para exportar', 'warning')

        const perfil = perfiles.find(p => p.filename === selectedFilename) || { nombre: 'data' };

        Swal.fire({ title: 'Exportando...', text: 'Por favor espera un momento', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        const result = await window.api.exportDatabase({ 
            filename: selectedFilename, 
            nombre: perfil.nombre, 
            formato 
        });

        if (result.success) { 
            Swal.fire('¡Éxito!', result.message, 'success') 
        } 
        else if (result.message !== 'Exportación cancelada') { 
            Swal.fire('Error', 'No se pudo exportar: ' + result.message, 'error') 
        } 
        else { 
            Swal.close() 
        }
    }

    return <>
        <Card className="text-center shadow-sm border-0 p-5">
            <div className="mb-4"><i className="bi bi-database-down text-primary" style={{ fontSize: '4rem' }}></i></div>
            <h3 className="mb-3">Respaldo de Seguridad</h3>
            <p className="text-muted mb-4">Exporta una base de datos seleccionada.</p>
            
            <Row className="justify-content-center mb-4">
                <Col md={4} className="text-start">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-secondary">Perfil de Datos</Form.Label>
                        <Form.Select 
                            value={selectedFilename} 
                            onChange={(e) => setSelectedFilename(e.target.value)}
                        >
                            {perfiles.map(p => (
                                <option key={p.id} value={p.filename}>
                                    {p.nombre} {p.is_active === 1 ? '(Activo)' : ''}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3} className="text-start">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-secondary">Formato de Salida</Form.Label>
                        <Form.Select 
                            value={formato} 
                            onChange={(e) => setFormato(e.target.value)}
                        >
                            <option value="db">Nativo SQLite (.db)</option>
                            <option value="json">Archivo JSON (.json)</option>
                            <option value="sql">Script SQL (.sql)</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <div>
                <Button variant="primary" size="md" className="shadow-sm" onClick={handleExport}>
                    <i className="bi bi-download me-2"></i>Exportar
                </Button>
            </div>
        </Card>
    </>
}