import { ipcMain } from "electron"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcryptjs"
import { appDb } from "../database/index.js" 
import { logger } from "../utils/logger.js"

const checkPermission = (permission) => {
    const user = global.currentUserSession
    if (!user) return false
    if (user.permisos?.includes("ALL")) return true
    return user.permisos?.includes(permission)
}

export const registerUsuariosHandlers = () => {
    
    appDb.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY,
            nombre_completo TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT NOT NULL,
            status INTEGER DEFAULT 1,
            date_created TEXT,
            date_modify TEXT
        );
    `);

    const checkAdmin = appDb.prepare("SELECT COUNT(*) as count FROM usuarios").get()
    if (checkAdmin.count === 0) {
        const hash = bcrypt.hashSync('admin123', 10)
        appDb.prepare(`
            INSERT INTO usuarios (id, nombre_completo, username, password_hash, rol, status, date_created) 
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
        `).run(uuidv4(), 'Administrador Principal', 'admin', hash, 'Administrador')
        logger.info('SISTEMA', 'Usuario "admin" (clave: admin123) creado por defecto.')
    }

    ipcMain.handle("check-login-required", () => {
        try {
            const activeUsers = appDb.prepare("SELECT * FROM usuarios WHERE status = 1").all()
            if (activeUsers.length > 1) return { success: true, required: true }
            
            if (activeUsers.length === 1) {
                const singleUser = activeUsers[0]
                if (singleUser.username === 'admin') {
                    const isDefaultPassword = bcrypt.compareSync('admin123', singleUser.password_hash)
                    if (isDefaultPassword) {
                        const roleRow = appDb.prepare("SELECT permisos_json FROM roles WHERE nombre = ?").get(singleUser.rol)
                        let permisos = ["ALL"]
                        try { if (roleRow) permisos = JSON.parse(roleRow.permisos_json); } catch (e) {}

                        const userSession = { id: singleUser.id, nombre_completo: singleUser.nombre_completo, username: singleUser.username, rol: singleUser.rol, permisos: permisos }
                        global.currentUserSession = userSession
                        return { success: true, required: false, user: userSession }
                    }
                }
                return { success: true, required: true }
            }
            return { success: true, required: false }
        } catch (error) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("login-user", async (_, { username, password }) => {
        try {
            const user = appDb.prepare("SELECT * FROM usuarios WHERE username = ? AND status = 1").get(username.toLowerCase().trim())
            if (!user) return { success: false, error: "Usuario o contraseña incorrectos." }

            const match = bcrypt.compareSync(password, user.password_hash)
            if (!match) return { success: false, error: "Usuario o contraseña incorrectos." }

            const roleRow = appDb.prepare("SELECT permisos_json FROM roles WHERE nombre = ?").get(user.rol)
            let permisos = []
            try { if (roleRow) permisos = JSON.parse(roleRow.permisos_json); } catch (e) {}

            const userSession = { id: user.id, nombre_completo: user.nombre_completo, username: user.username, rol: user.rol, permisos: permisos }
            global.currentUserSession = userSession

            logger.info('SISTEMA', `Inicio de sesión exitoso: @${user.username} [${user.rol}]`)
            return { success: true, user: userSession }
        } catch (error) { return { success: false, error: error.message }; }
    })

    ipcMain.handle("get-usuarios", () => {
        if (!checkPermission("usuarios_ver")) {
            return { success: false, error: "No autorizado para consultar la nómina del personal." }
        }
        try {
            const stmt = appDb.prepare("SELECT id, nombre_completo, username, rol, status, date_created FROM usuarios WHERE status = 1 ORDER BY nombre_completo ASC")
            return { success: true, data: stmt.all() }
        } catch (error) { return { success: false, error: error.message } }
    })

    ipcMain.handle("add-usuario", async (_, user) => {
        if (!checkPermission("usuarios_crear")) {
            return { success: false, error: "No autorizado para registrar nuevas cuentas de personal." }
        }
        try {
            const id = uuidv4()
            const now = new Date().toISOString()
            const hash = bcrypt.hashSync(user.password, 10)

            const stmt = appDb.prepare(`INSERT INTO usuarios (id, nombre_completo, username, password_hash, rol, status, date_created, date_modify) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
            stmt.run(id, user.nombre_completo, user.username, hash, user.rol, now, now)
            return { success: true, id }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, error: "El nombre de usuario ya está en uso." }
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("update-usuario", async (_, user) => {
        if (!checkPermission("usuarios_editar")) {
            return { success: false, error: "No autorizado para modificar datos o restablecer contraseñas." }
        }
        try {
            const now = new Date().toISOString()
            if (user.password && user.password.trim() !== '') {
                const hash = bcrypt.hashSync(user.password, 10)
                const stmt = appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, username = ?, password_hash = ?, rol = ?, date_modify = ? WHERE id = ?`)
                stmt.run(user.nombre_completo, user.username, hash, user.rol, now, user.id)
            } else {
                const stmt = appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, username = ?, rol = ?, date_modify = ? WHERE id = ?`)
                stmt.run(user.nombre_completo, user.username, user.rol, now, user.id)
            }
            return { success: true }
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, error: "El username ya está en uso por otra persona." }
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("delete-usuario", async (_, id) => {
        if (!checkPermission("usuarios_eliminar")) {
            return { success: false, error: "No autorizado para dar de baja cuentas corporativas." }
        }
        try {
            const check = appDb.prepare("SELECT COUNT(*) as count FROM usuarios WHERE status = 1 AND rol = 'Administrador'").get()
            const userToDel = appDb.prepare("SELECT rol, username FROM usuarios WHERE id = ?").get(id)
            
            if (userToDel && userToDel.rol === 'Administrador' && check.count <= 1) {
                return { success: false, error: "No puedes eliminar al último Administrador del sistema." }
            }

            appDb.prepare("UPDATE usuarios SET status = 0, date_modify = datetime('now') WHERE id = ?").run(id)
            return { success: true }
        } catch (error) { return { success: false, error: error.message } }
    })
}