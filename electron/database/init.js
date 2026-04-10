import { runMigrations } from './migrations.js'
import { createProductoTable } from "./tables/producto.js"
import { createConfigurarTable } from "./tables/configurar.js"
import { createClientesTable } from "./tables/clientes.js"
import { createAlmacenConfTable } from "./tables/almacenConf.js"
import { createInventarioTable } from './tables/inventario.js'
import { createBitacoraTable } from './tables/bitacora.js'
import { createVentasMaestroTable } from './tables/ventasMaestro.js'
import { createVentasDetalleTable } from './tables/ventasDetalle.js'
import { createNotasTables } from './tables/notas.js'


export const initDatabase = async () => {

  createProductoTable()
  createConfigurarTable()
  createClientesTable()
  createAlmacenConfTable()
  createInventarioTable()
  createBitacoraTable()
  createVentasMaestroTable()
  createVentasDetalleTable()
  createNotasTables()

  //await runMigrations()
}