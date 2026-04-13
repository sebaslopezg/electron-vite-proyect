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
import { createEncargosTable } from './tables/Encargos.js'
import { createCategoriasEtiquetasTables } from './tables/categorias_etiquetas.js'
import { appDb, switchTenantDb } from "./index.js";


export const initDatabase = () => {
    try {
        // CONFIGURAR LA BASE DE DATOS DEL SISTEMA (Perfiles) ---
        appDb.exec(`
            CREATE TABLE IF NOT EXISTS perfiles (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                filename TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                date_created TEXT
            )
        `);

        const countRow = appDb.prepare("SELECT count(*) as count FROM perfiles").get();
        if (countRow.count === 0) {
            appDb.prepare("INSERT INTO perfiles (id, nombre, filename, is_active, date_created) VALUES (?, ?, ?, ?, ?)").run(
                '1', 'Mi Tienda Principal', 'main.db', 1, new Date().toISOString()
            );
        }
        const activeProfile = appDb.prepare("SELECT filename FROM perfiles WHERE is_active = 1").get();

        switchTenantDb(activeProfile.filename); 

        // CREAR TODAS LAS TABLAS DE LA TIENDA ---
        // A partir de aquí, todas estas funciones usarán el dbProxy automáticamente
        createConfigurarTable();
        // createProductoTable();
        // createCategoriasEtiquetasTables();
        createProductoTable()
        createClientesTable()
        createAlmacenConfTable()
        createInventarioTable()
        createBitacoraTable()
        createVentasMaestroTable()
        createVentasDetalleTable()
        createNotasTables()
        createEncargosTable()
        createCategoriasEtiquetasTables()
        //await runMigrations()

        console.log(`Conectado al perfil: ${activeProfile.filename}`);
    } catch (error) {
        console.error("Error inicializando bases de datos:", error);
    }
}