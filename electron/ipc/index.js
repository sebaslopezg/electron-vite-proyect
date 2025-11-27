import { registerClientesHandlers } from "./clientesHandlers.js"
import { registerProductoHandlers } from "./productoHandlers.js"
import { registerConfigurarHandlers } from "./configurarHandlers.js"
import { registerAlmacenConfigHandlers } from "./almacenConfigHandlers.js"

export const registerAllHandlers = () => {
  registerProductoHandlers()
  registerClientesHandlers()
  registerConfigurarHandlers()
  registerAlmacenConfigHandlers()
}