import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerVentasHandlers = () => {

    ipcMain.handle("get-maestro", () => {
        try {
            // CAMBIO AQUÍ: Subconsulta para obtener las notas aplicadas
            const stmt = db.prepare(`
                SELECT 
                    v.*,
                    (SELECT GROUP_CONCAT(tipo_nota, ' y ') 
                     FROM nota 
                     WHERE id_factura_origen = v.id AND status = 1) AS notas_aplicadas
                FROM ventasMaestro v
                WHERE v.status > 0
                ORDER BY v.date_created DESC
            `)
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener facturas:", error)
            return []
        }
    })

    ipcMain.handle("get-detalle", (_, facturaId) => {
        try {
            const stmt = db.prepare(`
                SELECT df.*, 
                    p.sku, 
                    c.sku_prefix, 
                    c.separador
                FROM ventasDetalle df /* <-- Nombre correcto de la tabla */
                LEFT JOIN producto p ON df.id_producto = p.id /* <-- Columna correcta: id_producto */
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE df.maestro_id = ? /* <-- Columna correcta: maestro_id */
            `);
            
            const detalles = stmt.all(facturaId);
            const notasStmt = db.prepare(`SELECT * FROM nota WHERE id_factura_origen = ?`);
            const notas = notasStmt.all(facturaId);

            return { success: true, data: detalles, notas: notas };
        } catch (error) {
            console.error("Error obteniendo detalles:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("create-venta", (_, { maestro, detalles }) => {
        const transaction = db.transaction((maestroData, detallesData) => {
            const now = new Date().toISOString()
            const maestroId = uuidv4()

            const config = db.prepare('SELECT id, consecutivo, prefijo FROM almacen_conf LIMIT 1').get()
            if (!config) throw new Error("No se encontró configuración del almacén")

            const nuevoNumeroFactura = config.consecutivo + 1
            const prefijoFactura = config.prefijo || ''

            const insertMaestro = db.prepare(`
                INSERT INTO ventasMaestro (
                    id, 
                    numero_factura, 
                    prefijo,
                    nombre_cliente, 
                    documento_cliente, 
                    subtotal,          
                    descuento,         
                    iva,               
                    total_factura, 
                    total_recibido, 
                    saldo_pendiente,
                    metodo_pago,
                    date_created, 
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `)
            insertMaestro.run(
                maestroId,
                nuevoNumeroFactura,
                prefijoFactura,
                maestroData.nombre_cliente,
                maestroData.documento_cliente,
                maestroData.subtotal,
                maestroData.descuento,
                maestroData.iva,
                maestroData.total,
                maestroData.total_recibido,
                maestroData.saldo_pendiente,
                maestroData.metodo_pago,
                now
            )

            db.prepare('UPDATE almacen_conf SET consecutivo = ? WHERE id = ?').run(nuevoNumeroFactura, config.id)

            for (const item of detallesData) {
                const detalleId = uuidv4()

                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, 
                        maestro_id, 
                        id_producto, 
                        nombre_producto, 
                        cantidad_producto, 
                        precio_producto, 
                        total, 
                        is_encargo,
                        date_created
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                insertDetalle.run(
                    detalleId,
                    maestroId,
                    item.id,
                    item.ref_name,
                    item.cantidad,
                    item.precio,
                    item.cantidad * item.precio,
                    item.isEncargo,
                    now
                )

                if (item.isEncargo === '0' && item.tipo !== "servicio") {
                    const producto = db.prepare("SELECT stock FROM producto WHERE id = ?").get(item.id)
                    const stockAnterior = producto.stock
                    const stockNuevo = stockAnterior - item.cantidad

                    db.prepare("UPDATE producto SET stock = ? WHERE id = ?").run(stockNuevo, item.id)

                    const insertInventario = db.prepare(`
                    INSERT INTO inventario (
                        id, 
                        producto_id, 
                        tipo_movimiento, 
                        modulo_movimiento, 
                        cantidad, 
                        stock_anterior, 
                        stock_nuevo, 
                        fecha
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                    insertInventario.run(
                        uuidv4(),
                        item.id,
                        'SALIDA',
                        'VENTA',
                        item.cantidad,
                        stockAnterior,
                        stockNuevo,
                        now
                    )
                } else {
                    const prevNum = db.prepare('SELECT COUNT(*) as count FROM encargos').get()
                    const newNum = prevNum.count + 1
                    const insertEncargo = db.prepare(
                        `INSERT INTO encargos(
                            id,
                            id_factura,
                            numero_factura,
                            prefijo,
                            id_producto,
                            numero_encargo,
                            estado_encargo,
                            nombre_cliente,
                            documento_cliente,
                            date_created,
                            status
                        )
                        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `)
                    insertEncargo.run(
                        uuidv4(),
                        maestroId,
                        nuevoNumeroFactura,
                        prefijoFactura,
                        item.id,
                        newNum,
                        "pendiente",
                        maestroData.nombre_cliente,
                        maestroData.documento_cliente,
                        now
                    )

                }
            }

            return {
                success: true,
                maestroId,
                numero_factura: nuevoNumeroFactura,
                prefijo: prefijoFactura
            }
        })

        try {
            return transaction(maestro, detalles)
        } catch (error) {
            console.error("Transaction Error:", error)
            return { success: false, error: error.message }
        }
    })
}