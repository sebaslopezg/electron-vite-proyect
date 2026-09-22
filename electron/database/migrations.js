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
import { runV1Compras } from './tables/compras.js'
import { runV1Subcategorias } from './tables/subcategorias.js'
import { runV2ConfiguracionContable } from './tables/configuracionContable.js'
import { runV1Notificaciones } from './tables/Notificaciones.js'

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
            runV1Notificaciones()
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
    {
        version: 7,
        up: () => {
            runV1Compras()
        }
    },
    {
        version: 8,
        up: () => {
            runV2ConfiguracionContable()
        }
    },
    {
        version: 9,
        up: () => {
            console.log("Applying migration V9: Adding observaciones to ventasMaestro");
            try {
                db.exec(`ALTER TABLE ventasMaestro ADD COLUMN observaciones TEXT;`);
            } catch (error) {
                if (!error.message.includes('duplicate column name')) {
                    throw error;
                }
            }
        }
    },
    {
        version: 10,
        up: () => {
            console.log("Applying migration V10: Configuración de encargos por producto")
            try {
                db.exec(`ALTER TABLE producto ADD COLUMN allow_encargo INTEGER DEFAULT 1;`)
                db.exec(`ALTER TABLE producto ADD COLUMN encargo_solo_sin_stock INTEGER DEFAULT 1;`)
            } catch (error) {
                if (!error.message.includes('duplicate column name')) throw error
            }
        }
    },
    {
        version: 11,
        up: () => {
            runV1Subcategorias()
            try {
                db.exec(`ALTER TABLE producto ADD COLUMN subcategoria_id TEXT;`)
            } catch (error) {
                if (!error.message.includes('duplicate column name')) throw error
            }
        }
    },
    {
        version: 12,
        up: () => {
            console.log("Applying migration V12: Soporte para múltiples subcategorías")
            try {
                db.exec(`ALTER TABLE producto ADD COLUMN subcategorias_ids_json TEXT;`)
            } catch (error) {
                if (!error.message.includes('duplicate column name')) throw error
            }
        }
    },
    {
        version: 13,
        up: () => {
            console.log("Applying migration V13: Subcategorías Multi-Categoría");
            db.exec(`
                CREATE TABLE IF NOT EXISTS subcategoria_categoria (
                    subcategoria_id TEXT,
                    categoria_id TEXT,
                    PRIMARY KEY (subcategoria_id, categoria_id),
                    FOREIGN KEY(subcategoria_id) REFERENCES subcategoria(id) ON DELETE CASCADE,
                    FOREIGN KEY(categoria_id) REFERENCES categoria(id) ON DELETE CASCADE
                );
            `);
            try {
                db.exec(`
                    INSERT OR IGNORE INTO subcategoria_categoria (subcategoria_id, categoria_id)
                    SELECT id, categoria_id FROM subcategoria WHERE categoria_id IS NOT NULL AND categoria_id != '';
                `);
            } catch (e) {
                console.error("Error migrando subcategorías antiguas", e)
            }
        }
    },
    {
        version: 14,
        up: () => {
            console.log("Applying migration: Tabla de System Logs")
            db.exec(`
                CREATE TABLE IF NOT EXISTS system_logs (
                    id TEXT PRIMARY KEY,
                    tipo TEXT NOT NULL,
                    modulo TEXT NOT NULL,
                    mensaje TEXT NOT NULL,
                    detalles TEXT,
                    fecha TEXT NOT NULL
                );
            `)
        }
    },
    {
        version: 15,
        up: () => {
            runV1Notificaciones()
        }
    },
    {
        version: 16,
        up: () => {
            console.log("Applying migration V16: Notificaciones de Encargos")
            try {
                db.exec(`ALTER TABLE encargos ADD COLUMN notificado INTEGER DEFAULT 0;`)
            } catch (error) {
                if (!error.message.includes('duplicate column name')) throw error
            }
        }
    },
    {
        version: 17,
        up: () => {
            console.log("Applying migration V17: Separando saldos de inventario del catálogo de productos");
            try {
                db.exec(`
                    CREATE TABLE IF NOT EXISTS inventario_saldos (
                        producto_id TEXT PRIMARY KEY,
                        stock REAL DEFAULT 0,
                        min_stock REAL DEFAULT 5,
                        max_stock REAL DEFAULT 100,
                        FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE
                    );
                `)

                const tableInfo = db.pragma("table_info(producto)")
                const hasStock = tableInfo.some(col => col.name === 'stock')

                if (hasStock) {
                    db.exec(`
                        INSERT OR IGNORE INTO inventario_saldos (producto_id, stock, min_stock, max_stock)
                        SELECT id, IFNULL(stock, 0), IFNULL(min_stock, 5), IFNULL(max_stock, 100) FROM producto;
                    `)

                    try {
                        db.exec("ALTER TABLE producto DROP COLUMN stock;")
                        db.exec("ALTER TABLE producto DROP COLUMN min_stock;")
                        db.exec("ALTER TABLE producto DROP COLUMN max_stock;")
                        console.log("Columnas de stock extraídas y eliminadas exitosamente de la tabla producto.")
                    } catch (dropError) {
                        console.warn("Aviso: El motor SQLite actual no soporta DROP COLUMN. Las columnas antiguas quedarán inactivas pero no afectarán el sistema.")
                    }
                } else {
                    console.log("La tabla producto ya fue migrada previamente.")
                }
                
                console.log("Migración V17 finalizada correctamente.")
            } catch (error) {
                console.error("Error crítico en la migración V17", error)
                throw error
            }
        }
    },
    {
        version: 18,
        up: () => {
            console.log("Applying migration V18: Tabla de Control de Sincronización Web (sync_log)");
            db.exec(`
                CREATE TABLE IF NOT EXISTS sync_log (
                    modulo TEXT PRIMARY KEY,
                    last_sync_time TEXT NOT NULL,
                    status TEXT DEFAULT 'pending'
                );
            `);
        }
    },
    {
        version: 19,
        up: () => {
            console.log("Applying migration V19: Tabla de configuraciones generales (Token Sync)")
            db.exec(`
                CREATE TABLE IF NOT EXISTS configuracion (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            `)
        }
    }
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