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

export const registerTercerosHandlers = () => {

  ipcMain.handle("get-terceros", () => {
    if (!checkPermission("terceros_ver") && !checkPermission("ventas_crear")) return { success: false, error: "No autorizado" }
    try {
      return { success: true, data: db.prepare("SELECT * FROM terceros ORDER BY date_created DESC").all() }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("crear-tercero", async (event, tercero) => {
    if (!checkPermission("terceros_crear") && !checkPermission("ventas_crear")) return { success: false, error: "No autorizado" }
    try {
      const id = uuidv4()
      db.prepare(`INSERT INTO terceros (id, tipo_documento, numero_documento, digito_verificacion, tipo_persona, razon_social, nombres, apellidos, direccion, telefono, email, ciudad_id, es_cliente, es_proveedor, estado, date_created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`).run(id, tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion, tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos, tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id, tercero.es_cliente, tercero.es_proveedor)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("actualizar-tercero", async (event, tercero) => {
    if (!checkPermission("terceros_editar")) return { success: false, error: "No autorizado" };
    try {
      db.prepare(`UPDATE terceros SET tipo_documento = ?, numero_documento = ?, digito_verificacion = ?, tipo_persona = ?, razon_social = ?, nombres = ?, apellidos = ?, direccion = ?, telefono = ?, email = ?, ciudad_id = ?, es_cliente = ?, es_proveedor = ?, estado = ?, date_modify = datetime('now') WHERE id = ?`).run(tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion, tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos, tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id, tercero.es_cliente, tercero.es_proveedor, tercero.estado, tercero.id)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("eliminar-tercero", async (event, id) => {
    if (!checkPermission("terceros_eliminar")) return { success: false, error: "No autorizado" };
    try {
      db.prepare("DELETE FROM terceros WHERE id = ?").run(id)
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
  })

  ipcMain.handle("get-terceros-paginados", async (event, params) => {
    if (!checkPermission("terceros_ver") && !checkPermission("clientes_ver")) {
        return { draw: params.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
    }
    try {
      const { start, length, search, soloClientes } = params
      const searchValue = search?.value || ''
      let whereClause = "1=1"
      let queryParams = []
      if (soloClientes) whereClause += " AND es_cliente = 1"
      if (searchValue) {
        whereClause += ` AND (numero_documento LIKE ? OR razon_social LIKE ? OR nombres LIKE ? OR apellidos LIKE ?)`
        const likeSearch = `%${searchValue}%`
        queryParams.push(likeSearch, likeSearch, likeSearch, likeSearch)
      }
      const totalQuery = db.prepare(`SELECT COUNT(*) as count FROM terceros ${soloClientes ? 'WHERE es_cliente = 1' : ''}`).get()
      const filteredQuery = db.prepare(`SELECT COUNT(*) as count FROM terceros WHERE ${whereClause}`).get(...queryParams)
      const dataQuery = db.prepare(`SELECT * FROM terceros WHERE ${whereClause} ORDER BY date_created DESC LIMIT ? OFFSET ?`).all(...queryParams, length, start)
      return { draw: params.draw, recordsTotal: totalQuery.count, recordsFiltered: filteredQuery.count, data: dataQuery }
    } catch (error) { return { error: error.message } }
  })
}