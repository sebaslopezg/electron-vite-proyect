import { registerClientesHandlers } from "./clientesHandlers.js"
import { registerProductoHandlers } from "./productoHandlers.js"
import { registerConfigurarHandlers } from "./configurarHandlers.js"

export const registerAllHandlers = () => {
  registerProductoHandlers()
  registerClientesHandlers()
  registerConfigurarHandlers()
}