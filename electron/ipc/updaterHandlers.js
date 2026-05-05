import { app, ipcMain, BrowserWindow } from "electron"
import pkg from "electron-updater"
const { autoUpdater } = pkg

export const registerUpdaterHandlers = () => {
  autoUpdater.autoDownload = false

  const notifyWindow = (channel, payload) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(channel, payload)
    })
  }
  
  ipcMain.handle("get-app-version", () => app.getVersion())

  ipcMain.handle("check-updates", async () => {
    if (!app.isPackaged) return { error: "El actualizador solo funciona en producción." }
    try {
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall()
  })

  autoUpdater.on('update-available', (info) => notifyWindow('update-available', info))
  autoUpdater.on('update-not-available', (info) => notifyWindow('update-not-available', info))
  autoUpdater.on('download-progress', (progressObj) => notifyWindow('download-progress', progressObj))
  autoUpdater.on('update-downloaded', (info) => notifyWindow('update-downloaded', info))
  autoUpdater.on('error', (err) => notifyWindow('update-error', err.message))
}