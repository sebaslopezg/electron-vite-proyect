import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

export const registerInventarioHandler = () => {

    ipcMain.handle("get-inventario", () => {
        try {
            const stmt = db.prepare(`
                SELECT 
                    p.id, 
                    p.ref_name, 
                    p.sku, 
                    p.precio, 
                    p.stock, 
                    p.unidad_medida, 
                    p.descripcion, 
                    p.min_stock,
                    c.sku_prefix, 
                    c.separador, 
                    p.categoria_id, 
                    c.nombre as categoria_nombre,
                    GROUP_CONCAT(pe.etiqueta_id, ',') as etiquetas_ids
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                LEFT JOIN producto_etiqueta pe ON p.id = pe.producto_id
                WHERE p.status = 1 AND p.tipo = 'producto'
                GROUP BY p.id
            `)
            return stmt.all()
        } catch (error) {
            logger.error('INVENTARIO', "Error al intentar obtener la lista completa de inventario", error)
            return []
        }
    })

    ipcMain.handle("get-inventario-paginados", (_, dtParams) => {
        try {
            const limit = parseInt(dtParams.length, 10) || 10;
            const offset = parseInt(dtParams.start, 10) || 0;
            const searchValue = dtParams.search?.value || '';

            const filterCategory = dtParams.customCategory || '';
            const filterTag = dtParams.customTag || '';

            const orderColIndex = dtParams.order?.[0]?.column || 0;
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';
            
            const columnsMap = ['ref_name', 'sku', 'stock', 'precio'];
            let orderCol = columnsMap[orderColIndex] || 'ref_name';
            orderCol = `p.${orderCol}`;

            let baseQuery = `
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE p.status = 1 AND p.tipo = 'producto'
            `;
            let queryParams = [];

            if (searchValue) {
                baseQuery += " AND (p.ref_name LIKE ? OR p.sku LIKE ?)";
                const likeParam = `%${searchValue}%`;
                queryParams.push(likeParam, likeParam);
            }

            if (filterCategory) {
                baseQuery += " AND p.categoria_id = ?";
                queryParams.push(filterCategory);
            }

            if (filterTag) {
                baseQuery += " AND EXISTS (SELECT 1 FROM producto_etiqueta pe2 WHERE pe2.producto_id = p.id AND pe2.etiqueta_id = ?)";
                queryParams.push(filterTag);
            }

            const totalRow = db.prepare("SELECT COUNT(*) as count FROM producto WHERE status = 1 AND tipo = 'producto'").get();
            const recordsTotal = totalRow.count;

            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);
            const recordsFiltered = filteredRow.count;

            const dataQuery = `
                SELECT 
                    p.id, p.ref_name, p.sku, p.precio, p.stock, p.unidad_medida, p.descripcion, p.min_stock,
                    c.sku_prefix, c.separador, p.categoria_id, c.nombre as categoria_nombre,
                    (SELECT GROUP_CONCAT(pe.etiqueta_id, ',') FROM producto_etiqueta pe WHERE p.id = pe.producto_id) as etiquetas_ids
                ${baseQuery}
                ORDER BY ${orderCol} ${orderDir} 
                LIMIT ? OFFSET ?
            `;
            
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

            return {
                draw: dtParams.draw,
                recordsTotal: recordsTotal,
                recordsFiltered: recordsFiltered,
                data: data
            };
        } catch (error) {
            logger.error('INVENTARIO', "Error en paginación y filtros del inventario", error);
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
    });

    ipcMain.handle("set-inventario", (_, item) => {

        const transaction = db.transaction((item) => {
            const id = uuidv4()
            const now = new Date().toISOString()

            const getStock = db.prepare(`SELECT stock, ref_name FROM producto WHERE id = ?`)
            const currentProduct = getStock.get(item.id)

            if (!currentProduct) {
                throw new Error(`Producto con id ${item.id} no encontrado`)
            }

            const stockAnterior = currentProduct.stock
            let stockNuevo

            if (item.type === 'ingreso') {
                stockNuevo = stockAnterior + item.cantidad
            } else if (item.type === 'egreso') {
                stockNuevo = stockAnterior - item.cantidad
            } else if (item.type === 'ajuste_manual') {
                stockNuevo = item.cantidad
            } else {
                throw new Error(`Tipo de movimiento no válido: ${item.type}`)
            }

            const updateStock = db.prepare(`
                UPDATE producto SET 
                    stock = ?,
                    date_modify = ?,
                    modify_by = ?
                WHERE id = ?
            `)

            const updateInfo = updateStock.run(
                stockNuevo,
                now,
                item.usuario || 'nouser',
                item.id
            )

            if (updateInfo.changes === 0) {
                throw new Error('No se pudo actualizar el stock del producto')
            }

            const insertInventario = db.prepare(`
                INSERT INTO inventario(
                    id,
                    producto_id,
                    tipo_movimiento,
                    modulo_movimiento,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    fecha,
                    usuario,
                    notas
                ) VALUES (
                    @id,
                    @producto_id,
                    @tipo_movimiento,
                    @modulo_movimiento,
                    @cantidad,
                    @stock_anterior,
                    @stock_nuevo,
                    @fecha,
                    @usuario,
                    @notas
                )
            `)

            insertInventario.run({
                id: id,
                producto_id: item.id,
                tipo_movimiento: item.type,
                modulo_movimiento: item.modulo || 'inventario',
                cantidad: item.cantidad,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                fecha: now,
                usuario: item.usuario || 'nouser',
                notas: item.notas || null
            })

            return {
                success: true,
                inventarioId: id,
                stockAnterior,
                stockNuevo,
                nombreProducto: currentProduct.ref_name,
                changes: updateInfo.changes
            }
        })

        try {
            const result = transaction(item)
            logger.success(
                'INVENTARIO', 
                `Ajuste de inventario realizado: ${item.type.toUpperCase()}`, 
                `Producto: ${result.nombreProducto} | Cantidad: ${item.cantidad} | Stock: ${result.stockAnterior} -> ${result.stockNuevo} | Usuario: ${item.usuario || 'nouser'}`
            );
            return result
        } catch (error) {
            logger.error('INVENTARIO', "Error crítico en transacción de ajuste de inventario", error)
            return {
                success: false,
                error: error.message
            }
        }
    })

    ipcMain.handle("get-inventario-history", (_, productoId) => {
        try {
            const stmt = db.prepare(`
                SELECT 
                    i.*,
                    p.ref_name,
                    p.sku
                FROM inventario i
                LEFT JOIN producto p ON i.producto_id = p.id
                WHERE i.producto_id = ?
                ORDER BY i.fecha DESC
            `)
            return stmt.all(productoId)
        } catch (error) {
            logger.error('INVENTARIO', `Error al obtener historial de inventario para el producto (ID: ${productoId})`, error)
            return []
        }
    })

    ipcMain.handle("get-inventario-history-paginados", (_, dtParams) => {
        try {
            const limit = parseInt(dtParams.length, 10) || 10;
            const offset = parseInt(dtParams.start, 10) || 0;
            const searchValue = dtParams.search?.value || '';
            
            const productoId = dtParams.productoId; 
            if (!productoId) throw new Error("Se requiere el ID del producto");

            const orderColIndex = dtParams.order?.[0]?.column || 0;
            const orderDir = dtParams.order?.[0]?.dir === 'asc' ? 'ASC' : 'DESC'; 
            
            const columnsMap = ['fecha', 'tipo_movimiento', 'cantidad', 'stock_anterior', 'stock_nuevo', 'usuario', 'notas'];
            let orderCol = columnsMap[orderColIndex] || 'fecha';

            let baseQuery = `FROM inventario WHERE producto_id = ?`;
            let queryParams = [productoId];

            if (searchValue) {
                baseQuery += " AND (tipo_movimiento LIKE ? OR usuario LIKE ? OR notas LIKE ?)";
                const likeParam = `%${searchValue}%`;
                queryParams.push(likeParam, likeParam, likeParam);
            }

            const totalRow = db.prepare("SELECT COUNT(*) as count FROM inventario WHERE producto_id = ?").get(productoId);
            const recordsTotal = totalRow.count;

            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);
            const recordsFiltered = filteredRow.count;

            const dataQuery = `
                SELECT * ${baseQuery}
                ORDER BY ${orderCol} ${orderDir} 
                LIMIT ? OFFSET ?
            `;
            
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

            return {
                draw: dtParams.draw,
                recordsTotal: recordsTotal,
                recordsFiltered: recordsFiltered,
                data: data
            };
        } catch (error) {
            logger.error('INVENTARIO', "Error en paginación del historial de inventario", error);
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
    });
}