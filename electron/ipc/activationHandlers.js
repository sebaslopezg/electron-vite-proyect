import { ipcMain } from "electron"
import { v4 as uuidv4 } from "uuid"
import { appDb } from "../database/index.js"
import { execSync } from "child_process"
import crypto from "crypto"
import os from "os"
import { logger } from "../utils/logger.js"

const SECRET_SALT = "9fda35f81783e5ef729e2cd471ad1d52"

const getHardwareId = () => {
    const logs = [];
    let hwid = '';

    try {
        if (process.platform === 'win32') {
            try {
                hwid = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystem).UUID"').toString().trim()
                logs.push(`[Capa 1 - Win32] PowerShell ejecutado con éxito. Resultado: ${hwid}`);
            } catch (e) {
                logs.push(`[Capa 1 - Win32] Error PowerShell: ${e.message}`);
                const output = execSync('wmic csproduct get uuid').toString()
                const lines = output.split('\n')
                hwid = lines[1] ? lines[1].trim() : ''
                logs.push(`[Capa 1 - Win32] WMIC ejecutado. Resultado: ${hwid}`);
            }
        } else if (process.platform === 'darwin') {
            hwid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $4 }'").toString().replace(/"/g, "").trim()
            logs.push(`[Capa 1 - Darwin] Comando IOReg ejecutado. Resultado: ${hwid}`);
        } else {
            hwid = execSync('cat /etc/machine-id').toString().trim()
            logs.push(`[Capa 1 - Linux] Archivo machine-id leído. Resultado: ${hwid}`);
        }

        if (!hwid || hwid.includes('FFFFFFFF-FFFF') || hwid.length < 10) {
            throw new Error(`El HWID extraído es inválido o genérico de fábrica (${hwid}).`);
        }

        return { hwid, logs };

    } catch (e) {
        logs.push(`[Capa 1 Fallida] Motivo: ${e.message}`);
        
        try {
            const interfaces = os.networkInterfaces()
            logs.push(`[Capa 2] Interfaces de red detectadas: ${Object.keys(interfaces).join(', ')}`);
            
            for (const key in interfaces) {
                for (const net of interfaces[key]) {
                    if (!net.internal && net.mac !== '00:00:00:00:00:00') {
                        const fallbackStr = `${os.hostname()}-${net.mac}`
                        const macHwid = crypto.createHash('sha256').update(fallbackStr).digest('hex').substring(0, 32).toUpperCase()
                        logs.push(`[Capa 2 Exitosa] Se usó la interfaz física '${key}' con MAC ${net.mac}.`);
                        return { hwid: macHwid, logs }
                    }
                }
            }
            logs.push(`[Capa 2 Fallida] No se encontró ninguna interfaz de red con una MAC válida (No virtual).`);
        } catch (errFallback) {
            logs.push(`[Capa 2 Fallida] Error en módulo 'os': ${errFallback.message}`);
        }
        
        const absoluteFallback = os.hostname() || 'UNKNOWN-PC';
        const finalHwid = 'GEN-HWID-' + crypto.createHash('md5').update(absoluteFallback).digest('hex').toUpperCase();
        logs.push(`[Capa 3 Exitosa] Se aplicó último recurso con nombre de equipo: ${absoluteFallback}.`);
        
        return { hwid: finalHwid, logs };
    }
}

const generateValidKey = (hwid) => {
    const hash = crypto.createHash('sha256').update(hwid + SECRET_SALT).digest('hex').toUpperCase()
    return hash.substring(0, 16).match(/.{1,4}/g).join('-')
}

export const registerActivationHandlers = () => {
    
    appDb.exec(`
        CREATE TABLE IF NOT EXISTS licencia (
            id TEXT PRIMARY KEY,
            hardware_id TEXT,
            clave_activacion TEXT,
            activado INTEGER DEFAULT 0,
            date_activated TEXT
        );
    `)

    ipcMain.handle("get-hwid-debug", () => {
        const { hwid, logs } = getHardwareId()
        return { hwid, logs }
    })

    ipcMain.handle("check-license", () => {
        try {
            const { hwid } = getHardwareId() // Modificado
            const license = appDb.prepare("SELECT * FROM licencia LIMIT 1").get()

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
            const { hwid } = getHardwareId() // Modificado
            const expectedKey = generateValidKey(hwid)

            if (claveIngresada.trim().toUpperCase() === expectedKey) {
                const now = new Date().toISOString()
                appDb.prepare("DELETE FROM licencia").run()
                
                appDb.prepare(`
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