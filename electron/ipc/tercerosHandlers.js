import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"
import { logger } from "../utils/logger.js"
import { canModifyModule } from "./syncHandlers.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false;
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerTercerosHandlers = () => {

  ipcMain.handle("get-terceros", () => {
    if (!checkPermission("terceros_ver") && !checkPermission("ventas_crear")) {
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
    if (!checkPermission("terceros_crear") && !checkPermission("ventas_crear")) return { success: false, error: "No autorizado" }
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
        return { success: true }
    } catch (error) { 
        logger.error('TERCEROS', `Error al intentar registrar el tercero con documento: ${tercero?.numero_documento}`, error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("actualizar-tercero", async (event, tercero) => {
    if (!checkPermission("terceros_editar")) return { success: false, error: "No autorizado" };
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
        return { success: true }
    } catch (error) { 
        logger.error('TERCEROS', `Error al actualizar la información del tercero ID: ${tercero?.id}`, error)
        return { success: false, error: error.message } 
    }
  })

  ipcMain.handle("desactivar-tercero", async (event, id) => {
      if (!checkPermission("clientes_desactivar")) return { success: false, error: "No autorizado" }
      if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
      try {
          db.prepare("UPDATE terceros SET estado = 0, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
          logger.success('TERCEROS', `Tercero con ID ${id} fue desactivado exitosamente`)
          return { success: true }
      } catch (error) { 
          logger.error('TERCEROS', `Error al desactivar el tercero ID: ${id}`, error)
          return { success: false, error: error.message } 
      }
  })

  ipcMain.handle("reactivar-tercero", async (event, id) => {
      if (!checkPermission("clientes_editar")) return { success: false, error: "No autorizado" }
      if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
      try {
          db.prepare("UPDATE terceros SET estado = 1, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
          logger.success('TERCEROS', `Tercero con ID ${id} fue reactivado exitosamente`)
          return { success: true }
      } catch (error) { 
          logger.error('TERCEROS', `Error al reactivar el tercero ID: ${id}`, error)
          return { success: false, error: error.message } 
      }
  })

  ipcMain.handle("eliminar-tercero", async (event, id) => {
    if (!checkPermission("terceros_eliminar")) return { success: false, error: "No autorizado" }
    if (!canModifyModule('terceros')) return { success: false, error: 'Acción bloqueada. Sincronización web activa.' }
    try {
        db.prepare("UPDATE terceros SET estado = -1, date_modify = datetime('now', 'localtime') WHERE id = ?").run(id)
        logger.success('TERCEROS', `Tercero con ID ${id} fue dado de baja lógicamente (Soft Delete)`)
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
        if (estadoFinal === 0 && !checkPermission("clientes_inactivos_ver")) {
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
}