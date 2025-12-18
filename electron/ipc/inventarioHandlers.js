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

    ipcMain.handle("set-inventario", (_,item) => {
        try {
            const id = uuidv4()
            const now = new Date().toISOString()

            const register = db.prepare(`
                INSERT INTO inventario(
                    id,
                    producto_id,
                    tipo_movimiento,
                    modulo_movimiento,
                    cantidad,
                    fecha,
                    usuario
                ) VALUES (
                    @id,
                    @producto_id,
                    @tipo_movimiento,
                    @modulo_movimiento,
                    @cantidad,
                    @fecha,
                    @usuario 
                )
            `)

            const info = register.run({
                id:id,
                producto_id:item.id,
                tipo_movimiento:item.type,
                modulo_movimiento:'inventario',
                cantidad:item.cantidad,
                fecha:now,
                usuario:'nouser'
            })

            const updater = db.prepare()
        } catch (error) {
            
        }
    })
}