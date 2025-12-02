import db from './index.js'

export const getDatabaseVersion = () => {
    return new Promise((resolve, reject) => {
        db.get('PRAGMA user_version', (err, row) => {
            if (err) reject(err)
            else resolve(row.user_version || 0)
        })
    })
}

export const setDatabaseVersion = (version) => {
    return new Promise((resolve, reject) => {
        db.run(`PRAGMA user_version = ${version}`, (err) => {
            if (err) reject(err)
            else resolve()
      })
    })
}