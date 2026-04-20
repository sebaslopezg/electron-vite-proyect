import { useState, useEffect, useRef } from 'react';
import { Button, Form, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { CURRENCIES } from '../../utils/currencies';

export const General = () => {
    const [form, setForm] = useState({ 
        nombre: '', 
        logo: '',
        moneda: 'COP',
        formato_numero: 'es-CO'
    });
    const fileInputRef = useRef(null);

    const load = async () => {
        const data = await window.api.getConfiguracion();
        const appConf = data.find(row => row.key === 'confApp');
        if (appConf) {
            try {
                const parsed = JSON.parse(appConf.value);
                setForm({ 
                    nombre: parsed.nombre || '', 
                    logo: parsed.logo || '',
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                });
            } catch (error) { console.error(error) }
        }
    }

    useEffect(() => { load() }, [])

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, logo: reader.result });
            reader.readAsDataURL(file);
        }
    }

    const handleSaveGeneral = async (e) => {
        e.preventDefault(); 
        const payload = { key: 'confApp', value: JSON.stringify(form) };
        try {
            const result = await window.api.updateConfiguracion(payload); 
            if (result.success) {
                Swal.fire({ title: "Guardado", text: "Configuración guardada exitosamente", icon: "success", timer: 1500 });
                window.dispatchEvent(new CustomEvent('config-actualizada'));
                document.title = form.nombre;
                if (window.api.updateWindow) window.api.updateWindow(form);
            } else {
                Swal.fire("Error", result.error, "error");
            }
        } catch (error) { Swal.fire("Error", error.toString(), "error"); }
    }

    return (
        <Form onSubmit={handleSaveGeneral}>
            <Row>
                <Col md={4} className="text-center mb-4">
                    <div className="border rounded d-flex align-items-center justify-content-center bg-light mx-auto" 
                        style={{ width: '150px', height: '150px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => fileInputRef.current.click()}>
                        {form.logo ? (
                            <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <div className="text-muted text-center">
                                <i className="bi bi-image fs-1 d-block"></i><small>Subir Logo</small>
                            </div>
                        )}
                    </div>
                    <input type="file" accept="image/*" className="d-none" ref={fileInputRef} onChange={handleImageChange}/>
                    <Button variant="outline-secondary" size="sm" className="mt-2" onClick={() => fileInputRef.current.click()}>Cambiar Logo</Button>
                </Col>
                
                <Col md={8}>
                    <h5 className="card-title p-0 mb-3">Datos del Entorno Actual</h5>
                    <Form.Group className="mb-4">
                        <Form.Label htmlFor="appName">Nombre del Sistema / Empresa</Form.Label>
                        <Form.Control 
                            id="appName" 
                            value={form.nombre} 
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
                            type="text" 
                            required
                        />
                        <Form.Text className="text-muted">Este nombre y logo se guardarán exclusivamente para el Perfil de Datos actual.</Form.Text>
                    </Form.Group>

                    <h5 className="card-title p-0 mb-3 border-top pt-3">Formato de Moneda</h5>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Símbolo de Moneda</Form.Label>
                                <Form.Select 
                                    value={form.moneda} 
                                    onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Separador de Miles y Decimales</Form.Label>
                                <Form.Select 
                                    value={form.formato_numero} 
                                    onChange={(e) => setForm({ ...form, formato_numero: e.target.value })}
                                >
                                    <option value="es-CO">1.000,00 (Punto miles, Coma decimales)</option>
                                    <option value="en-US">1,000.00 (Coma miles, Punto decimales)</option>
                                    <option value="fr-FR">1 000,00 (Espacio miles, Coma decimales)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button variant="primary" type="submit" size="lg" className="mt-3">
                        Guardar Cambios
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}