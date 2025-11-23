const { contextBridge, ipcRenderer } = require("electron") //aqui se usa CommonJS porque con ES da error

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping"),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, callback) => {
    ipcRenderer.on(channel, (_, msg) => callback(msg));
  },
  getInventario: () => ipcRenderer.invoke("get-inventario"),
  addInventario: (item) => ipcRenderer.invoke("add-inventario", item),
  updateInventario: (item) => ipcRenderer.invoke("update-inventario", item),
  deleteInventario: (item) => ipcRenderer.invoke("delete-inventario", item),

  //clientes
  getClientes: () => ipcRenderer.invoke("get-clientes"),
  addCliente: (item) => ipcRenderer.invoke("add-cliente", item),
  updateCliente: (item) => ipcRenderer.invoke("update-cliente", item),
  deleteCliente: (item) => ipcRenderer.invoke("delete-cliente", item),
});
