import db from "../index.js"

export const createConfigurarTable = () => {
  const now = new Date().toISOString()

  // Configuración general por defecto
  const confApp = {
    nombre: 'Caedro',
    logo: '' // Aquí guardaremos la imagen en base64
  }

  // 1. Crear tabla
  db.exec(`
    CREATE TABLE IF NOT EXISTS configurar (
      key TEXT PRIMARY KEY,
      value TEXT,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    )
  `);

  // 2. Insertar configuración por defecto si no existe
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