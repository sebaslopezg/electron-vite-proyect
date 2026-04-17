import { useState, useEffect, useRef } from 'react'
import { Form, Button, Row, Col, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const Configuracion = ({ data, onReload }) => {

    const [form, setForm] = useState({
        id:'', 
        nombre_almacen:'', 
        nit_almacen:'',
        logo_almacen:'',
        direccion_almacen:'', 
        telefono_almacen:'',
        prefijo:'',
        separador: '',
        resolucionDian:'',
        nombreFactura:'',
        footer_factura:'',
        consecutivo:'',
        consecutivo_nota: '',
    })

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (data) {
            setForm({
                id: data.id,
                nombre_almacen: data.nombre_almacen || '',
                nit_almacen: data.nit_almacen || '',
                logo_almacen: data.logo_almacen || '',
                direccion_almacen: data.direccion_almacen || '',
                telefono_almacen: data.telefono_almacen || '',
                prefijo: data.prefijo || '',
                separador: data.separador || '',
                resolucionDian: data.resolucionDian || '',
                nombreFactura: data.nombreFactura || '',
                footer_factura: data.footer_factura || '',
                consecutivo: data.consecutivo || '',
                consecutivo_nota: data.consecutivo_nota || ''
            })
        }
    }, [data])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        try {
            await window.api.updateConfAlmacen(form)

            Swal.fire({
                title: "Éxito",
                text: "Configuración actualizada correctamente",
                icon: "success",
                timer: 1500
            })
            
            if (onReload) onReload()

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: "Error",
                text: "No se pudo actualizar la información",
                icon: "error"
            })
        }
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire('Error', 'La imagen es demasiado grande. Máximo 2MB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, logo_almacen: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

  if (!data) {
    return <div>Cargando configuración...</div>
  }

    return <>
        <h5 className="card-title text-primary"><i className="bi bi-shop me-2"></i>Datos del Almacén</h5>
                                
        <Form onSubmit={handleSubmit}>
            
            {/* SECCIÓN DEL LOGO */}
            <Card className="mb-4 bg-light border-0 shadow-sm">
                <Card.Body className="d-flex align-items-center">
                    <div className="me-4" style={{ width: '120px', height: '120px', border: '2px dashed #ccc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'white' }}>
                        {form.logo_almacen ? (
                            <img src={form.logo_almacen} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        ) : (
                            <i className="bi bi-image text-muted fs-1"></i>
                        )}
                    </div>
                    <div>
                        <h6 className="fw-bold">Logotipo del Almacén (Opcional)</h6>
                        <p className="text-muted small mb-2">Se utilizará en las facturas y recibos impresos en formato A4.</p>
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            className="d-none" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => fileInputRef.current.click()}>
                            <i className="bi bi-upload me-1"></i> Subir Imagen
                        </Button>
                        {form.logo_almacen && (
                            <Button variant="outline-danger" size="sm" onClick={() => setForm({...form, logo_almacen: ''})}>
                                <i className="bi bi-trash"></i>
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenNombre" className="fw-bold">Nombre del almacen</Form.Label>
                        <Form.Control
                            id="almacenNombre"
                            value={form.nombre_almacen}
                            onChange={(e) => setForm({ ...form, nombre_almacen: e.target.value })}
                            type="text"
                            placeholder="Nombre de mi almacen"
                            required
                        />
                    </Form.Group>
                </Col>

                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenNit" className="fw-bold">Nit del almacen</Form.Label>
                        <Form.Control
                            id="almacenNit"
                            value={form.nit_almacen}
                            onChange={(e) => setForm({ ...form, nit_almacen: e.target.value })}
                            type="text"
                            placeholder="Nit de mi almacen"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenDireccion" className="fw-bold">Dirección</Form.Label>
                        <Form.Control
                            id="almacenDireccion"
                            value={form.direccion_almacen}
                            onChange={(e) => setForm({ ...form, direccion_almacen: e.target.value })}
                            type="text"
                            placeholder="Direccion e.j Calle ejemplo #1 - 1"
                            required
                        />
                    </Form.Group>
                </Col>

                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenTelefono" className="fw-bold">Telefono</Form.Label>
                        <Form.Control
                            id="almacenTelefono"
                            value={form.telefono_almacen}
                            onChange={(e) => setForm({ ...form, telefono_almacen: e.target.value })}
                            type="text"
                            placeholder="Telefono o celular de mi almacen"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <hr className="my-4" />
            <h5 className="card-title text-success"><i className="bi bi-receipt me-2"></i>Datos de Facturación y Notas</h5>

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenDocName" className="fw-bold">Nombre del Documento</Form.Label>
                        <Form.Control
                            id="almacenDocName"
                            value={form.nombreFactura}
                            onChange={(e) => setForm({ ...form, nombreFactura: e.target.value })}
                            type="text"
                            placeholder="Ej. Factura de Venta POS"
                            required
                        />
                    </Form.Group>
                </Col>

                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="resolucionDian" className="fw-bold">Resolución DIAN</Form.Label>
                        <Form.Control
                            id="resolucionDian"
                            value={form.resolucionDian}
                            onChange={(e) => setForm({ ...form, resolucionDian: e.target.value })}
                            type="text"
                            placeholder="Resolución DIAN..."
                        />
                    </Form.Group>
                </Col>
                
                {/* PREFIJO Y SEPARADOR JUNTOS */}
                <Col md={2}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenPrefijo" className="fw-bold text-primary">Prefijo</Form.Label>
                        <Form.Control
                            id="almacenPrefijo"
                            value={form.prefijo}
                            onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })}
                            type="text"
                            placeholder="Ej. F"
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenSeparador" className="fw-bold text-primary">Separador</Form.Label>
                        <Form.Control
                            id="almacenSeparador"
                            value={form.separador}
                            onChange={(e) => setForm({ ...form, separador: e.target.value })}
                            type="text"
                            placeholder="Ej. -"
                            maxLength="3"
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenConsecutivo" className="fw-bold">Consecutivo Factura</Form.Label>
                        <Form.Control
                            id="almacenConsecutivo"
                            value={form.consecutivo}
                            onChange={(e) => setForm({ ...form, consecutivo: e.target.value })}
                            type="number"
                            required
                        />
                        <Form.Text className="text-muted">Próxima factura: {form.prefijo}{form.separador}{parseInt(form.consecutivo || 0) + 1}</Form.Text>
                    </Form.Group>
                </Col>

                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenConsecutivoNota" className="fw-bold">Consecutivo Notas</Form.Label>
                        <Form.Control
                            id="almacenConsecutivoNota"
                            value={form.consecutivo_nota}
                            onChange={(e) => setForm({ ...form, consecutivo_nota: e.target.value })}
                            type="number"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={12}>
                    <Form.Group className="mb-4">
                        <Form.Label htmlFor="footerFactura" className="fw-bold">Texto Pie de Página (Footer)</Form.Label>
                        <Form.Control
                            id="footerFactura"
                            as="textarea"
                            rows={3}
                            value={form.footer_factura}
                            onChange={(e) => setForm({ ...form, footer_factura: e.target.value })}
                            placeholder="Ej. Esta factura se asimila en todos sus efectos legales a una letra de cambio..."
                        />
                        <Form.Text className="text-muted">Este texto aparecerá al final de todos los recibos y facturas impresas.</Form.Text>
                    </Form.Group>
                </Col>
            </Row>

            <div className="d-grid mt-3 border-top pt-4">
                <Button variant="primary" size="lg" type="submit">
                    <i className="bi bi-save me-2"></i>Guardar Configuración
                </Button>
            </div>
        </Form>
  </>
}