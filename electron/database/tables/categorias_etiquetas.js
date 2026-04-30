import db from "../index.js"

export const runV1CategoriasEtiquetas = () => {
    db.exec(`
      -- 1. TABLA CATEGORÍAS
      CREATE TABLE categoria (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        sku_prefix TEXT,
        separador TEXT DEFAULT '-',
        status INTEGER DEFAULT 1
      );

      -- 2. TABLA ETIQUETAS
      CREATE TABLE etiqueta (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        color TEXT DEFAULT '#0d6efd',
        status INTEGER DEFAULT 1
      );

      -- 3. RELACIÓN: ETIQUETAS PERTENECEN A CATEGORÍAS
      CREATE TABLE etiqueta_categoria (
        etiqueta_id TEXT,
        categoria_id TEXT,
        PRIMARY KEY (etiqueta_id, categoria_id),
        FOREIGN KEY(etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE,
        FOREIGN KEY(categoria_id) REFERENCES categoria(id) ON DELETE CASCADE
      );

      -- 4. RELACIÓN: PRODUCTOS TIENEN ETIQUETAS
      CREATE TABLE producto_etiqueta (
        producto_id TEXT,
        etiqueta_id TEXT,
        PRIMARY KEY (producto_id, etiqueta_id),
        FOREIGN KEY(producto_id) REFERENCES producto(id) ON DELETE CASCADE,
        FOREIGN KEY(etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE
      );
    `);

    db.prepare(`
        INSERT INTO categoria (id, nombre, descripcion, sku_prefix, separador, status) 
        VALUES ('general', 'General', 'Categoría por defecto', '', '', 1)
    `).run();

    console.log("Tablas de Categorías y Etiquetas inicializadas.");
}