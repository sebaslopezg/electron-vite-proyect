import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerInventarioHandler = () =>{

    ipcMain.handle("get-inventario", () => {
        try {
        const stmt = db.prepare(`
            SELECT 
                id, 
                ref_name, 
                sku,
                precio, 
                stock, 
                unidad_medida, 
                descripcion
            FROM producto WHERE status = 1
        `)
        return stmt.all()
        } catch (error) {
        console.error("Error al intentar obtener productos:", error)
        return []
        }
    })

  ipcMain.handle("set-inventario", (_, item) => {

    const transaction = db.transaction((item) => {
        const id = uuidv4()
        const now = new Date().toISOString()

        const getStock = db.prepare(`
            SELECT stock FROM producto WHERE id = ?
        `)
        const currentProduct = getStock.get(item.id)
      
        if (!currentProduct) {
          throw new Error(`Producto con id ${item.id} no encontrado`)
        }

        const stockAnterior = currentProduct.stock
        let stockNuevo

        // Calculate new stock based on movement type
        // tipo_movimiento could be: 'entrada', 'salida', 'ajuste', etc.
        if (item.type === 'ingreso') {
            stockNuevo = stockAnterior + item.cantidad
        } else if (item.type === 'egreso') {
            stockNuevo = stockAnterior - item.cantidad
        } else if (item.type === 'ajuste_manual') {
            stockNuevo = item.cantidad
        } else {
            throw new Error(`Tipo de movimiento no válido: ${item.type}`)
        }

        // Update producto stock
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
            changes: updateInfo.changes
        }
    })

    try {
        // Execute the transaction
        const result = transaction(item)
        return result
    } catch (error) {
        console.error("Error en transacción de inventario:", error)
        return {
            success: false,
            error: error.message
        }
    }
  })

  // Get inventario history for a product
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
        console.error("Error al obtener historial de inventario:", error)
        return []
    }
  })
}