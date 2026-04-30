import db from './index.js'

export const getDatabaseVersion = () => {
    const row = db.prepare('PRAGMA user_version').get();
    return row ? row.user_version : 0;
}

export const setDatabaseVersion = (version) => {
    db.prepare(`PRAGMA user_version = ${version}`).run();
}