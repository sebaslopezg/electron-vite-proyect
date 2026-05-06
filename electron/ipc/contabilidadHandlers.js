import { ipcMain } from "electron"
import db from "../database/index.js"

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
      stmt.run(cuenta.id, cuenta.nombre, cuenta.tipo, cuenta.naturaleza, cuenta.es_auxiliar, cuenta.exige_tercero);
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
      stmt.run(cuenta.nombre, cuenta.exige_tercero, cuenta.estado, cuenta.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })

  ipcMain.handle("eliminar-cuenta", async (event, id) => {
    try {
      const hijas = db.prepare("SELECT COUNT(*) as total FROM cuentasContables WHERE id LIKE ? AND id != ?").get(`${id}%`, id);
      
      if (hijas.total > 0) {
        return { success: false, error: `No puedes eliminar esta cuenta porque tiene ${hijas.total} subcuentas asignadas. Elimina las hijas primero.` }
      }

      const stmt = db.prepare("DELETE FROM cuentasContables WHERE id = ?");
      stmt.run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
}