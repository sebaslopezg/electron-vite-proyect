import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

const dbDir = path.join(app.getPath("userData"), "app2");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// BASE DE DATOS DEL SISTEMA (Siempre es data.db)
export const appDb = new Database(path.join(dbDir, "data.db"));

// BASE DE DATOS DEL NEGOCIO (Dinámica)
let tenantDbInstance = null;

export const switchTenantDb = (filename) => {
    if (tenantDbInstance) {
        tenantDbInstance.close();
    }
    tenantDbInstance = new Database(path.join(dbDir, filename));
    tenantDbInstance.pragma('foreign_keys = ON'); // Habilitar relaciones seguras
    return tenantDbInstance;
}

// PROXY
const dbProxy = new Proxy({}, {
    get: (target, prop) => {
        if (!tenantDbInstance) throw new Error("Ningún perfil de base de datos ha sido cargado.");
        const value = tenantDbInstance[prop];
        return typeof value === 'function' ? value.bind(tenantDbInstance) : value;
    }
});

export default dbProxy;