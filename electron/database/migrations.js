import db from './index.js'
import { getDatabaseVersion, setDatabaseVersion } from './version.js'

const migrations = [
    // Migration 1: Initial setup (already done)
    {
        version: 1,
        up: () => {
            // Your initial table creation
        }
    },
  
    // Migration 2: Add new column to configurar table
    {
        version: 2,
        up: () => {
            return new Promise((resolve, reject) => {
                db.run(`
                    ALTER TABLE configurar 
                    ADD COLUMN email TEXT DEFAULT ''
                `, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }
    },
  
    // Migration 3: Add another column later
    {
        version: 3,
        up: () => {
            return new Promise((resolve, reject) => {
                db.run(`
                    ALTER TABLE producto 
                    ADD COLUMN precio REAL DEFAULT 0
                `, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }
    }
]

export const runMigrations = async() => {
    try {
        const currentVersion = await getDatabaseVersion()
        console.log(`Current DB version: ${currentVersion}`)

        // Run only migrations that haven't been applied yet
        for (const migration of migrations) {
            if (migration.version > currentVersion) {
                console.log(`Running migration ${migration.version}...`)
                await migration.up()
                await setDatabaseVersion(migration.version)
                console.log(`Migration ${migration.version} completed`)
            }
        }
    } catch (err) {
        console.error('Migration error:', err)
        throw err
    }
}