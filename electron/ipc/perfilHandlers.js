import { ipcMain, app } from "electron"
import { v4 as uuidv4 } from 'uuid'
import { appDb } from "../database/index.js"
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

// Función auxiliar para formatear los bytes a KB/MB
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const registerPerfilHandlers = () => {

    ipcMain.handle("get-perfiles", () => {
        try {
            return appDb.prepare("SELECT * FROM perfiles ORDER BY date_created ASC").all()
        } catch (error) {
            return []
        }
    })

    ipcMain.handle("add-perfil", (_, data) => {
        try {
            const id = uuidv4()
            const safeName = data.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const filename = `store_${safeName}_${Date.now()}.db`;
            
            appDb.prepare(`
                INSERT INTO perfiles (id, nombre, filename, is_active, date_created) 
                VALUES (?, ?, ?, 0, ?)
            `).run(id, data.nombre, filename, new Date().toISOString());

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("switch-perfil", (_, id) => {
        try {
            const transaction = appDb.transaction(() => {
                appDb.prepare("UPDATE perfiles SET is_active = 0").run();
                appDb.prepare("UPDATE perfiles SET is_active = 1 WHERE id = ?").run(id);
            });
            transaction();

            app.relaunch();
            app.exit(0);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-perfil", (_, id) => {
        try {
            const perfil = appDb.prepare("SELECT * FROM perfiles WHERE id = ?").get(id);
            if (!perfil) return { success: false, error: "Perfil no encontrado" };

            if (perfil.filename === 'main.db') {
                return { success: false, error: "Seguridad: No se puede eliminar el perfil principal del sistema." };
            }
            if (perfil.is_active === 1) {
                return { success: false, error: "No se puede eliminar un perfil en uso." };
            }

            appDb.prepare("DELETE FROM perfiles WHERE id = ?").run(id);

            const dbPath = path.join(app.getPath("userData"), "app2", perfil.filename);
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); 

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    })

    // --- NUEVO: Obtener estadísticas de la Base de Datos ---
    ipcMain.handle("get-perfil-stats", (_, filename) => {
        try {
            const dbPath = path.join(app.getPath("userData"), "app2", filename);
            
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: "El archivo físico de la base de datos no existe." };
            }

            // 1. Obtener tamaño del archivo
            const stats = fs.statSync(dbPath);
            const sizeFormatted = formatBytes(stats.size);

            // 2. Abrir conexión temporal en modo solo lectura
            const tempDb = new Database(dbPath, { readonly: true });
            
            // 3. Buscar todas las tablas (ignorando las del sistema interno de sqlite)
            const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            
            // 4. Contar las filas de cada tabla
            const tableStats = tables.map(t => {
                const countRow = tempDb.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
                return {
                    name: t.name,
                    rows: countRow.count
                };
            });

            tempDb.close(); // Cerrar conexión temporal

            return { 
                success: true, 
                size: sizeFormatted, 
                tables: tableStats 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    })
}