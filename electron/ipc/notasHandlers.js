import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerNotasHandlers = () => {

  ipcMain.handle("get-notas", () => {
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
      logger.error('NOTAS', "Error al intentar obtener el historial de notas", error)
      return []
    }
  })


  ipcMain.handle("add-nota", (_, data) => {
    const createNotaTransaction = db.transaction((notaData) => {
      const now = new Date().toISOString()
      const notaId = uuidv4()
      const currentUser = notaData.usuario || 'system'

      const config = db.prepare('SELECT id, consecutivo_nota, consecutivo_nota_debito FROM almacen_conf LIMIT 1').get()
      if (!config) throw new Error("No se encontró configuración del almacén")
      
      const prefijoCalculado = notaData.tipo_nota === 'Crédito' ? 'NC' : 'ND'
      
      let nuevoNumeroNota = 0
      if (notaData.tipo_nota === 'Crédito') {
        nuevoNumeroNota = config.consecutivo_nota + 1
      } else {
        nuevoNumeroNota = config.consecutivo_nota_debito + 1
      }

      const insertNota = db.prepare(`
        INSERT INTO nota (
          id, 
          tipo_nota, 
          prefijo, 
          numero_nota, 
          id_factura_origen, 
          numero_factura_origen, 
          documento_cliente, 
          nombre_cliente, 
          motivo_dian, 
          observaciones, 
          total_base, 
          total_iva, 
          total_final, 
          moneda,
          formato_numero,
          status, 
          date_created, 
          date_modify, 
          modify_by
        ) 
        VALUES (
          @id, 
          @tipo_nota, 
          @prefijo, 
          @numero_nota, 
          @id_factura_origen, 
          @numero_factura_origen, 
          @documento_cliente, 
          @nombre_cliente, 
          @motivo_dian, 
          @observaciones, 
          @total_base, 
          @total_iva, 
          @total_final, 
          @moneda,
          @formato_numero,
          1, 
          @now, 
          @now, 
          @usuario
        )
      `)

      insertNota.run({
        id: notaId,
        tipo_nota: notaData.tipo_nota,
        prefijo: prefijoCalculado,
        numero_nota: nuevoNumeroNota,
        id_factura_origen: notaData.id_factura_origen,
        numero_factura_origen: notaData.numero_factura_origen,
        documento_cliente: notaData.documento_cliente || '',
        nombre_cliente: notaData.nombre_cliente || '',
        motivo_dian: notaData.motivo_dian,
        observaciones: notaData.observaciones || '',
        total_base: notaData.total_base,
        total_iva: notaData.total_iva,
        total_final: notaData.total_final,
        moneda: notaData.moneda || 'COP',
        formato_numero: notaData.formato_numero || 'es-CO',
        now: now,
        usuario: currentUser
      })

      if (notaData.tipo_nota === 'Crédito') {
        db.prepare('UPDATE almacen_conf SET consecutivo_nota = ? WHERE id = ?').run(nuevoNumeroNota, config.id)
      } else {
        db.prepare('UPDATE almacen_conf SET consecutivo_nota_debito = ? WHERE id = ?').run(nuevoNumeroNota, config.id)
      }

      const insertItem = db.prepare(`
        INSERT INTO nota_item (
          id, id_nota, id_producto, nombre_producto, cantidad, 
          precio_unitario, iva_percent, subtotal, total
        ) VALUES (
          @id, @id_nota, @id_producto, @nombre_producto, @cantidad, 
          @precio_unitario, @iva_percent, @subtotal, @total
        )
      `)

      const getStock = db.prepare(`SELECT stock FROM producto WHERE id = ?`)
      const updateStock = db.prepare(`UPDATE producto SET stock = @stock, date_modify = @now WHERE id = @id`)
      
      const insertInventario = db.prepare(`
        INSERT INTO inventario (
          id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, 
          stock_anterior, stock_nuevo, fecha, usuario, notas
        ) VALUES (
          @id, @producto_id, @tipo_movimiento, @modulo_movimiento, @cantidad, 
          @stock_anterior, @stock_nuevo, @fecha, @usuario, @notas
        )
      `)

      for (const item of notaData.items) {
        insertItem.run({
          id: uuidv4(),
          id_nota: notaId,
          id_producto: item.id_producto,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          iva_percent: item.iva_percent,
          subtotal: item.subtotal,
          total: item.total
        })

        if (notaData.afecta_inventario) {
          const currentProduct = getStock.get(item.id_producto)
          
          if (currentProduct) {
            const stockAnterior = currentProduct.stock
            const stockNuevo = notaData.tipo_nota === 'Crédito' 
              ? stockAnterior + item.cantidad 
              : stockAnterior - item.cantidad

            updateStock.run({ stock: stockNuevo, now: now, id: item.id_producto })

            insertInventario.run({
              id: uuidv4(),
              producto_id: item.id_producto,
              tipo_movimiento: notaData.tipo_nota === 'Crédito' ? 'ingreso' : 'egreso',
              modulo_movimiento: 'notas_credito_debito',
              cantidad: item.cantidad,
              stock_anterior: stockAnterior,
              stock_nuevo: stockNuevo,
              fecha: now,
              usuario: currentUser,
              notas: `Asociado a Nota ${prefijoCalculado}-${nuevoNumeroNota}` 
            })
          }
        }
      }

      logger.success(
        'NOTAS', 
        `Nota ${notaData.tipo_nota} N° ${prefijoCalculado}-${nuevoNumeroNota} creada con éxito`, 
        `Aplicada a la Factura Origen N° ${notaData.numero_factura_origen} | Total de la nota: ${notaData.total_final}`
      )

      return notaId
    })

    try {
      const newNotaId = createNotaTransaction(data)
      return { success: true, id: newNotaId }
    } catch (error) {
      logger.error('NOTAS', "Error crítico en la transacción al intentar generar una Nota (Crédito/Débito)", error)
      return { success: false, error: error.message }
    }
  })


  ipcMain.handle("search-factura", (_, numero_factura) => {
    try {
      const maestro = db.prepare('SELECT * FROM ventasMaestro WHERE numero_factura = ? AND status > 0').get(numero_factura)
      
      if (!maestro) {
        logger.warning('NOTAS', `Intento de buscar factura inexistente (N°: ${numero_factura})`)
        return { success: false, message: 'Factura no encontrada' }
      }

      const detalles = db.prepare(`
          SELECT df.*, 
            p.sku, 
            c.sku_prefix, 
            c.separador
          FROM ventasDetalle df
          LEFT JOIN producto p ON df.id_producto = p.id
          LEFT JOIN categoria c ON p.categoria_id = c.id
          WHERE df.maestro_id = ?
      `).all(maestro.id)
      
      return { success: true, maestro, detalles }
    } catch (error) {
      logger.error('NOTAS', `Error al intentar buscar la factura N° ${numero_factura} en la base de datos`, error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-nota-detalle", (_, notaId) => {
    try {
      const stmt = db.prepare(`
          SELECT ni.*, 
            p.sku, 
            c.sku_prefix, 
            c.separador
          FROM nota_item ni
          LEFT JOIN producto p ON ni.id_producto = p.id
          LEFT JOIN categoria c ON p.categoria_id = c.id
          WHERE ni.id_nota = ?
      `);
      
      const detalles = stmt.all(notaId)
      const confStmt = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`)
      const configuracion = confStmt.get()

      return { success: true, data: detalles, configuracion: configuracion }
    } catch (error) {
      logger.error('NOTAS', `Error al obtener los detalles de la nota (ID: ${notaId})`, error)
      return { success: false, error: error.message }
    }
  })

}