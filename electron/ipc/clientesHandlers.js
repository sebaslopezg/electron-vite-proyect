import { ipcMain } from "electron"
import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

export const registerClientesHandlers = () => {

    ipcMain.handle("get-clientes", () => {
        try {
            const stmt = db.prepare("SELECT * FROM clientes WHERE status > 0")
            return stmt.all()
        } catch (error) {
            console.error("Error al intentar obtener datos: ", error)
            return []
        }
    })

    ipcMain.handle("add-cliente", (_,item) => {
        try {
            const now = new Date().toISOString()
            const status = 1
            const id = uuidv4()
            const stmt = db.prepare(`
                INSERT INTO clientes (
                    id, 
                    nombre, 
                    documento, 
                    telefono, 
                    direccion, 
                    status, 
                    date_created,
                    modify_by,
                    date_modify
                )
                VALUES (
                    @id, 
                    @nombre, 
                    @documento, 
                    @telefono, 
                    @direccion, 
                    @status, 
                    @date_created, 
                    @modify_by,
                    @date_modify
                )`)
            const info = stmt.run({
                ...item,
                id:id,
                date_created:now,
                modify_by:item.modify_by || 'stystem',
                date_modify:now,
                status:status
            })
            return { success: true, id: id, changes: info.changes }
        } catch (error) {
            console.error("Error al intentar insertar datos: ", error)
            return [] 
        }
    })

    ipcMain.handle("update-cliente", (_, item) => {
        try {
            const now = new Date().toISOString()
            const defaultStatus = 1
            const stmt = db.prepare(                
                `UPDATE clientes SET 
                    nombre=@nombre, 
                    documento=@documento, 
                    telefono=@telefono, 
                    direccion=@direccion,  
                    date_modify=@date_modify
                    modify_by = @modify_by
                    status = @status
                    WHERE id=@id
                `)
            const info = stmt.run({
                ...item,
                status: item.status === 1 || item.status === 2 ? item.status : defaultStatus,
                date_modify:now,
                modify_by: item.modify_by || "system"
            })

            return { success: true, changes: info.changes }

        } catch (error) {
            console.error("Error al intentar actualizar datos: ", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-cliente", () => {
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`
            UPDATE producto SET 
                  status = 0,
                  date_modify = @date_modify,
                  modify_by = @modify_by
                WHERE id = @id
            `)

            const info = stmt.run({
                date_modify:now,
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

/*     ipcMain.handle("add-cliente", async (_, item) => {

        const { nombre, documento, telefono, direccion } = item

        const now = new Date().toISOString()
        const status = 1
        const id = uuidv4()

        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO clientes (
                    id, 
                    nombre, 
                    documento, 
                    telefono, 
                    direccion, 
                    status, 
                    date_created, 
                    date_modify
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, nombre, documento, telefono, direccion, status, now, now],
                function (err) {
                    if (err) {
                        reject(err)
                        console.error('DB ERROR:', err) // LOG ERROR
                    }else {
                        resolve({ id: this.lastID })
                    }
                }
            )
        })
    }) */

/*     ipcMain.handle("update-cliente", async (_, item) => {
        const {id, nombre, documento, telefono, direccion } = item;
        const date_modify = new Date().toISOString();
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE clientes SET 
                    nombre=?, 
                    documento=?, 
                    telefono=?, 
                    direccion=?,  
                    date_modify=? 
                    WHERE id=?`,
                [nombre, documento, telefono, direccion, date_modify, id],
                function (err) {
                    if (err) reject(err)
                    else resolve({ changes: this.changes })
                }
            )
        })
    }) */

/*     ipcMain.handle("delete-cliente", async (_, id) => {
        const status = 0

        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE clientes SET status = ? WHERE id = ?`,
                [status, id],
                function (err) {
                if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            )
        })
    }) */

}