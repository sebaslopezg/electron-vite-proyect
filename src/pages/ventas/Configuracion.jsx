import { useState, useEffect } from 'react'
import { Form, Button, Row, Col } from 'react-bootstrap'
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
        resolucionDian:'',
        nombreFactura:'',
        footer_factura:'',
        consecutivo:'',
        consecutivo_nota: '',
    })

    useEffect(() => {
        if (data) {
            setForm({
                id: data.id,
                nombre_almacen: data.nombre_almacen || '',
                nit_almacen: data.nit_almacen || '',
                logo_almacen:'',
                direccion_almacen: data.direccion_almacen || '',
                telefono_almacen: data.telefono_almacen || '',
                prefijo: data.prefijo || '',
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

  if (!data) {
    return <div>Cargando configuración...</div>
  }

    return <>
        <h5 className="card-title">Datos del almacen</h5>
                                
        <Form onSubmit={handleSubmit}>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenNombre">Nombre del almacen</Form.Label>
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
                        <Form.Label htmlFor="almacenNit">Nit del almacen</Form.Label>
                        <Form.Control
                            id="almacenNit"
                            // Matching DB column name: nit_almacen
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
                        <Form.Label htmlFor="almacenDireccion">Dirección</Form.Label>
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
                        <Form.Label htmlFor="almacenTelefono">Telefono</Form.Label>
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

            <h5 className="card-title">Datos facturación y Notas</h5>

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenDocName">Nombre Documento</Form.Label>
                        <Form.Control
                            id="almacenDocName"
                            value={form.nombreFactura}
                            onChange={(e) => setForm({ ...form, nombreFactura: e.target.value })}
                            type="text"
                            required
                        />
                    </Form.Group>
                </Col>

                <Col md={2}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenPrefijo">Prefijo</Form.Label>
                        <Form.Control
                            id="almacenPrefijo"
                            value={form.prefijo}
                            onChange={(e) => setForm({ ...form, prefijo: e.target.value })}
                            type="text"
                            required
                        />
                    </Form.Group>
                </Col>

                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenConsecutivo">Consecutivo Factura</Form.Label>
                        <Form.Control
                            id="almacenConsecutivo"
                            value={form.consecutivo}
                            onChange={(e) => setForm({ ...form, consecutivo: e.target.value })}
                            type="number"
                            required
                        />
                    </Form.Group>
                </Col>

                {/* NUEVO CAMPO A CONTINUACIÓN */}
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="almacenConsecutivoNota">Consecutivo Notas</Form.Label>
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

            <Button variant="primary" type="submit">
                Guardar cambios
            </Button>
        </Form>
  </>
}