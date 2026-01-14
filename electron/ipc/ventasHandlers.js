import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerVentasHandlers = () => {

    ipcMain.handle("create-venta", (_, { maestro, detalles }) => {
        const transaction = db.transaction((maestroData, detallesData) => {
            const now = new Date().toISOString()
            const maestroId = uuidv4()

            // 1. Insert Maestro (The Header) /// EXPANDIR, FALTAN DATOS
            const insertMaestro = db.prepare(`
                INSERT INTO ventasMaestro (
                    id, 
                    numero_factura, 
                    nombre_cliente, 
                    documento_cliente, 
                    date_created, 
                    status
                )
                VALUES (?, ?, ?, ?, ?, 1)
            `)
            insertMaestro.run(
                maestroId, 
                maestroData.numero_factura, 
                maestroData.nombre_cliente, 
                maestroData.documento_cliente, 
                now
            )

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