import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"
import { canModifyModule, triggerBackgroundPush } from "./syncHandlers.js"

const checkPermission = (permission) => {
  const user = global.currentUserSession
  if (!user) return false
  if (user.permisos?.includes("ALL")) return true
  return user.permisos?.includes(permission)
}

export const registerNotasHandlers = () => {

  try {
    db.exec(`ALTER TABLE nota_item ADD COLUMN date_created TEXT`)
    db.exec(`ALTER TABLE nota_item ADD COLUMN date_modify TEXT`)
    logger.info('MIGRATION', 'Added date columns to nota_item table')
  } catch (error) {
  }

  ipcMain.handle("get-notas", () => {
    if (!checkPermission("notas_gestionar")) return []
    try {
      const stmt = db.prepare(`
        SELECT 
          n.*,
          v.prefijo AS prefijo_factura,
          v.numero_factura
        FROM nota n
        LEFT JOIN ventasMaestro v ON n.id_factura_origen = v.id
        ORDER BY n.date_created DESC
      `)
      return stmt.all()
    } catch (error) {
      logger.error('NOTES', 'Error fetching notes history', error)
      return []
    }
  })

  ipcMain.handle("add-nota", (_, data) => {
    if (!checkPermission("notas_gestionar")) return { success: false, error: "No autorizado." }
    if (!canModifyModule('nota')) return { success: false, error: "La emisión de notas está bloqueada por la sincronización web." }

    const createNoteTransaction = db.transaction((noteData) => {
      const nowRow = db.prepare("SELECT datetime('now', 'localtime') as nowStr").get()
      const now = nowRow.nowStr

      const noteId = uuidv4()
      const currentUser = global.currentUserSession?.username || 'system'

      const config = db.prepare('SELECT id, consecutivo_nota, consecutivo_nota_debito FROM almacen_conf LIMIT 1').get()
      if (!config) throw new Error("Store configuration not found")

      const calculatedPrefix = noteData.tipo_nota === 'Crédito' ? 'NC' : 'ND'

      const maxRow = db.prepare('SELECT MAX(numero_nota) as maxNum FROM nota WHERE prefijo = ?').get(calculatedPrefix)
      const maxInTable = maxRow?.maxNum || 0

      let newNoteNumber = 0
      if (noteData.tipo_nota === 'Crédito') {
        newNoteNumber = Math.max(config.consecutivo_nota || 0, maxInTable) + 1
        db.prepare('UPDATE almacen_conf SET consecutivo_nota = ? WHERE id = ?').run(newNoteNumber, config.id)
      } else {
        newNoteNumber = Math.max(config.consecutivo_nota_debito || 0, maxInTable) + 1
        db.prepare('UPDATE almacen_conf SET consecutivo_nota_debito = ? WHERE id = ?').run(newNoteNumber, config.id)
      }

      const insertNote = db.prepare(`
        INSERT INTO nota (
          id, tipo_nota, prefijo, numero_nota, id_factura_origen, numero_factura_origen, 
          documento_cliente, nombre_cliente, motivo_dian, observaciones, total_base, 
          total_iva, total_final, moneda, formato_numero, status, date_created, date_modify, modify_by
        ) 
        VALUES (
          @id, @tipo_nota, @prefijo, @numero_nota, @id_factura_origen, @numero_factura_origen, 
          @documento_cliente, @nombre_cliente, @motivo_dian, @observaciones, @total_base, 
          @total_iva, @total_final, @moneda, @formato_numero, 1, @now, @now, @user
        )
      `)

      insertNote.run({
        id: noteId,
        tipo_nota: noteData.tipo_nota,
        prefijo: calculatedPrefix,
        numero_nota: newNoteNumber,
        id_factura_origen: noteData.id_factura_origen,
        numero_factura_origen: noteData.numero_factura_origen,
        documento_cliente: noteData.documento_cliente || '',
        nombre_cliente: noteData.nombre_cliente || '',
        motivo_dian: noteData.motivo_dian,
        observaciones: noteData.observaciones || '',
        total_base: noteData.total_base,
        total_iva: noteData.total_iva,
        total_final: noteData.total_final,
        moneda: noteData.moneda || 'COP',
        formato_numero: noteData.formato_numero || 'es-CO',
        now: now,
        user: currentUser
      })

      const insertItem = db.prepare(`
        INSERT INTO nota_item (
          id, id_nota, id_producto, nombre_producto, cantidad, 
          precio_unitario, iva_percent, subtotal, total, date_created, date_modify
        ) VALUES (
          @id, @id_nota, @id_producto, @nombre_producto, @cantidad, 
          @precio_unitario, @iva_percent, @subtotal, @total, @now, @now
        )
      `)

      const getStock = db.prepare(`SELECT stock FROM inventario_saldos WHERE producto_id = ?`)
      const updateStock = db.prepare(`UPDATE inventario_saldos SET stock = @stock WHERE producto_id = @id`)
      const updateProductDate = db.prepare(`UPDATE producto SET date_modify = @now WHERE id = @id`)

      const insertInventory = db.prepare(`
        INSERT INTO inventario (
          id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, 
          stock_anterior, stock_nuevo, fecha, usuario, notas
        ) VALUES (
          @id, @producto_id, @tipo_movimiento, @modulo_movimiento, @cantidad, 
          @stock_anterior, @stock_nuevo, @fecha, @usuario, @notes
        )
      `)

      for (const item of noteData.items) {
        insertItem.run({
          id: uuidv4(),
          id_nota: noteId,
          id_producto: item.id_producto,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          iva_percent: item.iva_percent,
          subtotal: item.subtotal,
          total: item.total,
          now: now
        })

        if (noteData.afecta_inventario) {
          const currentProduct = getStock.get(item.id_producto)
          if (currentProduct) {
            const previousStock = currentProduct.stock
            const newStock = noteData.tipo_nota === 'Crédito'
              ? previousStock + item.cantidad
              : previousStock - item.cantidad

            updateStock.run({ stock: newStock, id: item.id_producto })
            updateProductDate.run({ now: now, id: item.id_producto })

            insertInventory.run({
              id: uuidv4(),
              producto_id: item.id_producto,
              tipo_movimiento: noteData.tipo_nota === 'Crédito' ? 'ingreso' : 'egreso',
              modulo_movimiento: 'notas_credito_debito',
              cantidad: item.cantidad,
              stock_anterior: previousStock,
              stock_nuevo: newStock,
              fecha: now,
              usuario: currentUser,
              notes: `Associated with Note ${calculatedPrefix}-${newNoteNumber}`
            })
          }
        }
      }

      // Financial balance handling for Credit Notes
      let debtDiscounted = 0
      let creditBalanceAdded = 0
      const noteTotal = Number(noteData.total_final) || 0

      if (noteData.tipo_nota === 'Crédito' && noteTotal > 0) {
        const originInvoice = db.prepare(`
          SELECT id, saldo_pendiente, documento_cliente
          FROM ventasMaestro
          WHERE id = ?
        `).get(noteData.id_factura_origen)

        const pendingBalance = Math.max(0, Number(originInvoice?.saldo_pendiente) || 0)

        if (pendingBalance > 0) {
          debtDiscounted = Math.min(pendingBalance, noteTotal)
          const newPendingBalance = Math.max(0, pendingBalance - debtDiscounted)

          db.prepare(`
            UPDATE ventasMaestro
            SET saldo_pendiente = ?
            WHERE id = ?
          `).run(newPendingBalance, originInvoice.id)
        }

        const remainingExcess = Math.max(0, noteTotal - debtDiscounted)

        if (noteData.generar_saldo_favor && remainingExcess > 0) {
          const clientDoc = noteData.documento_cliente || originInvoice?.documento_cliente || ''
          if (clientDoc) {
            const clientRecord = db.prepare(`
              SELECT id, COALESCE(saldo_favor, 0) as saldo_favor
              FROM terceros
              WHERE numero_documento = ? AND estado != -1
              LIMIT 1
            `).get(clientDoc)

            if (clientRecord) {
              const newCreditBalance = (Number(clientRecord.saldo_favor) || 0) + remainingExcess

              db.prepare(`
                UPDATE terceros
                SET saldo_favor = ?, date_modify = ?
                WHERE id = ?
              `).run(newCreditBalance, now, clientRecord.id)

              creditBalanceAdded = remainingExcess
              logger.info(
                'NOTES',
                `Added credit balance ${remainingExcess} to client ID ${clientRecord.id} from note ${calculatedPrefix}-${newNoteNumber}`
              )
            }
          }
        }
      }

      return {
        noteId,
        debtDiscounted,
        creditBalanceAdded
      }
    })

    try {
      const txResult = createNoteTransaction(data)

      triggerBackgroundPush('nota').catch(e => logger.error('SYNC', 'Error triggering background push after creating note', e))

      if (txResult.creditBalanceAdded > 0) {
        triggerBackgroundPush('terceros').catch(e => logger.error('SYNC', 'Error triggering background push for terceros after credit balance update', e))
      }

      return {
        success: true,
        id: txResult.noteId,
        debtDiscounted: txResult.debtDiscounted,
        creditBalanceAdded: txResult.creditBalanceAdded
      }
    } catch (error) {
      logger.error('NOTES', 'Critical error while creating note', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("search-factura", (_, invoiceNumber) => {
    if (!checkPermission("notas_gestionar")) return { success: false, message: "No autorizado" }
    try {
      const stmt = db.prepare(`
        SELECT * FROM ventasMaestro 
        WHERE (
          (IFNULL(prefijo, '') || IFNULL(separador, '') || numero_factura) COLLATE NOCASE = ? 
          OR numero_factura = ?
        )
        AND status > 0
      `)

      const masterRecord = stmt.get(invoiceNumber, invoiceNumber)
      if (!masterRecord) return { success: false, message: 'Factura no encontrada' }

      const rawDetails = db.prepare(`
        SELECT 
          df.*, 
          p.sku, 
          COALESCE(df.iva, p.iva, 0) as iva, 
          c.sku_prefix, 
          c.separador
        FROM ventasDetalle df
        LEFT JOIN producto p ON df.id_producto = p.id
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE df.maestro_id = ?
      `).all(masterRecord.id)

      const invoiceDiscount = Math.max(0, Number(masterRecord.descuento) || 0)
      const grossLinesSum = rawDetails.reduce((sum, row) => {
        const unitPrice = Number(row.precio_producto) || 0
        const qty = Number(row.cantidad_producto) || 0
        return sum + (unitPrice * qty)
      }, 0)
      const invoiceSubtotal = Number(masterRecord.subtotal) || grossLinesSum

      const savedLineDiscountsSum = rawDetails.reduce(
        (sum, row) => sum + Math.max(0, Number(row.descuento) || 0),
        0
      )
      const hasPerItemDiscounts = savedLineDiscountsSum > 0

      const fallbackDiscountRatio = (!hasPerItemDiscounts && invoiceDiscount > 0 && invoiceSubtotal > 0)
        ? Math.min(1, invoiceDiscount / invoiceSubtotal)
        : 0

      const details = rawDetails.map(row => {
        const unitPrice = Number(row.precio_producto) || 0
        const qty = Number(row.cantidad_producto) || 0
        let lineDiscount = 0

        if (hasPerItemDiscounts) {
          lineDiscount = Math.max(0, Number(row.descuento) || 0)
        } else if (fallbackDiscountRatio > 0) {
          lineDiscount = (unitPrice * qty) * fallbackDiscountRatio
        }

        const unitDiscount = qty > 0 ? Math.min(unitPrice, lineDiscount / qty) : 0
        const netUnitPrice = Math.max(0, unitPrice - unitDiscount)

        return {
          ...row,
          descuento_linea: lineDiscount,
          descuento_unitario: unitDiscount,
          precio_unitario_neto: netUnitPrice
        }
      })

      let clientBalanceInfo = null
      if (masterRecord.documento_cliente) {
        clientBalanceInfo = db.prepare(`
          SELECT id, numero_documento, COALESCE(saldo_favor, 0) as saldo_favor
          FROM terceros
          WHERE numero_documento = ? AND estado != -1
          LIMIT 1
        `).get(masterRecord.documento_cliente)
      }

      return {
        success: true,
        maestro: masterRecord,
        detalles: details,
        clienteSaldo: clientBalanceInfo
      }
    } catch (error) {
      logger.error('NOTES', 'Error searching invoice for note creation', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-nota-detalle", (_, noteId) => {
    if (!checkPermission("notas_gestionar")) return { success: false, error: "No autorizado" }
    try {
      const stmt = db.prepare(`
        SELECT ni.*, p.sku, c.sku_prefix, c.separador
        FROM nota_item ni
        LEFT JOIN producto p ON ni.id_producto = p.id
        LEFT JOIN categoria c ON p.categoria_id = c.id
        WHERE ni.id_nota = ?
      `)
      const details = stmt.all(noteId)

      const noteMasterStmt = db.prepare(`SELECT * FROM nota WHERE id = ?`)
      const noteMaster = noteMasterStmt.get(noteId)

      if (noteMaster) {
        const originInvoice = db.prepare(`
          SELECT v.documento_cliente, t.telefono as telefono_tercero
          FROM ventasMaestro v
          LEFT JOIN terceros t ON v.documento_cliente = t.numero_documento
          WHERE v.id = ?
        `).get(noteMaster.id_factura_origen)

        if (originInvoice && originInvoice.telefono_tercero) {
          noteMaster.telefono_cliente = originInvoice.telefono_tercero
        }
      }

      return {
        success: true,
        data: details,
        notaMaestro: noteMaster,
        configuracion: db.prepare(`SELECT * FROM almacen_conf LIMIT 1`).get()
      }
    } catch (error) {
      logger.error('NOTES', 'Error fetching note details', error)
      return { success: false, error: error.message }
    }
  })
}