import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false;
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerComprasHandlers = () => {

    // CORREGIDO: Ahora exige el permiso específico de lectura de compras
    ipcMain.handle("get-compras-paginadas", (_, dtParams) => {
        if (!checkPermission("compras_ver")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [], error: "No autorizado" };
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''

            let baseQuery = `FROM comprasMaestro c WHERE 1=1`
            let queryParams = []

            if (searchValue) {
                baseQuery += " AND (c.numero_factura LIKE ? OR c.nombre_proveedor LIKE ? OR c.documento_proveedor LIKE ?)"
                const likeParam = `%${searchValue}%`
                queryParams.push(likeParam, likeParam, likeParam)
            }

            const totalRow = db.prepare("SELECT COUNT(*) as count FROM comprasMaestro").get()
            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)

            const dataQuery = `
                SELECT c.* ${baseQuery}
                ORDER BY c.date_created DESC 
                LIMIT ? OFFSET ?
            `
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset)

            return {
                draw: dtParams.draw,
                recordsTotal: totalRow.count,
                recordsFiltered: filteredRow.count,
                data: data
            }
        } catch (error) {
            logger.error('COMPRAS', "Error en paginación y búsqueda del historial de compras", error);
            return { 
                draw: dtParams.draw, 
                recordsTotal: 0, 
                recordsFiltered: 0, 
                data: [] 
            }
        }
    })

    // CORREGIDO: Ahora exige el permiso específico de lectura de compras
    ipcMain.handle("get-compra-detalle", (_, compraId) => {
        if (!checkPermission("compras_ver")) {
            return { success: false, error: "No tienes autorización para auditar los registros de compras." };
        }
        try {
            const maestro = db.prepare('SELECT * FROM comprasMaestro WHERE id = ?').get(compraId);
            if (!maestro) return { success: false, error: "Compra no encontrada" };

            const detalles = db.prepare(`
                SELECT d.*, 
                       p.sku, 
                       p.ref_name as nombre_inventario,
                       c.nombre as nombre_cuenta
                FROM comprasDetalle d
                LEFT JOIN producto p ON d.producto_id = p.id
                LEFT JOIN cuentasContables c ON d.cuenta_puc_id = c.id
                WHERE d.compra_id = ?
            `).all(compraId);

            return { 
                success: true, 
                data: { maestro, detalles } 
            };
        } catch (error) {
            logger.error('COMPRAS', `Error al intentar cargar los detalles de la compra (ID: ${compraId})`, error);
            return { 
                success: false, 
                error: error.message 
            }
        }
    });

    // CORREGIDO: Ahora exige de forma estricta la llave de escritura 'compras_crear'
    ipcMain.handle("crear-compra", (_, { maestro, detalles }) => {
        if (!checkPermission("compras_crear")) {
            return { success: false, error: "No tienes la autorización requerida para asentar nuevas facturas de compras." };
        }
        
        const transaction = db.transaction(() => {
            const now = new Date().toISOString()
            const maestroId = uuidv4()
            const currentUser = global.currentUserSession?.username || 'system'

            db.prepare(`
                INSERT INTO comprasMaestro (
                    id, proveedor_id, documento_proveedor, nombre_proveedor, numero_factura, fecha_factura, fecha_vencimiento, 
                    concepto, subtotal, descuento, iva, total_factura, total_pagado, saldo_pendiente, estado, date_created, modify_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                maestroId, maestro.proveedor_id, maestro.documento_proveedor, maestro.nombre_proveedor, maestro.numero_factura, 
                maestro.fecha_factura, maestro.fecha_vencimiento, maestro.concepto, maestro.subtotal, maestro.descuento, 
                maestro.iva, maestro.total_factura, maestro.total_pagado, maestro.saldo_pendiente, maestro.estado, now, currentUser
            )

            const insertDetalle = db.prepare(`
                INSERT INTO comprasDetalle (
                    id, compra_id, cuenta_puc_id, producto_id, descripcion, cantidad, precio_unitario, iva_percent, subtotal, total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)

            for (const item of detalles) {
                insertDetalle.run(
                    uuidv4(), maestroId, item.cuenta_puc_id || null, item.producto_id || null, item.descripcion, 
                    item.cantidad, item.precio_unitario, item.iva_percent, item.subtotal, item.total
                )

                if (item.producto_id) {
                    const producto = db.prepare("SELECT stock FROM producto WHERE id = ?").get(item.producto_id)
                    if (producto) {
                        const stockAnterior = producto.stock
                        const stockNuevo = stockAnterior + item.cantidad

                        db.prepare("UPDATE producto SET stock = ? WHERE id = ?").run(stockNuevo, item.producto_id)

                        db.prepare(`
                            INSERT INTO inventario (id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, stock_anterior, stock_nuevo, fecha, usuario)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(uuidv4(), item.producto_id, 'ENTRADA', 'COMPRA', item.cantidad, stockAnterior, stockNuevo, now, currentUser)
                    }
                }
            }

            try {
                const configContable = db.prepare('SELECT * FROM configuracionContable WHERE id = 1').get()

                if (configContable && configContable.cuenta_proveedores) {
                    const comprobanteId = uuidv4()
                    const lastComp = db.prepare("SELECT MAX(numero_comprobante) as maxNum FROM comprobantes").get()
                    const numeroComprobante = (lastComp.maxNum || 0) + 1
                    const conceptoComp = `Compra Factura ${maestro.numero_factura} - ${maestro.nombre_provider || maestro.nombre_proveedor}`

                    db.prepare(`
                        INSERT INTO comprobantes (id, numero_comprobante, fecha, concepto, documento_referencia, estado, date_created, modify_by)
                        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    `).run(comprobanteId, numeroComprobante, now, conceptoComp, maestro.numero_factura, now, currentUser)

                    const insertDetalleContable = db.prepare(`
                        INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `)

                    for (const d of detalles) {
                        const cuentaLinea = d.producto_id ? configContable.cuenta_inventario : d.cuenta_puc_id
                        if (cuentaLinea) {
                            insertDetalleContable.run(uuidv4(), comprobanteId, cuentaLinea, maestro.proveedor_id, d.descripcion, d.subtotal, 0)
                        }
                    }

                    if (maestro.iva > 0 && configContable.cuenta_iva_compras) {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_iva_compras, maestro.proveedor_id, 'IVA Descontable', maestro.iva, 0)
                    }

                    if (maestro.tipo_pago === 'contado') {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_caja, maestro.proveedor_id, 'Pago Factura Contado', 0, maestro.total_factura)
                    } else {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_proveedores, maestro.proveedor_id, 'Cuenta por Pagar', 0, maestro.total_factura)
                    }
                }
            } catch (err) {
                throw err
            }

            logger.success('COMPRAS', `Compra registrada exitosamente: Factura N° ${maestro.numero_factura}`)
            return { success: true, maestroId }
        })

        try {
            return transaction()
        } catch (error) {
            logger.error('COMPRAS', "Error crítico al registrar la compra en la base de datos", error)
            return { success: false, error: error.message }
        }
    })
}