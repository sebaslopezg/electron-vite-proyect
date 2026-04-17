import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerCarteraHandlers = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS abonos_ventas (
            id TEXT PRIMARY KEY,
            maestro_id TEXT,
            valor REAL,
            metodo_pago TEXT,
            observaciones TEXT,
            date_created TEXT,
            usuario TEXT
        );
    `);

    ipcMain.handle("get-cartera", () => {
        try {
            const stmt = db.prepare(`
                SELECT * FROM ventasMaestro 
                WHERE saldo_pendiente > 0 AND status > 0 
                ORDER BY date_created ASC
            `);
            return stmt.all();
        } catch (error) {
            console.error("Error obteniendo cartera:", error);
            return [];
        }
    });

    ipcMain.handle("add-abono", (_, data) => {
        const transaction = db.transaction((abono) => {
            const now = new Date().toISOString();
            const abonoId = uuidv4();

            const insertAbono = db.prepare(`
                INSERT INTO abonos_ventas (id, maestro_id, valor, metodo_pago, observaciones, date_created, usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertAbono.run(abonoId, abono.maestro_id, abono.valor, abono.metodo_pago, abono.observaciones, now, 'Admin');

            const updateMaestro = db.prepare(`
                UPDATE ventasMaestro 
                SET total_recibido = total_recibido + ?, 
                    saldo_pendiente = saldo_pendiente - ?
                WHERE id = ?
            `);
            updateMaestro.run(abono.valor, abono.valor, abono.maestro_id);

            return abonoId;
        });

        try {
            const id = transaction(data);
            return { success: true, id };
        } catch (error) {
            console.error("Error registrando abono:", error);
            return { success: false, error: error.message };
        }
    });
};