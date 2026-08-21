import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerNotificacionesHandlers = () => {
    
    ipcMain.handle("get-notificaciones", () => {
        try {
            return db.prepare("SELECT * FROM notificaciones ORDER BY date_created DESC LIMIT 50").all();
        } catch (error) {
            logger.error('NOTIFICACIONES', "Error al obtener notificaciones", error)
            return []
        }
    });

    ipcMain.handle("marcar-notificacion-leida", (_, id) => {
        try {
            if (id === 'all') {
                db.prepare("UPDATE notificaciones SET leida = 1 WHERE leida = 0").run();
            } else {
                db.prepare("UPDATE notificaciones SET leida = 1 WHERE id = ?").run(id);
            }
            return { success: true };
        } catch (error) {
            logger.error('NOTIFICACIONES', "Error al marcar como leída", error)
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("add-notificacion", (_, item) => {
        try {
            const id = uuidv4();
            const now = new Date().toISOString();
            
            db.prepare(`
                INSERT INTO notificaciones (id, titulo, mensaje, tipo, link, leida, date_created)
                VALUES (@id, @titulo, @mensaje, @tipo, @link, 0, @now)
            `).run({
                id,
                titulo: item.titulo || 'Notificación',
                mensaje: item.mensaje || '',
                tipo: item.tipo || 'info',
                link: item.link || '',
                now
            });
            
            return { success: true, id };
        } catch (error) {
            logger.error('NOTIFICACIONES', "Error al crear notificación", error)
            return { success: false, error: error.message };
        }
    });
}