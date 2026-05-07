import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"

export const registerContabilidadHandlers = () => {
  ipcMain.handle("get-puc", () => {
    try {
      const cuentas = db.prepare("SELECT * FROM cuentasContables ORDER BY id ASC").all()
      return { success: true, data: cuentas }
    } catch (error) {
      console.error("Error obteniendo PUC:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("crear-cuenta", async (event, cuenta) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO cuentasContables 
        (id, nombre, tipo, naturaleza, es_auxiliar, exige_tercero, estado, date_created) 
        VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `)
      stmt.run(cuenta.id, cuenta.nombre, cuenta.tipo, cuenta.naturaleza, cuenta.es_auxiliar, cuenta.exige_tercero)
      return { success: true }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return { success: false, error: "El código de esta cuenta ya existe en el PUC." }
      }
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("actualizar-cuenta", async (event, cuenta) => {
    try {
      const stmt = db.prepare(`
        UPDATE cuentasContables 
        SET nombre = ?, exige_tercero = ?, estado = ?, date_modify = datetime('now')
        WHERE id = ?
      `);
      stmt.run(cuenta.nombre, cuenta.exige_tercero, cuenta.estado, cuenta.id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("eliminar-cuenta", async (event, id) => {
    try {
      const hijas = db.prepare("SELECT COUNT(*) as total FROM cuentasContables WHERE id LIKE ? AND id != ?").get(`${id}%`, id)
      
      if (hijas.total > 0) {
        return { success: false, error: `No puedes eliminar esta cuenta porque tiene ${hijas.total} subcuentas asignadas. Elimina las hijas primero.` }
      }

      const stmt = db.prepare("DELETE FROM cuentasContables WHERE id = ?")
      stmt.run(id);
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-comprobantes-paginados", async (event, params) => {
    try {
      const { start, length, search } = params
      const searchValue = search?.value || ''

      let whereClause = "1=1"
      let queryParams = []

      if (searchValue) {
        whereClause += ` AND (concepto LIKE ? OR documento_referencia LIKE ?)`
        const likeSearch = `%${searchValue}%`
        queryParams.push(likeSearch, likeSearch)
      }

      const totalQuery = db.prepare(`SELECT COUNT(*) as count FROM comprobantes`).get()
      const filteredQuery = db.prepare(`SELECT COUNT(*) as count FROM comprobantes WHERE ${whereClause}`).get(...queryParams)

      const dataQuery = db.prepare(`
        SELECT c.*, 
               (SELECT SUM(debito) FROM comprobantesDetalle WHERE comprobante_id = c.id) as total
        FROM comprobantes c
        WHERE ${whereClause} 
        ORDER BY c.fecha DESC, c.numero_comprobante DESC 
        LIMIT ? OFFSET ?
      `).all(...queryParams, length, start)

      return {
        draw: params.draw,
        recordsTotal: totalQuery.count,
        recordsFiltered: filteredQuery.count,
        data: dataQuery
      }
    } catch (error) {
      console.error("Error en paginación de comprobantes:", error)
      return { error: error.message }
    }
  })

  ipcMain.handle("crear-comprobante", async (event, { cabecera, detalles }) => {
    try {
      let sumDebitos = 0
      let sumCreditos = 0
      for (const linea of detalles) {
        sumDebitos += Number(linea.debito) || 0
        sumCreditos += Number(linea.credito) || 0
      }
      
      if (sumDebitos.toFixed(2) !== sumCreditos.toFixed(2)) {
        return { success: false, error: "El asiento no cuadra. La suma de los débitos no es igual a los créditos." }
      }

      const saveComprobante = db.transaction(() => {
         const comprobanteId = uuidv4()
         
         const lastComp = db.prepare("SELECT MAX(numero_comprobante) as maxNum FROM comprobantes").get()
         const numeroComprobante = (lastComp.maxNum || 0) + 1

         db.prepare(`
           INSERT INTO comprobantes (id, numero_comprobante, fecha, concepto, documento_referencia, estado, date_created, modify_by)
           VALUES (?, ?, ?, ?, ?, 1, datetime('now'), 'system')
         `).run(comprobanteId, numeroComprobante, cabecera.fecha, cabecera.concepto, cabecera.documento_referencia || '')

         const stmtDetalle = db.prepare(`
           INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito)
           VALUES (?, ?, ?, ?, ?, ?, ?)
         `)

         for (const linea of detalles) {
            stmtDetalle.run(
              uuidv4(), 
              comprobanteId, 
              linea.cuenta_id, 
              linea.tercero_id || null, 
              linea.descripcion_linea || '', 
              Number(linea.debito) || 0, 
              Number(linea.credito) || 0
            );
         }
      })
      saveComprobante()
      return { success: true }
    } catch (error) {
      console.error("Error creando comprobante:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-comprobante-detalle", (event, id) => {
    try {
      const cabecera = db.prepare("SELECT * FROM comprobantes WHERE id = ?").get(id)
      if (!cabecera) return { success: false, error: "Comprobante no encontrado" }
      
      const detalles = db.prepare("SELECT * FROM comprobantesDetalle WHERE comprobante_id = ?").all(id)
      return { success: true, data: { cabecera, detalles } }
    } catch (error) {
      console.error("Error obteniendo detalle de comprobante:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("actualizar-comprobante", async (event, { id, cabecera, detalles }) => {
    try {
      let sumDebitos = 0; let sumCreditos = 0
      for (const linea of detalles) {
        sumDebitos += Number(linea.debito) || 0
        sumCreditos += Number(linea.credito) || 0
      }
      if (sumDebitos.toFixed(2) !== sumCreditos.toFixed(2)) {
        return { success: false, error: "El asiento no cuadra." }
      }

      const updateComprobante = db.transaction(() => {
         db.prepare(`
           UPDATE comprobantes 
           SET fecha = ?, concepto = ?, documento_referencia = ?
           WHERE id = ?
         `).run(cabecera.fecha, cabecera.concepto, cabecera.documento_referencia || '', id)

         db.prepare("DELETE FROM comprobantesDetalle WHERE comprobante_id = ?").run(id)

         const stmtDetalle = db.prepare(`
           INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito)
           VALUES (?, ?, ?, ?, ?, ?, ?)
         `)

          for (const linea of detalles) {
            stmtDetalle.run(
              uuidv4(), id, linea.cuenta_id, linea.tercero_id || null, 
              linea.descripcion_linea || '', Number(linea.debito) || 0, Number(linea.credito) || 0
            )
          }
      })

      updateComprobante()
      return { success: true }
    } catch (error) {
      console.error("Error actualizando comprobante:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-cuentas-auxiliares", () => {
    try {
      return { success: true, data: db.prepare("SELECT id, nombre, exige_tercero FROM cuentasContables WHERE es_auxiliar = 1 AND estado = 1").all() }
    } catch (error) { return { success: false, error: error.message } }
  })


  // REPORTES FINANCIEROS

  ipcMain.handle("get-balance-prueba", async (event, { fechaInicio, fechaFin }) => {
    try {
      const query = `
        SELECT 
            c.id as cuenta, 
            c.nombre, 
            c.naturaleza,
            c.tipo,
            SUM(cd.debito) as total_debito, 
            SUM(cd.credito) as total_credito
        FROM cuentasContables c
        INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id
        INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id
        WHERE comp.estado = 1 
          AND comp.fecha >= ? 
          AND comp.fecha <= ?
        GROUP BY c.id
        ORDER BY c.id ASC
      `;
      
      const movimientos = db.prepare(query).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      
      const datosProcesados = movimientos.map(mov => {
        let saldo = 0
        if (mov.naturaleza === 'debito') {
          saldo = mov.total_debito - mov.total_credito
        } else {
          saldo = mov.total_credito - mov.total_debito
        }
        return { ...mov, saldo }
      })

      const granTotalDebito = datosProcesados.reduce((acc, curr) => acc + curr.total_debito, 0)
      const granTotalCredito = datosProcesados.reduce((acc, curr) => acc + curr.total_credito, 0)

      return { 
        success: true, 
        data: datosProcesados, 
        totales: { debito: granTotalDebito, credito: granTotalCredito } 
      }
    } catch (error) {
      console.error("Error generando Balance de Prueba:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("get-estado-resultados", async (event, { fechaInicio, fechaFin }) => {
    try {
      const query = `
        SELECT c.id, c.nombre, c.naturaleza, SUBSTR(c.id, 1, 1) as clase,
               SUM(cd.debito) as total_debito, SUM(cd.credito) as total_credito
        FROM cuentasContables c
        INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id
        INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id
        WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ?
          AND (c.id LIKE '4%' OR c.id LIKE '5%' OR c.id LIKE '6%')
        GROUP BY c.id ORDER BY c.id ASC
      `
      const movs = db.prepare(query).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)

      let ingresos = 0, gastos = 0, costos = 0;
      const cuentasStr = movs.map(m => {
        let saldo = m.naturaleza === 'credito' ? (m.total_credito - m.total_debito) : (m.total_debito - m.total_credito)
        if (m.clase === '4') ingresos += saldo
        if (m.clase === '5') gastos += saldo
        if (m.clase === '6') costos += saldo
        return { ...m, saldo }
      })

      return {
        success: true,
        data: {
          cuentas: cuentasStr,
          totales: { ingresos, gastos, costos, utilidad: ingresos - gastos - costos }
        }
      }
    } catch(err) { return { success: false, error: err.message }; }
  })

  ipcMain.handle("get-balance-general", async (event, { fechaInicio, fechaFin }) => {
    try {
      const qPyG = `
        SELECT SUBSTR(c.id, 1, 1) as clase, SUM(cd.debito) as deb, SUM(cd.credito) as cre
        FROM cuentasContables c
        INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id
        INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id
        WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ?
          AND (c.id LIKE '4%' OR c.id LIKE '5%' OR c.id LIKE '6%')
        GROUP BY clase
      `
      const pyg = db.prepare(qPyG).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      let ingresos = 0, gastos = 0, costos = 0
      pyg.forEach(m => {
        if (m.clase === '4') ingresos += (m.cre - m.deb)
        if (m.clase === '5') gastos += (m.deb - m.cre)
        if (m.clase === '6') costos += (m.deb - m.cre)
      })
      const utilidad = ingresos - gastos - costos

      const queryBG = `
        SELECT c.id, c.nombre, c.naturaleza, SUBSTR(c.id, 1, 1) as clase,
               SUM(cd.debito) as total_debito, SUM(cd.credito) as total_credito
        FROM cuentasContables c
        INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id
        INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id
        WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ?
          AND (c.id LIKE '1%' OR c.id LIKE '2%' OR c.id LIKE '3%')
        GROUP BY c.id ORDER BY c.id ASC
      `
      const movsBG = db.prepare(queryBG).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)

      let activo = 0, pasivo = 0, patrimonio = 0;
      const cuentasBG = movsBG.map(m => {
        let saldo = m.naturaleza === 'debito' ? (m.total_debito - m.total_credito) : (m.total_credito - m.total_debito)
        if (m.clase === '1') activo += saldo
        if (m.clase === '2') pasivo += saldo
        if (m.clase === '3') patrimonio += saldo
        return { ...m, saldo }
      })

      return {
        success: true,
        data: {
          cuentas: cuentasBG,
          totales: { 
            activo, 
            pasivo, 
            patrimonioPuro: patrimonio,
            utilidadDelEjercicio: utilidad,
            patrimonioTotal: patrimonio + utilidad,
            pasivoMasPatrimonio: pasivo + patrimonio + utilidad 
          }
        }
      }
    } catch(err) { return { success: false, error: err.message } }
  })


  // CONFIGURACIÓN CONTABLE

  ipcMain.handle("get-config-contable", () => {
    try {
      return { success: true, data: db.prepare("SELECT * FROM configuracionContable WHERE id = 1").get() }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("update-config-contable", (event, config) => {
    try {
      const stmt = db.prepare(`
        UPDATE configuracionContable SET 
          cuenta_caja = ?, 
          cuenta_cartera = ?, 
          cuenta_ingresos = ?, 
          cuenta_iva = ?, 
          cuenta_descuento = ?
        WHERE id = 1
      `)
      stmt.run(config.cuenta_caja, config.cuenta_cartera, config.cuenta_ingresos, config.cuenta_iva, config.cuenta_descuento)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}