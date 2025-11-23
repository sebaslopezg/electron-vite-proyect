import path from "path";
import sqlite3 from "sqlite3";
import { app } from "electron";

const dbPath =
  app && app.isPackaged
    ? path.join(process.resourcesPath, "data.db")
    : path.join(process.cwd(), "electron", "data.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite error:", err);
  else console.log("Connected to DB at", dbPath);
});

export default db;