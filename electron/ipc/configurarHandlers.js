import { ipcMain, BrowserWindow, nativeImage } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerConfigurarHandlers = () => {

  ipcMain.handle("get-configuracion", () => {
    try {
      const stmt = db.prepare(`SELECT * FROM configurar`)
      return stmt.all()
    } catch (error) {
      logger.error('CONFIGURACION_SISTEMA', "Error al intentar obtener los ajustes generales del sistema", error)
      return []
    }
  })

  ipcMain.handle("update-configuracion", (_, item) => {
    try {
      const now = new Date().toISOString()
      const stmt = db.prepare(`
        UPDATE configurar SET value=@value, date_modify=@date_modify WHERE key=@key
      `)
      const info = stmt.run({ value: item.value, date_modify: now, key: item.key })
      
      logger.success('CONFIGURACION_SISTEMA', `Ajuste del sistema actualizado con éxito`, `Clave: ${item.key}`)
      return { success: true, changes: info.changes }
    } catch (error) {
      logger.error('CONFIGURACION_SISTEMA', `Error al actualizar el ajuste del sistema (Clave: ${item.key})`, error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.on("update-window", (_, data) => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const win = windows[0]

      if (data.nombre) {
        win.setTitle(data.nombre);
        logger.info('SISTEMA', `El título de la ventana principal se actualizó a: ${data.nombre}`)
      }

      if (data.logo) {
        try {
          const image = nativeImage.createFromDataURL(data.logo)
          win.setIcon(image)
        } catch (e) {
          logger.error('SISTEMA', "Error configurando el ícono de la ventana principal", e)
        }
      }
    }
  })
}