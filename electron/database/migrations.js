import db from './index.js'
import { getDatabaseVersion, setDatabaseVersion } from './version.js'

import { runV1AlmacenConf } from './tables/almacenConf.js'
import { runV1CategoriasEtiquetas } from './tables/categorias_etiquetas.js'
import { runV1Clientes } from './tables/clientes.js'
import { runV1Configurar } from './tables/configurar.js'
import { runV1Encargos } from './tables/Encargos.js'
import { runV1EstadoEncargo } from './tables/estadoEncargo.js'
import { runV1Inventario } from './tables/inventario.js'
import { runV1Notas } from './tables/notas.js'
import { runV1NotasDetalle } from './tables/notasDetalle.js' 
import { runV1NotasMaestro } from './tables/notasMaestro.js'
import { runV1Producto } from './tables/producto.js'
import { runV1VentasDetalle } from './tables/ventasDetalle.js'
import { runV1VentasMaestro } from './tables/ventasMaestro.js'
import { runV1Bitacora } from './tables/bitacora.js'
import { runV1CuentasContables } from './tables/cuentasContables.js'
import { runV1Terceros } from './tables/terceros.js'
import { runV1Comprobantes } from './tables/comprobantes.js'
import { runV1ComprobantesDetalle } from './tables/comprobantesDetalle.js'
import { runV1ConfiguracionContable } from './tables/configuracionContable.js'

const migrations = [
    {
        version: 1,
        up: () => {
            console.log("Setting up base schema (V1)...")
            
            runV1AlmacenConf()
            runV1CategoriasEtiquetas()
            runV1Clientes()
            runV1Configurar()
            runV1Encargos()
            runV1EstadoEncargo()
            runV1Inventario()
            runV1Notas()
            runV1NotasDetalle()
            runV1NotasMaestro()
            runV1Producto()
            runV1VentasDetalle()
            runV1VentasMaestro()
            runV1Bitacora()
        }
    },
    
    {
        version: 3,
        up: () => {
            runV1CuentasContables()
            runV1Terceros()
        }
    },

    {
        version: 4,
        up: () => {
            runV1Comprobantes()
            runV1ComprobantesDetalle()
        }
    },
    {
        version: 5,
        up: () => {
            runV1ConfiguracionContable()
        }
    },
    {
        version: 6,
        up: () => {
            db.exec(`ALTER TABLE metodos_pago ADD COLUMN cuenta_id TEXT;`)
        }
    },
]

export const runMigrations = () => {
    try {
        const currentVersion = getDatabaseVersion()
        console.log(`Current DB version: v${currentVersion}`)
        const applyMigrations = db.transaction(() => {
            for (const migration of migrations) {
                if (migration.version > currentVersion) {
                    console.log(`Applying migration v${migration.version}...`)
                    migration.up()
                    setDatabaseVersion(migration.version)
                    console.log(`Migration v${migration.version} applied successfully.`)
                }
            }
        });

        applyMigrations();
        
    } catch (err) {
        console.error('Fatal error applying migrations:', err)
        throw err
    }
}