import { app, ipcMain, BrowserWindow } from "electron"
import pkg from "electron-updater"
const { autoUpdater } = pkg
import { logger } from "../utils/logger.js"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

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
      logger.info('SISTEMA', "Verificando disponibilidad de actualizaciones manualmente...")
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      logger.error('SISTEMA', "Error al buscar actualizaciones manuales", err)
      return { error: err.message }
    }
  })

  ipcMain.handle("download-update", async () => {
    try {
      logger.info('SISTEMA', "Iniciando descarga de la nueva actualización...")
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      logger.error('SISTEMA', "Error al intentar descargar la actualización", err)
      return { error: err.message }
    }
  })

  ipcMain.handle("install-update", () => {
    logger.warning('SISTEMA', "Cerrando la aplicación para instalar la nueva versión...")
    autoUpdater.quitAndInstall()
  })

  autoUpdater.on('update-available', (info) => {
      logger.success('SISTEMA', `Actualización detectada en el servidor: v${info.version}`)
      notifyWindow('update-available', info)

      try {
          const tituloNotif = `¡Nueva versión disponible! (v${info.version})`;
          
          const existe = db.prepare('SELECT id FROM notificaciones WHERE titulo = ?').get(tituloNotif);

          if (!existe) {
              const now = new Date().toISOString();
              db.prepare(`
                  INSERT INTO notificaciones (id, titulo, mensaje, tipo, link, leida, date_created)
                  VALUES (@id, @titulo, @mensaje, @tipo, @link, 0, @now)
              `).run({
                  id: uuidv4(),
                  titulo: tituloNotif,
                  mensaje: `La versión ${info.version} de Caedro está lista para descargar. Refresca la aplicación o revisa la ventana emergente para instalarla.`,
                  tipo: 'info',
                  link: '',
                  now
              });

              BrowserWindow.getAllWindows().forEach(win => {
                  win.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));").catch(() => {});
              });
          }
      } catch (error) {
          logger.error('NOTIFICACIONES', "Error al intentar registrar notificación de actualización", error);
      }
  })
  
  autoUpdater.on('update-not-available', (info) => {
      notifyWindow('update-not-available', info)
  })
  
  autoUpdater.on('download-progress', (progressObj) => notifyWindow('download-progress', progressObj))
  
  autoUpdater.on('update-downloaded', (info) => {
      logger.success('SISTEMA', `Actualización v${info.version} descargada exitosamente y lista para instalación.`)
      notifyWindow('update-downloaded', info)

      try {
          const now = new Date().toISOString();
          db.prepare(`
              INSERT INTO notificaciones (id, titulo, mensaje, tipo, link, leida, date_created)
              VALUES (@id, @titulo, @mensaje, @tipo, @link, 0, @now)
          `).run({
              id: uuidv4(),
              titulo: `Actualización v${info.version} Lista`,
              mensaje: `La actualización se ha descargado correctamente. Reinicia el sistema para aplicar los cambios.`,
              tipo: 'success',
              link: '',
              now
          });

          BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));").catch(() => {});
          });
      } catch (error) {
          logger.error('NOTIFICACIONES', "Error al registrar notificación de actualización lista", error);
      }
  })
  
  autoUpdater.on('error', (err) => {
      logger.error('SISTEMA', "Fallo crítico en el proceso de auto-actualización (autoUpdater)", err)
      notifyWindow('update-error', err.message)
  })

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
          logger.error('SISTEMA', "Error en la búsqueda automática de actualizaciones de inicio", err)
      })
    }, 3000)
  }
}