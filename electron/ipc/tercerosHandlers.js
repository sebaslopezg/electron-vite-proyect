import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"

export const registerTercerosHandlers = () => {
  ipcMain.handle("get-terceros", () => {
    try {
      const terceros = db.prepare("SELECT * FROM terceros ORDER BY date_created DESC").all()
      return { success: true, data: terceros }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("crear-tercero", async (event, tercero) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO terceros 
        (id, tipo_documento, numero_documento, digito_verificacion, tipo_persona, razon_social, nombres, apellidos, direccion, telefono, email, ciudad_id, es_cliente, es_proveedor, estado, date_created) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `)
      
      const id = uuidv4()
      stmt.run(
        id, tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion,
        tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos,
        tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id,
        tercero.es_cliente, tercero.es_proveedor
      )
      return { success: true }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { success: false, error: "Ya existe un tercero registrado con este número de documento." }
      }
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("actualizar-tercero", async (event, tercero) => {
    try {
      const stmt = db.prepare(`
        UPDATE terceros SET 
        tipo_documento = ?, numero_documento = ?, digito_verificacion = ?, tipo_persona = ?, 
        razon_social = ?, nombres = ?, apellidos = ?, direccion = ?, telefono = ?, email = ?, 
        ciudad_id = ?, es_cliente = ?, es_proveedor = ?, estado = ?, date_modify = datetime('now')
        WHERE id = ?
      `)
      stmt.run(
        tercero.tipo_documento, tercero.numero_documento, tercero.digito_verificacion,
        tercero.tipo_persona, tercero.razon_social, tercero.nombres, tercero.apellidos,
        tercero.direccion, tercero.telefono, tercero.email, tercero.ciudad_id,
        tercero.es_cliente, tercero.es_proveedor, tercero.estado, tercero.id
      )
      return { success: true }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { success: false, error: "El número de documento ya está en uso por otro tercero." }
      }
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("eliminar-tercero", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM terceros WHERE id = ?")
      stmt.run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}