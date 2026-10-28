import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db, { appDb } from "../database/index.js"
import { logger } from "../utils/logger.js"
import { canModifyModule, triggerBackgroundPush } from "./syncHandlers.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerVentasHandlers = () => {

    try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN pagos_multiples TEXT;") } catch (e) {}
    try { db.exec("ALTER TABLE ventasMaestro ADD COLUMN vendedor TEXT;") } catch (e) {}
    
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS factura_notas_adicionales (
                id TEXT PRIMARY KEY,
                factura_id TEXT NOT NULL,
                usuario_id TEXT NOT NULL,
                usuario_nombre TEXT NOT NULL,
                contenido TEXT NOT NULL,
                date_created TEXT NOT NULL
            )
        `)
    } catch (e) {
        logger.error('VENTAS', "Error al crear la tabla factura_notas_adicionales", e)
    }

    ipcMain.handle("get-maestro", () => {
        if (!checkPermission("ventas_historial")) {
            return { success: false, error: "No autorizado para ver el historial de facturas." }
        }
        try {
            const stmt = db.prepare(`
                SELECT 
                    v.*,
                    (SELECT separador FROM almacen_conf LIMIT 1) AS separador,
                    (SELECT GROUP_CONCAT(tipo_nota, ' y ') 
                        FROM nota 
                        WHERE id_factura_origen = v.id AND status = 1) AS notas_aplicadas,
                    (SELECT GROUP_CONCAT(motivo_dian, '|') 
                        FROM nota 
                        WHERE id_factura_origen = v.id AND status = 1) AS notas_motivos
                FROM ventasMaestro v
                WHERE v.status > 0
                ORDER BY v.date_created DESC
            `)
            return stmt.all()
        } catch (error) {
            logger.error('VENTAS', "Error al intentar obtener el listado histórico de facturas", error)
            return []
        }
    })

    ipcMain.handle("get-maestro-paginados", (_, dtParams) => {
        if (!checkPermission("ventas_historial")) {
            return { draw: dtParams?.draw || 0, recordsTotal: 0, recordsFiltered: 0, data: [], error: "No autorizado" }
        }
        try {
            const limit = parseInt(dtParams.length, 10) || 10
            const offset = parseInt(dtParams.start, 10) || 0
            const searchValue = dtParams.search?.value || ''

            const orderColIndex = dtParams.order?.[0]?.column || 0
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC'
            
            const columnsMap = ['date_created', 'numero_factura', 'documento_cliente', 'nombre_cliente', 'status', 'status']
            let orderCol = columnsMap[orderColIndex] || 'date_created'

            const startDate = dtParams.startDate
            const endDate = dtParams.endDate

            let baseQuery = `FROM ventasMaestro v WHERE v.status > 0`
            let queryParams = []

            if (startDate) {
                baseQuery += " AND date(v.date_created) >= date(?)"
                queryParams.push(startDate)
            }
            if (endDate) {
                baseQuery += " AND date(v.date_created) <= date(?)"
                queryParams.push(endDate)
            }

            if (searchValue) {
                baseQuery += " AND (v.numero_factura LIKE ? OR v.documento_cliente LIKE ? OR v.nombre_cliente LIKE ?)"
                const likeParam = `%${searchValue}%`
                queryParams.push(likeParam, likeParam, likeParam)
            }

            const totalRow = db.prepare("SELECT COUNT(*) as count FROM ventasMaestro WHERE status > 0").get()
            const recordsTotal = totalRow.count

            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams)
            const recordsFiltered = filteredRow.count

            const dataQuery = `
                SELECT 
                    v.*,
                    (SELECT separador FROM almacen_conf LIMIT 1) AS separador,
                    (SELECT GROUP_CONCAT(tipo_nota, ' y ') 
                     FROM nota 
                     WHERE id_factura_origen = v.id AND status = 1) AS notas_aplicadas,
                    (SELECT GROUP_CONCAT(motivo_dian, '|') 
                     FROM nota 
                     WHERE id_factura_origen = v.id AND status = 1) AS notas_motivos
                ${baseQuery}
                ORDER BY v.${orderCol} ${orderDir} 
                LIMIT ? OFFSET ?
            `
            
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset)

            return {
                draw: dtParams.draw,
                recordsTotal: recordsTotal,
                recordsFiltered: recordsFiltered,
                data: data
            }
        } catch (error) {
            logger.error('VENTAS', "Error en paginación o filtros del listado de ventas", error)
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }
        }
    })

    ipcMain.handle("get-detalle", (_, facturaId) => {
        if (!checkPermission("ventas_historial")) {
            return { success: false, error: "No autorizado para consultar detalles de facturación." }
        }
        try {
            const stmt = db.prepare(`
                SELECT df.*, 
                    p.sku, 
                    p.subcategorias_ids_json,
                    c.sku_prefix as cat_prefix,
                    c.separador as cat_separador
                FROM ventasDetalle df
                LEFT JOIN producto p ON df.id_producto = p.id
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE df.maestro_id = ?
            `)
            const detallesRaw = stmt.all(facturaId)

            const detalles = detallesRaw.map(d => {
                let fullPrefix = d.cat_prefix || ''
                let finalSeparator = d.cat_separador || ''
                
                const subIds = d.subcategorias_ids_json ? JSON.parse(d.subcategorias_ids_json) : []
                
                if (subIds.length > 0) {
                    const placeholders = subIds.map(() => '?').join(',')
                    const subs = db.prepare(`SELECT id, sku_prefix, separador FROM subcategoria WHERE id IN (${placeholders})`).all(...subIds)
                    
                    subIds.forEach(id => {
                        const s = subs.find(sub => sub.id === id)
                        if (s && s.sku_prefix) {
                            if (fullPrefix) {
                                fullPrefix += `${finalSeparator}${s.sku_prefix}`
                            } else {
                                fullPrefix = s.sku_prefix
                            }
                            if (s.separador !== undefined && s.separador !== null) {
                                finalSeparator = s.separador
                            }
                        }
                    })
                }
                
                delete d.subcategorias_ids_json
                delete d.cat_prefix
                delete d.cat_separador

                return { ...d, sku_prefix: fullPrefix, separador: finalSeparator }
            })

            const notasStmt = db.prepare(`SELECT * FROM nota WHERE id_factura_origen = ?`)
            const notas = notasStmt.all(facturaId)
            
            const maestroStmt = db.prepare(`
                SELECT v.*, t.telefono as telefono_tercero
                FROM ventasMaestro v
                LEFT JOIN terceros t ON v.documento_cliente = t.numero_documento
                WHERE v.id = ?
            `);
            const maestro = maestroStmt.get(facturaId) || {}

            if (maestro && !maestro.telefono_cliente) {
                maestro.telefono_cliente = maestro.telefono_tercero || '';
            }

            const confStmt = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`)
            const currentConf = confStmt.get() || {}

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
            }

            return { 
                success: true, 
                maestro: maestro, 
                data: detalles, 
                notes: notas, 
                configuracion: configuracionSnapshot 
            }
        } catch (error) {
            logger.error('VENTAS', `Error obteniendo los detalles de la factura (ID: ${facturaId})`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-reporte-ventas", (_, { startDate, endDate }) => {
        if (!checkPermission("reportes_ver")) {
            return { success: false, error: "No autorizado para consultar reportes financieros de ventas." }
        }
        try {
            let baseQueryVentas = `
                FROM ventasMaestro v 
                WHERE v.status > 0 
                AND NOT EXISTS (
                    SELECT 1 FROM nota n 
                    WHERE n.id_factura_origen = v.id 
                    AND n.status = 1 
                    AND n.motivo_dian COLLATE NOCASE LIKE '%anula%'
                )
            `
            let queryParams = [];

            if (startDate) {
                baseQueryVentas += " AND date(v.date_created) >= date(?)"
                queryParams.push(startDate)
            }
            if (endDate) {
                baseQueryVentas += " AND date(v.date_created) <= date(?)"
                queryParams.push(endDate)
            }

            const queryVentas = `
                SELECT v.*,
                (SELECT separador FROM almacen_conf LIMIT 1) AS separador,
                (SELECT GROUP_CONCAT(tipo_nota, ' y ') FROM nota WHERE id_factura_origen = v.id AND status = 1) AS notas_aplicadas,
                (SELECT SUM(CASE WHEN tipo_nota = 'Crédito' THEN total_final ELSE 0 END) FROM nota WHERE id_factura_origen = v.id AND status = 1) as valor_restar_nota,
                (SELECT SUM(CASE WHEN tipo_nota = 'Débito' THEN total_final ELSE 0 END) FROM nota WHERE id_factura_origen = v.id AND status = 1) as valor_sumar_nota
                ${baseQueryVentas}
                ORDER BY v.date_created ASC
            `
            
            const rawDataVentas = db.prepare(queryVentas).all(...queryParams)

            const dataVentas = rawDataVentas.map(fv => {
                let tempTotal = fv.total_factura || 0;
                
                if (fv.valor_restar_nota) {
                    tempTotal = tempTotal - fv.valor_restar_nota;
                }
                if (fv.valor_sumar_nota) {
                    tempTotal = tempTotal + fv.valor_sumar_nota;
                }
                fv.total_factura = Math.max(0, tempTotal);

                return fv;
            });


            let abonosWhere = `WHERE 1=1`
            let abonosParams = []

            if (startDate) {
                abonosWhere += " AND date(a.date_created) >= date(?)"
                abonosParams.push(startDate)
            }
            if (endDate) {
                abonosWhere += " AND date(a.date_created) <= date(?)"
                abonosParams.push(endDate)
            }

            const queryAbonos = `
                SELECT a.*, v.numero_factura as factura_numero, v.nombre_cliente as cliente_nombre 
                FROM abonos_ventas a
                LEFT JOIN ventasMaestro v ON a.maestro_id = v.id
                ${abonosWhere}
                ORDER BY a.date_created ASC
            `
            
            let dataAbonos = []
            try {
                dataAbonos = db.prepare(queryAbonos).all(...abonosParams)
            } catch (e) {
                logger.warning('REPORTES_VENTAS', "No se encontraron abonos en el rango de fechas.", e.message)
            }
            
            const confStmt = db.prepare(`SELECT * FROM almacen_conf LIMIT 1`)
            const configuracion = confStmt.get() || {}

            return { success: true, data: dataVentas, abonos: dataAbonos, configuracion }
        } catch (error) {
            logger.error('REPORTES_VENTAS', "Error generando el reporte de ventas por rango de fechas", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("create-venta", async (_, { maestro, detalles }) => {
        if (!checkPermission("ventas_crear")) {
            return { success: false, error: "No autorizado para registrar operaciones de venta de mostrador." }
        }
        if (!canModifyModule('ventasMaestro')) {
            return { success: false, error: "La facturación local está bloqueada. La nube controla las ventas." }
        }

        const transaction = db.transaction((maestroData, detallesData) => {
            const nowRow = db.prepare("SELECT datetime('now', 'localtime') as nowStr").get();
            const now = nowRow.nowStr;
            
            const maestroId = uuidv4()
            const currentUser = global.currentUserSession?.username || 'system'
            const currentFullName = global.currentUserSession?.nombre_completo || 'Sistema'

            const config = db.prepare('SELECT * FROM almacen_conf LIMIT 1').get()
            if (!config) throw new Error("No se encontró configuración del almacén")

            const nuevoNumeroFactura = config.consecutivo + 1
            const prefijoFactura = config.prefijo || ''

            const insertMaestro = db.prepare(`
                INSERT INTO ventasMaestro (
                    id, numero_factura, prefijo, separador, resolucion_dian, titulo_documento,
                    nombre_almacen, nit_almacen, direccion_almacen, telefono_almacen,
                    email_almacen, footer, nombre_cliente, documento_cliente, telefono_cliente, subtotal,
                    descuento, iva, total_factura, total_recibido, saldo_pendiente,
                    total_recibido_original, saldo_pendiente_original, tipo_pago,
                    metodo_pago, pagos_multiples, moneda, formato_numero, date_created, date_modify, status, observaciones, vendedor
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?
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
                maestroData.telefono_cliente || null,
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
                maestroData.pagos_multiples || null,
                maestroData.moneda, 
                maestroData.formato_numero, 
                now, 
                now, 
                maestroData.observaciones || '',
                currentFullName 
            )

            db.prepare('UPDATE almacen_conf SET consecutivo = ? WHERE id = ?').run(nuevoNumeroFactura, config.id)

            for (const item of detallesData) {
                const detalleId = uuidv4()
                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, maestro_id, id_producto, nombre_producto, cantidad_producto, 
                        precio_producto, total, is_encargo, date_created
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                insertDetalle.run(
                    detalleId, maestroId, item.id, item.ref_name, item.cantidad,
                    item.precio, item.cantidad * item.precio, item.isEncargo, now
                )

                if (item.isEncargo === '0' && item.tipo !== "servicio") {
                    const producto = db.prepare("SELECT stock FROM inventario_saldos WHERE producto_id = ?").get(item.id)
                    const stockAnterior = producto ? producto.stock : 0
                    const stockNuevo = stockAnterior - item.cantidad

                    db.prepare("UPDATE inventario_saldos SET stock = ? WHERE producto_id = ?").run(stockNuevo, item.id)

                    const insertInventario = db.prepare(`
                    INSERT INTO inventario (
                        id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, 
                        stock_anterior, stock_nuevo, fecha, usuario, notas
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `)
                    const numF = `${prefijoFactura}${config.separador || ''}${nuevoNumeroFactura}`
                    const htmlNota = `Venta <a href="#" class="text-primary fw-bold text-decoration-underline btn-view-factura-global" data-fullnum="${numF}">Factura ${numF}</a>`
                    
                    insertInventario.run(
                        uuidv4(), item.id, 'SALIDA', 'VENTA', item.cantidad, 
                        stockAnterior, stockNuevo, now, currentUser, htmlNota
                    )
                } else if (item.isEncargo === '1') {
                    try {
                        const prevNum = db.prepare('SELECT COUNT(*) as count FROM encargos').get()
                        const newNum = prevNum.count + 1
                        const insertEncargo = db.prepare(
                            `INSERT INTO encargos(
                                id, factura_id, producto_id, estado_id, cliente_nombre, cliente_documento,
                                factura_numero, producto_cantidad, encargo_numero, date_created, status
                            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
                        )
                        
                        let estadoIdObj = db.prepare("SELECT id FROM estadoEncargo WHERE titulo COLLATE NOCASE = 'Pendiente'").get()
                        let estadoId = estadoIdObj ? estadoIdObj.id : 'pendiente'

                        insertEncargo.run(uuidv4(), maestroId, item.id, estadoId, maestroData.nombre_cliente, maestroData.documento_cliente, nuevoNumeroFactura, item.cantidad, newNum, now)
                    } catch (err) {
                        if (err.message.includes('FOREIGN KEY')) {
                            throw new Error("Fallo en Sistema de Encargos. Los estados de configuración base están corruptos.")
                        }
                        throw err
                    }
                }
            }

            try {
                const configContable = db.prepare('SELECT * FROM configuracionContable WHERE id = 1').get()
                
                if (configContable && configContable.cuenta_caja && configContable.cuenta_ingresos) {
                    const tercero = db.prepare('SELECT id FROM terceros WHERE numero_documento = ?').get(maestroData.documento_cliente)
                    const terceroId = tercero ? tercero.id : null

                    const comprobanteId = uuidv4()
                    const lastComp = db.prepare("SELECT MAX(numero_comprobante) as maxNum FROM comprobantes").get()
                    const numeroComprobante = (lastComp.maxNum || 0) + 1
                    
                    const conceptoFactura = `Venta ${prefijoFactura}${config.separador || ''}${nuevoNumeroFactura} - ${maestroData.nombre_cliente}`

                    db.prepare(`
                        INSERT INTO comprobantes (id, numero_comprobante, fecha, concepto, documento_referencia, estado, date_created, modify_by)
                        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    `).run(comprobanteId, numeroComprobante, now, conceptoFactura, `${prefijoFactura}${nuevoNumeroFactura}`, now, currentUser)

                    const insertDetalleContable = db.prepare(`
                        INSERT INTO comprobantesDetalle (id, comprobante_id, cuenta_id, tercero_id, descripcion_linea, debito, credito)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `)

                    const tieneCuentaDesc = configContable.cuenta_descuento ? true : false;
                    const valorIngreso = tieneCuentaDesc ? maestroData.subtotal : (maestroData.subtotal - maestroData.descuento)
                    if (valorIngreso > 0) {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_ingresos, terceroId, 'Ingresos por Venta', 0, valorIngreso)
                    }

                    if (maestroData.iva > 0 && configContable.cuenta_iva) {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_iva, terceroId, 'IVA Generado', 0, maestroData.iva)
                    }

                    if (maestroData.descuento > 0 && tieneCuentaDesc) {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_descuento, terceroId, 'Descuento Concedido', maestroData.descuento, 0)
                    }

                    let montoFaltantePorRegistrar = maestroData.total - maestroData.saldo_pendiente
                    let pagosMultiplesArray = []
                    try {
                        if (maestroData.pagos_multiples) pagosMultiplesArray = JSON.parse(maestroData.pagos_multiples)
                    } catch(e){}

                    if (montoFaltantePorRegistrar > 0 && pagosMultiplesArray.length > 0) {
                        for (const p of pagosMultiplesArray) {
                            if (montoFaltantePorRegistrar <= 0) break
                            let montoAAplicar = parseFloat(p.monto) || 0
                            if (montoAAplicar > montoFaltantePorRegistrar) {
                                montoAAplicar = montoFaltantePorRegistrar
                            }
                            if (montoAAplicar > 0) {
                                const metodoInfo = db.prepare('SELECT cuenta_id FROM metodos_pago WHERE nombre = ?').get(p.metodo)
                                const cuentaDestinoEfectivo = (metodoInfo && metodoInfo.cuenta_id) ? metodoInfo.cuenta_id : configContable.cuenta_caja
                                insertDetalleContable.run(uuidv4(), comprobanteId, cuentaDestinoEfectivo, terceroId, `Ingreso por ${p.metodo}`, montoAAplicar, 0)
                                montoFaltantePorRegistrar -= montoAAplicar
                            }
                        }
                    } else if (montoFaltantePorRegistrar > 0) {
                        const metodoInfo = db.prepare('SELECT cuenta_id FROM metodos_pago WHERE nombre = ?').get(maestroData.metodo_pago)
                        const cuentaDestinoEfectivo = (metodoInfo && metodoInfo.cuenta_id) ? metodoInfo.cuenta_id : configContable.cuenta_caja
                        insertDetalleContable.run(uuidv4(), comprobanteId, cuentaDestinoEfectivo, terceroId, `Ingreso por ${maestroData.metodo_pago}`, montoFaltantePorRegistrar, 0)
                    }

                    if (maestroData.saldo_pendiente > 0 && configContable.cuenta_cartera) {
                        insertDetalleContable.run(uuidv4(), comprobanteId, configContable.cuenta_cartera, terceroId, 'Cuenta por Cobrar (Crédito)', maestroData.saldo_pendiente, 0)
                    }
                }
            } catch (err) {
                logger.warning('CONTABILIDAD', "Aviso: Comprobante contable automático cancelado por error de configuración de cuentas.", err.message)
            }

            return {
                success: true,
                maestroId,
                numero_factura: nuevoNumeroFactura,
                prefijo: prefijoFactura
            }
        })

        try {
            const result = transaction(maestro, detalles);
            logger.success('VENTAS', `Venta procesada exitosamente: Factura N° ${result.prefijo}${result.numero_factura}`)

            triggerBackgroundPush().catch(err => {
                logger.error('SYNC', 'Error disparando push en segundo plano tras venta', err)
            })

            return result;
        } catch (error) {
            logger.error('VENTAS', "Error crítico al intentar registrar una nueva venta", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-factura-notas-adicionales", (_, facturaId) => {
        try {
            const notas = db.prepare(`
                SELECT *
                FROM factura_notas_adicionales
                WHERE factura_id = ?
                ORDER BY date_created DESC
            `).all(facturaId);

            const resultConFotos = notas.map(nota => {
                let foto_perfil = null;
                try {
                    const user = appDb.prepare("SELECT foto_perfil FROM usuarios WHERE id = ?").get(nota.usuario_id);
                    if (user) foto_perfil = user.foto_perfil;
                } catch (e) {}
                
                return {
                    ...nota,
                    foto_perfil: foto_perfil
                };
            });

            return { success: true, data: resultConFotos };
        } catch (error) {
            logger.error('VENTAS', "Error al obtener las notas adicionales de la factura", error);
            return { success: false, error: error.message };
        }
    })

    ipcMain.handle("add-factura-nota-adicional", (_, { facturaId, contenido }) => {
        const user = global.currentUserSession;
        if (!user) return { success: false, error: "Debes iniciar sesión para añadir notas." };

        try {
            const id = uuidv4();
            const now = db.prepare("SELECT datetime('now', 'localtime') as nowStr").get().nowStr;

            db.prepare(`
                INSERT INTO factura_notas_adicionales (id, factura_id, usuario_id, usuario_nombre, contenido, date_created)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, facturaId, user.id, user.nombre_completo || user.username, contenido, now);

            logger.info('VENTAS', `Nota adicional añadida a la factura ${facturaId} por @${user.username}`);
            
            return { success: true, notaId: id, date_created: now };
        } catch (error) {
            logger.error('VENTAS', "Error al añadir la nota adicional", error);
            return { success: false, error: error.message };
        }
    })
}