import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import chokidar from "chokidar";
import db from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const isMac = process.platform === "darwin";

let mainWindow;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(app.getAppPath(), "electron/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // ✅ Point to Vite's dev server
    const devServerURL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    console.log("🚀 Loading Vite dev server:", devServerURL);
    await mainWindow.loadURL(devServerURL);

    mainWindow.webContents.once("dom-ready", () => {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    });
  } else {
    // ✅ In production, load the built index.html
    const indexPath = path.join(__dirname, "../dist/index.html");
    console.log("📦 Loading production build:", indexPath);
    await mainWindow.loadFile(indexPath);
  }

  Menu.setApplicationMenu(null);

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (!isMac) app.quit();
  });
}

// === CRUD IPC ===

// READ
ipcMain.handle("get-inventario", async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM inventario WHERE status > 0", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// CREATE
ipcMain.handle("add-inventario", async (_, item) => {
  const { ref_name, sku } = item;
  const now = new Date().toISOString();
  const status = 1;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO inventario (ref_name, sku, status, date_created, date_modify)
       VALUES (?, ?, ?, ?, ?)`,
      [ref_name, sku, status, now, now],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
});

// UPDATE
ipcMain.handle("update-inventario", async (_, item) => {
  const { id, ref_name, sku, status } = item;
  const date_modify = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE inventario SET ref_name=?, sku=?, status=?, date_modify=? WHERE id=?`,
      [ref_name, sku, status, date_modify, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
});

// DELETE (soft delete)
ipcMain.handle("delete-inventario", async (_, id) => {
  const status = 0;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE inventario SET status = ? WHERE id = ?`,
      [status, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
});

// Other IPCs
ipcMain.handle("ping", () => "pong from main 🚀");

ipcMain.on("custom-event", (event, data) => {
  console.log("Renderer says:", data);
  event.reply("custom-event-reply", { ok: true, msg: "Got your message!" });
});

app.whenReady().then(async () => {
  // 🔁 Watch for main process changes and restart the app automatically
  if (isDev) {
    const watcher = chokidar.watch([
      path.join(__dirname, "./**/*.js"),
      path.join(__dirname, "../electron/**/*.js"),
    ]);
    watcher.on("change", () => {
      console.log("🔁 Restarting Electron due to main process change...");
      app.relaunch();
      app.exit(0);
    });
  }
  await createMainWindow();

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
