import { runMigrations } from './migrations.js'
import { createProductoTable } from "./tables/producto.js"
import { createConfigurarTable } from "./tables/configurar.js"
import { createClientesTable } from "./tables/clientes.js"
import { createAlmacenConfTable } from "./tables/almacenConf.js"
import { createInventarioTable } from './tables/inventario.js'

export const initDatabase = async() => {
  
  createProductoTable()
  createConfigurarTable()
  createClientesTable()
  createAlmacenConfTable()
  createInventarioTable()

  //await runMigrations()
}