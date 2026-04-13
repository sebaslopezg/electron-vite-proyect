import db from "../index.js"
import { v4 as uuidv4 } from 'uuid'

export const createCategoriasEtiquetasTables = () => {
  try {
    db.exec(`
      -- 1. TABLA CATEGORÍAS
      CREATE TABLE IF NOT EXISTS categoria (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        sku_prefix TEXT,
        status INTEGER DEFAULT 1
      );

      -- 2. TABLA ETIQUETAS
      CREATE TABLE IF NOT EXISTS etiqueta (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        color TEXT DEFAULT '#0d6efd',
        status INTEGER DEFAULT 1
      );

      -- 3. RELACIÓN: ETIQUETAS PERTENECEN A CATEGORÍAS
      CREATE TABLE IF NOT EXISTS etiqueta_categoria (
        etiqueta_id TEXT,
        categoria_id TEXT,
        PRIMARY KEY (etiqueta_id, categoria_id),
        FOREIGN KEY(etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE,
        FOREIGN KEY(categoria_id) REFERENCES categoria(id) ON DELETE CASCADE
      );

      -- 4. RELACIÓN: PRODUCTOS TIENEN ETIQUETAS
      CREATE TABLE IF NOT EXISTS producto_etiqueta (
        producto_id TEXT,
        etiqueta_id TEXT,
        PRIMARY KEY (producto_id, etiqueta_id),
        FOREIGN KEY(producto_id) REFERENCES producto(id) ON DELETE CASCADE,
        FOREIGN KEY(etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE
      );
    `);

    // Crear la categoría "general" por defecto si no existe
    const row = db.prepare('SELECT count(*) as count FROM categoria WHERE id = ?').get('general');
    if (row.count === 0) {
      db.prepare(`
        INSERT INTO categoria (id, nombre, descripcion, sku_prefix, status) 
        VALUES ('general', 'General', 'Categoría por defecto', 'GEN', 1)
      `).run();
    }

    console.log("Tablas de Categorías y Etiquetas inicializadas.");
  } catch (error) {
    console.error("Error creando tablas de categorías/etiquetas:", error);
  }
}