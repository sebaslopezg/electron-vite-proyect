const { contextBridge, ipcRenderer } = require("electron") //aqui se usa CommonJS porque con ES da error

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping"),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, callback) => {
    ipcRenderer.on(channel, (_, msg) => callback(msg));
  },

  //ventas
  createVenta: (data) => ipcRenderer.invoke("create-venta", data),

  //inventario
  getInventario: () => ipcRenderer.invoke("get-inventario"),
  setInventario: (item) => ipcRenderer.invoke("set-inventario", item),
  getInventarioHistory: (productoId) => ipcRenderer.invoke("get-inventario-history", productoId),

  //productos
  getProductos: () => ipcRenderer.invoke("get-productos"),
  addProducto: (item) => ipcRenderer.invoke("add-producto", item),
  updateProducto: (item) => ipcRenderer.invoke("update-producto", item),
  deleteProducto: (item) => ipcRenderer.invoke("delete-producto", item),

  //clientes
  getClientes: () => ipcRenderer.invoke("get-clientes"),
  addCliente: (item) => ipcRenderer.invoke("add-cliente", item),
  updateCliente: (item) => ipcRenderer.invoke("update-cliente", item),
  deleteCliente: (item) => ipcRenderer.invoke("delete-cliente", item),

  //configuraciones
  getConfiguracion:() => ipcRenderer.invoke("get-configuracion"),
  updateConfiguracion:(item) => ipcRenderer.invoke("update-configuracion", item),

  //conf almacen
  getAllConfAlmacen:() => ipcRenderer.invoke("getAll-almacenConf"),
  getOneConfAlmacen:(id) => ipcRenderer.invoke("get-almacenConf", id),
  updateConfAlmacen: (item) => ipcRenderer.invoke("update-almacenConf", item),
})
