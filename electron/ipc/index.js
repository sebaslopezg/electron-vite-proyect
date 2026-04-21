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
import { registerImportHandlers } from "./importHandlers.js";
import { registerEncargosHandlers } from "./encargosHandler.js"
import { registerEstadoHandlers } from "./estadosEncargoHandler.js"
import { registerCarteraHandlers } from "./carteraHandlers.js"
import { registerExportHandlers } from "./exportHandler.js"

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
  registerImportHandlers()
  registerEncargosHandlers()
  registerEstadoHandlers()
  registerCarteraHandlers()
  registerExportHandlers()
}