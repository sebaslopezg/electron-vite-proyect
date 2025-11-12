import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath =
  app && app.isPackaged
    ? path.join(process.resourcesPath, "inventario.db")
    : path.join(process.cwd(), "electron", "inventario.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite error:", err);
  else console.log("Connected to DB at", dbPath);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_name TEXT,
      sku TEXT,
      status INTEGER,
      date_created TEXT,
      date_modify TEXT
    )
  `);
});

export default db;
