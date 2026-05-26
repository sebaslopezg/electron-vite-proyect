import { Routes, Route, Navigate } from 'react-router-dom'
import { Ventas } from '../pages/ventas'
import { Inventario } from '../pages/inventario'
import { Clientes } from '../pages/Clientes'
import { ConfiguracionIndex as Configuracion } from '../pages/configuracion/index'
import { ProductosIndex } from '../pages/productos'
import { IndexEncargos } from '../pages/encargos/index'
import { Cartera } from '../pages/cartera/index'
import { ContabilidadIndex } from '../pages/contabilidad'
import { Compras } from '../pages/compras'
import { Usuarios } from '../pages/usuarios'
import { Roles } from '../pages/roles'

export const MainRoutes = ({ currentUser }) => {

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const getLandingRoute = () => {
        if (!currentUser) return '/ventas'
        if (currentUser.permisos?.includes('ALL')) return '/ventas'

        const tokenConfigurado = currentUser.permisos?.find(p => p.startsWith('START_PATH:'))
        if (tokenConfigurado) {
            return tokenConfigurado.split(':')[1]
        }

        const mapaSeguridadRutas = [
            { path: '/ventas', perm: 'ventas_crear' },
            { path: '/productos', perm: 'productos_ver' },
            { path: '/inventario', perm: 'inventario_ver' },
            { path: '/encargos', perm: 'encargos_ver' },
            { path: '/clientes', perm: 'clientes_ver' },
            { path: '/cartera', perm: 'cartera_ver' },
            { path: '/compras', perm: 'compras_ver' },
            { path: '/contabilidad', perm: 'contabilidad_ver' },
            { path: '/usuarios', perm: 'usuarios_gestionar' },
            { path: '/roles', perm: 'roles_gestionar' },
            { path: '/configuracion', perm: 'configuracion_sistema' }
        ]

        const primeraRutaValida = mapaSeguridadRutas.find(m => hasPermission(m.perm))
        return primeraRutaValida ? primeraRutaValida.path : '/ventas'
    }

    const ProtectedRoute = ({ children, permission }) => {
        if (!hasPermission(permission)) {
            return (
                <div className="alert alert-danger m-4 text-center shadow-sm">
                    <i className="bi bi-shield-slash fs-1 d-block mb-2"></i>
                    <h5 className="fw-bold">Acceso Denegado</h5>
                    <p className="small m-0">No tienes los permisos requeridos para visualizar este módulo. Contacta al administrador.</p>
                </div>
            )
        }
        return children
    }

    return <>
        <Routes>
            <Route path="/" element={<Navigate to={getLandingRoute()} replace />} />
            
            <Route path="/ventas" element={
                <ProtectedRoute permission="ventas_crear">
                    <Ventas currentUser={currentUser} /> 
                </ProtectedRoute>
            } />

            <Route path="/productos" element={
                <ProtectedRoute permission="productos_ver">
                    <ProductosIndex currentUser={currentUser} /> 
                </ProtectedRoute>
            } />

            <Route path="/inventario" element={
                <ProtectedRoute permission="inventario_ver">
                    <Inventario currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/encargos" element={
                <ProtectedRoute permission="encargos_ver">
                    <IndexEncargos currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/clientes" element={
                <ProtectedRoute permission="clientes_ver">
                    <Clientes currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/cartera" element={
                <ProtectedRoute permission="cartera_ver">
                    <Cartera currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/compras" element={
                <ProtectedRoute permission="compras_ver">
                    <Compras currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/contabilidad" element={
                <ProtectedRoute permission="contabilidad_ver">
                    <ContabilidadIndex currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/usuarios" element={
                <ProtectedRoute permission="usuarios_gestionar">
                    <Usuarios currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/roles" element={
                <ProtectedRoute permission="roles_gestionar">
                    <Roles currentUser={currentUser} />
                </ProtectedRoute>
            } />

            <Route path="/configuracion" element={
                <ProtectedRoute permission="configuracion_sistema">
                    <Configuracion currentUser={currentUser} />
                </ProtectedRoute>
            } />
        </Routes>
    </>
}