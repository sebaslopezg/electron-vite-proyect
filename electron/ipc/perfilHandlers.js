import { ipcMain, app } from "electron"
import { v4 as uuidv4 } from 'uuid'
import { appDb } from "../database/index.js"
import fs from 'fs'
import path from 'path'

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
            // Creamos un nombre de archivo seguro sin espacios ni caracteres raros
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
            // Transacción: Desactivamos todos, y activamos solo el seleccionado
            const transaction = appDb.transaction(() => {
                appDb.prepare("UPDATE perfiles SET is_active = 0").run();
                appDb.prepare("UPDATE perfiles SET is_active = 1 WHERE id = ?").run(id);
            });
            transaction();

            // REINICIAMOS LA APP DE ELECTRON PARA APLICAR CAMBIOS SEGUROS
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
                return { success: false, error: "No se puede eliminar un perfil que está actualmente en uso. Cambie a otro primero." };
            }

            appDb.prepare("DELETE FROM perfiles WHERE id = ?").run(id);

            const dbPath = path.join(app.getPath("userData"), "app2", perfil.filename);
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    })
}