
import { ipcMain } from "electron"
import { v4 as uuidv4 } from 'uuid'
import db from "../database/index.js"

export const registerEncargosHandlers = () => {
    ipcMain.handle("get-encargos", () => {
        try {
            const stmt = db.prepare(`SELECT * FROM encargos WHERE status > 0`)
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
        INSERT INTO producto (
            id,
            id_factura,
            numero_encargo,
            fecha_entrega,
            estado_encargo,
            nombre_almacen,
            nombre_cliente,
            status,
            date_created
        ) VALUES (
            @id,
            @id_factura,
            @numero_encargo,
            @fecha_entrega,
            @estado_encargo,
            @nombre_almacen,
            @nombre_cliente,
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
        UPDATE encargo SET
            fecha_entrega = @fecha_entrega,
            estado_encargo = @estado_encargo,
        WHERE id = @id
      `)

            const info = stmt.run({
                ...item,
                date_modify: now,
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
        UPDATE encargo
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