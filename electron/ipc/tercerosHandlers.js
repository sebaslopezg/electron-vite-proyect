import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"
import { logger } from "../utils/logger.js"
import { canModifyModule, triggerBackgroundPush } from "./syncHandlers.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerTercerosHandlers = () => {

  ipcMain.handle("get-terceros", () => {
    if (!checkPermission("terceros_ver") && !checkPermission("clientes_ver") && !checkPermission("ventas_crear")) {
        return { success: false, error: "No autorizado" }
    }
    try {
        const data = db.prepare("SELECT * FROM terceros WHERE estado = 1 ORDER BY date_created DESC").all()
        return { success: true, data }
    } catch (error) { 
        logger.error('TERCEROS', "Error al obtener la lista de terceros activos", error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("crear-tercero", async (event, tercero) => {
    if (!checkPermission("terceros_crear") && !checkPermission("clientes_crear") && !checkPermission("ventas_crear")) return { success: false, error: "No autorizado" }
    if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa en modo solo lectura.' }
    
    try {
        const id = uuidv4()
        db.prepare(`
            INSERT INTO terceros (
                id, tipo_documento, numero_documento, digito_verificacion, 
                tipo_persona, razon_social, nombres, apellidos, direccion, 
                telefono, email, ciudad_id, es_cliente, es_proveedor, estado, date_created, date_modify
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `).run(
            id, tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion,
            tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos,
            tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id,
            tercero.es_cliente, tercero.es_proveedor
        )
        
        const identificador = tercero.tipo_persona === 'juridica' ? tercero.razon_social : `${tercero.nombres} ${tercero.apellidos}`
        logger.success('TERCEROS', `Nuevo tercero registrado exitosamente: ${identificador} (Doc: ${tercero.numero_documento})`)

        triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error en push background (terceros)', e))

        return { success: true }
    } catch (error) { 
        logger.error('TERCEROS', `Error al intentar registrar el tercero con documento: ${tercero?.numero_documento}`, error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("actualizar-tercero", async (event, tercero) => {
    if (!checkPermission("terceros_editar") && !checkPermission("clientes_editar")) return { success: false, error: "No autorizado" };
    if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa en modo solo lectura.' }
    
    try {
        db.prepare(`
            UPDATE terceros SET 
                tipo_documento = ?, numero_documento = ?, digito_verificacion = ?, 
                tipo_persona = ?, razon_social = ?, nombres = ?, apellidos = ?, 
                direccion = ?, telefono = ?, email = ?, ciudad_id = ?, 
                es_cliente = ?, es_proveedor = ?, estado = ?, date_modify = datetime('now', 'localtime') 
            WHERE id = ?
        `).run(
            tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion,
            tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos,
            tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id,
            tercero.es_cliente, tercero.es_proveedor, tercero.estado, tercero.id
        )
        
        logger.success('TERCEROS', `Datos del tercero ID ${tercero.id} actualizados correctamente`)

        triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error en push background (terceros)', e))

        return { success: true }
    } catch (error) { 
        logger.error('TERCEROS', `Error al actualizar la información del tercero ID: ${tercero?.id}`, error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("desactivar-tercero", async (event, id) => {
      if (!checkPermission("terceros_desactivar") && !checkPermission("clientes_desactivar")) return { success: false, error: "No autorizado" }
      if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
      try {
          db.prepare("UPDATE terceros SET estado = 0, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
          logger.success('TERCEROS', `Tercero con ID ${id} fue desactivado exitosamente`)

          triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error en push background (terceros)', e))

          return { success: true }
      } catch (error) { 
          logger.error('TERCEROS', `Error al desactivar el tercero ID: ${id}`, error)
          return { success: false, error: error.message } 
      }
  })

  ipcMain.handle("reactivar-tercero", async (event, id) => {
      if (!checkPermission("terceros_editar") && !checkPermission("clientes_editar")) return { success: false, error: "No autorizado" }
      if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
      try {
          db.prepare("UPDATE terceros SET estado = 1, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
          logger.success('TERCEROS', `Tercero con ID ${id} fue reactivado exitosamente`)

          triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error en push background (terceros)', e))

          return { success: true }
      } catch (error) { 
          logger.error('TERCEROS', `Error al reactivar el tercero ID: ${id}`, error)
          return { success: false, error: error.message } 
      }
  })

  ipcMain.handle("eliminar-tercero", async (event, id) => {
    if (!checkPermission("terceros_eliminar") && !checkPermission("clientes_eliminar")) return { success: false, error: "No autorizado" }
    if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
    try {
        db.prepare("UPDATE terceros SET estado = -1, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
        logger.success('TERCEROS', `Tercero con ID ${id} fue dado de baja lógicamente (Soft Delete)`)

        triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error en push background (terceros)', e))

        return { success: true }
    } catch (error) { 
        logger.error('TERCEROS', `Error al aplicar Soft Delete al tercero ID: ${id}`, error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("get-terceros-paginados", async (event, params) => {
    try {
        const { start, length, search, soloClientes, estado } = params
        const searchValue = search?.value || ''
        const estadoFinal = estado !== undefined ? Number(estado) : 1

        if (estadoFinal === 1 && !checkPermission("terceros_ver") && !checkPermission("clientes_ver")) {
            return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
        if (estadoFinal === 0 && !checkPermission("terceros_inactivos_ver") && !checkPermission("clientes_inactivos_ver")) {
            return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
        
        let whereClause = "estado = ?"
        let queryParams = [estadoFinal]
        
        if (soloClientes) whereClause += " AND es_cliente = 1"
        
        if (searchValue) {
            whereClause += ` AND (numero_documento LIKE ? OR razon_social LIKE ? OR nombres LIKE ? OR apellidos LIKE ?)`
            const likeSearch = `%${searchValue}%`
            queryParams.push(likeSearch, likeSearch, likeSearch, likeSearch)
        }
        
        const totalQuery = db.prepare(`SELECT COUNT(*) as count FROM terceros WHERE estado = ? ${soloClientes ? 'AND es_cliente = 1' : ''}`).get(estadoFinal)
        const filteredQuery = db.prepare(`SELECT COUNT(*) as count FROM terceros WHERE ${whereClause}`).get(...queryParams)
        const dataQuery = db.prepare(`SELECT * FROM terceros WHERE ${whereClause} ORDER BY date_created DESC LIMIT ? OFFSET ?`).all(...queryParams, length, start)
        
        return { draw: params.draw, recordsTotal: totalQuery.count, recordsFiltered: filteredQuery.count, data: dataQuery }
    } catch (error) { 
        logger.error('TERCEROS', "Error al compilar listado dinámico", error)
        return { error: error.message } 
    }
  })

  ipcMain.handle("get-cliente-saldo", (event, params = {}) => {
    if (
            !checkPermission("terceros_ver") && 
            !checkPermission("clientes_ver") && 
            !checkPermission("ventas_crear") && 
            !checkPermission("notas_crear") && 
            !checkPermission("cartera_ver") && 
            !checkPermission("cartera_abonar"
        )) {
        return { success: false, error: "No autorizado" }
    }

    try {
        const id = typeof params === 'object' ? (params.id || params.clienteId) : null
        const documento = typeof params === 'object' ? params.documento : params

        let whereClause = ""
        let queryParam = null

        if (id) {
            whereClause = "t.id = ?"
            queryParam = id
        } else if (documento) {
            whereClause = "t.numero_documento = ?"
            queryParam = documento
        } else {
            return { success: false, error: "Debe proporcionar id o documento del cliente" }
        }

        const cliente = db.prepare(`
            SELECT 
                t.id,
                t.tipo_documento,
                t.numero_documento,
                t.digito_verificacion,
                t.tipo_persona,
                t.razon_social,
                t.nombres,
                t.apellidos,
                t.estado,
                COALESCE(t.saldo_favor, 0) as saldo_favor,
                COALESCE(v.deuda_total, 0) as deuda_total,
                COALESCE(v.facturas_pendientes, 0) as facturas_pendientes
            FROM terceros t
            LEFT JOIN (
                SELECT 
                    documento_cliente,
                    SUM(CASE WHEN saldo_pendiente > 0 THEN saldo_pendiente ELSE 0 END) as deuda_total,
                    COUNT(CASE WHEN saldo_pendiente > 0 THEN 1 END) as facturas_pendientes
                FROM ventasMaestro
                GROUP BY documento_cliente
            ) v ON v.documento_cliente = t.numero_documento
            WHERE ${whereClause} AND t.estado != -1
            LIMIT 1
        `).get(queryParam)

        if (!cliente) {
            return { success: false, error: "Cliente no encontrado" }
        }

        return {
            success: true,
            data: {
                ...cliente,
                saldo_favor: Number(cliente.saldo_favor) || 0,
                deuda_total: Number(cliente.deuda_total) || 0,
                facturas_pendientes: Number(cliente.facturas_pendientes) || 0
            }
        }
    } catch (error) {
        logger.error('TERCEROS', "Error al consultar el saldo del cliente", error)
        return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-clientes-saldos-paginados", async (event, params = {}) => {
    if (!checkPermission("terceros_ver") && !checkPermission("clientes_ver")) {
        return { draw: params.draw || 1, recordsTotal: 0, recordsFiltered: 0, data: [], resumen: { totalDeuda: 0, totalFavor: 0 } }
    }

    try {
        const draw = Number(params.draw) || 1
        const start = Number(params.start) || 0
        const length = Number(params.length) || 10
        const searchValue = (params.search?.value || '').trim()
        const tipoSaldo = params.tipoSaldo || 'todos'

        const baseFrom = `
            FROM terceros t
            LEFT JOIN (
                SELECT 
                    documento_cliente,
                    SUM(CASE WHEN saldo_pendiente > 0 THEN saldo_pendiente ELSE 0 END) as deuda_total,
                    COUNT(CASE WHEN saldo_pendiente > 0 THEN 1 END) as facturas_pendientes
                FROM ventasMaestro
                GROUP BY documento_cliente
            ) v ON v.documento_cliente = t.numero_documento
        `

        const baseWhere = `
            WHERE t.es_cliente = 1 
              AND t.estado != -1 
              AND (COALESCE(t.saldo_favor, 0) > 0 OR COALESCE(v.deuda_total, 0) > 0)
        `

        const totalQuery = db.prepare(`SELECT COUNT(*) as count ${baseFrom} ${baseWhere}`).get()
        const resumenQuery = db.prepare(`
            SELECT 
                COALESCE(SUM(COALESCE(v.deuda_total, 0)), 0) as totalDeuda,
                COALESCE(SUM(COALESCE(t.saldo_favor, 0)), 0) as totalFavor
            ${baseFrom}
            ${baseWhere}
        `).get()

        const conditions = []
        const queryParams = []

        if (tipoSaldo === 'deuda') {
            conditions.push(`COALESCE(v.deuda_total, 0) > 0`)
        } else if (tipoSaldo === 'favor') {
            conditions.push(`COALESCE(t.saldo_favor, 0) > 0`)
        }

        if (searchValue) {
            conditions.push(`(
                t.numero_documento LIKE ? OR 
                t.razon_social LIKE ? OR 
                t.nombres LIKE ? OR 
                t.apellidos LIKE ? OR
                (COALESCE(t.nombres, '') || ' ' || COALESCE(t.apellidos, '')) LIKE ?
            )`)
            const likeSearch = `%${searchValue}%`
            queryParams.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch)
        }

        const extraWhere = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : ''

        const filteredQuery = db.prepare(`SELECT COUNT(*) as count ${baseFrom} ${baseWhere}${extraWhere}`).get(...queryParams)

        const orderColIdx = params.order?.[0]?.column
        const orderDir = params.order?.[0]?.dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
        const orderMap = {
            0: 't.numero_documento',
            1: "CASE WHEN t.tipo_persona = 'juridica' THEN t.razon_social ELSE t.nombres END",
            3: 'deuda_total',
            4: 'saldo_favor'
        }
        const orderBy = orderMap[orderColIdx] || 'deuda_total DESC, saldo_favor'

        const dataQuery = db.prepare(`
            SELECT 
                t.*,
                COALESCE(t.saldo_favor, 0) as saldo_favor,
                COALESCE(v.deuda_total, 0) as deuda_total,
                COALESCE(v.facturas_pendientes, 0) as facturas_pendientes
            ${baseFrom}
            ${baseWhere}${extraWhere}
            ORDER BY ${orderBy} ${orderDir}
            LIMIT ? OFFSET ?
        `).all(...queryParams, length, start)

        return {
            draw,
            recordsTotal: totalQuery.count,
            recordsFiltered: filteredQuery.count,
            data: dataQuery,
            resumen: {
                totalDeuda: Number(resumenQuery?.totalDeuda) || 0,
                totalFavor: Number(resumenQuery?.totalFavor) || 0
            }
        }
    } catch (error) {
        logger.error('TERCEROS', "Error al obtener listado paginado de saldos de clientes", error)
        return { draw: params.draw || 1, recordsTotal: 0, recordsFiltered: 0, data: [], resumen: { totalDeuda: 0, totalFavor: 0 }, error: error.message }
    }
  })

  ipcMain.handle("get-tercero-detalle-completo", (event, params = {}) => {
    if (!checkPermission("terceros_ver") && !checkPermission("clientes_ver") && !checkPermission("cartera_ver")) {
      return { success: false, error: "No autorizado" }
    }

    try {
      const targetId = typeof params === 'object' ? (params.id || params.clienteId) : null
      const targetDoc = typeof params === 'object' ? params.documento : params

      let thirdParty = null
      if (targetId) {
        thirdParty = db.prepare(`
          SELECT *, COALESCE(saldo_favor, 0) as saldo_favor
          FROM terceros
          WHERE id = ?
          LIMIT 1
        `).get(targetId)
      } else if (targetDoc) {
        thirdParty = db.prepare(`
          SELECT *, COALESCE(saldo_favor, 0) as saldo_favor
          FROM terceros
          WHERE numero_documento = ? AND estado != -1
          LIMIT 1
        `).get(targetDoc)
      }

      if (!thirdParty) {
        return { success: false, error: "Tercero no encontrado" }
      }

      const clientDoc = thirdParty.numero_documento || ''
      const storeConf = db.prepare(`SELECT separador FROM almacen_conf LIMIT 1`).get()
      const defaultSeparator = storeConf?.separador || ''

      const invoices = clientDoc ? db.prepare(`
        SELECT 
          v.*,
          COALESCE(NULLIF(v.separador, ''), ?) as separador_efectivo,
          (SELECT GROUP_CONCAT(tipo_nota, ' y ') FROM nota WHERE id_factura_origen = v.id AND status = 1) as notas_aplicadas,
          (SELECT GROUP_CONCAT(motivo_dian, '|') FROM nota WHERE id_factura_origen = v.id AND status = 1) as notas_motivos
        FROM ventasMaestro v
        WHERE v.documento_cliente = ? AND v.status > 0
        ORDER BY v.date_created DESC
      `).all(defaultSeparator, clientDoc) : []

      let payments = []
      if (clientDoc) {
        try {
          payments = db.prepare(`
            SELECT 
              a.*,
              v.prefijo,
              COALESCE(NULLIF(v.separador, ''), ?) as separador,
              v.numero_factura
            FROM abonos_ventas a
            INNER JOIN ventasMaestro v ON a.maestro_id = v.id
            WHERE v.documento_cliente = ?
            ORDER BY a.date_created DESC
          `).all(defaultSeparator, clientDoc)
        } catch (err) {
          logger.warning('TERCEROS', 'Could not query abonos_ventas for client detail', err.message)
        }
      }

      const creditMovements = []

      if (clientDoc) {
        try {
          const creditNotes = db.prepare(`
            SELECT 
              n.id,
              n.prefijo,
              n.numero_nota,
              n.numero_factura_origen,
              n.motivo_dian,
              n.observaciones,
              n.total_final,
              n.date_created,
              v.prefijo as prefijo_factura,
              COALESCE(NULLIF(v.separador, ''), ?) as separador_factura
            FROM nota n
            LEFT JOIN ventasMaestro v ON n.id_factura_origen = v.id
            WHERE n.documento_cliente = ? AND n.tipo_nota = 'Crédito' AND n.status = 1
            ORDER BY n.date_created DESC
          `).all(defaultSeparator, clientDoc)

          creditNotes.forEach(note => {
            const invoiceRef = `${note.prefijo_factura || ''}${note.separador_factura || ''}${note.numero_factura_origen || ''}`
            creditMovements.push({
              id: `note-${note.id}`,
              type: 'credit_note',
              direction: 'in',
              label: 'Nota Crédito',
              reference: `${note.prefijo || 'NC'}-${note.numero_nota}`,
              detail: `Factura ${invoiceRef} - ${note.motivo_dian || 'Sin motivo'}`,
              amount: Number(note.total_final) || 0,
              date_created: note.date_created
            })
          })
        } catch (err) {
          logger.warning('TERCEROS', 'Could not query credit notes for client detail', err.message)
        }
      }

      invoices.forEach(inv => {
        let creditUsedInSale = 0

        if (inv.pagos_multiples) {
          try {
            const parsedPayments = JSON.parse(inv.pagos_multiples)
            if (Array.isArray(parsedPayments)) {
              parsedPayments.forEach(p => {
                if (String(p.metodo || '').trim().toLowerCase() === 'saldo a favor') {
                  creditUsedInSale += parseFloat(p.monto) || 0
                }
              })
            }
          } catch (err) {}
        } else if (String(inv.metodo_pago || '').trim().toLowerCase() === 'saldo a favor') {
          creditUsedInSale = Math.max(0, (Number(inv.total_factura) || 0) - (Number(inv.saldo_pendiente_original ?? inv.saldo_pendiente) || 0))
        }

        if (creditUsedInSale > 0) {
          const invoiceRef = `${inv.prefijo || ''}${inv.separador_efectivo || ''}${inv.numero_factura}`
          creditMovements.push({
            id: `sale-credit-${inv.id}`,
            type: 'sale_usage',
            direction: 'out',
            label: 'Uso en Compra',
            reference: invoiceRef,
            detail: `Aplicado como pago en factura ${invoiceRef}`,
            amount: creditUsedInSale,
            date_created: inv.date_created
          })
        }
      })

      payments.forEach(pay => {
        if (String(pay.metodo_pago || '').trim().toLowerCase() === 'saldo a favor') {
          const invoiceRef = `${pay.prefijo || ''}${pay.separador || ''}${pay.numero_factura || ''}`
          creditMovements.push({
            id: `payment-credit-${pay.id}`,
            type: 'payment_usage',
            direction: 'out',
            label: 'Uso en Abono',
            reference: invoiceRef,
            detail: pay.observaciones || `Abono a factura ${invoiceRef}`,
            amount: Number(pay.valor) || 0,
            date_created: pay.date_created
          })
        }
      })

      creditMovements.sort((a, b) => new Date(b.date_created) - new Date(a.date_created))

      const debtTotal = invoices.reduce((sum, inv) => {
        const pending = Number(inv.saldo_pendiente) || 0
        return sum + (pending > 0 ? pending : 0)
      }, 0)

      const pendingInvoicesCount = invoices.filter(inv => (Number(inv.saldo_pendiente) || 0) > 0).length

      const totalPurchased = invoices.reduce((sum, inv) => {
        const isAnnulled = inv.notas_motivos && inv.notas_motivos.toLowerCase().includes('anula')
        if (isAnnulled) return sum
        return sum + (Number(inv.total_factura) || 0)
      }, 0)

      return {
        success: true,
        data: {
          tercero: {
            ...thirdParty,
            saldo_favor: Number(thirdParty.saldo_favor) || 0
          },
          resumenCartera: {
            deuda_total: debtTotal,
            facturas_pendientes: pendingInvoicesCount,
            saldo_favor: Number(thirdParty.saldo_favor) || 0,
            total_comprado: totalPurchased,
            total_facturas: invoices.length
          },
          facturas: invoices,
          abonos: payments,
          movimientosSaldoFavor: creditMovements
        }
      }
    } catch (error) {
      logger.error('TERCEROS', 'Error fetching complete third party detail', error)
      return { success: false, error: error.message }
    }
  })
}