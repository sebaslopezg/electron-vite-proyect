import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'

export const Configuracion = () => {

    const [form, setForm] = useState({ 
        almacenNombre: '', 
        almacenNit: '', 
        almacenDireccion: '', 
        almacenTelefono: '' 
    })

    const load = async () => {
        const data = await window.api.getConfiguracion()
        const confAlmacenRow = data.find(row => row.key === 'confAlmacen')
        if (confAlmacenRow) {
            try {
                const parsedValue = JSON.parse(confAlmacenRow.value)
                setForm({
                    almacenNombre: parsedValue.nombre || '', 
                    almacenNit: parsedValue.nit || '',
                    almacenDireccion: parsedValue.direccion || '',
                    almacenTelefono: parsedValue.telefono || '',
                })
                
            } catch (error) {
                console.error('Error parsing configuration JSON:', error)
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault() 

        // Define the payload structure
        const dataForDb = {
            key: 'confAlmacen',
            value: JSON.stringify({ 
                nombre: form.almacenNombre,
                nit: form.almacenNit,
                direccion: form.almacenDireccion,
                telefono: form.almacenTelefono,
            })
        }
        
        console.log('Sending to Backend:', dataForDb)
        
        try {
            // Send the correctly defined variable 'dataForDb'
            const result = await window.api.updateConfiguracion(dataForDb) 
            console.log('Update successful:', result)
            await load()

            Swal.fire({
                title: "Configuracion guardada",
                text: "La configuracion se ha guardado de manera exitosa",
                icon: "success"
            })
            
        } catch (error) {
            console.error('Error updating configuration:', error)
            const errorText = error.toString();
            Swal.fire({
                title: "Error de configuración",
                // This is the safest way to display an unknown error object
                text: errorText, 
                icon: "error"
            })
        }
    }

    useEffect(() => { load() }, [])

    return <>
        <div className="pagetitle">
          <h1>Configuracion</h1>
        </div>

        <div className="card">
          <div className="card-title"></div>
          <div className="card-body">

            <div className="row">
              <div className="row">
                <div className="col">

                    <h5 className="card-title">Datos del almacen</h5>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="almacenNombre">Nombre del almacen</Form.Label>
                            <Form.Control 
                            id="almacenNombre"
                            value={form.almacenNombre} 
                            onChange={(e) => setForm({ ...form, almacenNombre: e.target.value })}
                            type="text" 
                            placeholder="Nombre de mi almacen"
                            required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="almacenNit">Nit del almacen</Form.Label>
                            <Form.Control 
                            id="almacenNit"
                            value={form.almacenNit}
                            onChange={(e) => setForm({ ...form, almacenNit: e.target.value })}
                            type="text" 
                            placeholder="Nit de mi almacen" 
                            required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="almacenDireccion">Dirección</Form.Label>
                            <Form.Control 
                            id="almacenDireccion"
                            value={form.almacenDireccion}
                            onChange={(e) => setForm({ ...form, almacenDireccion: e.target.value })}
                            type="text" 
                            placeholder="Direccion e.j Calle ejemplo #1 - 1" 
                            required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="almacenTelefono">Telefono</Form.Label>
                            <Form.Control 
                            id="almacenTelefono"
                            value={form.almacenTelefono}
                            onChange={(e) => setForm({ ...form, almacenTelefono: e.target.value })}
                            type="text" 
                            placeholder="Telefono o celular de mi almacen" 
                            required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Guardar
                        </Button>
                    </Form>

                </div>
              </div>
            </div>

          </div>
        </div>
    </>
}