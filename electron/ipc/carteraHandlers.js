import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { triggerBackgroundPush } from "./syncHandlers.js"

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
        )
    `)

    ipcMain.handle("get-cartera", () => {
        if (!checkPermission("cartera_ver")) return []
        try {
            const stmt = db.prepare(`
                SELECT 
                    v.*,
                    COALESCE(t.saldo_favor, 0) as cliente_saldo_favor
                FROM ventasMaestro v
                LEFT JOIN (
                    SELECT numero_documento, MAX(COALESCE(saldo_favor, 0)) as saldo_favor
                    FROM terceros
                    WHERE estado != -1
                    GROUP BY numero_documento
                ) t ON v.documento_cliente = t.numero_documento
                WHERE v.saldo_pendiente > 0 AND v.status > 0 
                ORDER BY v.date_created ASC
            `)
            return stmt.all()
        } catch (error) {
            logger.error('CARTERA', 'Failed to fetch full debtors list', error)
            return []
        }
    })

    ipcMain.handle("get-cartera-paginada", (_, dtParams) => {
        if (!checkPermission("cartera_ver")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''
            const orderColIndex = dtParams.order?.[0]?.column || 0
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'

            const columnsMap = [
                'v.numero_factura',
                'v.documento_cliente',
                'v.nombre_cliente',
                'v.date_created',
                'v.total_factura',
                'v.saldo_pendiente'
            ]
            const orderCol = columnsMap[orderColIndex] || 'v.date_created'

            let baseQuery = `
                FROM ventasMaestro v
                LEFT JOIN (
                    SELECT numero_documento, MAX(COALESCE(saldo_favor, 0)) as saldo_favor
                    FROM terceros
                    WHERE estado != -1
                    GROUP BY numero_documento
                ) t ON v.documento_cliente = t.numero_documento
                WHERE v.saldo_pendiente > 0 AND v.status > 0
            `
            const queryParams = []

            if (searchValue) {
                baseQuery += ` AND (v.numero_factura LIKE ? OR v.documento_cliente LIKE ? OR v.nombre_cliente LIKE ?)`
                const likeParam = `%${searchValue}%`
                queryParams.push(likeParam, likeParam, likeParam)
            }

            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ventasMaestro WHERE saldo_pendiente > 0 AND status > 0`).get()
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)

            const data = db.prepare(`
                SELECT 
                    v.*,
                    COALESCE(t.saldo_favor, 0) as cliente_saldo_favor
                ${baseQuery}
                ORDER BY ${orderCol} ${orderDir}
                LIMIT ? OFFSET ?
            `).all(...queryParams, limit, offset)

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data }
        } catch (error) {
            logger.error('CARTERA', 'Failed to paginate and search receivables', error)
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
    })

    ipcMain.handle("add-abono", (_, data) => {
        if (!checkPermission("cartera_abonar")) {
            return { success: false, error: "No cuentas con privilegios de rol para alterar saldos de cartera." }
        }

        const transaction = db.transaction((paymentData) => {
            const nowIso = new Date().toISOString()
            const localNowRow = db.prepare("SELECT datetime('now', 'localtime') as nowStr").get()
            const localNow = localNowRow.nowStr
            const activeUser = global.currentUserSession?.username || 'system'

            const invoiceInfo = db.prepare(`
                SELECT id, numero_factura, prefijo, documento_cliente, nombre_cliente, saldo_pendiente
                FROM ventasMaestro
                WHERE id = ?
            `).get(paymentData.maestro_id)

            if (!invoiceInfo) {
                throw new Error("Invoice not found")
            }

            const pendingBalance = Math.max(0, Number(invoiceInfo.saldo_pendiente) || 0)
            if (pendingBalance <= 0) {
                throw new Error("This invoice has no pending balance")
            }

            

            const explicitCreditUsed = Math.max(0, Number(paymentData.saldo_favor_usado) || 0)
            const rawAmount = Math.max(0, Number(paymentData.valor) || 0)
            const isDirectCreditMethod = paymentData.metodo_pago === 'Saldo a Favor'

            const creditRequested = explicitCreditUsed > 0
                ? explicitCreditUsed
                : (isDirectCreditMethod ? rawAmount : 0)

            const otherAmount = isDirectCreditMethod ? 0 : rawAmount

            const totalPayment = creditRequested + otherAmount

            if (totalPayment <= 0) {
                throw new Error("Total payment amount must be greater than 0")
            }

            if (totalPayment > pendingBalance + 0.01) {
                throw new Error("Total payment amount exceeds pending invoice debt")
            }

            let creditUsed = 0
            let remainingCreditBalance = 0

            if (creditRequested > 0) {
                const clientDoc = (invoiceInfo.documento_cliente || '').trim()
                if (!clientDoc) {
                    throw new Error("Client document is required to apply credit balance")
                }

                const clientRecord = db.prepare(`
                    SELECT id, COALESCE(saldo_favor, 0) as saldo_favor
                    FROM terceros
                    WHERE numero_documento = ? AND estado != -1
                    LIMIT 1
                `).get(clientDoc)

                if (!clientRecord) {
                    throw new Error("Client not found in terceros to apply credit balance")
                }

                const availableCredit = Number(clientRecord.saldo_favor) || 0
                if (creditRequested > availableCredit + 0.01) {
                    throw new Error("Insufficient client credit balance")
                }

                creditUsed = Math.min(creditRequested, availableCredit, pendingBalance)
                remainingCreditBalance = Math.max(0, availableCredit - creditUsed)

                db.prepare(`
                    UPDATE terceros
                    SET saldo_favor = ?, date_modify = ?
                    WHERE id = ?
                `).run(remainingCreditBalance, localNow, clientRecord.id)
            }

            const insertPayment = db.prepare(`
                INSERT INTO abonos_ventas (id, maestro_id, valor, metodo_pago, observaciones, date_created, usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)

            const createdIds = []

            if (creditUsed > 0) {
                const creditPaymentId = uuidv4()
                insertPayment.run(
                    creditPaymentId,
                    paymentData.maestro_id,
                    creditUsed,
                    'Saldo a Favor',
                    paymentData.observaciones || '',
                    nowIso,
                    activeUser
                )
                createdIds.push(creditPaymentId)
            }

            if (otherAmount > 0) {
                const otherPaymentId = uuidv4()
                insertPayment.run(
                    otherPaymentId,
                    paymentData.maestro_id,
                    otherAmount,
                    paymentData.metodo_pago || 'Efectivo',
                    paymentData.observaciones || '',
                    nowIso,
                    activeUser
                )
                createdIds.push(otherPaymentId)
            }

            const appliedTotal = Math.min(pendingBalance, creditUsed + otherAmount)
            const newPendingBalance = Math.max(0, pendingBalance - appliedTotal)

            db.prepare(`
                UPDATE ventasMaestro
                SET total_recibido = total_recibido + ?,
                    saldo_pendiente = ?,
                    date_modify = ?
                WHERE id = ?
            `).run(appliedTotal, newPendingBalance, nowIso, paymentData.maestro_id)

            logger.success(
                'CARTERA',
                `Payment of $${appliedTotal} registered by @${activeUser}`,
                `Invoice ${invoiceInfo.prefijo || ''}${invoiceInfo.numero_factura}. Client: ${invoiceInfo.nombre_cliente}. Credit used: $${creditUsed}.`
            )

            return {
                primaryId: createdIds[0] || null,
                creditUsed,
                remainingCreditBalance
            }
        })

        try {
            const txResult = transaction(data)

            triggerBackgroundPush('ventasMaestro').catch(e => logger.error('SYNC', 'Background push error after portfolio payment', e))

            if (txResult.creditUsed > 0) {
                triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Background push error for terceros after credit payment', e))
            }

            return {
                success: true,
                id: txResult.primaryId,
                creditUsed: txResult.creditUsed,
                remainingCreditBalance: txResult.remainingCreditBalance
            }
        } catch (error) {
            logger.error('CARTERA', 'Critical error while saving portfolio payment', error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-abonos", () => {
        if (!checkPermission("cartera_historial_ver")) return { success: false, data: [], error: "No autorizado" }
        try {
            const stmt = db.prepare(`
                SELECT a.*, 
                    v.prefijo, 
                    v.separador,
                    v.numero_factura, 
                    v.nombre_cliente, 
                    v.documento_cliente,
                    v.saldo_pendiente,
                    v.subtotal,
                    v.descuento,
                    v.iva,
                    v.total_factura,
                    v.tipo_pago,
                    v.total_recibido,
                    v.metodo_pago as metodo_pago_factura,
                    v.date_created as fecha_factura
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                ORDER BY a.date_created DESC
            `)
            const payments = stmt.all()
            const storeConfig = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`).get()

            return { success: true, data: payments, configuracion: storeConfig }
        } catch (error) {
            logger.error('CARTERA', 'Failed to fetch full payment history', error)
            return { success: false, data: [] }
        }
    })

    ipcMain.handle("get-abonos-paginados", (_, dtParams) => {
        if (!checkPermission("cartera_historial_ver")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''
            const orderColIndex = dtParams.order?.[0]?.column || 0
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'

            const columnsMap = ['a.date_created', 'v.numero_factura', 'v.nombre_cliente', 'a.metodo_pago', 'a.valor', 'a.usuario']
            const orderCol = columnsMap[orderColIndex] || 'a.date_created'

            let baseQuery = `
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                WHERE 1=1
            `
            const queryParams = []

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
                       v.separador,
                       v.numero_factura, 
                       v.nombre_cliente, 
                       v.documento_cliente,
                       v.saldo_pendiente,
                       v.subtotal,
                       v.descuento,
                       v.iva,
                       v.total_factura,
                       v.tipo_pago,
                       v.total_recibido,
                       v.metodo_pago as metodo_pago_factura,
                       v.date_created as fecha_factura
                ${baseQuery}
                ORDER BY ${orderCol} ${orderDir}
                LIMIT ? OFFSET ?
            `
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset)

            return { draw: dtParams.draw, recordsTotal: totalRow.count, recordsFiltered: filteredRow.count, data }
        } catch (error) {
            logger.error('CARTERA', 'Failed to paginate and search payment history', error)
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
    })
}