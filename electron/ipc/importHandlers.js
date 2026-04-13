import { ipcMain, app, dialog } from "electron"
import Database from 'better-sqlite3'
import db from "../database/index.js" 
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

// --- HELPER: Formatear peso de archivos ---
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- HELPER: Purificador de MySQL a SQLite ---
const sanitizeSqlToSqlite = (sql) => {
    let clean = sql;
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/--.*$/gm, '');
    clean = clean.replace(/^LOCK TABLES.*?;/gmi, '');
    clean = clean.replace(/^UNLOCK TABLES;/gmi, '');
    clean = clean.replace(/^SET .*?;/gmi, '');
    clean = clean.replace(/^ALTER TABLE[\s\S]*?;/gmi, '');
    clean = clean.replace(/^DROP VIEW.*?;/gmi, '');
    clean = clean.replace(/^CREATE( OR REPLACE)?( ALGORITHM[\s\S]*?)? VIEW[\s\S]*?;/gmi, '');
    clean = clean.replace(/^DROP TRIGGER.*?;/gmi, '');
    clean = clean.replace(/^DELIMITER[\s\S]*?^DELIMITER ;/gmi, '');
    clean = clean.replace(/^CREATE TRIGGER[\s\S]*?END(;| \$\$)/gmi, '');
    clean = clean.replace(/ENGINE=[^\s;]+/gi, '');
    clean = clean.replace(/DEFAULT CHARSET=[^\s;]+/gi, '');
    clean = clean.replace(/COLLATE=[^\s,;]+/gi, '');
    clean = clean.replace(/CHARACTER SET [^\s,;]+/gi, '');
    clean = clean.replace(/AUTO_INCREMENT=\d+/gi, '');
    clean = clean.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
    clean = clean.replace(/UNSIGNED/gi, '');
    clean = clean.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
    clean = clean.replace(/,\s*(UNIQUE\s+)?KEY\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s*\([^)]+\)/gmi, '');
    clean = clean.replace(/,\s*FULLTEXT\s+KEY\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s*\([^)]+\)/gmi, '');
    clean = clean.replace(/,\s*CONSTRAINT\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s+FOREIGN\s+KEY[^\n]+/gmi, '');
    clean = clean.replace(/\\'/g, "''");
    return clean.trim();
}

export const registerImportHandlers = () => {

    // 1. SELECTOR NATIVO DE ARCHIVOS
    ipcMain.handle("select-db-file", async () => {
        const result = await dialog.showOpenDialog({
            title: 'Seleccionar Base de Datos',
            properties: ['openFile'],
            filters: [{ name: 'Bases de Datos', extensions: ['db', 'sqlite', 'sqlite3', 'sql'] }]
        });
        
        if (result.canceled) {
            return { canceled: true };
        } else {
            const filePath = result.filePaths[0];
            const stats = fs.statSync(filePath); 
            
            return { 
                canceled: false, 
                filePath, 
                sizeBytes: stats.size,
                sizeFormatted: formatBytes(stats.size)
            };
        }
    });

    // 2. LEER ARCHIVO Y EXTRAER ESQUEMA
    ipcMain.handle("read-external-db", (_, filePath) => {
        try {
            if (!filePath) return { success: false, error: "La ruta del archivo es inválida." };

            let activeFilePath = filePath;
            let isTempFile = false;

            if (filePath.toLowerCase().endsWith('.sql')) {
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                const sanitizedSql = sanitizeSqlToSqlite(sqlContent);

                const tempDbPath = path.join(app.getPath("userData"), `temp_import_${Date.now()}.db`);
                const tempDb = new Database(tempDbPath);

                const statements = sanitizedSql.split(/;\r?\n/);
                
                for (let stmt of statements) {
                    if (stmt.trim()) {
                        try { tempDb.exec(stmt + ';'); } 
                        catch (err) { console.warn("SQL Ignorado:", err.message); }
                    }
                }
                tempDb.close();

                activeFilePath = tempDbPath;
                isTempFile = true;
            }

            const extDb = new Database(activeFilePath, { readonly: true });
            const tables = extDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            
            const schema = {};
            for (const t of tables) {
                const columns = extDb.prepare(`PRAGMA table_info(${t.name})`).all();
                schema[t.name] = columns.map(c => c.name);
            }
            extDb.close();

            return { success: true, schema, newPath: isTempFile ? activeFilePath : filePath };
        } catch (error) {
            console.error("ERROR CRÍTICO AL LEER DB:", error);
            return { success: false, error: `Error procesando el archivo: ${error.message}` };
        }
    });

    // 3. OBTENER ESQUEMA DE CAEDRO
    ipcMain.handle("get-internal-schema", () => {
        try {
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            const schema = {};
            for (const t of tables) {
                const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
                schema[t.name] = columns.map(c => c.name);
            }
            return { success: true, schema };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 4. PREVISUALIZAR DATOS DE UNA TABLA (¡Solo uno de estos!)
    ipcMain.handle("preview-external-table", (_, { filePath, tableName }) => {
        try {
            if (!fs.existsSync(filePath)) return { success: false, error: "El archivo de base de datos no se encuentra." };

            const extDb = new Database(filePath, { readonly: true });

            const colInfo = extDb.prepare(`PRAGMA table_info(${tableName})`).all();
            const columns = colInfo.map(c => c.name);

            const data = extDb.prepare(`SELECT * FROM ${tableName} LIMIT 50`).all();
            const countRow = extDb.prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get();

            extDb.close();
            
            return { success: true, columns, data, totalRows: countRow.total };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 5. EJECUTAR LA IMPORTACIÓN
    ipcMain.handle("execute-import", (_, { filePath, sourceTable, targetTable, mapping, defaultValues }) => {
        try {
            const extDb = new Database(filePath, { readonly: true });
            const sourceData = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            extDb.close();

            if (sourceData.length === 0) return { success: false, error: "La tabla de origen está vacía." };

            const transaction = db.transaction((data) => {
                const targetCols = db.prepare(`PRAGMA table_info(${targetTable})`).all().map(c => c.name);
                const placeholders = targetCols.map(() => '?').join(', ');
                const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

                let count = 0;
                for (const row of data) {
                    const values = [];
                    for (const targetCol of targetCols) {
                        if (targetCol === 'id' && !mapping['id']) {
                            values.push(uuidv4());
                        } else if (targetCol === 'date_created' && !mapping['date_created']) {
                            values.push(new Date().toISOString());
                        } else if (targetCol === 'status' && !mapping['status']) {
                            values.push(1); 
                        } else {
                            const sourceCol = mapping[targetCol];
                            if (sourceCol) {
                                values.push(row[sourceCol] ?? null); 
                            } else {
                                values.push(defaultValues[targetCol] ?? null);
                            }
                        }
                    }
                    insertStmt.run(values);
                    count++;
                }
                return count;
            });

            const rowsImported = transaction(sourceData);
            return { success: true, rows: rowsImported };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}