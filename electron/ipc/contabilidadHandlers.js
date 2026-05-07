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

  ipcMain.handle("get-cuentas-auxiliares", () => {
    try {
      return { success: true, data: db.prepare("SELECT id, nombre, exige_tercero FROM cuentasContables WHERE es_auxiliar = 1 AND estado = 1").all() }
    } catch (error) { return { success: false, error: error.message } }
  })
}