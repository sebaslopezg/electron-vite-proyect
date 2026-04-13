import { ipcMain, app } from "electron"
import Database from 'better-sqlite3'
import db from "../database/index.js" 
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

// FUNCIÓN TRADUCTORA EXTREMA: Elimina todo lo que no sean tablas puras e inserts
const sanitizeSqlToSqlite = (sql) => {
    let clean = sql;

    // 1. Eliminar comentarios (/* ... */ y -- )
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/--.*$/gm, '');

    // 2. Eliminar bloqueos y variables de entorno de MySQL
    clean = clean.replace(/^LOCK TABLES.*?;/gmi, '');
    clean = clean.replace(/^UNLOCK TABLES;/gmi, '');
    clean = clean.replace(/^SET .*?;/gmi, '');

    // 3. Eliminar ALTER TABLES (usualmente añaden relaciones complejas que rompen SQLite)
    clean = clean.replace(/^ALTER TABLE[\s\S]*?;/gmi, '');

    // 4. Eliminar Vistas (Views)
    clean = clean.replace(/^DROP VIEW.*?;/gmi, '');
    clean = clean.replace(/^CREATE( OR REPLACE)?( ALGORITHM[\s\S]*?)? VIEW[\s\S]*?;/gmi, '');

    // 5. Eliminar Triggers y Procedimientos Almacenados
    clean = clean.replace(/^DROP TRIGGER.*?;/gmi, '');
    // Elimina bloques de procedimientos que usan DELIMITER (típico de phpMyAdmin)
    clean = clean.replace(/^DELIMITER[\s\S]*?^DELIMITER ;/gmi, ''); 
    // Elimina triggers estándar
    clean = clean.replace(/^CREATE TRIGGER[\s\S]*?END(;| \$\$)/gmi, '');

    // 6. Limpiar la "basura" dentro de los CREATE TABLE
    clean = clean.replace(/ENGINE=[^\s;]+/gi, '');
    clean = clean.replace(/DEFAULT CHARSET=[^\s;]+/gi, '');
    clean = clean.replace(/COLLATE=[^\s,;]+/gi, '');
    clean = clean.replace(/CHARACTER SET [^\s,;]+/gi, '');
    clean = clean.replace(/AUTO_INCREMENT=\d+/gi, '');
    clean = clean.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
    clean = clean.replace(/UNSIGNED/gi, '');
    clean = clean.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');

    // 7. Arreglar el escapado de comillas (MySQL usa \' , SQLite usa '')
    clean = clean.replace(/\\'/g, "''");

    return clean.trim();
}

export const registerImportHandlers = () => {

    ipcMain.handle("read-external-db", (_, filePath) => {
        try {
            let activeFilePath = filePath;
            let isTempFile = false;

            // SI ES UN ARCHIVO .SQL (Volcado de texto)
            if (filePath.toLowerCase().endsWith('.sql')) {
                // 1. Leemos el texto
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                // 2. Lo traducimos a SQLite
                const sanitizedSql = sanitizeSqlToSqlite(sqlContent);

                // 3. Creamos una base de datos temporal en blanco
                const tempDbPath = path.join(app.getPath("userData"), `temp_import_${Date.now()}.db`);
                const tempDb = new Database(tempDbPath);
                
                // 4. Ejecutamos todo el SQL allí dentro
                tempDb.exec(sanitizedSql);
                tempDb.close();

                // 5. Ahora le decimos al sistema que trabaje con esta nueva BD temporal
                activeFilePath = tempDbPath;
                isTempFile = true;
            }

            // LEER EL ESQUEMA (Funciona para .db nativos y para nuestro .db temporal recién creado)
            const extDb = new Database(activeFilePath, { readonly: true });
            const tables = extDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            
            const schema = {};
            for (const t of tables) {
                const columns = extDb.prepare(`PRAGMA table_info(${t.name})`).all();
                schema[t.name] = columns.map(c => c.name);
            }
            extDb.close();

            return { 
                success: true, 
                schema, 
                // Devolvemos la nueva ruta al Frontend por si tuvimos que crear un archivo temporal
                newPath: isTempFile ? activeFilePath : filePath 
            };
        } catch (error) {
            console.error(error);
            return { 
                success: false, 
                error: "Error procesando el archivo. Si es un .sql de MySQL muy complejo (con vistas, triggers o tipos de datos exóticos), puede que no sea compatible con SQLite directamente." 
            };
        }
    });

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

    ipcMain.handle("execute-import", (_, { filePath, sourceTable, targetTable, mapping }) => {
        try {
            const extDb = new Database(filePath, { readonly: true });
            const sourceData = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            extDb.close();

            if (sourceData.length === 0) return { success: false, error: "La tabla de origen está vacía." };

            const transaction = db.transaction((data) => {
                const targetCols = Object.keys(mapping);
                
                const allTargetCols = [...targetCols];
                if (!allTargetCols.includes('id')) allTargetCols.push('id');
                if (!allTargetCols.includes('date_created')) allTargetCols.push('date_created');
                if (!allTargetCols.includes('status')) allTargetCols.push('status');

                const placeholders = allTargetCols.map(() => '?').join(', ');
                const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${allTargetCols.join(', ')}) VALUES (${placeholders})`);

                let count = 0;
                for (const row of data) {
                    const values = [];
                    for (const targetCol of allTargetCols) {
                        if (targetCol === 'id' && !mapping['id']) {
                            values.push(uuidv4());
                        } else if (targetCol === 'date_created' && !mapping['date_created']) {
                            values.push(new Date().toISOString());
                        } else if (targetCol === 'status' && !mapping['status']) {
                            values.push(1); 
                        } else {
                            const sourceCol = mapping[targetCol];
                            values.push(row[sourceCol] ?? null); 
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