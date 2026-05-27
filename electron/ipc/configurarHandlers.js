import { ipcMain, BrowserWindow, nativeImage } from "electron"
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
  const user = global.currentUserSession
  if (!user) return false
  return user.permisos?.includes("ALL") || user.permisos?.includes(permission)
}

export const registerConfigurarHandlers = () => {

  ipcMain.handle("get-configuracion", () => {
    if (!checkPermission("configuracion_general")) return []
    try { return db.prepare(`SELECT * FROM configurar`).all() } catch (error) { return [] }
  })

  ipcMain.handle("update-configuracion", (_, item) => {
    if (!checkPermission("configuracion_general")) return { success: false, error: "No autorizado." }
    try {
      db.prepare(`UPDATE configurar SET value=@value, date_modify=@date_modify WHERE key=@key`).run({ value: item.value, date_modify: new Date().toISOString(), key: item.key })
      return { success: true }
    } catch (error) { return { success: false, error: error.message } }
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