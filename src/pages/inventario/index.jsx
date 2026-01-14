import { useState, useEffect } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Swal from 'sweetalert2'

export const Inventario = () => {
  const [show, setShow] = useState(false)
  const [dataInTable, setDataInTable] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)

  const [form, setForm] = useState({ 
    cantidad: '',
    type: ''
  })

  const [modalInfo, setModalInfo] = useState({
    title: 'Registro',
    description: 'Ingrese la cantidad',
    increase: null
  })

  const handleClose = () => {
    setShow(false)
    setSelectedProduct(null)
    cleanForm()
  }

  const handleShow = () => setShow(true)

  const load = async () => {
    const data = await window.api.getInventario()
    setDataInTable(data)
  }

  useEffect(() => { 
    load() 
  }, [])

  const handleIncrease = async (row) => {
    setSelectedProduct(row)
    setModalInfo({
        title: `Registrar ingreso de productos - ${row.ref_name}`,
        description: 'Ingrese la cantidad a ingresar:',
        increase: true
    })
    setForm({ 
        cantidad: '', 
        type: 'ingreso' 
    })
    handleShow()
  }

  const handleDecrease = async (row) => {
    setSelectedProduct(row)
    setModalInfo({
        title: `Registrar egreso de productos - ${row.ref_name}`,
        description: 'Ingrese la cantidad a egresar:',
        increase: false
    })
    setForm({ 
        cantidad: '', 
        type: 'egreso' 
    })
    handleShow()
  }

  const handleSave = async () => {
    if (!selectedProduct) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No hay producto seleccionado'
      })
      return
    }

    if (!form.cantidad || parseFloat(form.cantidad) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La cantidad debe ser mayor a 0'
      })
      return
    }

    try {
      const result = await window.api.setInventario({
        id: selectedProduct.id,
        cantidad: parseFloat(form.cantidad),
        type: form.type,
        usuario: 'current_user', // You can replace this with actual user
        notas: '' // Optional notes
      })

      if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: `Stock actualizado: ${result.stockAnterior} → ${result.stockNuevo}`,
            timer: 2000
        })
        handleClose()
        load() // Reload the table
      } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.error || 'No se pudo actualizar el inventario'
        })
      }
    } catch (error) {
      console.error('Error al guardar inventario:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al procesar la solicitud'
      })
    }
  }

  const cleanForm = () => {
    setForm({ cantidad: '', type: '' })
  }

  const viewHistory = async (row) => {
    try {
      const history = await window.api.getInventarioHistory(row.id)
      
      if (history.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin historial',
            text: 'No hay movimientos registrados para este producto'
        })
        return
      }

      // Format history for display
      const historyHtml = history.map(h => `
        <div style="text-align: left; padding: 10px; border-bottom: 1px solid #eee;">
            <strong>Fecha:</strong> ${new Date(h.fecha).toLocaleString('es-ES')}<br>
            <strong>Tipo:</strong> ${h.tipo_movimiento}<br>
            <strong>Cantidad:</strong> ${h.cantidad}<br>
            <strong>Stock:</strong> ${h.stock_anterior} → ${h.stock_nuevo}<br>
            <strong>Usuario:</strong> ${h.usuario}
            ${h.notas ? `<br><strong>Notas:</strong> ${h.notas}` : ''}
        </div>
      `).join('')

        Swal.fire({
            title: `Historial - ${row.ref_name}`,
            html: `<div style="max-height: 400px; overflow-y: auto;">${historyHtml}</div>`,
            width: 600
        })
    } catch (error) {
        console.error('Error al obtener historial:', error)
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener el historial'
        })
    }
  }

  return <>
        <div className="pagetitle">
            <h1>Inventario</h1>
        </div>

        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">
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
                            className: 'btn-success',
                            extraClasses: 'me-2',
                            onClick: handleIncrease
                        },
                        {
                            name: 'decrease',
                            label: 'Disminuir',
                            icon: 'bi bi-dash',
                            className: 'btn-warning',
                            extraClasses: 'me-2',
                            onClick: handleDecrease
                        },
                        {
                            name: 'history',
                            label: 'Historial',
                            icon: 'bi bi-clock-history',
                            className: 'btn-info',
                            onClick: viewHistory
                        }
                    ]}
                    customRenders={{
                        stock: (data, type, row) => {
                            const stockLevel = data <= 0 ? 'danger' : data <= 10 ? 'warning' : 'success'
                            return `<span class="badge bg-${stockLevel}">${data}</span>`
                        },
                        precio: (data, type, row) => {
                            return `$${parseFloat(data).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
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
            <Form onSubmit={(e) => {
                e.preventDefault()
                handleSave()
            }}>
                <Form.Group className="mb-3">
                    <Form.Label htmlFor="cantidad">{modalInfo.description}</Form.Label>
                    <Form.Control 
                        id="cantidad"
                        value={form.cantidad} 
                        onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cantidad"
                        required
                        autoFocus
                    />
                    {selectedProduct && (
                        <Form.Text className="text-muted">
                            Stock actual: <strong>{selectedProduct.stock}</strong> {selectedProduct.unidad_medida || ''}
                        </Form.Text>
                    )}
                </Form.Group>
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