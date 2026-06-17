import { useState, useEffect, useRef } from 'react'
import CustomDataTable from '../../components/DataTableComponent'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { Row, Col, Card } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { formatCurrency } from '../../utils/currencies'
import { BuscadorFiltros } from '../../components/BuscadorFiltros'
import { ModalAjusteStock } from './components/ModalAjusteStock'
import { ModalHistorialInventario } from './components/ModalHistorialInventario'
import { inventarioService } from '../../services/inventarioService'

export const Inventario = ({ currentUser }) => {
    const [show, setShow] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [reloadTable, setReloadTable] = useState(0)

    const [categoriasList, setCategoriasList] = useState([])
    const [subcategoriasTotales, setSubcategoriasTotales] = useState([])
    const [subcategoriasFiltradas, setSubcategoriasFiltradas] = useState([])
    const [etiquetasList, setEtiquetasList] = useState([])
  
    const [filterCategory, setFilterCategory] = useState(() => localStorage.getItem('inv_filtro_categoria') || '')
    const [filterSubcategory, setFilterSubcategory] = useState(() => localStorage.getItem('inv_filtro_subcategoria') || '')
    const [filterTag, setFilterTag] = useState(() => localStorage.getItem('inv_filtro_etiqueta') || '')

    const [metrics, setMetrics] = useState({ totalStock: 0, totalReferences: 0, averageStock: 0 })

    useEffect(() => {
        localStorage.setItem('inv_filtro_categoria', filterCategory)
        localStorage.setItem('inv_filtro_subcategoria', filterSubcategory)
        localStorage.setItem('inv_filtro_etiqueta', filterTag)
    }, [filterCategory, filterSubcategory, filterTag])

    const [form, setForm] = useState({ cantidad: '', type: '' })
    const [modalInfo, setModalInfo] = useState({ 
        title: 'Revision', 
        description: 'Ingrese la cantidad', 
        increase: null 
    })

    const [showHistory, setShowHistory] = useState(false)
    const [historyProductId, setHistoryProductId] = useState(null)
    const [historyTitle, setHistoryTitle] = useState('')

    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const loadConfig = async () => {
        const configData = await inventarioService.getConfiguracion()
        const confAppRaw = configData.find(c => c.key === 'confApp')
        if (confAppRaw) {
            try {
                const parsed = JSON.parse(confAppRaw.value)
                setAppConfig({
                    moneda: parsed.moneda || 'COP',
                    formato_numero: parsed.formato_numero || 'es-CO'
                })
            } catch(e) {}
        }
    }

    const renderCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
    }

    const handleClose = () => {
        setShow(false)
        setSelectedProduct(null)
        setForm({ cantidad: '', type: '' })
    }

    const handleShow = () => setShow(true)

    const loadFilters = async () => {
        const [cats, tags, subs] = await Promise.all([
            inventarioService.getCategorias(),
            inventarioService.getEtiquetas(),
            inventarioService.getSubcategorias()
        ])
        setCategoriasList(cats || [])
        setEtiquetasList(tags || [])
        setSubcategoriasTotales(subs || [])
    }

    useEffect(() => { 
        loadFilters()
        loadConfig()
        window.addEventListener('config-actualizada', loadConfig)
        return () => window.removeEventListener('config-actualizada', loadConfig)
    }, [])

    useEffect(() => {
        if (!filterCategory) {
            setSubcategoriasFiltradas([])
            if (subcategoriasTotales.length > 0 && filterSubcategory) {
                setFilterSubcategory('')
            }
        } else {
            const filtradas = subcategoriasTotales.filter(sub => {
                const ids = sub.categorias_ids ? sub.categorias_ids.split(',') : []
                return ids.includes(filterCategory)
            })
            setSubcategoriasFiltradas(filtradas)
            
            if (subcategoriasTotales.length > 0 && filterSubcategory) {
                const esValida = filtradas.some(s => s.id === filterSubcategory)
                if (!esValida) {
                    setFilterSubcategory('')
                }
            }
        }
    }, [filterCategory, subcategoriasTotales])

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
        if (!form.cantidad || parseFloat(form.cantidad) <= 0) return Swal.fire(
            { 
                icon: 'error', 
                title: 'Error', 
                text: 'La cantidad debe ser mayor a 0' 
            })

        try {
            const result = await inventarioService.setInventario({
                id: selectedProduct.id,
                amount: parseFloat(form.cantidad),
                type: form.type,
                usuario: currentUser?.username || 'system',
                notes: 'Ajuste manual desde módulo de inventario' 
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
        const container = tableContainerRef.current
        if (!container) return
        
        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-alldata]')
            if (!btn || !container.contains(btn)) return
            try {
                const rawData = decodeURIComponent(btn.dataset.alldata)
                const item = JSON.parse(rawData)
                if (btn.classList.contains('btn-increase')) handleIncrease(item)
                else if (btn.classList.contains('btn-decrease')) handleDecrease(item)
                else if (btn.classList.contains('btn-history')) viewHistory(item)
            } catch(err) { console.error("Error leyendo datos", err); }
        }
        
        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
        
    }, [reloadTable, filterCategory, filterSubcategory, filterTag])

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-clipboard-check me-2"></i>Inventario</h1>
        </div>

        <div className="card" style={{ overflow: 'visible' }}>
            <div className="card-body pt-4" style={{ overflow: 'visible' }}>
                
                <div className="bg-light p-3 rounded mb-3 border" style={{ overflow: 'visible' }}>
                    <Row className="g-3 align-items-end" style={{ overflow: 'visible' }}>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary"><small>Categoría:</small></Form.Label>
                                <BuscadorFiltros 
                                    items={categoriasList}
                                    value={filterCategory}
                                    onChange={setFilterCategory}
                                    placeholder="Todas las categorías..."
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3} style={{ overflow: 'visible' }}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary"><small>Subcategoría:</small></Form.Label>
                                <BuscadorFiltros 
                                    items={subcategoriasFiltradas}
                                    value={filterSubcategory}
                                    onChange={setFilterSubcategory}
                                    placeholder={filterCategory ? "Todas las subcategorías..." : "Selecciona categoría primero"}
                                    disabled={!filterCategory}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary"><small>Etiqueta:</small></Form.Label>
                                <Form.Select size="sm" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                                    <option value="">Todas las etiquetas</option>
                                    {etiquetasList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        
                        <Col md={3} className="text-end">
                            <Button 
                                variant="outline-danger" size="sm" className="w-100"
                                onClick={() => { setFilterCategory(''); setFilterSubcategory(''); setFilterTag(''); }}
                                disabled={!filterCategory && !filterSubcategory && !filterTag}
                            >
                                <i className="bi bi-x-circle me-1"></i> Limpiar Filtros
                            </Button>
                        </Col>
                    </Row>
                </div>

                <Row className="mb-4 g-2">
                    <Col xs={12} sm={4}>
                        <Card className="shadow-sm border-0 border-start border-primary border-4 bg-light">
                            <Card.Body className="p-2 px-3">
                                <p className="text-muted small mb-1 fw-bold text-uppercase"><i className="bi bi-boxes me-1"></i>Stock Disponible</p>
                                <h4 className="m-0 fw-bold text-dark">{metrics.totalStock.toLocaleString()} <span className="fs-6 text-muted font-weight-normal">uds</span></h4>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Card className="shadow-sm border-0 border-start border-info border-4 bg-light">
                            <Card.Body className="p-2 px-3">
                                <p className="text-muted small mb-1 fw-bold text-uppercase"><i className="bi bi-tag-fill me-1"></i>Referencias Filtradas</p>
                                <h4 className="m-0 fw-bold text-dark">{metrics.totalReferences.toLocaleString()} <span className="fs-6 text-muted font-weight-normal">ítems</span></h4>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Card className="shadow-sm border-0 border-start border-warning border-4 bg-light">
                            <Card.Body className="p-2 px-3">
                                <p className="text-muted small mb-1 fw-bold text-uppercase"><i className="bi bi-calculator me-1"></i>Promedio Stock / Ref</p>
                                <h4 className="m-0 fw-bold text-dark">{metrics.averageStock.toFixed(1)} <span className="fs-6 text-muted font-weight-normal">uds/ref</span></h4>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <div ref={tableContainerRef} className="w-100 overflow-hidden">
                    <CustomDataTable 
                        tableId="dt-inventario-maestro"
                        key={`inv-${filterCategory}-${filterSubcategory}-${filterTag}-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}`} 
                        ajaxData={async (params) => {
                            params.customCategory = filterCategory;
                            params.customSubcategory = filterSubcategory;
                            params.customTag = filterTag;
                            
                            const response = await inventarioService.getInventarioPaginados(params);
                            const totalFilteredRef = response.recordsFiltered || 0;
                            const stockSum = response.totalStock || 0;
                            
                            setMetrics({
                                totalStock: stockSum,
                                totalReferences: totalFilteredRef,
                                averageStock: totalFilteredRef > 0 ? (stockSum / totalFilteredRef) : 0
                            });

                            return response;
                        }}
                        
                        columns={[
                            { data: 'ref_name', title: 'Nombre' },
                            { 
                                data: 'sku', title: 'Referencia / Código',
                                render: (data, type, row) => {
                                    if (!data) return '-';
                                    const prefix = row.sku_prefix ? `${row.sku_prefix}${row.separador || ''}` : '';
                                    const skuVal = String(data);
                                    const finalSku = skuVal.startsWith(prefix) ? skuVal : `${prefix}${skuVal}`;
                                    
                                    return `<strong>${finalSku}</strong>`;
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
                                    const canAdjust = hasPermission('inventario_ajustar');
                                    
                                    return `
                                        ${canAdjust ? `
                                        <button class="btn btn-sm btn-success me-2 mb-1 btn-increase" data-alldata="${safeData}" title="Aumentar"><i class="bi bi-plus-lg"></i></button>
                                        <button class="btn btn-sm btn-warning me-2 mb-1 btn-decrease" data-alldata="${safeData}" title="Disminuir"><i class="bi bi-dash"></i></button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-info text-white mb-1 btn-history" data-alldata="${safeData}" title="Historial"><i class="bi bi-clock-history"></i></button>
                                    `;
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>

        <ModalAjusteStock 
            show={show}
            handleClose={handleClose}
            modalInfo={modalInfo}
            form={form}
            setForm={setForm}
            selectedProduct={selectedProduct}
            handleSave={handleSave}
        />

        <ModalHistorialInventario 
            show={showHistory}
            handleClose={() => setShowHistory(false)}
            historyProductId={historyProductId}
            historyTitle={historyTitle}
            appConfig={appConfig}
        />
    </>
}