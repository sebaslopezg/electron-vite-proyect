import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5';
import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import ProductModal from '../../components/ProductoModal';

DataTable.use(DT);

export const Productos = () => {

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [dataInTable, setDataInTable] = useState([])
  const [categorias, setCategorias] = useState([])
  const [etiquetas, setEtiquetas] = useState([])

  const emptyForm = {
    ref_name: '',
    sku: '',
    stock: 0,
    min_stock: 5,
    max_stock: 50,
    categoria_id: 'general',
    etiquetas: [],
    unidad_medida: 'Unidad',
    iva: 0,
    allow_negative: 0,
    descripcion: '',
    precio: 0,
    status: 1,
    tipo: 'producto',
  }

  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)

  const loadData = useCallback(async () => {
    const [prodData, catsData, tagsData] = await Promise.all([
      window.api.getProductos(),
      window.api.getCategorias(),
      window.api.getEtiquetas()
    ]);
    setDataInTable(prodData || [])
    setCategorias(catsData || [])
    setEtiquetas(tagsData || [])
  }, []);

  const cleanForm = () => setForm({ ...emptyForm })

  useEffect(() => { loadData() }, [loadData])

  // Escuchamos si el usuario crea una categoría/etiqueta nueva en otra pestaña
  useEffect(() => {
      const handleUpdate = () => loadData();
      window.addEventListener('categorias-actualizadas', handleUpdate);
      window.addEventListener('etiquetas-actualizadas', handleUpdate);
      return () => {
          window.removeEventListener('categorias-actualizadas', handleUpdate);
          window.removeEventListener('etiquetas-actualizadas', handleUpdate);
      }
  }, [loadData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    let result;
    if (editingId) {
      result = await window.api.updateProducto({ ...form, id: editingId })
    } else {
      result = await window.api.addProducto(form)
    }

    if (result && result.success) {
        Swal.fire({ title: '¡Éxito!', text: 'Producto guardado correctamente', icon: 'success', timer: 1500 });
        cleanForm()
        handleClose()
        loadData()
    } else {
        Swal.fire('Error', result?.error || 'No se pudo guardar el producto', 'error');
    }
  }

  const handleEdit = (item) => {
    const tagsArray = item.etiquetas_ids ? item.etiquetas_ids.split(',').filter(id => id) : [];

    setForm({
      ref_name: item.ref_name,
      sku: item.sku,
      stock: item.stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      categoria_id: item.categoria_id || 'general',
      etiquetas: tagsArray,
      unidad_medida: item.unidad_medida,
      iva: item.iva,
      allow_negative: item.allow_negative,
      descripcion: item.descripcion,
      precio: item.precio,
      status: item.status,
      tipo: item.tipo
    })
    setEditingId(item.id)
    handleShow() 
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro que desea eliminar?",
      showDenyButton: true,
      confirmButtonText: "Sí",
      denyButtonText: `No`
    })

    if (result.isConfirmed) {
      await window.api.deleteProducto(id)
      loadData()
    }
  }

  return <>
    <div className="mb-3">
        <button className='btn btn-primary' onClick={() => {
            setEditingId(null)
            cleanForm()
            handleShow()
        }}>
            <i className="bi bi-plus-circle me-2"></i>Nuevo Producto
        </button>
    </div>

    <DataTableComponent
      data={dataInTable}
      columns={[
        { data: 'ref_name', title: 'Nombre Referencia' },
        { data: 'sku', title: 'SKU' },
        { data: 'categoria_nombre', title: 'Categoría', render: (data) => data || 'General' },
        { data: 'stock', title: 'Stock', render: (data, type, row) => `<span class="badge bg-${data <= row.min_stock ? 'danger' : 'success'}">${data}</span>` },
        { data: 'precio', title: 'Precio', render: (data) => `$${data.toLocaleString('es-CO')}` },
        { data: 'status', title: 'Estado' },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          render: function (data, type, row) {
            return `
                  <button class="btn btn-sm btn-secondary me-2 btn-edit-${row.id}"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm btn-danger btn-delete-${row.id}"><i class="bi bi-trash3"></i></button>
                  `;
          }
        }
      ]}
      onEdit={handleEdit}
      onDelete={handleDelete}
      customRenders={{
        status: (data) => `<span class="badge ${data === 1 ? 'bg-success' : 'bg-danger'}">${data === 1 ? 'Activo' : 'Inactivo'}</span>`,
        sku: (data) => `<strong>${data.toUpperCase()}</strong>`
      }}
    />
    <ProductModal
      show={show}
      handleClose={handleClose}
      handleSubmit={handleSubmit}
      form={form}
      setForm={setForm}
      editingId={editingId}
      categorias={categorias}
      etiquetas={etiquetas}
    />
  </>
}