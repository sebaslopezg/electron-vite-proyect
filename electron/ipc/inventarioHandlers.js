import { ipcMain } from "electron"
//import { v4 as uuidv4 } from 'uuid'
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
}