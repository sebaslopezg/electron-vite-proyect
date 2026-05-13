import { ipcMain, app, dialog } from "electron"
import Database from 'better-sqlite3'
import db from "../database/index.js" 
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const sanitizeSqlToSqlite = (sql) => {
    // 0. Eliminar el BOM (Byte Order Mark) y caracteres invisibles al inicio
    let clean = sql.replace(/^\uFEFF/, '');

    // 1. LIMPIEZA INICIAL: Comentarios de MariaDB/MySQL
    // Atrapamos espacios, tabs o caracteres invisibles ANTES del comentario
    clean = clean.replace(/^[ \t\uFEFF\xA0]*--.*$/gm, '');
    clean = clean.replace(/^[ \t\uFEFF\xA0]*#.*$/gm, '');
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');

    // 2. COMANDOS QUE SQLITE NO ENTIENDE
    clean = clean.replace(/^[ \t]*LOCK TABLES.*?;/gmi, '');
    clean = clean.replace(/^[ \t]*UNLOCK TABLES;/gmi, '');
    clean = clean.replace(/^[ \t]*SET .*?;/gmi, '');
    clean = clean.replace(/^[ \t]*ALTER TABLE[\s\S]*?;/gmi, '');
    clean = clean.replace(/^[ \t]*DROP VIEW.*?;/gmi, '');
    clean = clean.replace(/^[ \t]*CREATE( OR REPLACE)?( ALGORITHM[\s\S]*?)? VIEW[\s\S]*?;/gmi, '');
    clean = clean.replace(/^[ \t]*DROP TRIGGER.*?;/gmi, '');
    clean = clean.replace(/^[ \t]*DELIMITER[\s\S]*?^[ \t]*DELIMITER ;/gmi, '');
    clean = clean.replace(/^[ \t]*CREATE TRIGGER[\s\S]*?END(;| \$\$)/gmi, '');

    // 3. LIMPIEZA DEL CREATE TABLE (Corta todas las etiquetas de MySQL al final)
    // Cambia todo el "ENGINE=MyISAM DEFAULT CHARSET=..." por un simple ");"
    clean = clean.replace(/\)\s*(ENGINE|DEFAULT CHARSET|CHARSET|COLLATE)[^;]+;/gmi, ');');

    // 4. PALABRAS RESERVADAS DENTRO DE LAS COLUMNAS
    clean = clean.replace(/\bAUTO_INCREMENT=\d+\b/gi, ''); 
    clean = clean.replace(/\bAUTO_INCREMENT\b/gi, ''); 
    clean = clean.replace(/\bUNSIGNED\b/gi, '');
    clean = clean.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
    clean = clean.replace(/current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP'); // Adaptación a SQLite

    // 5. LLAVES Y RESTRICCIONES (Constraints que SQLite maneja diferente)
    clean = clean.replace(/,\s*(UNIQUE\s+)?KEY\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s*\([^)]+\)/gmi, '');
    clean = clean.replace(/,\s*(UNIQUE\s+)?INDEX\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s*\([^)]+\)/gmi, '');
    clean = clean.replace(/,\s*FULLTEXT\s+KEY\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s*\([^)]+\)/gmi, '');
    clean = clean.replace(/,\s*CONSTRAINT\s+[`'"]?[a-zA-Z0-9_]+[`'"]?\s+FOREIGN\s+KEY[^\n)]+\)/gmi, '');

    // 6. TIPOS DE DATOS (Adaptación de MySQL a SQLite)
    clean = clean.replace(/\bint\(\d+\)\b/gi, 'INTEGER');
    clean = clean.replace(/\btinyint\(\d+\)\b/gi, 'INTEGER');
    clean = clean.replace(/\bbigint\(\d+\)\b/gi, 'INTEGER');

    // 7. ESCAPE DE CARACTERES (Previene roturas en los INSERTs)
    clean = clean.replace(/\\'/g, "''");
    clean = clean.replace(/\\"/g, '"');
    clean = clean.replace(/\\\\/g, '\\');

    // 8. BORRAR SALTOS DE LÍNEA VACÍOS RESIDUALES
    clean = clean.replace(/^\s*[\r\n]/gm, '');

    return clean.trim();
}

export const registerImportHandlers = () => {


    // 1. Selector exclusivo para CSV
    ipcMain.handle("select-csv-file", async () => {
        const result = await dialog.showOpenDialog({
            title: 'Seleccionar Archivo CSV',
            properties: ['openFile'],
            filters: [{ name: 'Archivos CSV', extensions: ['csv'] }]
        });
        
        if (result.canceled) return { canceled: true };
        const filePath = result.filePaths[0];
        const stats = fs.statSync(filePath); 
        return { canceled: false, filePath, sizeBytes: stats.size, sizeFormatted: formatBytes(stats.size) };
    });

    ipcMain.handle("read-csv-file", async (event, filePath) => {
        const sendLog = (msg) => { if (event && event.sender) event.sender.send('import-log', msg); };
        sendLog(`[CSV] >> Abriendo flujo de lectura de archivo...`);

        return new Promise((resolve) => {
            const previewData = [];
            let columns = [];
            let totalRows = 0;

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('headers', (headers) => {
                    columns = headers;
                    sendLog(`[CSV] 🔍 Columnas detectadas: ${columns.length}`);
                })
                .on('data', (data) => {
                    totalRows++;
                    if (totalRows <= 50) {
                        previewData.push(data);
                    }
                    if (totalRows > 0 && totalRows % 10000 === 0) {
                        sendLog(`[CSV] Contando registros: ${totalRows} filas procesadas...`);
                    }
                })
                .on('end', () => {
                    sendLog(`[CSV] >> Archivo pre-cargado. Total exacto: ${totalRows} filas.`);
                    resolve({ 
                        success: true, 
                        columns: columns, 
                        data: previewData, 
                        totalRows: totalRows 
                    });
                })
                .on('error', (error) => {
                    sendLog(`[CSV] X Error leyendo el archivo: ${error.message}`);
                    resolve({ success: false, error: error.message });
                });
        });
    });

    ipcMain.handle("execute-import-csv", async (event, { filePath, targetTable, mapping, defaultValues, idPrefix }) => {
        const sendLog = (msg) => { if (event && event.sender) event.sender.send('import-log', msg); };
        sendLog(`[CSV] Iniciando lectura del archivo...`);

        return new Promise((resolve) => {
            const sourceData = [];
            let readCount = 0;

            fs.createReadStream(filePath)
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => {
                    sourceData.push(data);
                    readCount++;
                    if (readCount % 5000 === 0) sendLog(`[CSV] Procesando: ${readCount} filas encontradas...`);
                })
                .on('error', (error) => {
                    sendLog(`[CSV] ❌ Error leyendo el archivo: ${error.message}`);
                    resolve({ success: false, error: "Error leyendo CSV: " + error.message });
                })
                .on('end', async () => {
                    try {
                        if (sourceData.length === 0) {
                            sendLog(`[CSV] ❌ El archivo está vacío.`);
                            return resolve({ success: false, error: "El archivo CSV está vacío." });
                        }

                        sendLog(`[CSV] Lectura completa. Total a importar: ${sourceData.length} filas.`);
                        sendLog(`[CSV] Preparando motor SQLite para tabla '${targetTable}'...`);

                        const targetColsInfo = db.prepare(`PRAGMA table_info(${targetTable})`).all();
                        const targetCols = targetColsInfo.map(c => c.name);
                        const placeholders = targetCols.map(() => '?').join(', ');
                        const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

                        let count = 0, fixed = 0, skipped = 0;
                        sendLog(`[CSV] Insertando datos (En bloques para evitar congelamiento)...`);

                        // Función interna que inserta un bloque pequeño
                        const processChunk = db.transaction((rows) => {
                            let c = 0, f = 0, s = 0;
                            for (const row of rows) {
                                const values = [];
                                for (const targetCol of targetCols) {
                                    let finalValue = null;

                                    if (targetCol === 'id') {
                                        if (mapping['id'] && row[mapping['id']]) finalValue = (idPrefix || '') + String(row[mapping['id']]);
                                        else if (defaultValues['id']) finalValue = (idPrefix || '') + String(defaultValues['id']);
                                        else finalValue = uuidv4();
                                    }
                                    else if (targetCol === 'date_created' && !mapping['date_created']) finalValue = new Date().toISOString();
                                    else if (targetCol === 'status' && !mapping['status']) finalValue = 1; 
                                    else if (mapping[targetCol]) finalValue = row[mapping[targetCol]];
                                    else if (defaultValues[targetCol] !== undefined && defaultValues[targetCol] !== '') finalValue = defaultValues[targetCol];

                                    // Limpieza de tipos universal
                                    if (finalValue === undefined || finalValue === "undefined") {
                                        finalValue = null;
                                    } else if (finalValue === "") {
                                        finalValue = "";
                                    } else if (finalValue !== null) {
                                        if (typeof finalValue === 'string') {
                                            const matchDict = finalValue.match(/^(\d+)\s*\(/);
                                            if (matchDict) finalValue = parseInt(matchDict[1], 10);
                                            else if (!isNaN(finalValue) && finalValue.trim() !== '') finalValue = Number(finalValue);
                                            else finalValue = String(finalValue).trim();
                                        }
                                    }
                                    values.push(finalValue);
                                }

                                try { 
                                    insertStmt.run(values); c++; 
                                } catch (err) {
                                    if (err.message.includes('UNIQUE constraint failed')) {
                                        try {
                                            const parts = err.message.split(': ');
                                            if (parts.length > 1) {
                                                const failedFields = parts[1].split(', ');
                                                failedFields.forEach(field => {
                                                    const colName = field.includes('.') ? field.split('.')[1] : field;
                                                    const colIdx = targetCols.indexOf(colName);
                                                    if (colIdx !== -1) {
                                                        const oldVal = values[colIdx];
                                                        values[colIdx] = oldVal ? `${oldVal}_dup${Math.floor(Math.random()*10000)}` : `sin_dato_${Math.floor(Math.random()*100000)}`;
                                                    }
                                                });
                                                insertStmt.run(values); c++; f++; 
                                            } else s++;
                                        } catch (e2) { s++; }
                                    } else s++;
                                }
                            }
                            return { c, f, s };
                        });

                        // CHUNKING: Cortamos el trabajo en bloques de 1500
                        const CHUNK_SIZE = 1500;
                        for (let i = 0; i < sourceData.length; i += CHUNK_SIZE) {
                            const chunk = sourceData.slice(i, i + CHUNK_SIZE);
                            const res = processChunk(chunk);
                            count += res.c;
                            fixed += res.f;
                            skipped += res.s;
                            
                            sendLog(`[CSV] Progreso: ${count + fixed} registros procesados...`);
                            
                            // TRUCO MÁGICO: Pausa de 10ms para refrescar la consola en pantalla y no congelar la app
                            await new Promise(r => setTimeout(r, 10)); 
                        }

                        sendLog(`[CSV] ✅ Proceso completado exitosamente.`);
                        resolve({ success: true, rows: count, fixed: fixed, skipped: skipped });

                    } catch (error) {
                        sendLog(`[CSV] ❌ Error general: ${error.message}`);
                        resolve({ success: false, error: error.message });
                    }
                });
        });
    });

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

    ipcMain.handle("read-external-db", async (event, filePath) => {
        const sendLog = (msg) => { if (event && event.sender) event.sender.send('import-log', msg); };

        try {
            if (!filePath) return { success: false, error: "La ruta del archivo es inválida." };

            let activeFilePath = filePath;
            let isTempFile = false;

            if (filePath.toLowerCase().endsWith('.sql')) {
                sendLog(`[SQL] >> Archivo SQL detectado. Leyendo contenido completo...`);
                // Pausa inicial para que la UI muestre el modal de consola
                await new Promise(r => setTimeout(r, 50)); 

                const sqlContent = fs.readFileSync(filePath, 'utf8');

                sendLog(`[SQL] >> Limpiando sintaxis incompatible (Puede tomar unos segundos)...`);
                await new Promise(r => setTimeout(r, 50)); 
                const sanitizedSql = sanitizeSqlToSqlite(sqlContent);

                sendLog(`[SQL] >> Construyendo base de datos temporal...`);
                const tempDbPath = path.join(app.getPath("userData"), `temp_import_${Date.now()}.db`);
                const tempDb = new Database(tempDbPath);

                sendLog(`[SQL] >> Dividiendo archivo en instrucciones individuales...`);
                await new Promise(r => setTimeout(r, 50));
                const statements = sanitizedSql.split(/;\s*[\r\n]+/);
                
                sendLog(`[SQL] >> Ejecutando ${statements.length} instrucciones en la memoria...`);
                
                let count = 0;
                for (let stmt of statements) {
                    const cleanStmt = stmt.trim();
                    if (cleanStmt && cleanStmt.length > 5) {
                        try { 
                            tempDb.exec(cleanStmt + ';'); 
                        } 
                        catch (err) { 
                        }
                        count++;
                        
                        if (count % 500 === 0) {
                            sendLog(`[SQL] Construyendo entorno: ${count} / ${statements.length} instrucciones completadas...`);
                            await new Promise(r => setTimeout(r, 5)); // <-- Esto evita que salga "No Responde"
                        }
                    }
                }
                tempDb.close();

                sendLog(`[SQL] >> Base de datos temporal construida con éxito.`);
                activeFilePath = tempDbPath;
                isTempFile = true;
            }

            sendLog(`[SQL] >> Extrayendo el esquema y nombre de las tablas...`);
            await new Promise(r => setTimeout(r, 10));

            const extDb = new Database(activeFilePath, { readonly: true });
            const tables = extDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            
            const schema = {};
            for (const t of tables) {
                const columns = extDb.prepare(`PRAGMA table_info(${t.name})`).all();
                schema[t.name] = columns.map(c => c.name);
            }
            extDb.close();

            sendLog(`[SQL] >> Esquema listo. Preparando entorno de mapeo...`);
            return { success: true, schema, newPath: isTempFile ? activeFilePath : filePath };
        } catch (error) {
            sendLog(`[SQL] [X] ERROR CRÍTICO: ${error.message}`);
            console.error("ERROR CRÍTICO AL LEER DB:", error);
            return { success: false, error: `Error procesando el archivo: ${error.message}` };
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

    const buildJoinsCache = (joins, extDb) => {
        const cache = {};
        if (!joins) return cache;
        for (const [targetCol, joinConf] of Object.entries(joins)) {
            try {
                const targetDb = joinConf.isInternal ? db : extDb; 
                const rows = targetDb.prepare(`SELECT * FROM ${joinConf.extTable}`).all();
                const map = new Map(rows.map(r => [String(r[joinConf.pkCol]), r[joinConf.extCol]]));
                cache[targetCol] = { map, fkCol: joinConf.fkCol };
            } catch(e) {
                console.warn(`Error cargando tabla de join ${joinConf.extTable}:`, e.message);
            }
        }
        return cache;
    };

    const getVal = (reqCol, sourceObj, mapObj, defaultVal, joinsCache, defValues = {}) => {
        if (joinsCache && joinsCache[reqCol]) {
            const fkVal = sourceObj[joinsCache[reqCol].fkCol];
            return fkVal != null ? (joinsCache[reqCol].map.get(String(fkVal)) ?? defValues[reqCol] ?? defaultVal) : (defValues[reqCol] ?? defaultVal);
        }
        return sourceObj[mapObj[reqCol]] ?? defValues[reqCol] ?? defaultVal;
    };

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
        } catch (error) { return { success: false, error: error.message }; }
    });
    
    ipcMain.handle("execute-import", async (event, { filePath, sourceTable, targetTable, mapping, defaultValues, joins, idPrefix }) => {
        const sendLog = (msg) => { if (event && event.sender) event.sender.send('import-log', msg); };
        
        try {
            sendLog(`[SQL] Abriendo base de datos temporal...`);
            const extDb = new Database(filePath, { readonly: true });
            
            sendLog(`[SQL] Leyendo tabla origen '${sourceTable}'...`);
            const sourceData = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            if (sourceData.length === 0) {
                sendLog(`[SQL] ❌ La tabla de origen está vacía.`);
                return { success: false, error: "La tabla de origen está vacía." };
            }

            sendLog(`[SQL] Lectura completa. Total a importar: ${sourceData.length} filas.`);
            sendLog(`[SQL] Preparando motor SQLite para tabla '${targetTable}'...`);

            const targetColsInfo = db.prepare(`PRAGMA table_info(${targetTable})`).all();
            const targetCols = targetColsInfo.map(c => c.name);
            const placeholders = targetCols.map(() => '?').join(', ');
            const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

            let count = 0, fixed = 0, skipped = 0;
            sendLog(`[SQL] Insertando datos (En bloques para evitar congelamiento)...`);

            const processChunk = db.transaction((rows) => {
                let c = 0, f = 0, s = 0;
                for (const row of rows) {
                    const values = [];
                    for (const targetCol of targetCols) {
                        let finalValue = null;

                        if (targetCol === 'id') {
                            if (mapping['id'] && row[mapping['id']]) finalValue = (idPrefix || '') + String(row[mapping['id']]);
                            else if (defaultValues['id']) finalValue = (idPrefix || '') + String(defaultValues['id']);
                            else finalValue = uuidv4();
                        }
                        else if (targetCol === 'date_created' && !mapping['date_created']) finalValue = new Date().toISOString();
                        else if (targetCol === 'status' && !mapping['status']) finalValue = 1; 
                        else {
                            if (joinsCache && joinsCache[targetCol]) {
                                const fkVal = row[joinsCache[targetCol].fkCol];
                                finalValue = fkVal != null ? (joinsCache[targetCol].map.get(String(fkVal)) ?? defaultValues[targetCol] ?? null) : (defaultValues[targetCol] ?? null);
                            } else if (mapping[targetCol]) {
                                finalValue = row[mapping[targetCol]] ?? null; 
                            } else {
                                finalValue = defaultValues[targetCol] ?? null;
                            }
                        }

                        if (finalValue === undefined || finalValue === "undefined") {
                            finalValue = null;
                        } else if (finalValue === "") {
                            finalValue = "";
                        } else if (finalValue !== null) {
                            if (typeof finalValue === 'string') {
                                const matchDict = finalValue.match(/^(\d+)\s*\(/);
                                if (matchDict) finalValue = parseInt(matchDict[1], 10);
                                else if (!isNaN(finalValue) && finalValue.trim() !== '') finalValue = Number(finalValue);
                                else finalValue = String(finalValue).trim();
                            }
                        }

                        values.push(finalValue);
                    }
                    try { 
                        insertStmt.run(values); c++; 
                    } catch (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            try {
                                const parts = err.message.split(': ');
                                if (parts.length > 1) {
                                    const failedFields = parts[1].split(', ');
                                    failedFields.forEach(field => {
                                        const colName = field.includes('.') ? field.split('.')[1] : field;
                                        const colIdx = targetCols.indexOf(colName);
                                        if (colIdx !== -1) {
                                            const oldVal = values[colIdx];
                                            values[colIdx] = oldVal ? `${oldVal}_dup${Math.floor(Math.random()*10000)}` : `sin_dato_${Math.floor(Math.random()*100000)}`;
                                        }
                                    });
                                    insertStmt.run(values); c++; f++; 
                                } else s++;
                            } catch (e2) { s++; }
                        } else s++;
                    }
                }
                return { c, f, s };
            });

            const CHUNK_SIZE = 1500;
            for (let i = 0; i < sourceData.length; i += CHUNK_SIZE) {
                const chunk = sourceData.slice(i, i + CHUNK_SIZE);
                const res = processChunk(chunk);
                count += res.c;
                fixed += res.f;
                skipped += res.s;
                
                sendLog(`[SQL] Progreso: ${count + fixed} registros procesados...`);
                await new Promise(r => setTimeout(r, 10)); 
            }

            sendLog(`[SQL] ✅ Proceso completado exitosamente.`);
            return { success: true, rows: count, fixed: fixed, skipped: skipped };

        } catch (error) { 
            sendLog(`[SQL] ❌ Error general: ${error.message}`);
            return { success: false, error: error.message }; 
        }
    });

    ipcMain.handle("import-facturas-relacionadas", (_, { filePath, tablaMaestroOrigen, tablaDetalleOrigen, mapMaestro, mapDetalle, joins, defaultValues }) => {
        let extDb;
        try {
            extDb = new Database(filePath, { readonly: true });
            const maestrosViejos = extDb.prepare(`SELECT * FROM ${tablaMaestroOrigen}`).all();
            const detallesViejos = extDb.prepare(`SELECT * FROM ${tablaDetalleOrigen}`).all();
            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            const transaction = db.transaction(() => {
                const now = new Date().toISOString();
                let facturasImportadas = 0, detallesImportados = 0;

                const insertMaestro = db.prepare(`INSERT INTO ventasMaestro (id, numero_factura, prefijo, separador, nombre_cliente, documento_cliente, subtotal, descuento, iva, total_factura, total_recibido, saldo_pendiente, total_recibido_original, saldo_pendiente_original, tipo_pago, metodo_pago, moneda, formato_numero, status, date_created, date_modify, modify_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'system')`);
                const insertDetalle = db.prepare(`INSERT INTO ventasDetalle (id, maestro_id, id_producto, nombre_producto, precio_producto, cantidad_producto, total, is_encargo, status, date_created) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`);

                for (const mViejo of maestrosViejos) {
                    const nuevoMaestroId = uuidv4();
                    const nroFactura = getVal('numero_factura', mViejo, mapMaestro, facturasImportadas + 1, joinsCache, defaultValues);
                    const totalFactura = parseFloat(getVal('total_factura', mViejo, mapMaestro, 0, joinsCache, defaultValues));
                    
                    const fechaCreacion = getVal('date_created', mViejo, mapMaestro, now, joinsCache, defaultValues);
                    const prefijoFinal = getVal('prefijo', mViejo, mapMaestro, 'H', joinsCache, defaultValues);
                    const separadorFinal = getVal('separador', mViejo, mapMaestro, '-', joinsCache, defaultValues);

                    insertMaestro.run(
                        nuevoMaestroId, nroFactura, prefijoFinal, separadorFinal, 
                        String(getVal('nombre_cliente', mViejo, mapMaestro, 'Consumidor Final', joinsCache, defaultValues)),
                        String(getVal('documento_cliente', mViejo, mapMaestro, '222222222222', joinsCache, defaultValues)),
                        parseFloat(getVal('subtotal', mViejo, mapMaestro, totalFactura, joinsCache, defaultValues)),
                        parseFloat(getVal('descuento', mViejo, mapMaestro, 0, joinsCache, defaultValues)),
                        parseFloat(getVal('iva', mViejo, mapMaestro, 0, joinsCache, defaultValues)),
                        totalFactura, totalFactura, 0, totalFactura, 0, 'contado', 'Efectivo', 'COP', 'es-CO', 
                        fechaCreacion, now 
                    );
                    facturasImportadas++;

                    const misDetalles = detallesViejos.filter(d => String(d[mapDetalle.foreign_key_column]) === String(mViejo[mapMaestro.id_column]));

                    for (const dViejo of misDetalles) {
                        const cant = parseFloat(getVal('cantidad_producto', dViejo, mapDetalle, 1, joinsCache, defaultValues));
                        const precio = parseFloat(getVal('precio_producto', dViejo, mapDetalle, 0, joinsCache, defaultValues));
                        const totalItem = parseFloat(getVal('total', dViejo, mapDetalle, cant * precio, joinsCache, defaultValues));

                        insertDetalle.run(
                            uuidv4(), nuevoMaestroId, 'importado',
                            String(getVal('nombre_producto', dViejo, mapDetalle, 'Producto Histórico', joinsCache, defaultValues)),
                            precio, cant, totalItem, fechaCreacion 
                        );
                        detallesImportados++;
                    }
                }
                return { facturasImportadas, detallesImportados };
            });
            return { success: true, ...transaction() };
        } catch (error) { if (extDb && extDb.open) extDb.close(); return { success: false, error: error.message }; }
    });

    ipcMain.handle("execute-import-json", (_, { filePath, sourceTable, query, targetTable, jsonColumn, mapping, jsonKeysMapping, defaultValues, joins, idPrefix }) => {
        try {
            const extDb = new Database(filePath, { readonly: true });
            
            let sourceData = [];
            if (query) {
                sourceData = extDb.prepare(query).all();
            } else if (sourceTable) {
                sourceData = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            }

            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            if (sourceData.length === 0) return { success: false, error: "La tabla origen o consulta está vacía." };

            const extractItems = (obj) => {
                if (Array.isArray(obj)) return obj;
                if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) { if (Array.isArray(obj[key])) return obj[key]; }
                    const values = Object.values(obj);
                    if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) return values;
                }
                return [];
            };

            const transaction = db.transaction((data) => {
                const targetCols = db.prepare(`PRAGMA table_info(${targetTable})`).all().map(c => c.name);
                const placeholders = targetCols.map(() => '?').join(', ');
                const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

                let count = 0, fixed = 0, skipped = 0;

                for (const row of data) {
                    if (!row[jsonColumn]) continue;

                    try {
                        let rawJson = String(row[jsonColumn]);
                        if (rawJson.startsWith('"') && rawJson.endsWith('"')) rawJson = rawJson.slice(1, -1);
                        rawJson = rawJson.replace(/\\"/g, '"');
                        
                        const parsedJson = JSON.parse(rawJson);
                        const items = extractItems(parsedJson);

                        for (const item of items) {
                            const values = [];
                            for (const targetCol of targetCols) {
                                let finalVal = null;
                                const isJsonMapped = mapping[targetCol] === '__JSON__';
                                
                                if (targetCol === 'id') {
                                    let baseId = null;
                                    if (isJsonMapped && jsonKeysMapping['id'] && item[jsonKeysMapping['id']]) baseId = item[jsonKeysMapping['id']];
                                    else if (mapping['id'] && row[mapping['id']]) baseId = row[mapping['id']];
                                    else if (defaultValues['id']) baseId = defaultValues['id'];
                                    
                                    finalVal = baseId ? `${idPrefix || ''}${baseId}` : uuidv4();
                                }
                                else if (targetCol === 'date_created' && !mapping['date_created']) {
                                    finalVal = new Date().toISOString();
                                }
                                else if (targetCol === 'status' && !mapping['status']) {
                                    finalVal = 1;
                                }
                                else if (joinsCache && joinsCache[targetCol]) {
                                    let fkVal = row[joinsCache[targetCol].fkCol];
                                    if (fkVal === undefined && item[joinsCache[targetCol].fkCol] !== undefined) fkVal = item[joinsCache[targetCol].fkCol];
                                    finalVal = fkVal != null ? (joinsCache[targetCol].map.get(String(fkVal)) ?? defaultValues[targetCol] ?? null) : (defaultValues[targetCol] ?? null);
                                }
                                else if (isJsonMapped) {
                                    finalVal = item[jsonKeysMapping[targetCol]] ?? defaultValues[targetCol] ?? null;
                                }
                                else if (mapping[targetCol]) {
                                    finalVal = row[mapping[targetCol]] ?? defaultValues[targetCol] ?? null;
                                }
                                else {
                                    finalVal = defaultValues[targetCol] ?? null;
                                }
                                values.push(finalVal);
                            }

                            try { insertStmt.run(values); count++; } 
                            catch (err) {
                                if (err.message.includes('UNIQUE constraint failed')) {
                                    const parts = err.message.split(': ');
                                    if (parts.length > 1) {
                                        const failedFields = parts[1].split(', ');
                                        failedFields.forEach(field => {
                                            const colName = field.includes('.') ? field.split('.')[1] : field;
                                            const colIdx = targetCols.indexOf(colName);
                                            if (colIdx !== -1) {
                                                const oldVal = values[colIdx];
                                                values[colIdx] = oldVal ? `${oldVal}_dup${Math.floor(Math.random()*10000)}` : `sin_dato_${Math.floor(Math.random()*100000)}`;
                                            }
                                        });
                                        try { insertStmt.run(values); count++; fixed++; } catch (e2) { skipped++; }
                                    } else skipped++;
                                } else skipped++;
                            }
                        }
                    } catch(e) {
                        console.warn("Fila ignorada por JSON inválido");
                    }
                }
                return { count, fixed, skipped };
            });

            const stats = transaction(sourceData);
            return { success: true, rows: stats.count, fixed: stats.fixed, skipped: stats.skipped };
        } catch (error) { 
            return { success: false, error: error.message }; 
        }
    });

    ipcMain.handle("preview-external-query", (_, { filePath, query }) => {
        try {
            if (!fs.existsSync(filePath)) return { success: false, error: "El archivo de base de datos no se encuentra." };
            const extDb = new Database(filePath, { readonly: true });
            
            let previewQuery = query.trim();
            if (!previewQuery.toLowerCase().includes('limit')) {
                previewQuery = `SELECT * FROM (${previewQuery}) LIMIT 50`;
            }

            const stmt = extDb.prepare(previewQuery);
            const data = stmt.all();
            const columns = stmt.columns().map(c => c.name);
            
            extDb.close();
            
            return { success: true, columns, data, totalRows: data.length };
        } catch (error) {
            return { success: false, error: `Error SQL: ${error.message}` };
        }
    });

    ipcMain.handle("execute-import-query", (_, { filePath, query, targetTable, mapping, defaultValues, joins, idPrefix }) => {
        try {
            const extDb = new Database(filePath, { readonly: true });
            const sourceData = extDb.prepare(query).all();
            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            if (sourceData.length === 0) return { success: false, error: "La consulta no arrojó resultados." };

            const transaction = db.transaction((data) => {
                const targetCols = db.prepare(`PRAGMA table_info(${targetTable})`).all().map(c => c.name);
                const placeholders = targetCols.map(() => '?').join(', ');
                const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

                let count = 0, fixed = 0, skipped = 0;

                for (const row of data) {
                    const values = [];
                    for (const targetCol of targetCols) {
                        
                        if (targetCol === 'id') {
                            if (mapping['id'] && row[mapping['id']]) {
                                values.push((idPrefix || '') + String(row[mapping['id']]));
                            } else if (defaultValues['id']) {
                                values.push((idPrefix || '') + String(defaultValues['id']));
                            } else {
                                values.push(uuidv4());
                            }
                        }
                        else if (targetCol === 'date_created' && !mapping['date_created']) values.push(new Date().toISOString());
                        else if (targetCol === 'status' && !mapping['status']) values.push(1); 
                        else {
                            if (joinsCache && joinsCache[targetCol]) {
                                const fkVal = row[joinsCache[targetCol].fkCol];
                                values.push(fkVal != null ? (joinsCache[targetCol].map.get(String(fkVal)) ?? defaultValues[targetCol] ?? null) : (defaultValues[targetCol] ?? null));
                            } else if (mapping[targetCol]) {
                                values.push(row[mapping[targetCol]] ?? null); 
                            } else {
                                values.push(defaultValues[targetCol] ?? null);
                            }
                        }
                    }
                    try { insertStmt.run(values); count++; } 
                    catch (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            const parts = err.message.split(': ');
                            if (parts.length > 1) {
                                const failedFields = parts[1].split(', ');
                                failedFields.forEach(field => {
                                    const colName = field.includes('.') ? field.split('.')[1] : field;
                                    const colIdx = targetCols.indexOf(colName);
                                    if (colIdx !== -1) {
                                        const oldVal = values[colIdx];
                                        values[colIdx] = oldVal ? `${oldVal}_dup${Math.floor(Math.random()*10000)}` : `sin_dato_${Math.floor(Math.random()*100000)}`;
                                    }
                                });
                                try { insertStmt.run(values); count++; fixed++; } catch (e2) { skipped++; }
                            } else skipped++;
                        } else skipped++;
                    }
                }
                return { count, fixed, skipped };
            });

            const stats = transaction(sourceData);
            return { success: true, rows: stats.count, fixed: stats.fixed, skipped: stats.skipped };
        } catch (error) { return { success: false, error: error.message }; }
    });
};