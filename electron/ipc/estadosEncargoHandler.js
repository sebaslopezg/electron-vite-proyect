import { ipcMain } from "electron";
import db from "../database/index.js";
import { v4 as uuidv4 } from "uuid";

export const registerEstadoHandlers = () => {
    ipcMain.handle("get-estados", () => {
        try {
            const stmt = db.prepare("SELECT * FROM estadoEncargo WHERE status > 0")
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener datos: ", error);
            return []
        }
    })

    ipcMain.handle("add-estado", (_, item) => {
        try {
            const now = new Date().toISOString()
            const status = 1
            const id = uuidv4()
            const stmt = db.prepare(`
                    INSERT INTO estadoEncargo(
                    id,
                    titulo,
                    descripcion,
                    color,
                    allow_calendar,
                    status, 
                    date_created
                    )
                    VALUES(
                    @id,
                    @titulo,
                    @descripcion,
                    @color,
                    @allow_calendar,
                    @status, 
                    @date_created
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

    ipcMain.handle("update-estado", (_, item) => {
        try {
            const now = new Date().toISOString()
            const defaultStatus = 1
            const id = uuidv4()
            const stmt = db.prepare(`
                    UPDATE estadoEncargo SET
                    titulo=@titulo,
                    descripcion=@descripcion,
                    color=@color,
                    allow_calendar=@allow_calendar,
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
    ipcMain.handle("delete-estado", (_, item) => {
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`
            UPDATE estadoEncargo SET 
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