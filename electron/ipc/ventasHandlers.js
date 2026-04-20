import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerVentasHandlers = () => {

    ipcMain.handle("get-maestro", () => {
        try {
            const stmt = db.prepare(`
                SELECT 
                    v.*,
                    (SELECT separador FROM almacen_conf LIMIT 1) AS separador,
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
                FROM ventasDetalle df
                LEFT JOIN producto p ON df.id_producto = p.id
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE df.maestro_id = ?
            `);
            const detalles = stmt.all(facturaId);
            
            const notasStmt = db.prepare(`SELECT * FROM nota WHERE id_factura_origen = ?`);
            const notas = notasStmt.all(facturaId);
            const maestro = db.prepare('SELECT * FROM ventasMaestro WHERE id = ?').get(facturaId) || {};
            const confStmt = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`);
            const currentConf = confStmt.get() || {};

            const configuracionSnapshot = {
                nombre_almacen: maestro.nombre_almacen || currentConf.nombre_almacen,
                nit_almacen: maestro.nit_almacen || currentConf.nit_almacen,
                direccion_almacen: maestro.direccion_almacen || currentConf.direccion_almacen,
                telefono_almacen: maestro.telefono_almacen || currentConf.telefono_almacen,
                email_almacen: maestro.email_almacen || currentConf.email_almacen,
                resolucionDian: maestro.resolucion_dian || currentConf.resolucionDian,
                nombreFactura: maestro.titulo_documento || currentConf.nombreFactura,
                footer_factura: maestro.footer || currentConf.footer_factura,
                separador: maestro.separador || currentConf.separador,
                logo_almacen: currentConf.logo_almacen,
                imprimir_logo_pos: currentConf.imprimir_logo_pos 
            };

            return { success: true, data: detalles, notas: notas, configuracion: configuracionSnapshot };
        } catch (error) {
            console.error("Error obteniendo detalles:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("create-venta", (_, { maestro, detalles }) => {
        const transaction = db.transaction((maestroData, detallesData) => {
            const now = new Date().toISOString()
            const maestroId = uuidv4()

            const config = db.prepare('SELECT * FROM almacen_conf LIMIT 1').get()
            if (!config) throw new Error("No se encontró configuración del almacén")

            const nuevoNumeroFactura = config.consecutivo + 1
            const prefijoFactura = config.prefijo || ''

            const insertMaestro = db.prepare(`
                INSERT INTO ventasMaestro (
                    id, 
                    numero_factura, 
                    prefijo,
                    separador,
                    resolucion_dian,
                    titulo_documento,
                    nombre_almacen,
                    nit_almacen,
                    direccion_almacen,
                    telefono_almacen,
                    email_almacen,
                    footer,
                    nombre_cliente, 
                    documento_cliente, 
                    subtotal,          
                    descuento,         
                    iva,               
                    total_factura, 
                    total_recibido, 
                    saldo_pendiente,
                    total_recibido_original,
                    saldo_pendiente_original,
                    tipo_pago,
                    metodo_pago,
                    date_created, 
                    status
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
                )
            `)
            insertMaestro.run(
                maestroId,
                nuevoNumeroFactura,
                prefijoFactura,
                config.separador || '',
                config.resolucionDian || '',
                config.nombreFactura || '',
                config.nombre_almacen || '',
                config.nit_almacen || '',
                config.direccion_almacen || '',
                config.telefono_almacen || '',
                config.email_almacen || '',
                config.footer_factura || '',
                maestroData.nombre_cliente,
                maestroData.documento_cliente,
                maestroData.subtotal,
                maestroData.descuento,
                maestroData.iva,
                maestroData.total,
                maestroData.total_recibido,
                maestroData.saldo_pendiente,
                maestroData.total_recibido,
                maestroData.saldo_pendiente,
                maestroData.tipo_pago,
                maestroData.metodo_pago,
                now
            )

            db.prepare('UPDATE almacen_conf SET consecutivo = ? WHERE id = ?').run(nuevoNumeroFactura, config.id)

            for (const item of detallesData) {
                const detalleId = uuidv4()

                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, maestro_id, id_producto, nombre_producto, cantidad_producto, 
                        precio_producto, total, is_encargo, date_created
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                insertDetalle.run(
                    detalleId, maestroId, item.id, item.ref_name, item.cantidad,
                    item.precio, item.cantidad * item.precio, item.isEncargo, now
                )

                if (item.isEncargo === '0' && item.tipo !== "servicio") {
                    const producto = db.prepare("SELECT stock FROM producto WHERE id = ?").get(item.id)
                    const stockAnterior = producto.stock
                    const stockNuevo = stockAnterior - item.cantidad

                    db.prepare("UPDATE producto SET stock = ? WHERE id = ?").run(stockNuevo, item.id)

                    const insertInventario = db.prepare(`
                    INSERT INTO inventario (
                        id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, 
                        stock_anterior, stock_nuevo, fecha
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                    insertInventario.run(
                        uuidv4(), item.id, 'SALIDA', 'VENTA',
                        item.cantidad, stockAnterior, stockNuevo, now
                    )
                } else {
                    const prevNum = db.prepare('SELECT COUNT(*) as count FROM encargos').get()
                    const newNum = prevNum.count + 1
                    const insertEncargo = db.prepare(
                        `INSERT INTO encargos(
                            id, id_factura, numero_factura, prefijo, id_producto,
                            nombre_producto, cantidad_producto, numero_encargo,
                            nombre_cliente, documento_cliente, date_created, status
                        )
                        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `)
                    insertEncargo.run(
                        uuidv4(), maestroId, nuevoNumeroFactura, prefijoFactura,
                        item.id, item.ref_name, item.cantidad, newNum,
                        maestroData.nombre_cliente, maestroData.documento_cliente, now
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