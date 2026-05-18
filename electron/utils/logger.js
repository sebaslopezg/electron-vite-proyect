import db from "../database/index.js"
import { v4 as uuidv4 } from 'uuid'

const writeLog = (tipo, modulo, mensaje, detalles = null) => {
    try {
        const id = uuidv4()
        const fecha = new Date().toISOString()
        
        let detallesStr = '';
        if (detalles instanceof Error) {
            detallesStr = detalles.stack || detalles.message;
        } else if (typeof detalles === 'object' && detalles !== null) {
            detallesStr = JSON.stringify(detalles)
        } else {
            detallesStr = detalles || ''
        }

        db.prepare(`
            INSERT INTO system_logs (id, tipo, modulo, mensaje, detalles, fecha)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, tipo, modulo, mensaje, detallesStr, fecha)

        const logStr = `[${tipo}] [${modulo}] ${mensaje}`
        if (tipo === 'ERROR') console.error(logStr, detalles || '')
        else if (tipo === 'WARNING') console.warn(logStr)
        else console.log(logStr);

    } catch (err) {
        console.error("Fallo crítico en el Logger del sistema:", err)
    }
};

export const logger = {
    info: (modulo, mensaje, detalles) => writeLog('INFO', modulo, mensaje, detalles),
    success: (modulo, mensaje, detalles) => writeLog('SUCCESS', modulo, mensaje, detalles),
    warning: (modulo, mensaje, detalles) => writeLog('WARNING', modulo, mensaje, detalles),
    error: (modulo, mensaje, detalles) => writeLog('ERROR', modulo, mensaje, detalles)
}