import { ipcMain } from "electron";
import db from "../database/index.js";
import { v4 as uuidv4 } from 'uuid';

export const registerClientesHandlers = () => {

    ipcMain.handle("get-clientes", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM clientes WHERE status > 0", (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    })

    ipcMain.handle("add-cliente", async (_, item) => {

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
    })

    ipcMain.handle("update-cliente", async (_, item) => {
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
    })

    ipcMain.handle("delete-cliente", async (_, id) => {
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
    })

}