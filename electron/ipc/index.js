import { registerClientesHandlers } from "./clientesHandlers.js"
import { registerProductoHandlers } from "./productoHandlers.js"
import { registerInventarioHandler } from "./inventarioHandlers.js"
import { registerConfigurarHandlers } from "./configurarHandlers.js"
import { registerAlmacenConfigHandlers } from "./almacenConfigHandlers.js"
import { registerVentasHandlers } from "./ventasHandlers.js"
import { registerBitacoraHandlers } from "./bitacoraHandlers.js"
import { registerNotasHandlers } from "./notasHandlers.js"
import { registerCategoriaHandlers } from "./categoriaHandlers.js"
import { registerEtiquetaHandlers } from "./etiquetaHandlers.js"

export const registerAllHandlers = () => {
  registerProductoHandlers()
  registerClientesHandlers()
  registerConfigurarHandlers()
  registerAlmacenConfigHandlers()
  registerInventarioHandler()
  registerVentasHandlers()
  registerBitacoraHandlers()
  registerNotasHandlers()
  registerCategoriaHandlers()
  registerEtiquetaHandlers()
}