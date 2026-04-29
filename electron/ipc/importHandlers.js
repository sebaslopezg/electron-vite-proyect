import { ipcMain, app, dialog } from "electron"
import Database from 'better-sqlite3'
import db from "../database/index.js" 
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
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
                const rows = extDb.prepare(`SELECT * FROM ${joinConf.extTable}`).all();
                const map = new Map(rows.map(r => [String(r[joinConf.pkCol]), r[joinConf.extCol]]));
                cache[targetCol] = { map, fkCol: joinConf.fkCol };
            } catch(e) {
                console.warn(`Error cargando tabla de join ${joinConf.extTable}:`, e.message);
            }
        }
        return cache;
    };

    const getVal = (reqCol, sourceObj, mapObj, defaultFallback, joinsCache, defValues = {}) => {
        if (joinsCache && joinsCache[reqCol]) {
            const fkVal = sourceObj[joinsCache[reqCol].fkCol];
            return fkVal != null ? (joinsCache[reqCol].map.get(String(fkVal)) ?? defValues[reqCol] ?? defaultFallback) : (defValues[reqCol] ?? defaultFallback);
        }
        if (mapObj[reqCol]) {
            return sourceObj[mapObj[reqCol]] ?? defValues[reqCol] ?? defaultFallback;
        }
        return defValues[reqCol] ?? defaultFallback;
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
    
    ipcMain.handle("execute-import", (_, { filePath, sourceTable, targetTable, mapping, defaultValues, joins }) => {
        try {
            const extDb = new Database(filePath, { readonly: true });
            const sourceData = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            if (sourceData.length === 0) return { success: false, error: "La tabla de origen está vacía." };

            const transaction = db.transaction((data) => {
                const targetCols = db.prepare(`PRAGMA table_info(${targetTable})`).all().map(c => c.name);
                const placeholders = targetCols.map(() => '?').join(', ');
                const insertStmt = db.prepare(`INSERT INTO ${targetTable} (${targetCols.join(', ')}) VALUES (${placeholders})`);

                let count = 0, fixed = 0, skipped = 0;

                for (const row of data) {
                    const values = [];
                    for (const targetCol of targetCols) {
                        if (targetCol === 'id' && !mapping['id']) values.push(uuidv4());
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
                    try {
                        insertStmt.run(values); count++;
                    } catch (err) {
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

    ipcMain.handle("import-facturas-json", (_, { filePath, sourceTable, jsonColumn, mapMaestro, mapDetalle, joins, defaultValues }) => {
        let extDb;
        try {
            extDb = new Database(filePath, { readonly: true });
            const maestrosViejos = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            const joinsCache = buildJoinsCache(joins, extDb);
            extDb.close();

            const extractItems = (obj) => {
                if (Array.isArray(obj)) return obj;
                if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) { if (Array.isArray(obj[key])) return obj[key]; }
                    const values = Object.values(obj);
                    if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) return values;
                }
                return [];
            };

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
                    const prefijoFinal = getVal('prefijo', mViejo, mapMaestro, 'J', joinsCache, defaultValues);
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

                    if (mViejo[jsonColumn]) {
                        try {
                            let rawJson = String(mViejo[jsonColumn]);
                            if (rawJson.startsWith('"') && rawJson.endsWith('"')) rawJson = rawJson.slice(1, -1);
                            rawJson = rawJson.replace(/\\"/g, '"');
                            
                            const items = extractItems(JSON.parse(rawJson));

                            for (const item of items) {
                                const cant = parseFloat(getVal('cantidad_producto', item, mapDetalle, 1, joinsCache, defaultValues));
                                const precio = parseFloat(getVal('precio_producto', item, mapDetalle, 0, joinsCache, defaultValues));
                                const totalItem = parseFloat(getVal('total', item, mapDetalle, cant * precio, joinsCache, defaultValues));

                                insertDetalle.run(
                                    uuidv4(), nuevoMaestroId, 'importado_json',
                                    String(getVal('nombre_producto', item, mapDetalle, 'Producto JSON', joinsCache, defaultValues)),
                                    precio, cant, totalItem, fechaCreacion
                                );
                                detallesImportados++;
                            }
                        } catch(e) { console.warn("JSON ignorado en factura", nroFactura); }
                    }
                }
                return { facturasImportadas, detallesImportados };
            });
            return { success: true, ...transaction() };
        } catch (error) { if (extDb && extDb.open) extDb.close(); return { success: false, error: error.message }; }
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

    ipcMain.handle("execute-import-query", (_, { filePath, query, targetTable, mapping, defaultValues, joins }) => {
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
                        if (targetCol === 'id' && !mapping['id']) values.push(uuidv4());
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
                    try {
                        insertStmt.run(values); count++;
                    } catch (err) {
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