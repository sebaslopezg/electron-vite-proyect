import { useState, useEffect } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'

export const Inventario = () => {
  const [show, setShow] = useState(false)
  const [dataInTable, setDataInTable] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)

  // ESTADOS PARA LOS FILTROS
  const [categoriasList, setCategoriasList] = useState([])
  const [etiquetasList, setEtiquetasList] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const [form, setForm] = useState({ 
    cantidad: '',
    type: ''
  })

  const [modalInfo, setModalInfo] = useState({
    title: 'Registro',
    description: 'Ingrese la cantidad',
    increase: null
  })

  // ESTADOS PARA EL MODAL DE HISTORIAL
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyTitle, setHistoryTitle] = useState('')

  const handleClose = () => {
    setShow(false)
    setSelectedProduct(null)
    cleanForm()
  }

  const handleShow = () => setShow(true)

  // ACTUALIZADO: Cargamos Inventario, Categorías y Etiquetas al mismo tiempo
  const load = async () => {
    const [invData, cats, tags] = await Promise.all([
        window.api.getInventario(),
        window.api.getCategorias(),
        window.api.getEtiquetas()
    ]);
    setDataInTable(invData || [])
    setCategoriasList(cats || [])
    setEtiquetasList(tags || [])
  }

  useEffect(() => { 
    load() 
  }, [])

  // NUEVO: Lógica de filtrado en tiempo real
  const filteredData = dataInTable.filter(item => {
      // 1. Filtrar por categoría
      if (filterCategory && item.categoria_id !== filterCategory) return false;
      
      // 2. Filtrar por etiqueta
      if (filterTag) {
          if (!item.etiquetas_ids) return false;
          const tagsArray = item.etiquetas_ids.split(',');
          if (!tagsArray.includes(filterTag)) return false;
      }
      
      return true;
  });

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
      Swal.fire({ icon: 'error', title: 'Error', text: 'No hay producto seleccionado' })
      return
    }

    if (!form.cantidad || parseFloat(form.cantidad) <= 0) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'La cantidad debe ser mayor a 0' })
      return
    }

    try {
      const result = await window.api.setInventario({
        id: selectedProduct.id,
        cantidad: parseFloat(form.cantidad),
        type: form.type,
        usuario: 'current_user',
        notas: '' 
      })

      if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: `Stock actualizado: ${result.stockAnterior} → ${result.stockNuevo}`,
            timer: 2000
        })
        handleClose()
        load() 
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo actualizar el inventario' })
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al procesar la solicitud' })
    }
  }

  const cleanForm = () => {
    setForm({ cantidad: '', type: '' })
  }

  const viewHistory = async (row) => {
    try {
      const history = await window.api.getInventarioHistory(row.id)
      
      if (history.length === 0) {
        Swal.fire({ icon: 'info', title: 'Sin historial', text: 'No hay movimientos registrados' })
        return
      }

      setHistoryTitle(`Historial de Movimientos - ${row.ref_name}`)
      setHistoryData(history)
      setShowHistory(true)

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener el historial' })
    }
  }

  return <>
        <div className="pagetitle">
            <h1>Inventario</h1>
        </div>

        <div className="card">
            <div className="card-body pt-4">
                
                {/* NUEVO: BARRA DE FILTROS */}
                <div className="bg-light p-3 rounded mb-4 border">
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-bold"><small>Filtrar por Categoría:</small></Form.Label>
                                <Form.Select size="sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                    <option value="">Todas las categorías</option>
                                    {categoriasList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-bold"><small>Filtrar por Etiqueta:</small></Form.Label>
                                <Form.Select size="sm" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                                    <option value="">Todas las etiquetas</option>
                                    {etiquetasList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => { setFilterCategory(''); setFilterTag(''); }}
                                disabled={!filterCategory && !filterTag}
                            >
                                <i className="bi bi-x-circle me-1"></i> Limpiar Filtros
                            </Button>
                        </Col>
                    </Row>
                </div>

                <DataTableComponent 
                    data={filteredData}  // Pasamos los datos ya filtrados
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
                            className: 'btn-info text-white',
                            onClick: viewHistory
                        }
                    ]}
                    customRenders={{
                        // ACTUALIZADO: Pintar el SKU completo con prefijo y separador
                        sku: (data, type, row) => {
                            const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                            return `<strong>${prefix}${data}</strong>`;
                        },
                        stock: (data, type, row) => {
                            const minStock = row.min_stock || 5; 
                            const stockLevel = data <= minStock ? 'danger' : 'success';
                            return `<span class="badge bg-${stockLevel} fs-6">${data}</span>`
                        },
                        precio: (data) => {
                            return `$${parseFloat(data).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
                        }
                    }}
                />
            </div>
        </div>

        {/* MODAL 1: PARA INGRESOS Y EGRESOS */}
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

        {/* MODAL 2: PARA EL HISTORIAL CON TABLA */}
        <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>{historyTitle}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <DataTableComponent 
                    data={historyData}
                    columns={[
                        { data: 'fecha', title: 'Fecha' },
                        { data: 'tipo_movimiento', title: 'Tipo' },
                        { data: 'cantidad', title: 'Cant.' },
                        { data: 'stock_anterior', title: 'Antes' },
                        { data: 'stock_nuevo', title: 'Después' },
                        { data: 'usuario', title: 'Usuario' },
                        { data: 'notas', title: 'Notas' }
                    ]}
                    customRenders={{
                        fecha: (data) => new Date(data).toLocaleString('es-CO'),
                        tipo_movimiento: (data) => {
                            const val = data ? data.toLowerCase() : '';
                            let badgeClass = 'secondary';
                            
                            if (val === 'ingreso' || val === 'entrada') badgeClass = 'success';
                            if (val === 'egreso' || val === 'salida') badgeClass = 'danger';

                            return `<span class="badge bg-${badgeClass}">${data.toUpperCase()}</span>`;
                        },
                        notas: (data) => data ? `<small class="text-muted">${data}</small>` : '<span class="text-muted">-</span>'
                    }}
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowHistory(false)}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>

    </>
}