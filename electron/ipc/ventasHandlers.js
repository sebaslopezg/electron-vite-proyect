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

    ipcMain.handle("get-detalle", (_, id) => {
        try {
            const stmt = db.prepare('SELECT * FROM ventasDetalle WHERE maestro_id = ?')
            const info = stmt.all(id)
            return { success: true, data: info }
        } catch (error) {
            console.error("Error al obtener detalle:", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("create-venta", (_, { maestro, detalles }) => {
        const transaction = db.transaction((maestroData, detallesData) => {
            const now = new Date().toISOString()
            const maestroId = uuidv4()

            const config = db.prepare('SELECT id, consecutivo FROM almacen_conf LIMIT 1').get()
            if (!config) throw new Error("No se encontró configuración del almacén")
            
            const nuevoNumeroFactura = config.consecutivo + 1

            const insertMaestro = db.prepare(`
                INSERT INTO ventasMaestro (
                    id, 
                    numero_factura, 
                    nombre_cliente, 
                    documento_cliente, 
                    date_created, 
                    status
                ) VALUES (?, ?, ?, ?, ?, 1)
            `)
            insertMaestro.run(
                maestroId,
                nuevoNumeroFactura,
                maestroData.nombre_cliente,
                maestroData.documento_cliente,
                now
            )

            db.prepare('UPDATE almacen_conf SET consecutivo = ? WHERE id = ?').run(nuevoNumeroFactura, config.id)

            // 2. Process each item
            for (const item of detallesData) {
                const detalleId = uuidv4()

                // A. Insert into VentasDetalle
                const insertDetalle = db.prepare(`
                    INSERT INTO ventasDetalle (
                        id, 
                        maestro_id, 
                        id_producto, 
                        nombre_producto, 
                        cantidad_producto, 
                        precio_producto, 
                        total, 
                        date_created
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                insertDetalle.run(
                    detalleId,
                    maestroId,
                    item.id,
                    item.ref_name,
                    item.cantidad,
                    item.precio,
                    item.cantidad * item.precio,
                    now
                )

                // B. Get current stock for inventory log
                const producto = db.prepare("SELECT stock FROM producto WHERE id = ?").get(item.id)
                const stockAnterior = producto.stock
                const stockNuevo = stockAnterior - item.cantidad

                // C. Update Product Stock
                db.prepare("UPDATE producto SET stock = ? WHERE id = ?").run(stockNuevo, item.id)

                // D. Register Inventory Movement
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
            }

            return { success: true, maestroId }
        })

        try {
            return transaction(maestro, detalles)
        } catch (error) {
            console.error("Transaction Error:", error)
            return { success: false, error: error.message }
        }
    })
}