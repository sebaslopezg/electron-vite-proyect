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

    ipcMain.handle("get-cartera-paginada", (_, dtParams) => {
        try {
            const limit = parseInt(dtParams.length, 10) || 10;
            const offset = parseInt(dtParams.start, 10) || 0;
            const searchValue = dtParams.search?.value || '';
            const orderColIndex = dtParams.order?.[0]?.column || 0;
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';

            const columnsMap = ['numero_factura', 'documento_cliente', 'nombre_cliente', 'date_created', 'total_factura', 'saldo_pendiente'];
            let orderCol = columnsMap[orderColIndex] || 'date_created';

            let baseQuery = `FROM ventasMaestro WHERE saldo_pendiente > 0 AND status > 0`;
            let queryParams = [];

            if (searchValue) {
                baseQuery += ` AND (numero_factura LIKE ? OR documento_cliente LIKE ? OR nombre_cliente LIKE ?)`;
                const likeParam = `%${searchValue}%`;
                queryParams.push(likeParam, likeParam, likeParam);
            }

            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ventasMaestro WHERE saldo_pendiente > 0 AND status > 0`).get();
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);

            const data = db.prepare(`
                SELECT * ${baseQuery} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?
            `).all(...queryParams, limit, offset);

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data };
        } catch (error) {
            console.error("Error en paginación de cartera: ", error);
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
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

    ipcMain.handle("get-abonos", () => {
        try {
            const stmt = db.prepare(`
                SELECT a.*, 
                    v.prefijo, 
                    v.numero_factura, 
                    v.nombre_cliente, 
                    v.documento_cliente,
                    v.saldo_pendiente
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                ORDER BY a.date_created DESC
            `);
            const abonos = stmt.all();
            const confStmt = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`);
            const configuracion = confStmt.get();

            return { success: true, data: abonos, configuracion: configuracion };
        } catch (error) {
            console.error("Error obteniendo el historial de abonos:", error);
            return { success: false, data: [] };
        }
    });

    ipcMain.handle("get-abonos-paginados", (_, dtParams) => {
        try {
            const limit = parseInt(dtParams.length, 10) || 10;
            const offset = parseInt(dtParams.start, 10) || 0;
            const searchValue = dtParams.search?.value || '';
            const orderColIndex = dtParams.order?.[0]?.column || 0;
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';

            const columnsMap = ['a.date_created', 'v.numero_factura', 'v.nombre_cliente', 'a.metodo_pago', 'a.valor', 'a.usuario'];
            let orderCol = columnsMap[orderColIndex] || 'a.date_created';

            let baseQuery = `
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                WHERE 1=1
            `;
            let queryParams = [];

            if (searchValue) {
                baseQuery += ` AND (v.numero_factura LIKE ? OR v.nombre_cliente LIKE ? OR a.metodo_pago LIKE ? OR a.usuario LIKE ?)`;
                const likeParam = `%${searchValue}%`;
                queryParams.push(likeParam, likeParam, likeParam, likeParam);
            }

            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM abonos_ventas`).get();
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);

            const dataQuery = `
                SELECT a.*, 
                       v.prefijo, 
                       v.numero_factura, 
                       v.nombre_cliente, 
                       v.documento_cliente,
                       v.saldo_pendiente
                ${baseQuery}
                ORDER BY ${orderCol} ${orderDir}
                LIMIT ? OFFSET ?
            `;
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data };
        } catch (error) {
            console.error("Error en paginación de abonos: ", error);
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
    });
};