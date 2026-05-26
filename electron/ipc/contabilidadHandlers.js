import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false;
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerContabilidadHandlers = () => {
  ipcMain.handle("get-puc", () => {
    if (!checkPermission("puc_ver")) return { success: false, error: "No autorizado" }
    try { return { success: true, data: db.prepare("SELECT * FROM cuentasContables ORDER BY id ASC").all() }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("crear-cuenta", async (event, cuenta) => {
    if (!checkPermission("puc_crear")) return { success: false, error: "No autorizado" };
    try {
      db.prepare(`INSERT INTO cuentasContables (id, nombre, tipo, naturaleza, es_auxiliar, exige_tercero, estado, date_created) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`).run(cuenta.id, cuenta.nombre, cuenta.tipo, cuenta.naturaleza, cuenta.es_auxiliar, cuenta.exige_tercero)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("actualizar-cuenta", async (event, cuenta) => {
    if (!checkPermission("puc_editar")) return { success: false, error: "No autorizado" };
    try {
      db.prepare(`UPDATE cuentasContables SET nombre = ?, exige_tercero = ?, estado = ?, date_modify = datetime('now') WHERE id = ?`).run(cuenta.nombre, cuenta.exige_tercero, cuenta.estado, cuenta.id)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("eliminar-cuenta", async (event, id) => {
    if (!checkPermission("puc_eliminar")) return { success: false, error: "No autorizado" };
    try {
      const hijas = db.prepare("SELECT COUNT(*) as total FROM cuentasContables WHERE id LIKE ? AND id != ?").get(`${id}%`, id)
      if (hijas.total > 0) return { success: false, error: `No puedes eliminar esta cuenta porque tiene ${hijas.total} subcuentas asignadas.` }
      db.prepare("DELETE FROM cuentasContables WHERE id = ?").run(id);
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("get-comprobantes-paginados", async (_, params) => {
    if (!checkPermission("comprobantes_ver")) return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
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
      const dataQuery = db.prepare(`SELECT c.*, (SELECT SUM(debito) FROM comprobantesDetalle WHERE comprobante_id = c.id) as total FROM comprobantes c WHERE ${whereClause} ORDER BY c.fecha DESC LIMIT ? OFFSET ?`).all(...queryParams, length, start)
      return { draw: params.draw, recordsTotal: totalQuery.count, recordsFiltered: filteredQuery.count, data: dataQuery }
    } catch (error) { return { error: error.message } }
  })

  ipcMain.handle("crear-comprobante", async (_, { cabecera, detalles }) => {
    if (!checkPermission("comprobantes_crear")) return { success: false, error: "No autorizado" };
    try {
      let sumDebitos = 0; let sumCreditos = 0
      for (const linea of detalles) { sumDebitos += Number(linea.debito) || 0; sumCreditos += Number(linea.credito) || 0; }
      if (sumDebitos.toFixed(2) !== sumCreditos.toFixed(2)) return { success: false, error: "El asiento no cuadra." }
      
      const currentUser = global.currentUserSession?.username || 'system'
      const saveComprobante = db.transaction(() => {
         const compId = uuidv4()
         const lastComp = db.prepare("SELECT MAX(numero_comprobante) as maxNum FROM comprobantes").get()
         const numComp = (lastComp.maxNum || 0) + 1
         db.prepare(`INSERT INTO comprobantes (id, numero_comprobante, fecha, concepto, documento_referencia, estado, date_created, modify_by) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), ?)`).run(compId, numComp, cabecera.fecha, cabecera.concepto, cabecera.documento_referencia || '', currentUser)
         const stmtDetalle = db.prepare(`INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito) VALUES (?, ?, ?, ?, ?, ?, ?)`)
         for (const linea of detalles) { stmtDetalle.run(uuidv4(), compId, linea.cuenta_id, linea.tercero_id || null, linea.descripcion_linea || '', Number(linea.debito) || 0, Number(linea.credito) || 0); }
      })
      saveComprobante()
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("get-comprobante-detalle", (_, id) => {
    if (!checkPermission("comprobantes_ver")) return { success: false, error: "No autorizado" };
    try {
      const cabecera = db.prepare("SELECT * FROM comprobantes WHERE id = ?").get(id)
      if (!cabecera) return { success: false, error: "No encontrado" }
      const detalles = db.prepare(`SELECT cd.*, t.numero_documento, (CASE WHEN t.tipo_persona = 'juridica' THEN t.razon_social ELSE t.nombres || ' ' || t.apellidos END) as tercero_nombre FROM comprobantesDetalle cd LEFT JOIN terceros t ON cd.tercero_id = t.id WHERE cd.comprobante_id = ?`).all(id)
      return { success: true, data: { cabecera, detalles } }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("actualizar-comprobante", async (_, { id, cabecera, detalles }) => {
    if (!checkPermission("comprobantes_editar")) return { success: false, error: "No autorizado" };
    try {
      let sumDebitos = 0; let sumCreditos = 0
      for (const linea of detalles) { sumDebitos += Number(linea.debito) || 0; sumCreditos += Number(linea.credito) || 0; }
      if (sumDebitos.toFixed(2) !== sumCreditos.toFixed(2)) return { success: false, error: "El asiento no cuadra." }
      
      const updateComprobante = db.transaction(() => {
         db.prepare(`UPDATE comprobantes SET fecha = ?, concepto = ?, documento_referencia = ? WHERE id = ?`).run(cabecera.fecha, cabecera.concepto, cabecera.documento_referencia || '', id)
         db.prepare("DELETE FROM comprobantesDetalle WHERE comprobante_id = ?").run(id)
         const stmtDetalle = db.prepare(`INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id)
         for (const linea of detalles) { db.prepare(`INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), id, linea.cuenta_id, linea.tercero_id || null, linea.descripcion_linea || '', Number(linea.debito) || 0, Number(linea.credito) || 0) }
      })
      updateComprobante()
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  // REPORTES Y BALANCES FINANCIEROS
  ipcMain.handle("get-balance-prueba", async (_, { fechaInicio, fechaFin }) => {
    if (!checkPermission("contabilidad_reportes_ver")) return { success: false, error: "No autorizado" };
    try {
      const movimientos = db.prepare(`SELECT c.id as cuenta, c.nombre, c.naturaleza, c.tipo, SUM(cd.debito) as total_debito, SUM(cd.credito) as total_credito FROM cuentasContables c INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ? GROUP BY c.id ORDER BY c.id ASC`).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      const datosProcesados = movimientos.map(mov => ({ ...mov, saldo: mov.naturaleza === 'debito' ? mov.total_debito - mov.total_credito : mov.total_credito - mov.total_debito }))
      return { success: true, data: datosProcesados, totales: { debito: datosProcesados.reduce((a, c) => a + c.total_debito, 0), credito: datosProcesados.reduce((a, c) => a + c.total_credito, 0) } }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("get-estado-resultados", async (_, { fechaInicio, fechaFin }) => {
    if (!checkPermission("contabilidad_reportes_ver")) return { success: false, error: "No autorizado" };
    try {
      const movs = db.prepare(`SELECT c.id, c.nombre, c.naturaleza, SUBSTR(c.id, 1, 1) as clase, SUM(cd.debito) as total_debito, SUM(cd.credito) as total_credito FROM cuentasContables c INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ? AND (c.id LIKE '4%' OR c.id LIKE '5%' OR c.id LIKE '6%') GROUP BY c.id ORDER BY c.id ASC`).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      let ingresos = 0, gastos = 0, costos = 0
      const cuentas = movs.map(m => {
        let saldo = m.naturaleza === 'credito' ? (m.total_credito - m.total_debito) : (m.total_debito - m.total_credito)
        if (m.clase === '4') ingresos += saldo; if (m.clase === '5') gastos += saldo; if (m.clase === '6') costos += saldo;
        return { ...m, saldo }
      })
      return { success: true, data: { cuentas, totales: { ingresos, gastos, costos, utilidad: ingresos - gastos - costos } } }
    } catch(err) { return { success: false, error: err.message } }
  })

  ipcMain.handle("get-balance-general", async (_, { fechaInicio, fechaFin }) => {
    if (!checkPermission("contabilidad_reportes_ver")) return { success: false, error: "No autorizado" };
    try {
      const pyg = db.prepare(`SELECT SUBSTR(c.id, 1, 1) as clase, SUM(cd.debito) as deb, SUM(cd.credito) as cre FROM cuentasContables c INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ? AND (c.id LIKE '4%' OR c.id LIKE '5%' OR c.id LIKE '6%') GROUP BY clase`).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      let ingresos = 0, gastos = 0, costos = 0
      pyg.forEach(m => { if (m.clase === '4') ingresos += (m.cre - m.deb); if (m.clase === '5') gastos += (m.deb - m.cre); if (m.clase === '6') costos += (m.deb - m.cre); })
      const utilidad = ingresos - gastos - costos

      const movsBG = db.prepare(`SELECT c.id, c.nombre, c.naturaleza, SUBSTR(c.id, 1, 1) as clase, SUM(cd.debito) as total_debito, SUM(cd.credito) as total_credito FROM cuentasContables c INNER JOIN comprobantesDetalle cd ON c.id = cd.cuenta_id INNER JOIN comprobantes comp ON cd.comprobante_id = comp.id WHERE comp.estado = 1 AND comp.fecha >= ? AND comp.fecha <= ? AND (c.id LIKE '1%' OR c.id LIKE '2%' OR c.id LIKE '3%') GROUP BY c.id ORDER BY c.id ASC`).all(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`)
      let activo = 0, pasivo = 0, patrimonio = 0
      const cuentas = movsBG.map(m => {
        let saldo = m.naturaleza === 'debito' ? (m.total_debito - m.total_credito) : (m.total_credito - m.total_debito)
        if (m.clase === '1') activo += saldo; if (m.clase === '2') pasivo += saldo; if (m.clase === '3') patrimonio += saldo;
        return { ...m, saldo }
      })
      return { success: true, data: { cuentas, totales: { activo, pasivo, patrimonioPuro: patrimonio, utilidadDelEjercicio: utilidad, patrimonioTotal: patrimonio + utilidad, pasivoMasPatrimonio: pasivo + patrimonio + utilidad } } }
    } catch(err) { return { success: false, error: err.message } }
  })

  ipcMain.handle("get-config-contable", () => {
    if (!checkPermission("contabilidad_config_ver")) return { success: false, error: "No autorizado" };
    try { return { success: true, data: db.prepare("SELECT * FROM configuracionContable WHERE id = 1").get() }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("update-config-contable", (_, { config, subCheck }) => {
    if (subCheck.canSales && !checkPermission("config_cuentas_ventas")) return { success: false, error: "Falta permiso de ventas" }
    if (subCheck.canPurchases && !checkPermission("config_cuentas_compras")) return { success: false, error: "Falta permiso de compras" }
    if (!subCheck.canSales && !subCheck.canPurchases && !checkPermission("config_metodos_pago")) return { success: false, error: "No autorizado" }

    try {
      db.prepare(`UPDATE configuracionContable SET cuenta_caja = ?, cuenta_cartera = ?, cuenta_ingresos = ?, cuenta_iva = ?, cuenta_descuento = ?, cuenta_proveedores = ?, cuenta_iva_compras = ?, cuenta_inventario = ? WHERE id = 1`).run(config.cuenta_caja, config.cuenta_cartera, config.cuenta_ingresos, config.cuenta_iva, config.cuenta_descuento, config.cuenta_proveedores, config.cuenta_iva_compras, config.cuenta_inventario)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("get-cuentas-auxiliares", () => {
     try { return { success: true, data: db.prepare("SELECT id, nombre, exige_tercero FROM cuentasContables WHERE es_auxiliar = 1 AND estado = 1").all() }
     } catch (e) { return { success: false, error: e.message } }
  })
}