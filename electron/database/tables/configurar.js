import db from "../index.js"

export const createConfigurarTable = () => {
  const now = new Date().toISOString()

  const confApp = {
    nombre: 'Caedro',
    logo: '',
    moneda: 'COP',
    formato_numero: 'es-CO'
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS configurar (
      key TEXT PRIMARY KEY,
      value TEXT,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `);

  try {
    const row = db.prepare("SELECT count(*) as count FROM configurar WHERE key = 'confApp'").get();
    if (row.count === 0) {
      db.prepare("INSERT INTO configurar (key, value, date_created, date_modify) VALUES (?, ?, ?, ?)").run(
        'confApp', JSON.stringify(confApp), now, now
      );
    }
  } catch (err) {
    console.error('Error insertando configuración por defecto:', err)
  }
}