
import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerEncargosHandlers = () => {
    ipcMain.handle("get-encargos", () => {
        try {
            const stmt = db.prepare(`
                SELECT en.id,
                    en.encargo_numero, 
                    en.factura_numero, 
                    en.cliente_nombre, 
                    en.cliente_documento,
					en.descripcion,
                    en.fecha_entrega, 
					en.producto_cantidad,
                    es.titulo as estado_titulo, 
                    es.id as estado_id,
                    es.allow_calendar,
                    es.color as estado_color,
					p.ref_name as producto_nombre
                    FROM encargos en
                LEFT JOIN estadoEncargo es ON en.estado_id = es.id
				LEFT JOIN producto p ON en.producto_id = p.id
                WHERE en.status > 0
                `)
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener encargos:", error)
            return []
        }
    })

    ipcMain.handle("add-encargo", (_, item) => {
        try {
            const id = uuidv4()
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1

            const stmt = db.prepare(`
        INSERT INTO encargos (
            id,
            factura_id,
            producto_id
            estado_id,
            almacen_id,
            cliente_id,
            cliente_nombre,
            cliente_documento,
            factura_numero,
            producto_cantidad,
            encargo_numero,
            fecha_entrega,
            descripcion,
            status,
            date_created
        ) VALUES (
            @id,
            @factura_id,
            @producto_id
            @estado_id,
            @almacen_id,
            @cliente_id,
            @cliente_nombre,
            @cliente_documento,
            @factura_numero,
            @producto_cantidad,
            @encargo_numero,
            @fecha_entrega,
            @descripcion,
            @status,
            @date_created,
        )
      `)

            const info = stmt.run({
                ...item,
                id: id,
                date_created: now,
                date_modify: now,
                status: status
            })

            return { success: true, id: id, changes: info.changes }

        } catch (error) {
            console.error("Error adding product:", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-encargo", (_, item) => {
        try {
            const now = new Date().toISOString()
            const status = item.status > 0 && item.status <= 2 ? item.status : 1
            const stmt = db.prepare(`
        UPDATE encargos SET
            fecha_entrega = @fecha_entrega,
            estado_id = @estado_id,
            descripcion = @descripcion,
            date_modify = @date_modify,
            modify_by = @modify_by
        WHERE id = @id
      `)
            const info = stmt.run({
                ...item,
                date_modify: now,
                modify_by: item.modify_by || "system",
                status: status
            })

            return { success: true, changes: info.changes }

        } catch (error) {
            console.error("Error updating encargo:", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-encargo", (_, item) => {
        try {
            const now = new Date().toISOString();
            const stmt = db.prepare(`
        UPDATE encargos
        SET 
          status = 0,
          date_modify = @date_modify,
          modify_by = @modify_by
        WHERE id = @id
      `)

            const info = stmt.run({
                id: item,
                date_modify: now,
                modify_by: 'No user'
            })

            if (info.changes > 0) {
                return { success: true, changes: info.changes };
            } else {
                console.log(`Error: ${info.changes}`)
                return { success: false, changes: 0, message: "Product ID not found." }
            }

        } catch (error) {
            console.error("Error deleting product:", error)
            return { success: false, error: error.message }
        }
    })
}