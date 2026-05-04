import { useState, useEffect, useRef } from 'react'
import CustomDataTable from '../../components/DataTableComponent'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { formatCurrency } from '../../utils/currencies'

export const Inventario = () => {
  const [show, setShow] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [reloadTable, setReloadTable] = useState(0)

  const [categoriasList, setCategoriasList] = useState([])
  const [etiquetasList, setEtiquetasList] = useState([])
  
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const [form, setForm] = useState({ cantidad: '', type: '' })
  const [modalInfo, setModalInfo] = useState({ 
    title: 'Registro', 
    description: 'Ingrese la cantidad', 
    increase: null 
  })

  const [showHistory, setShowHistory] = useState(false)
  const [historyProductId, setHistoryProductId] = useState(null)
  const [historyTitle, setHistoryTitle] = useState('')

  const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

  const loadConfig = async () => {
      const configData = await window.api.getConfiguracion();
      const confAppRaw = configData.find(c => c.key === 'confApp');
      if (confAppRaw) {
          try {
              const parsed = JSON.parse(confAppRaw.value);
              setAppConfig({
                  moneda: parsed.moneda || 'COP',
                  formato_numero: parsed.formato_numero || 'es-CO'
              });
          } catch(e) {}
      }
  };

  const renderCurrency = (val) => {
      return formatCurrency(val, appConfig.formato_numero, appConfig.moneda);
  };

  const handleClose = () => {
    setShow(false)
    setSelectedProduct(null)
    setForm({ cantidad: '', type: '' })
  }

  const handleShow = () => setShow(true)

  const loadFilters = async () => {
    const [cats, tags] = await Promise.all([
        window.api.getCategorias(),
        window.api.getEtiquetas()
    ]);
    setCategoriasList(cats || [])
    setEtiquetasList(tags || [])
  }

  useEffect(() => { 
      loadFilters();
      loadConfig();
      window.addEventListener('config-actualizada', loadConfig);
      return () => window.removeEventListener('config-actualizada', loadConfig);
  }, [])

  const handleIncrease = async (row) => {
    setSelectedProduct(row)
    setModalInfo({ 
        title: `Ingreso de stock - ${row.ref_name}`, 
        description: 'Ingrese la cantidad a sumar:', 
        increase: true 
    })
    setForm({ cantidad: '', type: 'ingreso' })
    handleShow()
  }

  const handleDecrease = async (row) => {
    setSelectedProduct(row)
    setModalInfo({ 
        title: `Egreso de stock - ${row.ref_name}`, 
        description: 'Ingrese la cantidad a restar:', 
        increase: false })
    setForm({ 
        cantidad: '', 
        type: 'egreso' 
    })
    handleShow()
  }

  const handleSave = async () => {
    if (!selectedProduct) return Swal.fire({ icon: 'error', title: 'Error', text: 'No hay producto seleccionado' })
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) return Swal.fire({ icon: 'error', title: 'Error', text: 'La cantidad debe ser mayor a 0' })

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
            icon: 'success', title: 'Éxito', text: `Stock actualizado: ${result.stockAnterior} → ${result.stockNuevo}`, timer: 2000
        })
        handleClose()
        setReloadTable(prev => prev + 1)
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo actualizar' })
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al procesar' })
    }
  }

  const viewHistory = (row) => {
      setHistoryTitle(`Historial - ${row.ref_name}`)
      setHistoryProductId(row.id)
      setShowHistory(true)
  }

  const tableContainerRef = useRef(null);

  useEffect(() => {
      const container = tableContainerRef.current;
      if (!container) return;
      const handleTableClick = (e) => {
          const btn = e.target.closest('button[data-alldata]');
          if (!btn) return;
          try {
              const rawData = decodeURIComponent(btn.dataset.alldata);
              const item = JSON.parse(rawData);
              if (btn.classList.contains('btn-increase')) handleIncrease(item);
              else if (btn.classList.contains('btn-decrease')) handleDecrease(item);
              else if (btn.classList.contains('btn-history')) viewHistory(item);
          } catch(err) { console.error("Error leyendo datos", err); }
      };
      container.addEventListener('click', handleTableClick);
      return () => container.removeEventListener('click', handleTableClick);
  }, []);

  return <>
        <div className="pagetitle">
            <h1><i className="bi bi-clipboard-check me-2"></i>Inventario</h1>
        </div>

        <div className="card">
            <div className="card-body pt-4">
                
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
                                variant="outline-secondary" size="sm"
                                onClick={() => { setFilterCategory(''); setFilterTag(''); }}
                                disabled={!filterCategory && !filterTag}
                            >
                                <i className="bi bi-x-circle me-1"></i> Limpiar Filtros
                            </Button>
                        </Col>
                    </Row>
                </div>

                <div ref={tableContainerRef} className="w-100 overflow-hidden">
                    <CustomDataTable 
                        key={`inv-${filterCategory}-${filterTag}-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}`} 
                        ajaxData={(params) => {
                            params.customCategory = filterCategory;
                            params.customTag = filterTag;
                            return window.api.getInventarioPaginados(params);
                        }}
                        
                        columns={[
                            { data: 'ref_name', title: 'Nombre' },
                            { 
                                data: 'sku', title: 'Referencia / Código',
                                render: (data, type, row) => {
                                    const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                                    return `<strong>${prefix}${data}</strong>`;
                                }
                            },
                            { 
                                data: 'stock', title: 'Stock',
                                render: (data, type, row) => {
                                    const minStock = row.min_stock || 5; 
                                    const stockLevel = data <= minStock ? 'danger' : 'success';
                                    return `<span class="badge bg-${stockLevel} fs-6">${data}</span>`
                                }
                            },
                            { 
                                data: 'precio', title: 'Precio',
                                render: (data) => renderCurrency(data)
                            },
                            {
                                data: null, title: 'Acciones', orderable: false,
                                render: function (data, type, row) {
                                    const safeData = encodeURIComponent(JSON.stringify(row));
                                    return `
                                        <button class="btn btn-sm btn-success me-2 mb-1 btn-increase" data-alldata="${safeData}" title="Aumentar"><i class="bi bi-plus-lg"></i></button>
                                        <button class="btn btn-sm btn-warning me-2 mb-1 btn-decrease" data-alldata="${safeData}" title="Disminuir"><i class="bi bi-dash"></i></button>
                                        <button class="btn btn-sm btn-info text-white mb-1 btn-history" data-alldata="${safeData}" title="Historial"><i class="bi bi-clock-history"></i></button>
                                    `;
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>

        <Modal show={show} onHide={handleClose} size="sm" centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-6">{modalInfo.title}</Modal.Title>
            </Modal.Header>
        <Modal.Body>
            <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <Form.Group className="mb-3">
                    <Form.Label htmlFor="cantidad">{modalInfo.description}</Form.Label>
                    <Form.Control 
                        id="cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                        type="number" step="0.01" min="0" placeholder="Cantidad" required autoFocus
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
            <Button variant="secondary" size="sm" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
        </Modal.Footer>
        </Modal>

        <Modal show={showHistory} onHide={() => setShowHistory(false)} size="xl" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5 text-primary"><i className="bi bi-clock-history me-2"></i>{historyTitle}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-3">
                {historyProductId && (
                    <CustomDataTable 
                        key={`history-${historyProductId}-${appConfig.formato_numero}`}
                        
                        ajaxData={(params) => {
                            params.productoId = historyProductId;
                            return window.api.getInventarioHistoryPaginados(params);
                        }}
                        
                        columns={[
                            { 
                                data: 'fecha', title: 'Fecha', 
                                render: (data) => {
                                    if (!data) return '-';
                                    return new Date(data).toLocaleString(appConfig.formato_numero, {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                    });
                                }
                            },
                            { 
                                data: 'tipo_movimiento', title: 'Tipo',
                                render: (data) => {
                                    const val = data ? data.toLowerCase() : '';
                                    let badgeClass = 'secondary';
                                    if (val === 'ingreso' || val === 'entrada') badgeClass = 'success';
                                    if (val === 'egreso' || val === 'salida') badgeClass = 'danger';
                                    return `<span class="badge bg-${badgeClass}">${(data||'').toUpperCase()}</span>`;
                                }
                            },
                            { data: 'cantidad', title: 'Cant.' },
                            { data: 'stock_anterior', title: 'Antes' },
                            { data: 'stock_nuevo', title: 'Después' },
                            { data: 'usuario', title: 'Usuario' },
                            { data: 'notas', title: 'Notas', render: (data) => data ? `<small class="text-muted">${data}</small>` : '<span class="text-muted">-</span>' }
                        ]}
                    />
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={() => setShowHistory(false)}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    </>
}