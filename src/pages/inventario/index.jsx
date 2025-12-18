import { useState } from 'react'
import { useEffect } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'

export const Inventario = () => {

    const [show, setShow] = useState(false)
    const [dataInTable, setDataInTable] = useState([])

  const [form, setForm] = useState({ 
    cantidad: ''
  })

    const defaultModalInfo = {
        title:'Registro',
        description:'Ingrese la cantidad'
    }

    const [modalInfo, setModalInfo] = useState({})

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const load = async () => {
        const data = await window.api.getInventario()
        setDataInTable(data)
    }

    const [editingId, setEditingId] = useState(null)

    useEffect(() => { load() }, [])

    const handleIncrease = async (row) => {

        setModalInfo({
            title:'Registrar ingreso de productos',
            description:'Ingrese la cantidad a ingresar:'
        })
        console.log(modalInfo)
        handleShow()
    }

    const handleDecrease = async (row) => {
        setModalInfo({
            title:'Registrar egreso de productos',
            description:'Ingrese la cantidad a egresar:'
        })
        console.log(modalInfo)
        handleShow()
    }

    const handleSave = () => {
        // Handle save logic here
        console.log('Saving...')
        handleClose()
    }

    const cleanForm = () => {
        //setForm({ documento: '', nombre: '', telefono: '', direccion: '' })
    }

    return <>
        <div className="pagetitle">
            <h1>Inventario</h1>
        </div>

        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">

                <button className='btn btn-primary' onClick={(e) => {
                  setEditingId(null)
                  cleanForm()
                  handleShow()
                }}>Nuevo</button>

                <DataTableComponent 
                    data={dataInTable}
                    columns={[
                        { data: 'ref_name', title: 'Nombre' },
                        { data: 'sku', title: 'Referencia / Código' },
                        { data: 'stock', title: 'Stock' },
                        { data: 'precio', title: 'Precio' },
                        {
                            data: null,
                            title: 'Acciones',
                            orderable: false
                        }
                    ]}
                    customActions={[
                        {
                            name: 'increase',
                            label: 'Aumentar',
                            icon: 'bi bi-plus-lg',
                            className: 'btn-secondary',
                            extraClasses: 'me-2',
                            onClick: handleIncrease
                        },
                        {
                            name: 'decrease',
                            label: 'Disminuir',
                            icon: 'bi bi-dash',
                            className: 'btn-secondary',
                            onClick: handleDecrease
                        }
                    ]}
                    customRenders={{
                        date_created: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES')
                        },
                        date_modify: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES')
                        }
                    }}
                />

            </div>
        </div>

      <Modal show={show} onHide={handleClose} size="sm" centered>
          <Modal.Header closeButton>
          <Modal.Title>{modalInfo.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
              <Form onSubmit={handleSave}>
                    <Form.Label htmlFor="cantidad">{modalInfo.description}</Form.Label>
                      <Form.Control 
                        id='cantidad'
                        value={form.documento} 
                        onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                        type="text" 
                        placeholder="Cantidad"
                        required
                      />
              </Form>
          </Modal.Body>
          <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                  Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave}>
                  Guardar
              </Button>
              
          </Modal.Footer>
      </Modal>
    </>
}