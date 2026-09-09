import { ipcMain } from "electron"
import { v4 as uuidv4 } from "uuid"
import db, { appDb } from "../database/index.js"
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
                hwid = execSync('powershell.exe -NoProfile -Command "(Get-ItemProperty -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography).MachineGuid"', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
                logs.push(`[Capa 1 - Win32] MachineGuid extraído con éxito. Resultado: ${hwid}`);
            } catch (e) {
                logs.push(`[Capa 1 - Win32] Error PowerShell: ${e.message}`);
                const output = execSync('reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
                const match = output.match(/([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/);
                if (match) hwid = match[1].trim();
            }
        } else if (process.platform === 'darwin') {
            hwid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $4 }'", { stdio: ['pipe', 'pipe', 'ignore'] }).toString().replace(/"/g, "").trim()
            logs.push(`[Capa 1 - Darwin] Comando IOReg ejecutado. Resultado: ${hwid}`);
        } else {
            try {
                hwid = execSync('cat /etc/machine-id', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
            } catch {
                hwid = execSync('cat /var/lib/dbus/machine-id', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
            }
            logs.push(`[Capa 1 - Linux] Archivo machine-id leído. Resultado: ${hwid}`);
        }

        if (!hwid || hwid.length < 10 || hwid.includes('FFFFFFFF')) {
            throw new Error(`El identificador base extraído es genérico o inválido (${hwid}).`);
        }

        return { hwid: hwid.toUpperCase(), logs };

    } catch (e) {
        logs.push(`[Capa 1 Fallida] Motivo: ${e.message}`);
        
        try {
            const userInfo = os.userInfo().username || 'user';
            const interfaces = os.networkInterfaces()
            
            const validMacs = [];
            for (const key in interfaces) {
                const nameLower = key.toLowerCase();
                if (nameLower.includes('veth') || nameLower.includes('docker') || nameLower.includes('vmware') || nameLower.includes('virtual') || nameLower.includes('hyper') || nameLower.includes('vpn')) {
                    continue;
                }

                for (const net of interfaces[key]) {
                    if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
                        validMacs.push(net.mac);
                    }
                }
            }
            
            if (validMacs.length > 0) {
                validMacs.sort()
                const selectedMac = validMacs[0]

                const fallbackStr = `${os.hostname()}-${userInfo}-${selectedMac}`;
                const macHwid = crypto.createHash('sha256').update(fallbackStr).digest('hex').substring(0, 32).toUpperCase();
                
                logs.push(`[Capa 2 Exitosa] Se usó MAC física controlada: ${selectedMac}.`);
                return { hwid: macHwid, logs }
            }
            
            logs.push(`[Capa 2 Fallida] No se encontró ninguna interfaz de red válida.`);
        } catch (errFallback) {
            logs.push(`[Capa 2 Fallida] Error en fallback de red: ${errFallback.message}`);
        }
        
        const absoluteFallback = os.hostname() + '-' + os.release() + '-' + os.arch();
        const finalHwid = 'GEN-' + crypto.createHash('sha256').update(absoluteFallback).digest('hex').substring(0, 28).toUpperCase();
        logs.push(`[Capa 3 Exitosa] Identidad enlazada al nombre estático del host.`);
        
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
            const { hwid } = getHardwareId()
            let license = appDb.prepare("SELECT * FROM licencia LIMIT 1").get()

            if (!license || license.activado !== 1) {
                try {
                    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='licencia'").get();
                    if (tableExists) {
                        const legacyLicense = db.prepare("SELECT * FROM licencia LIMIT 1").get();
                        
                        if (legacyLicense && legacyLicense.activado === 1) {
                            appDb.prepare("DELETE FROM licencia").run();
                            appDb.prepare(`
                                INSERT INTO licencia (id, hardware_id, clave_activacion, activado, date_activated) 
                                VALUES (?, ?, ?, 1, ?)
                            `).run(
                                legacyLicense.id || uuidv4(), 
                                legacyLicense.hardware_id || hwid, 
                                legacyLicense.clave_activacion, 
                                legacyLicense.date_activated || new Date().toISOString()
                            );
                            
                            license = legacyLicense;
                            logger.success('SEGURIDAD', 'Licencia heredada migrada automáticamente a la base de datos global.');
                        }
                    }
                } catch (migrationError) {
                }
            }

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
            const { hwid } = getHardwareId()
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