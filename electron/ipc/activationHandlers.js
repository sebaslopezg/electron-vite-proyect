import { ipcMain } from "electron"
import { v4 as uuidv4 } from "uuid"
import db from "../database/index.js"
import { execSync } from "child_process"
import crypto from "crypto"
import { logger } from "../utils/logger.js"

const SECRET_SALT = "9fda35f81783e5ef729e2cd471ad1d52"

const getHardwareId = () => {
    try {
        if (process.platform === 'win32') {
            const output = execSync('wmic csproduct get uuid').toString()
            const lines = output.split('\n')
            return lines[1] ? lines[1].trim() : 'WIN-UNKNOWN-HWID'
        } else if (process.platform === 'darwin') {
            return execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $4 }'").toString().replace(/"/g, "").trim()
        } else {
            return execSync('cat /etc/machine-id').toString().trim()
        }
    } catch (e) {
        return 'GENERIC-HARDWARE-ID-ERROR'
    }
}

const generateValidKey = (hwid) => {
    const hash = crypto.createHash('sha256').update(hwid + SECRET_SALT).digest('hex').toUpperCase()
    return hash.substring(0, 16).match(/.{1,4}/g).join('-')
}

export const registerActivationHandlers = () => {
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS licencia (
            id TEXT PRIMARY KEY,
            hardware_id TEXT,
            clave_activacion TEXT,
            activado INTEGER DEFAULT 0,
            date_activated TEXT
        );
    `)

    ipcMain.handle("check-license", () => {
        try {
            const hwid = getHardwareId()
            const license = db.prepare("SELECT * FROM licencia LIMIT 1").get()

            if (!license || license.activado !== 1) {
                return { success: true, activated: false, hardwareId: hwid }
            }

            const expectedKey = generateValidKey(hwid)
            if (license.clave_activacion === expectedKey) {
                return { success: true, activated: true, hardwareId: hwid }
            } else {
                logger.warning('SEGURIDAD', 'Intento de vulneración: Se detectó una base de datos copiada en un equipo no autorizado.')
                return { success: true, activated: false, hardwareId: hwid }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("activate-app", (_, claveIngresada) => {
        try {
            const hwid = getHardwareId()
            const expectedKey = generateValidKey(hwid)

            if (claveIngresada.trim().toUpperCase() === expectedKey) {
                const now = new Date().toISOString()
                db.prepare("DELETE FROM licencia").run()
                
                db.prepare(`
                    INSERT INTO licencia (id, hardware_id, clave_activacion, activado, date_activated) 
                    VALUES (?, ?, ?, 1, ?)
                `).run(uuidv4(), hwid, expectedKey, now)

                logger.success('SEGURIDAD', '¡El software ha sido activado con éxito para este equipo!')
                return { success: true }
            } else {
                logger.warning('SEGURIDAD', `Intento fallido de activación. Clave errónea: ${claveIngresada}`)
                return { success: false, error: "La clave ingresada no es válida para este equipo." }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })
}