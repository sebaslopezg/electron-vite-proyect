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
  getFacturasPaginadas: (params) => ipcRenderer.invoke('get-maestro-paginados', params),
  getReporteVentas: (data) => ipcRenderer.invoke("get-reporte-ventas", data),

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
  importFacturasRelacionadas: (data) => ipcRenderer.invoke('import-facturas-relacionadas', data),
  previewExternalQuery: (data) => ipcRenderer.invoke('preview-external-query', data),
  executeImportQuery: (data) => ipcRenderer.invoke('execute-import-query', data),
  executeImportJson: (data) => ipcRenderer.invoke('execute-import-json', data),

  // Perfiles de Datos
  getPerfiles: () => ipcRenderer.invoke("get-perfiles"),
  addPerfil: (data) => ipcRenderer.invoke("add-perfil", data),
  switchPerfil: (id) => ipcRenderer.invoke("switch-perfil", id),
  deletePerfil: (id) => ipcRenderer.invoke("delete-perfil", id),
  getPerfilStats: (filename) => ipcRenderer.invoke("get-perfil-stats", filename),
  getPerfilTableData: (data) => ipcRenderer.invoke("get-perfil-table-data", data),
  clearPerfilTableData: (data) => ipcRenderer.invoke("clear-perfil-table-data", data),

  //conf almacen
  getAllConfAlmacen: () => ipcRenderer.invoke("getAll-almacenConf"),
  getOneConfAlmacen: (id) => ipcRenderer.invoke("get-almacenConf", id),
  updateConfAlmacen: (item) => ipcRenderer.invoke("update-almacenConf", item),

  getMetodosPago: () => ipcRenderer.invoke('get-metodos-pago'),
  addMetodoPago: (nombre) => ipcRenderer.invoke('add-metodo-pago', nombre),
  deleteMetodoPago: (id) => ipcRenderer.invoke('delete-metodo-pago', id),
  updateMetodoPagoCuenta: (data) => ipcRenderer.invoke('update-metodo-pago-cuenta', data),

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
  selectCsvFile: () => ipcRenderer.invoke('select-csv-file'),
  readCsvFile: (filePath) => ipcRenderer.invoke('read-csv-file', filePath),
  executeImportCsv: (data) => ipcRenderer.invoke('execute-import-csv', data),

  //logs de consola en backend
  onImportLog: (callback) => ipcRenderer.on('import-log', (_event, msg) => callback(msg)),
  removeAllImportLogs: () => ipcRenderer.removeAllListeners('import-log'),

  // Cartera y cobranzas
  getCartera: () => ipcRenderer.invoke("get-cartera"),
  getAbonos: () => ipcRenderer.invoke("get-abonos"),
  addAbono: (data) => ipcRenderer.invoke("add-abono", data),
  getCarteraPaginada: (params) => ipcRenderer.invoke('get-cartera-paginada', params),
  getAbonosPaginados: (params) => ipcRenderer.invoke('get-abonos-paginados', params),

  // Exportación de Datos
  exportDatabase: () => ipcRenderer.invoke('export-db'),

  // Subcategorias
  getSubcategorias: () => ipcRenderer.invoke("get-subcategorias"),
  addSubcategoria: (item) => ipcRenderer.invoke("add-subcategoria", item),
  updateSubcategoria: (item) => ipcRenderer.invoke("update-subcategoria", item),
  deleteSubcategoria: (id) => ipcRenderer.invoke("delete-subcategoria", id),
})

  //contabilidad
contextBridge.exposeInMainWorld('contaAPI', {
  getPuc: () => ipcRenderer.invoke('get-puc'),
  crearCuenta: (cuenta) => ipcRenderer.invoke('crear-cuenta', cuenta),
  actualizarCuenta: (cuenta) => ipcRenderer.invoke('actualizar-cuenta', cuenta),
  eliminarCuenta: (id) => ipcRenderer.invoke('eliminar-cuenta', id),

  getTerceros: () => ipcRenderer.invoke('get-terceros'),
  getTercerosPaginados: (params) => ipcRenderer.invoke('get-terceros-paginados', params),
  crearTercero: (data) => ipcRenderer.invoke('crear-tercero', data),
  actualizarTercero: (data) => ipcRenderer.invoke('actualizar-tercero', data),
  eliminarTercero: (id) => ipcRenderer.invoke('eliminar-tercero', id),

  getComprobantesPaginados: (params) => ipcRenderer.invoke('get-comprobantes-paginados', params),
  getComprobanteDetalle: (id) => ipcRenderer.invoke('get-comprobante-detalle', id),
  actualizarComprobante: (data) => ipcRenderer.invoke('actualizar-comprobante', data),
  crearComprobante: (data) => ipcRenderer.invoke('crear-comprobante', data),
  getCuentasAuxiliares: () => ipcRenderer.invoke('get-cuentas-auxiliares'),
  getBalancePrueba: (params) => ipcRenderer.invoke('get-balance-prueba', params),

  getBalancePrueba: (params) => ipcRenderer.invoke('get-balance-prueba', params),
  getEstadoResultados: (params) => ipcRenderer.invoke('get-estado-resultados', params),
  getBalanceGeneral: (params) => ipcRenderer.invoke('get-balance-general', params),

  getConfigContable: () => ipcRenderer.invoke('get-config-contable'),
  updateConfigContable: (data) => ipcRenderer.invoke('update-config-contable', data),
})

  contextBridge.exposeInMainWorld('comprasAPI', {
    getComprasPaginadas: (params) => ipcRenderer.invoke('get-compras-paginadas', params),
    getCompraDetalle: (id) => ipcRenderer.invoke('get-compra-detalle', id),
    crearCompra: (data) => ipcRenderer.invoke('crear-compra', data),
  }),

contextBridge.exposeInMainWorld('updaterAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_event, progressObj) => callback(progressObj)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
  onError: (callback) => ipcRenderer.on('update-error', (_event, error) => callback(error)),
  
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-not-available')
    ipcRenderer.removeAllListeners('download-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('update-error')
  }
})
