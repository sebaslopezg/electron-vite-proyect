import db from "../index.js"

export const runV1Configurar = () => {
  db.exec(`
    CREATE TABLE configurar (
      key TEXT PRIMARY KEY,
      value TEXT,
      date_created TEXT,
      date_modify TEXT,
      modify_by TEXT
    );
  `);

  const now = new Date().toISOString()
  const confApp = {
      nombre: 'Caedro',
      logo: '',
      moneda: 'COP',
      formato_numero: 'es-CO'
  }

  db.prepare(`
    INSERT INTO configurar (key, value, date_created, date_modify, modify_by) 
    VALUES (?, ?, ?, ?, ?)
  `).run('confApp', JSON.stringify(confApp), now, now, 'system');

  console.log("Tabla Configurar inicializada.");
}