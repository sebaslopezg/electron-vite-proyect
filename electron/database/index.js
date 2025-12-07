import path from "path"
import Database from 'better-sqlite3'
import { app } from "electron"
import fs from 'fs'

const userDataPath = app.getPath('userData')
const dbName = 'data.db'
const dbPath = path.join(userDataPath, dbName)

const isPackaged = app.isPackaged
const resourcesPath = isPackaged
  ? process.resourcesPath // Production path
  : path.join(app.getAppPath(), 'electron'); // Dev path

const templateDbPath = path.join(resourcesPath, dbName)

if (!fs.existsSync(dbPath)) {
  if (fs.existsSync(templateDbPath)) {
    fs.copyFileSync(templateDbPath, dbPath);
    console.log("Database copied to User Data folder.");
  } else {
    fs.writeFileSync(dbPath, ''); 
  }
}

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
console.log(`Connected to database at: ${dbPath}`)

/* const dbPath =
  app && app.isPackaged
    ? path.join(process.resourcesPath, "data.db")
    : path.join(process.cwd(), "electron", "data.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite error:", err)
  else console.log("Connected to DB at", dbPath)
}); */

export default db