import { ipcMain } from "electron";
import db from "../database/index.js";
import { v4 as uuidv4 } from "uuid";

export const registerBitacoraHandlers = () => {
    ipcMain.handle("get-bitacoras", () => {
        try {
            const stmt = db.prepare("SELECT * FROM bitacora WHERE status > 0")
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener datos: ", error);
            return []
        }
    })

    ipcMain.handle("add-bitacora", (_, item) => {
        try {
            const now = new Date().toISOString()
            const status = 1
            const id = uuidv4()
            const stmt = db.prepare(`
                    INSERT INTO bitacora(
                    id,
                    titulo,
                    descripcion,
                    fecha,
                    status, 
                    date_created,
                    modify_by,
                    date_modify
                    )
                    VALUES(
                    @id,
                    @titulo,
                    @descripcion,
                    @fecha,
                    @status, 
                    @date_created, 
                    @modify_by,
                    @date_modify
                    )
                `)
            const info = stmt.run({
                ...item,
                id: id,
                date_created: now,
                modify_by: item.modify_by || 'system',
                date_modify: now,
                status: status
            })
            return { success: true, id: id, changes: info.changes }
        } catch (error) {
            console.error("Error al intentar insertar datos: ", error)
            return []
        }
    })

    ipcMain.handle("update-bitacora", (_, item) => {
        try {
            const now = new Date().toISOString()
            const defaultStatus = 1
            const id = uuidv4()
            const stmt = db.prepare(`
                    UPDATE bitacora SET
                    titulo=@titulo,
                    descripcion=@descripcion,
                    fecha=@fecha,
                    status=@status, 
                    modify_by=@modify_by,
                    date_modify=@date_modify
                    WHERE id=@id
                `)
            const info = stmt.run({
                ...item,
                modify_by: item.modify_by || 'system',
                date_modify: now,
                status: item.status === 1 || item.status === 2 ? item.status : defaultStatus
            })
            return { success: true, id: id, changes: info.changes }
        } catch (error) {
            console.error("Error al intentar insertar datos: ", error)
            return { success: false, error: error.message }
        }
    })
    ipcMain.handle("delete-bitacora", (_, item) => {
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`
            UPDATE bitacora SET 
                  status = 0,
                  date_modify = @date_modify,
                  modify_by = @modify_by
                WHERE id = @id
            `)

            const info = stmt.run({
                id: item,
                date_modify: now,
                modify_by: 'system'
            })

            if (info.changes > 0) {
                return { success: true, changes: info.changes };
            } else {
                return { success: false, changes: 0, message: "ID not found." };
            }
        } catch (error) {
            console.error("Error al intentar eliminar datos: ", error)
            return { success: false, error: error.message }
        }
    })
}