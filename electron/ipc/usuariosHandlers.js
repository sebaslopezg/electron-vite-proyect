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
    `)

    try { appDb.exec("ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;") } catch (e) {}
    try { appDb.exec("ALTER TABLE usuarios ADD COLUMN remember_token TEXT;") } catch (e) {}

    const checkAdmin = appDb.prepare("SELECT COUNT(*) as count FROM usuarios").get()
    if (checkAdmin.count === 0) {
        const hash = bcrypt.hashSync('admin123', 10)
        appDb.prepare(`
            INSERT INTO usuarios (id, nombre_completo, username, password_hash, rol, status, date_created) 
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
        `).run(uuidv4(), 'Administrador Principal', 'admin', hash, 'Administrador')
        logger.info('SISTEMA', 'Usuario "admin" (clave: admin123) creado por defecto.')
    }

    ipcMain.handle("check-login-required", (_, token) => {
        try {
            if (token) {
                const userByToken = appDb.prepare("SELECT * FROM usuarios WHERE remember_token = ? AND status = 1").get(token)
                if (userByToken) {
                    const roleRow = appDb.prepare("SELECT permisos_json FROM roles WHERE nombre = ?").get(userByToken.rol)
                    let permisos = ["ALL"]
                    try { if (roleRow) permisos = JSON.parse(roleRow.permisos_json); } catch (e) {}

                    const userSession = { 
                        id: userByToken.id, 
                        nombre_completo: userByToken.nombre_completo, 
                        username: userByToken.username, 
                        rol: userByToken.rol, 
                        permisos: permisos,
                        foto_perfil: userByToken.foto_perfil 
                    }
                    global.currentUserSession = userSession
                    logger.info('SISTEMA', `Auto-login exitoso mediante token persistente para: @${userByToken.username}`)
                    return { success: true, required: false, user: userSession }
                }
            }

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

                        const userSession = { 
                            id: singleUser.id, 
                            nombre_completo: singleUser.nombre_completo, 
                            username: singleUser.username, 
                            rol: singleUser.rol, 
                            permisos: permisos,
                            foto_perfil: singleUser.foto_perfil 
                        }
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

    ipcMain.handle("login-user", async (_, { username, password, rememberMe }) => {
        try {
            const user = appDb.prepare("SELECT * FROM usuarios WHERE username = ? AND status = 1").get(username.toLowerCase().trim())
            if (!user) return { success: false, error: "Usuario o contraseña incorrectos." }

            const match = bcrypt.compareSync(password, user.password_hash)
            if (!match) return { success: false, error: "Usuario o contraseña incorrectos." }

            const roleRow = appDb.prepare("SELECT permisos_json FROM roles WHERE nombre = ?").get(user.rol)
            let permisos = []
            try { if (roleRow) permisos = JSON.parse(roleRow.permisos_json); } catch (e) {}

            const userSession = { 
                id: user.id, 
                nombre_completo: user.nombre_completo, 
                username: user.username, 
                rol: user.rol, 
                permisos: permisos,
                foto_perfil: user.foto_perfil
            }
            global.currentUserSession = userSession

            let generatedToken = null
            if (rememberMe) {
                generatedToken = uuidv4()
                appDb.prepare("UPDATE usuarios SET remember_token = ? WHERE id = ?").run(generatedToken, user.id)
            } else {
                appDb.prepare("UPDATE usuarios SET remember_token = NULL WHERE id = ?").run(user.id)
            }

            logger.info('SISTEMA', `Inicio de sesión exitoso: @${user.username} [${user.rol}]`)
            return { success: true, user: userSession, token: generatedToken }
        } catch (error) { return { success: false, error: error.message } }
    })

    ipcMain.handle("logout-user", () => {
        try {
            if (global.currentUserSession) {
                appDb.prepare("UPDATE usuarios SET remember_token = NULL WHERE id = ?").run(global.currentUserSession.id);
                logger.info('SISTEMA', `Sesión cerrada para: @${global.currentUserSession.username}`)
                global.currentUserSession = null;
            }
            return { success: true }
        } catch(e) {
            return { success: false, error: e.message }
        }
    })

    ipcMain.handle("update-mi-perfil", async (_, data) => {
        const session = global.currentUserSession
        if (!session) return { success: false, error: "Sesión inválida." }
        
        if (session.id !== data.id) {
            logger.warning('SISTEMA', `Intento de violación de acceso: @${session.username} intentó modificar otro perfil.`);
            return { success: false, error: "No tienes permiso para modificar este perfil." }
        }

        try {
            const now = new Date().toISOString()
            if (data.password && data.password.trim() !== '') {
                const hash = bcrypt.hashSync(data.password, 10)
                appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, password_hash = ?, foto_perfil = ?, date_modify = ? WHERE id = ?`)
                     .run(data.nombre_completo, hash, data.foto_perfil, now, data.id)
                logger.success('SISTEMA', `El usuario @${session.username} actualizó su perfil personal y cambió su contraseña.`)
            } else {
                appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, foto_perfil = ?, date_modify = ? WHERE id = ?`)
                     .run(data.nombre_completo, data.foto_perfil, now, data.id)
                logger.info('SISTEMA', `El usuario @${session.username} actualizó sus datos personales.`)
            }

            global.currentUserSession.nombre_completo = data.nombre_completo;
            global.currentUserSession.foto_perfil = data.foto_perfil;

            return { success: true, user: global.currentUserSession }
        } catch (error) {
            logger.error('USUARIOS', "Error actualizando perfil personal", error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle("get-usuarios", () => {
        if (!checkPermission("usuarios_ver")) return { success: false, error: "No autorizado." }
        try { return { success: true, data: appDb.prepare("SELECT id, nombre_completo, username, rol, status, date_created FROM usuarios WHERE status = 1 ORDER BY nombre_completo ASC").all() } } catch (e) { return { success: false, error: e.message } }
    })

    ipcMain.handle("add-usuario", async (_, user) => {
        if (!checkPermission("usuarios_crear")) return { success: false, error: "No autorizado." }
        try {
            const id = uuidv4(); const now = new Date().toISOString(); const hash = bcrypt.hashSync(user.password, 10)
            appDb.prepare(`INSERT INTO usuarios (id, nombre_completo, username, password_hash, rol, status, date_created, date_modify) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`).run(id, user.nombre_completo, user.username, hash, user.rol, now, now)
            logger.success('USUARIOS', `Nuevo usuario creado: ${user.nombre_completo}`, `Usuario: ${user.username} | Rol: ${user.rol}`)
            return { success: true, id }
        } catch (error) { return { success: false, error: error.message } }
    })

    ipcMain.handle("update-usuario", async (_, user) => {
        if (!checkPermission("usuarios_editar")) return { success: false, error: "No autorizado." }
        try {
            const now = new Date().toISOString()
            if (user.password && user.password.trim() !== '') {
                const hash = bcrypt.hashSync(user.password, 10)
                appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, username = ?, password_hash = ?, rol = ?, date_modify = ? WHERE id = ?`).run(user.nombre_completo, user.username, hash, user.rol, now, user.id)
                logger.success('USUARIOS', `Usuario actualizado por admin (Clave modificada): ${user.username}`);
            } else {
                appDb.prepare(`UPDATE usuarios SET nombre_completo = ?, username = ?, rol = ?, date_modify = ? WHERE id = ?`).run(user.nombre_completo, user.username, user.rol, now, user.id)
                logger.info('USUARIOS', `Usuario actualizado por admin: ${user.username}`)
            }
            return { success: true }
        } catch (error) { return { success: false, error: error.message } }
    })

    ipcMain.handle("delete-usuario", async (_, id) => {
        if (!checkPermission("usuarios_eliminar")) return { success: false, error: "No autorizado." }
        try {
            const check = appDb.prepare("SELECT COUNT(*) as count FROM usuarios WHERE status = 1 AND rol = 'Administrador'").get()
            const userToDel = appDb.prepare("SELECT rol, username FROM usuarios WHERE id = ?").get(id)
            if (userToDel && userToDel.rol === 'Administrador' && check.count <= 1) return { success: false, error: "No puedes eliminar al último Administrador del sistema." }
            appDb.prepare("UPDATE usuarios SET status = 0, date_modify = datetime('now') WHERE id = ?").run(id)
            logger.warning('USUARIOS', `Usuario enviado a la papelera (Username: ${userToDel?.username})`)
            return { success: true }
        } catch (error) { return { success: false, error: error.message } }
    })
}