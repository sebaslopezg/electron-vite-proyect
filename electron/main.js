import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { globalShortcut } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";

let mainWindow;

const preloadPath = path.join(app.getAppPath(), "electron/preload.js");
console.log("Using preload:", preloadPath);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null); // Hide menu bar

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    console.log("Loading dev server:", process.env.VITE_DEV_SERVER_URL);

    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);

    // Open DevTools once DOM is ready
    mainWindow.webContents.once("dom-ready", () => {
      console.log("DOM ready — opening DevTools");
      mainWindow.webContents.openDevTools({ mode: "detach" });
    });

    // Extra: log any load errors
    mainWindow.webContents.on("did-fail-load", (_, code, desc) => {
      console.error("Failed to load renderer:", code, desc);
    });

  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    console.log("Loading production file:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (!isMac) app.quit();
  });
}

// Handle IPC
ipcMain.handle("ping", () => "pong from main 🚀");

ipcMain.on("custom-event", (event, data) => {
  console.log("Renderer says:", data);
  event.reply("custom-event-reply", { ok: true, msg: "Got your message!" });
});

app.whenReady().then(() => {
  createMainWindow();

  // Manual devtools toggle
  if (isDev) {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (mainWindow) {
        const open = mainWindow.webContents.isDevToolsOpened();
        if (open) mainWindow.webContents.closeDevTools();
        else mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    });
  }
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});