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
                    date_modify=@date_modify,
                    modify_by = @modify_by,
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

    ipcMain.handle("delete-cliente", (_, id) => {
        try {
            const now = new Date().toISOString()
            const stmt = db.prepare(`
            UPDATE clientes SET /* <--- CORREGIDO: Decía producto */
                  status = 0,
                  date_modify = @date_modify,
                  modify_by = @modify_by
                WHERE id = @id
            `)

            const info = stmt.run({
                id: id, /* <--- CORREGIDO: Faltaba pasarle el ID */
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

    // Paginación del lado del servidor (Server-Side Processing) ---
    ipcMain.handle("get-clientes-paginados", (_, dtParams) => {
        try {
            // 1. FORZAMOS A ENTEROS (SQLite lanza error si recibe un string aquí)
            const limit = parseInt(dtParams.length, 10) || 10;
            const offset = parseInt(dtParams.start, 10) || 0;
            const searchValue = dtParams.search?.value || '';

            const orderColIndex = dtParams.order?.[0]?.column || 0;
            const orderDir = dtParams.order?.[0]?.dir === 'desc' ? 'DESC' : 'ASC';
            
            const columnsMap = ['documento', 'nombre', 'telefono', 'direccion', 'date_created'];
            const orderCol = columnsMap[orderColIndex] || 'date_created';

            let baseQuery = "FROM clientes WHERE status > 0";
            let queryParams = [];

            if (searchValue) {
                baseQuery += " AND (nombre LIKE ? OR documento LIKE ? OR telefono LIKE ? OR direccion LIKE ?)";
                const likeParam = `%${searchValue}%`;
                queryParams.push(likeParam, likeParam, likeParam, likeParam);
            }

            const totalRow = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE status > 0").get();
            const recordsTotal = totalRow.count;

            const filteredRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams);
            const recordsFiltered = filteredRow.count;

            const dataQuery = `SELECT * ${baseQuery} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`;
            const data = db.prepare(dataQuery).all(...queryParams, limit, offset);

            return {
                draw: dtParams.draw,
                recordsTotal: recordsTotal,
                recordsFiltered: recordsFiltered,
                data: data
            };
        } catch (error) {
            console.error("Error crítico en paginación: ", error);
            return { draw: dtParams.draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }
    });
}