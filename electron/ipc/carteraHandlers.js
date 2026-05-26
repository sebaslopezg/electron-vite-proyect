import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

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
        if (!checkPermission("cartera_ver")) return [];
        try {
            const stmt = db.prepare(`
                SELECT * FROM ventasMaestro 
                WHERE saldo_pendiente > 0 AND status > 0 
                ORDER BY date_created ASC
            `);
            return stmt.all()
        } catch (error) {
            logger.error('CARTERA', "Fallo al consultar la lista completa de deudores", error)
            return []
        }
    })

    ipcMain.handle("get-cartera-paginada", (_, dtParams) => {
        if (!checkPermission("cartera_ver")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''
            const orderColIndex = dtParams.order?.[0]?.column || 0
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'

            const columnsMap = ['numero_factura', 'documento_cliente', 'nombre_cliente', 'date_created', 'total_factura', 'saldo_pendiente']
            let orderCol = columnsMap[orderColIndex] || 'date_created'

            let baseQuery = `FROM ventasMaestro WHERE saldo_pendiente > 0 AND status > 0`
            let queryParams = []

            if (searchValue) {
                baseQuery += ` AND (numero_factura LIKE ? OR documento_cliente LIKE ? OR nombre_cliente LIKE ?)`
                const likeParam = `%${searchValue}%`
                queryParams.push(likeParam, likeParam, likeParam)
            }

            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ventasMaestro WHERE saldo_pendiente > 0 AND status > 0`).get()
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)

            const data = db.prepare(`
                SELECT * ${baseQuery} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?
            `).all(...queryParams, limit, offset)

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data }
        } catch (error) {
            logger.error('CARTERA', "Fallo en la paginación y búsqueda del módulo de Cartera", error)
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
    })

    ipcMain.handle("add-abono", (_, data) => {
        if (!checkPermission("cartera_abonar")) {
            return { success: false, error: "No cuentas con privilegios de rol para alterar saldos de cartera." };
        }
        
        const transaction = db.transaction((abono) => {
            const now = new Date().toISOString();
            const abonoId = uuidv4();
            
            const usuarioActivo = global.currentUserSession?.username || 'system';

            const facturaInfo = db.prepare("SELECT numero_factura, nombre_cliente, saldo_pendiente FROM ventasMaestro WHERE id = ?").get(abono.maestro_id)

            const insertAbono = db.prepare(`
                INSERT INTO abonos_ventas (id, maestro_id, valor, metodo_pago, observaciones, date_created, usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            insertAbono.run(abonoId, abono.maestro_id, abono.valor, abono.metodo_pago, abono.observaciones, now, usuarioActivo)

            const updateMaestro = db.prepare(`
                UPDATE ventasMaestro 
                SET total_recibido = total_recibido + ?, 
                    saldo_pendiente = saldo_pendiente - ?
                WHERE id = ?
            `)
            updateMaestro.run(abono.valor, abono.valor, abono.maestro_id)

            if (facturaInfo) {
                logger.success(
                    'CARTERA', 
                    `Abono de $${abono.valor} registrado por @${usuarioActivo}`, 
                    `Factura N° ${facturaInfo.numero_factura}. Cliente: ${facturaInfo.nombre_cliente}.`
                )
            }

            return abonoId
        })

        try {
            const id = transaction(data)
            return { success: true, id }
        } catch (error) {
            logger.error('CARTERA', "Error crítico al intentar guardar un abono", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-abonos", () => {
        if (!checkPermission("cartera_historial_ver")) return { success: false, data: [], error: "No autorizado" };
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
            `)
            const abonos = stmt.all();
            const configuracion = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`).get()

            return { success: true, data: abonos, configuracion: configuracion }
        } catch (error) {
            logger.error('CARTERA', "Fallo al consultar el historial completo de abonos", error)
            return { success: false, data: [] }
        }
    })

    ipcMain.handle("get-abonos-paginados", (_, dtParams) => {
        if (!checkPermission("cartera_historial_ver")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''
            const orderColIndex = dtParams.order?.[0]?.column || 0
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'

            const columnsMap = ['a.date_created', 'v.numero_factura', 'v.nombre_cliente', 'a.metodo_pago', 'a.valor', 'a.usuario']
            let orderCol = columnsMap[orderColIndex] || 'a.date_created'

            let baseQuery = `
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                WHERE 1=1
            `
            let queryParams = []

            if (searchValue) {
                baseQuery += ` AND (v.numero_factura LIKE ? OR v.nombre_cliente LIKE ? OR a.metodo_pago LIKE ? OR a.usuario LIKE ?)`
                const likeParam = `%${searchValue}%`
                queryParams.push(likeParam, likeParam, likeParam, likeParam)
            }

            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM abonos_ventas`).get()
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)

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
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset)

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data }
        } catch (error) {
            logger.error('CARTERA', "Fallo en la paginación y búsqueda del historial de abonos", error)
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
    })
}