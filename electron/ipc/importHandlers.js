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
                let fixed = 0;
                let skipped = 0;

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

                    try {
                        insertStmt.run(values);
                        count++;
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
                                        values[colIdx] = oldVal 
                                            ? `${oldVal}_dup${Math.floor(Math.random() * 10000)}` 
                                            : `sin_dato_${Math.floor(Math.random() * 100000)}`;
                                    }
                                });
                                try {
                                    insertStmt.run(values);
                                    count++;
                                    fixed++;
                                } catch (e2) {
                                    skipped++;
                                }
                            } else {
                                skipped++;
                            }
                        } else {
                            skipped++;
                        }
                    }
                }
                return { count, fixed, skipped };
            });

            const stats = transaction(sourceData);
            
            return { 
                success: true, 
                rows: stats.count, 
                fixed: stats.fixed, 
                skipped: stats.skipped 
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 5. NUEVO: IMPORTACIÓN RELACIONAL (FACTURAS MAESTRO-DETALLE)
    ipcMain.handle("import-facturas-relacionadas", (_, { filePath, tablaMaestroOrigen, tablaDetalleOrigen, mapMaestro, mapDetalle, clientJoin }) => {
        let extDb;
        try {
            if (!fs.existsSync(filePath)) return { success: false, error: "El archivo de base de datos no se encuentra." };
            
            extDb = new Database(filePath, { readonly: true });
            
            const maestrosViejos = extDb.prepare(`SELECT * FROM ${tablaMaestroOrigen}`).all();
            const detallesViejos = extDb.prepare(`SELECT * FROM ${tablaDetalleOrigen}`).all();
            
            // --- NUEVO: PREPARAR EL JOIN DE CLIENTES EN MEMORIA ---
            let clientesMap = new Map();
            if (clientJoin && clientJoin.table) {
                try {
                    const clientesViejos = extDb.prepare(`SELECT * FROM ${clientJoin.table}`).all();
                    clientesMap = new Map(clientesViejos.map(c => [String(c[clientJoin.pk_in_client]), c]));
                } catch(e) { console.warn("No se pudo cargar la tabla de clientes para el cruce", e.message); }
            }

            extDb.close();

            const transaction = db.transaction(() => {
                const now = new Date().toISOString();
                let facturasImportadas = 0;
                let detallesImportados = 0;

                const insertMaestro = db.prepare(`
                    INSERT INTO ventasMaestro (
                        id, numero_factura, prefijo, separador, nombre_cliente, documento_cliente,
                        subtotal, descuento, iva, total_factura, total_recibido, saldo_pendiente,
                        total_recibido_original, saldo_pendiente_original, tipo_pago, metodo_pago, 
                        moneda, formato_numero, status, date_created, date_modify, modify_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'system')
                `);

                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, maestro_id, id_producto, nombre_producto, precio_producto, 
                        cantidad_producto, total, is_encargo, status, date_created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
                `);

                for (const mViejo of maestrosViejos) {
                    const nuevoMaestroId = uuidv4();
                    const nroFactura = mViejo[mapMaestro.numero_factura] || facturasImportadas + 1;
                    const totalFactura = parseFloat(mViejo[mapMaestro.total_factura] || 0);

                    // --- APLICAR EL JOIN DE CLIENTES ---
                    let finalName = String(mViejo[mapMaestro.nombre_cliente] || 'Consumidor Final');
                    let finalDoc = String(mViejo[mapMaestro.documento_cliente] || '222222222222');

                    if (clientJoin && clientJoin.table && mViejo[clientJoin.fk_in_invoice]) {
                        const clienteData = clientesMap.get(String(mViejo[clientJoin.fk_in_invoice]));
                        if (clienteData) {
                            if (clientJoin.name_col && clienteData[clientJoin.name_col]) finalName = String(clienteData[clientJoin.name_col]);
                            if (clientJoin.doc_col && clienteData[clientJoin.doc_col]) finalDoc = String(clienteData[clientJoin.doc_col]);
                        }
                    }
                    
                    insertMaestro.run(
                        nuevoMaestroId, nroFactura, 'H', '-', finalName, finalDoc,
                        parseFloat(mViejo[mapMaestro.subtotal] || totalFactura),
                        parseFloat(mViejo[mapMaestro.descuento] || 0),
                        parseFloat(mViejo[mapMaestro.iva] || 0),
                        totalFactura, totalFactura, 0, totalFactura, 0,
                        'contado', 'Efectivo', 'COP', 'es-CO', now, now
                    );
                    facturasImportadas++;

                    const llaveForaneaVieja = mapDetalle.foreign_key_column;
                    const idMaestroViejo = mViejo[mapMaestro.id_column];
                    const misDetalles = detallesViejos.filter(d => String(d[llaveForaneaVieja]) === String(idMaestroViejo));

                    for (const dViejo of misDetalles) {
                        const cant = parseFloat(dViejo[mapDetalle.cantidad_producto] || 1);
                        const precio = parseFloat(dViejo[mapDetalle.precio_producto] || 0);
                        const totalItem = parseFloat(dViejo[mapDetalle.total] || (cant * precio));

                        insertDetalle.run(
                            uuidv4(), nuevoMaestroId, 'importado',
                            String(dViejo[mapDetalle.nombre_producto] || 'Producto Histórico'),
                            precio, cant, totalItem, now
                        );
                        detallesImportados++;
                    }
                }
                
                return { facturasImportadas, detallesImportados };
            });

            const stats = transaction();
            return { success: true, ...stats };

        } catch (error) {
            if (extDb && extDb.open) extDb.close();
            console.error("Error en importación relacional:", error);
            return { success: false, error: error.message };
        }
    });

    // 6. NUEVO: IMPORTACIÓN DESDE COLUMNA JSON
    ipcMain.handle("import-facturas-json", (_, { filePath, sourceTable, jsonColumn, mapMaestro, mapDetalle, clientJoin }) => {
        let extDb;
        try {
            if (!fs.existsSync(filePath)) return { success: false, error: "Archivo no encontrado." };
            extDb = new Database(filePath, { readonly: true });
            
            const maestrosViejos = extDb.prepare(`SELECT * FROM ${sourceTable}`).all();
            
            // --- NUEVO: PREPARAR EL JOIN DE CLIENTES EN MEMORIA ---
            let clientesMap = new Map();
            if (clientJoin && clientJoin.table) {
                try {
                    const clientesViejos = extDb.prepare(`SELECT * FROM ${clientJoin.table}`).all();
                    clientesMap = new Map(clientesViejos.map(c => [String(c[clientJoin.pk_in_client]), c]));
                } catch(e) { console.warn("No se pudo cargar la tabla de clientes para el cruce", e.message); }
            }

            extDb.close();

            const extractItems = (obj) => {
                if (Array.isArray(obj)) return obj;
                if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) { if (Array.isArray(obj[key])) return obj[key]; }
                    const values = Object.values(obj);
                    if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                        return values;
                    }
                }
                return [];
            };

            const transaction = db.transaction(() => {
                const now = new Date().toISOString();
                let facturasImportadas = 0;
                let detallesImportados = 0;

                const insertMaestro = db.prepare(`
                    INSERT INTO ventasMaestro (
                        id, numero_factura, prefijo, separador, nombre_cliente, documento_cliente,
                        subtotal, descuento, iva, total_factura, total_recibido, saldo_pendiente,
                        total_recibido_original, saldo_pendiente_original, tipo_pago, metodo_pago, 
                        moneda, formato_numero, status, date_created, date_modify, modify_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'system')
                `);

                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, maestro_id, id_producto, nombre_producto, precio_producto, 
                        cantidad_producto, total, is_encargo, status, date_created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
                `);

                for (const mViejo of maestrosViejos) {
                    const nuevoMaestroId = uuidv4();
                    const nroFactura = mViejo[mapMaestro.numero_factura] || facturasImportadas + 1;
                    const totalFactura = parseFloat(mViejo[mapMaestro.total_factura] || 0);
                    
                    // --- APLICAR EL JOIN DE CLIENTES ---
                    let finalName = String(mViejo[mapMaestro.nombre_cliente] || 'Consumidor Final');
                    let finalDoc = String(mViejo[mapMaestro.documento_cliente] || '222222222222');

                    if (clientJoin && clientJoin.table && mViejo[clientJoin.fk_in_invoice]) {
                        const clienteData = clientesMap.get(String(mViejo[clientJoin.fk_in_invoice]));
                        if (clienteData) {
                            if (clientJoin.name_col && clienteData[clientJoin.name_col]) finalName = String(clienteData[clientJoin.name_col]);
                            if (clientJoin.doc_col && clienteData[clientJoin.doc_col]) finalDoc = String(clienteData[clientJoin.doc_col]);
                        }
                    }

                    insertMaestro.run(
                        nuevoMaestroId, nroFactura, 'J', '-', finalName, finalDoc,
                        parseFloat(mViejo[mapMaestro.subtotal] || totalFactura),
                        parseFloat(mViejo[mapMaestro.descuento] || 0),
                        parseFloat(mViejo[mapMaestro.iva] || 0),
                        totalFactura, totalFactura, 0, totalFactura, 0,
                        'contado', 'Efectivo', 'COP', 'es-CO', now, now
                    );
                    facturasImportadas++;

                    if (mViejo[jsonColumn]) {
                        try {
                            let rawJson = String(mViejo[jsonColumn]);
                            if (rawJson.startsWith('"') && rawJson.endsWith('"')) {
                                rawJson = rawJson.slice(1, -1);
                            }
                            rawJson = rawJson.replace(/\\"/g, '"');
                            
                            const parsedJson = JSON.parse(rawJson);
                            const items = extractItems(parsedJson);

                            for (const item of items) {
                                const cant = parseFloat(item[mapDetalle.cantidad_producto] || 1);
                                const precio = parseFloat(item[mapDetalle.precio_producto] || 0);
                                const totalItem = parseFloat(item[mapDetalle.total] || (cant * precio));

                                insertDetalle.run(
                                    uuidv4(), nuevoMaestroId, 'importado_json',
                                    String(item[mapDetalle.nombre_producto] || 'Producto JSON'),
                                    precio, cant, totalItem, now
                                );
                                detallesImportados++;
                            }
                        } catch(e) {
                            console.warn("Fila ignorada por JSON inválido en factura", nroFactura, e.message);
                        }
                    }
                }
                return { facturasImportadas, detallesImportados };
            });

            const stats = transaction();
            return { success: true, ...stats };

        } catch (error) {
            if (extDb && extDb.open) extDb.close();
            console.error("Error en importación JSON:", error);
            return { success: false, error: error.message };
        }
    });

};