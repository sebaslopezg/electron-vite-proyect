const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping"),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, callback) => {
    ipcRenderer.on(channel, (_, msg) => callback(msg));
  },

  //ventas
  getMaestro: () => ipcRenderer.invoke("get-maestro"),
  getDetalle: (id) => ipcRenderer.invoke("get-detalle", id),
  createVenta: (data) => ipcRenderer.invoke("create-venta", data),

  //inventario
  getInventario: () => ipcRenderer.invoke("get-inventario"),
  getInventarioPaginados: (params) => ipcRenderer.invoke("get-inventario-paginados", params),
  setInventario: (item) => ipcRenderer.invoke("set-inventario", item),
  getInventarioHistory: (productoId) => ipcRenderer.invoke("get-inventario-history", productoId),
  getInventarioHistoryPaginados: (params) => ipcRenderer.invoke("get-inventario-history-paginados", params),

  //productos
  getProductos: () => ipcRenderer.invoke("get-productos"),
  getProductosPaginados: (params) => ipcRenderer.invoke("get-productos-paginados", params),
  getServicios: () => ipcRenderer.invoke("get-servicios"),
  getServiciosPaginados: (params) => ipcRenderer.invoke("get-servicios-paginados", params),
  getAllProductos: () => ipcRenderer.invoke("get-allProductos"),
  addProducto: (item) => ipcRenderer.invoke("add-producto", item),
  updateProducto: (item) => ipcRenderer.invoke("update-producto", item),
  deleteProducto: (item) => ipcRenderer.invoke("delete-producto", item),

  //encargos
  getEncargos: () => ipcRenderer.invoke("get-encargos"),
  addEncargo: (item) => ipcRenderer.invoke("add-encargo", item),
  updateEncargo: (item) => ipcRenderer.invoke("update-encargo", item),
  deleteEncargo: (item) => ipcRenderer.invoke("delete-encargo", item),

  //estados encargos
  getEstados: () => ipcRenderer.invoke("get-estados"),
  addEstado: (item) => ipcRenderer.invoke("add-estado", item),
  updateEstado: (item) => ipcRenderer.invoke("update-estado", item),
  deleteEstado: (item) => ipcRenderer.invoke("delete-estado", item),

  //clientes
  getClientes: () => ipcRenderer.invoke("get-clientes"),
  getClientesPaginados: (params) => ipcRenderer.invoke("get-clientes-paginados", params),
  addCliente: (item) => ipcRenderer.invoke("add-cliente", item),
  updateCliente: (item) => ipcRenderer.invoke("update-cliente", item),
  deleteCliente: (item) => ipcRenderer.invoke("delete-cliente", item),

  //bitacoras
  getBitacoras: () => ipcRenderer.invoke("get-bitacoras"),
  addBitacora: (item) => ipcRenderer.invoke("add-bitacora", item),
  updateBitacora: (item) => ipcRenderer.invoke("update-bitacora", item),
  deleteBitacora: (item) => ipcRenderer.invoke("delete-bitacora", item),

  //configuraciones
  getConfiguracion: () => ipcRenderer.invoke("get-configuracion"),
  updateConfiguracion: (item) => ipcRenderer.invoke("update-configuracion", item),
  updateWindow: (data) => ipcRenderer.send("update-window", data),

  // Perfiles de Datos
  getPerfiles: () => ipcRenderer.invoke("get-perfiles"),
  addPerfil: (data) => ipcRenderer.invoke("add-perfil", data),
  switchPerfil: (id) => ipcRenderer.invoke("switch-perfil", id),
  deletePerfil: (id) => ipcRenderer.invoke("delete-perfil", id),
  getPerfilStats: (filename) => ipcRenderer.invoke("get-perfil-stats", filename),

  //conf almacen
  getAllConfAlmacen: () => ipcRenderer.invoke("getAll-almacenConf"),
  getOneConfAlmacen: (id) => ipcRenderer.invoke("get-almacenConf", id),
  updateConfAlmacen: (item) => ipcRenderer.invoke("update-almacenConf", item),

  //notas - credito/debito
  getNotas: () => ipcRenderer.invoke("get-notas"),
  getNotaDetalle: (id) => ipcRenderer.invoke('get-nota-detalle', id),
  addNota: (data) => ipcRenderer.invoke("add-nota", data),
  searchFactura: (numero) => ipcRenderer.invoke("search-factura", numero),

  // Categorias --
  getCategorias: () => ipcRenderer.invoke("get-categorias"),
  addCategoria: (item) => ipcRenderer.invoke("add-categoria", item),
  updateCategoria: (item) => ipcRenderer.invoke("update-categoria", item),
  deleteCategoria: (id) => ipcRenderer.invoke("delete-categoria", id),

  // -- Etiquetas --
  getEtiquetas: () => ipcRenderer.invoke("get-etiquetas"),
  addEtiqueta: (item) => ipcRenderer.invoke("add-etiqueta", item),
  updateEtiqueta: (item) => ipcRenderer.invoke("update-etiqueta", item),
  deleteEtiqueta: (id) => ipcRenderer.invoke("delete-etiqueta", id),

  // Migración de Datos
  selectDbFile: () => ipcRenderer.invoke("select-db-file"),
  readExternalDb: (path) => ipcRenderer.invoke("read-external-db", path),
  getInternalSchema: () => ipcRenderer.invoke("get-internal-schema"),
  executeImport: (data) => ipcRenderer.invoke("execute-import", data),
  previewExternalTable: (data) => ipcRenderer.invoke("preview-external-table", data),

  // Cartera y cobranzas
  getCartera: () => ipcRenderer.invoke("get-cartera"),
  getAbonos: () => ipcRenderer.invoke("get-abonos"),
  addAbono: (data) => ipcRenderer.invoke("add-abono", data),

  // Exportación de Datos
  exportDatabase: () => ipcRenderer.invoke('export-db'),
})
