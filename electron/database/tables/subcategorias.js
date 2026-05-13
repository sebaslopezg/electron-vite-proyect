import db from "../index.js"

export const runV1Subcategorias = () => {
    console.log("Applying migration V11: Tabla de Subcategorías")
    db.exec(`
        CREATE TABLE IF NOT EXISTS subcategoria (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            sku_prefix TEXT,
            separador TEXT DEFAULT '-',
            categoria_id TEXT NOT NULL,
            status INTEGER DEFAULT 1,
            FOREIGN KEY(categoria_id) REFERENCES categoria(id)
        );
    `)
    console.log("Tabla 'Subcategorias' inicializada.");
}