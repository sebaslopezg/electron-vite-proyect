import { runMigrations } from './migrations.js'
import { appDb, switchTenantDb } from "./index.js"

export const initDatabase = () => {
    try {
        appDb.exec(`
            CREATE TABLE IF NOT EXISTS perfiles (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                filename TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                date_created TEXT
            )
        `)

        const countRow = appDb.prepare("SELECT count(*) as count FROM perfiles").get()
        if (countRow.count === 0) {
            appDb.prepare("INSERT INTO perfiles (id, nombre, filename, is_active, date_created) VALUES (?, ?, ?, ?, ?)").run(
                '1', 'Mi Tienda Principal', 'main.db', 1, new Date().toISOString()
            )
        }
        
        const activeProfile = appDb.prepare("SELECT filename FROM perfiles WHERE is_active = 1").get()

        switchTenantDb(activeProfile.filename)

        runMigrations()

        console.log(`Connected to profile: ${activeProfile.filename}`)
    } catch (error) {
        console.error("Error initializing databases:", error)
    }
}