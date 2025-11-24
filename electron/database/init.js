import { createProductoTable } from "./tables/producto.js"
import { createConfigurarTable } from "./tables/configurar.js"

export function initDatabase() {
  createProductoTable()
  createConfigurarTable()
}