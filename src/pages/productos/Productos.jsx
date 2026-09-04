import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import CustomDataTable from '../../components/DataTableComponent'
import ProductModal from './components/ProductoModal'
import { ProductoDetalles } from './components/ProductoDetalles'
import { formatCurrency } from '../../utils/currencies'
import { productosService } from '../../services/productosService'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const Productos = ({ currentUser }) => {
  const [show, setShow] = useState(false)
  const [showDetalles, setShowDetalles] = useState(false)

  // 1. Estado local para garantizar la persistencia de sesión
  const [activeUser, setActiveUser] = useState(currentUser)

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)
  
  const handleCloseDetalles = () => setShowDetalles(false)
  const handleShowDetalles = () => setShowDetalles(true)

  const [reloadTable, setReloadTable] = useState(0)
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([]) 
  const [etiquetas, setEtiquetas] = useState([])

  const emptyForm = {
    ref_name: '', 
    sku: '', 
    stock: 0, 
    min_stock: 5, 
    max_stock: 50,
    categoria_id: 'general', 
    subcategorias_ids: [], 
    etiquetas: [], 
    unidad_medida: 'Unidad', 
    iva: 0, 
    allow_negative: 0, 
    descripcion: '', 
    precio: 0, 
    status: 1, 
    tipo: 'producto', 
    allow_encargo: 1, 
    encargo_solo_sin_stock: 1
  }

  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [prodSel, setProdSel] = useState(null)
  
  const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

  // 2. Garantizamos la carga de la sesión
  useEffect(() => {
      if (currentUser) {
          setActiveUser(currentUser)
      } else if (window.api && window.api.getCurrentUser) {
          window.api.getCurrentUser().then(res => {
              if (res.success && res.data) {
                  setActiveUser(res.data)
              }
          })
      }
  }, [currentUser])

  // 3. Validador de permisos dinámico
  const hasPermission = (permissionKey) => {
      const u = activeUser || currentUser;
      if (!u) return false;
      if (u.permisos?.includes('ALL')) return true;
      return u.permisos?.includes(permissionKey);
  }

  const canCreate = hasPermission('productos_crear');
  const canEdit = hasPermission('productos_editar');

  const loadConfig = async () => {
    const configData = await productosService.getConfiguracion()
    const confAppRaw = configData.find(c => c.key === 'confApp')
    if (confAppRaw) {
      try {
        const parsed = JSON.parse(confAppRaw.value)
        setAppConfig({ moneda: parsed.moneda || 'COP', formato_numero: parsed.formato_numero || 'es-CO' })
      } catch(e) {}
    }
  }

  const renderCurrency = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda)

  const loadSelectsData = useCallback(async () => {
    const [catsData, tagsData, subcatsData] = await Promise.all([
      productosService.getCategorias(), 
      productosService.getEtiquetas(), 
      productosService.getSubcategorias()
    ])
    setCategorias(catsData || [])
    setEtiquetas(tagsData || [])
    setSubcategorias(subcatsData || []) 
  }, [])

  const cleanForm = () => setForm({ ...emptyForm })

  useEffect(() => { 
    loadSelectsData()
    loadConfig()
    
    window.addEventListener('config-actualizada', loadConfig)
    window.addEventListener('categorias-actualizadas', loadSelectsData)
    window.addEventListener('subcategorias-actualizadas', loadSelectsData)
    window.addEventListener('etiquetas-actualizadas', loadSelectsData)

    return () => {
        window.removeEventListener('config-actualizada', loadConfig)
        window.removeEventListener('categorias-actualizadas', loadSelectsData)
        window.removeEventListener('subcategorias-actualizadas', loadSelectsData)
        window.removeEventListener('etiquetas-actualizadas', loadSelectsData)
    }
  }, [loadSelectsData])

  const tableContainerRef = useRef(null)

  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const handleTableClick = (e) => {
      // Editar
      const editBtn = e.target.closest('.btn-edit')
      if (editBtn) {
        e.preventDefault()
        try {
          const rawData = decodeURIComponent(editBtn.dataset.alldata)
          const item = JSON.parse(rawData)
          
          const tagsArray = item.etiquetas_ids ? item.etiquetas_ids.split(',').filter(id => id) : []
          let subcatIds = []
          if (item.subcategorias_ids_json) {
            try { subcatIds = JSON.parse(item.subcategorias_ids_json) } catch (e) {}
          }

          setForm({
            ref_name: item.ref_name || '', 
            sku: item.sku || '', 
            stock: item.stock || 0,
            min_stock: item.min_stock || 5, 
            max_stock: item.max_stock || 50,
            categoria_id: item.categoria_id || 'general', 
            subcategorias_ids: subcatIds,
            etiquetas: tagsArray, 
            unidad_medida: item.unidad_medida || 'Unidad', 
            iva: item.iva || 0, 
            allow_negative: item.allow_negative || 0, 
            descripcion: item.descripcion || '', 
            precio: item.precio || 0, 
            status: item.status || 1, 
            tipo: item.tipo || 'producto',
            allow_encargo: item.allow_encargo !== undefined ? item.allow_encargo : 1,
            encargo_solo_sin_stock: item.encargo_solo_sin_stock !== undefined ? item.encargo_solo_sin_stock : 1
          })
          setEditingId(item.id)
          handleShow()
        } catch(err) { console.error("Error leyendo datos", err) }
      }
      
      const viewBtn = e.target.closest('.btn-view')
      if (viewBtn) {
          e.preventDefault()
          try {
              const rawData = decodeURIComponent(viewBtn.dataset.alldata)
              const item = JSON.parse(rawData)
              setProdSel(item)
              handleShowDetalles()
          } catch(err) { console.error("Error leyendo datos para vista", err) }
      }

      const delBtn = e.target.closest('.btn-delete')
      if (delBtn) {
          e.preventDefault()
          handleDelete(delBtn.dataset.id)
      }
    }

    container.addEventListener('click', handleTableClick)
    return () => container.removeEventListener('click', handleTableClick)
  }, [])

  const handleSubmit = async (e, finalSkuArmado) => {
    e.preventDefault()
    
    const payload = { ...form }
    if (finalSkuArmado) payload.sku = finalSkuArmado

    let result
    if (editingId) {
      result = await productosService.updateProducto({ ...payload, id: editingId })
    } else {
      result = await productosService.addProducto(payload)
    }

    if (result && result.success) {
      Toast.fire({ icon: 'success', title: 'Producto guardado correctamente' })
      cleanForm()
      handleClose()
      setReloadTable(prev => prev + 1)
    } else {
      Toast.fire({ icon: 'error', title: result?.error || 'No se pudo guardar el producto' })
    }
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro que desea eliminar?",
      showDenyButton: true,
      confirmButtonText: "Sí",
      denyButtonText: `No`
    })

    if (result.isConfirmed) {
      const res = await productosService.deleteProducto(id)
      if (res.success) {
          Toast.fire({ icon: 'success', title: 'Producto eliminado' })
          setReloadTable(prev => prev + 1)
      } else {
          Toast.fire({ icon: 'error', title: res.error || 'Error al eliminar' })
      }
    }
  }

  const dataColumns = useMemo(() => [
    {
      data: 'ref_name',
      title: 'Nombre Referencia'
    },
    { 
      data: 'sku', title: 'SKU', 
      render: (data, type, row) => {
        if (!data) return '-';
        const safeData = encodeURIComponent(JSON.stringify(row));
        return `<a href="#" class="text-primary fw-bold text-decoration-underline btn-view" data-alldata="${safeData}">${data.toUpperCase()}</a>`;
      }
    },
    { 
      data: 'categoria_nombre', 
      title: 'Categoría', 
      render: (data) => data || 'General' 
    },
    { 
      data: 'stock', 
      title: 'Stock', 
      render: (data, type, row) => `<span class="badge bg-${data <= row.min_stock ? 'danger' : 'success'}">${data}</span>` 
    },
    { 
      data: 'precio', 
      title: 'Precio', 
      render: (data) => renderCurrency(data) 
    },
    { 
      data: 'status', 
      title: 'Estado', 
      render: (data) => `<span class="badge ${data === 1 ? 'bg-success' : 'bg-danger'}">${data === 1 ? 'Activo' : 'Inactivo'}</span>` 
    },
    {
      data: null, title: 'Acciones', orderable: false, className: 'text-center',
      render: function (data, type, row) {
        const safeData = encodeURIComponent(JSON.stringify(row))
        const canEditAction = hasPermission('productos_editar');

        let menuItems = `
          <li>
            <a class="dropdown-item btn-view" href="#" data-alldata="${safeData}">
              <i class="bi bi-eye me-2 text-secondary"></i> Ver Detalles
            </a>
          </li>
        `;

        if (canEditAction) {
          menuItems += `
            <li>
              <a class="dropdown-item btn-edit" href="#" data-id="${row.id}" data-alldata="${safeData}">
                <i class="bi bi-pencil me-2 text-primary"></i> Editar
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item btn-delete text-danger" href="#" data-id="${row.id}">
                <i class="bi bi-trash3 me-2"></i> Eliminar
              </a>
            </li>
          `;
        }

        return `
          <div class="dropdown">
            <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opciones">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu shadow-sm">
              ${menuItems}
            </ul>
          </div>
        `
      }
    }
  ], [appConfig, activeUser, currentUser])

  return <>
    {canCreate && (
      <div className="mb-3">
          <button className='btn btn-primary' onClick={() => {
            setEditingId(null)
            cleanForm()
            handleShow()
          }}>
            <i className="bi bi-plus-circle me-2"></i>Nuevo Producto
          </button>
      </div>
    )}

    <div ref={tableContainerRef} className="w-100" style={{ overflow: 'visible' }}>
      <CustomDataTable
        tableId="dt-productos-catalogo"
        key={`productos-${reloadTable}-${appConfig.moneda}-${appConfig.formato_numero}`}
        reloadKey={reloadTable}
        ajaxData={(params) => productosService.getProductosPaginados(params)}
        columns={dataColumns}
      />
    </div>

    <ProductModal 
      show={show} 
      handleClose={handleClose} 
      handleSubmit={handleSubmit} 
      form={form} 
      setForm={setForm} 
      editingId={editingId} 
      categorias={categorias} 
      subcategorias={subcategorias} 
      etiquetas={etiquetas} 
    />

    <ProductoDetalles 
        show={showDetalles}
        handleClose={handleCloseDetalles}
        productoData={prodSel}
        appConfig={appConfig}
    />
  </>
}