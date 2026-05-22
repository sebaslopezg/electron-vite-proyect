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

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/ventas" replace />} />
            
            <Route path="/ventas" element={
                <ProtectedRoute permission="ventas_crear">
                    <Ventas currentUser={currentUser} /> 
                </ProtectedRoute>
            } />
            <Route path="/productos" element={
                <ProtectedRoute permission="productos_ver"><ProductosIndex /></ProtectedRoute>
            } />
            <Route path="/inventario" element={
                <ProtectedRoute permission="inventario_ajustar"><Inventario /></ProtectedRoute>
            } />
            <Route path="/encargos" element={
                <ProtectedRoute permission="ventas_crear"><IndexEncargos /></ProtectedRoute>
            } />
            <Route path="/clientes" element={
                <ProtectedRoute permission="ventas_crear"><Clientes /></ProtectedRoute>
            } />
            <Route path="/cartera" element={
                <ProtectedRoute permission="reportes_ver"><Cartera /></ProtectedRoute>
            } />
            <Route path="/compras" element={
                <ProtectedRoute permission="reportes_ver"><Compras /></ProtectedRoute>
            } />
            <Route path="/contabilidad" element={
                <ProtectedRoute permission="reportes_ver"><ContabilidadIndex /></ProtectedRoute>
            } />
            <Route path="/usuarios" element={
                <ProtectedRoute permission="usuarios_gestionar"><Usuarios /></ProtectedRoute>
            } />
            <Route path="/roles" element={
                <ProtectedRoute permission="roles_gestionar"><Roles /></ProtectedRoute>
            } />
            <Route path="/configuracion" element={
                <ProtectedRoute permission="ventas_configurar"><Configuracion /></ProtectedRoute>
            } />
        </Routes>
    )
}