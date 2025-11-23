import { registerClientesHandlers } from "./clientesHandlers.js"
import { registerInventarioHandlers } from "./inventarioHandlers.js"

export function registerAllHandlers() {
  registerInventarioHandlers()
  registerClientesHandlers()
}