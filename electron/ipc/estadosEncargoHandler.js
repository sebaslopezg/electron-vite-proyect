import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from "uuid"
import { logger } from "../utils/logger.js"

export const registerEstadoHandlers = () => {
    ipcMain.handle("get-estados", () => {
        try {
            const stmt = db.prepare("SELECT * FROM estadoEncargo WHERE status > 0")
            return stmt.all()
        } catch (error) {
            logger.error('ESTADOS_ENCARGO', "Error al obtener la lista de estados de encargo", error)
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
                        icon_data,
                        status, 
                        date_created
                    )
                    VALUES(
                        @id,
                        @titulo,
                        @descripcion,
                        @color,
                        @allow_calendar,
                        @icon_data,
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

            logger.success('ESTADOS_ENCARGO', `Nuevo estado de encargo creado: ${item.titulo}`)
            return { success: true, id: id, changes: info.changes }
        } catch (error) {
            logger.error('ESTADOS_ENCARGO', `Error al intentar crear el estado de encargo: ${item.titulo}`, error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-estado", (_, item) => {
        try {
            const now = new Date().toISOString()
            const defaultStatus = 1
            const stmt = db.prepare(`
                    UPDATE estadoEncargo SET
                        titulo=@titulo,
                        descripcion=@descripcion,
                        color=@color,
                        allow_calendar=@allow_calendar,
                        icon_data=@icon_data,
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
            
            logger.success('ESTADOS_ENCARGO', `Estado de encargo actualizado: ${item.titulo} (ID: ${item.id})`)
            return { success: true, id: item.id, changes: info.changes }
        } catch (error) {
            logger.error('ESTADOS_ENCARGO', `Error al intentar actualizar el estado de encargo (ID: ${item.id})`, error)
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
                logger.warning('ESTADOS_ENCARGO', `Estado de encargo eliminado (Soft delete) (ID: ${item})`)
                return { success: true, changes: info.changes }
            } else {
                logger.warning('ESTADOS_ENCARGO', `Intento de eliminar un estado de encargo inexistente (ID: ${item})`)
                return { success: false, changes: 0, message: "ID not found." }
            }
        } catch (error) {
            logger.error('ESTADOS_ENCARGO', `Error crítico al intentar eliminar el estado de encargo (ID: ${item})`, error)
            return { success: false, error: error.message }
        }
    })
}