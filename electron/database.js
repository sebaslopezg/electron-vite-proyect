import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "inventario.db");
const db = new sqlite3.Database(dbPath);

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
