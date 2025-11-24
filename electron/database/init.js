import { createProductoTable } from "./tables/producto.js"
import { createConfigurarTable } from "./tables/configurar.js"
import { createClientesTable } from "./tables/clientes.js"

export function initDatabase() {
  createProductoTable()
  createConfigurarTable()
  createClientesTable()
}