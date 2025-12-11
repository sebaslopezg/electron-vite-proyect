import { Routes, Route } from 'react-router-dom'
import { Ventas } from '../pages/ventas'
import { Inventario } from '../pages/inventario'
import { Clientes } from '../pages/Clientes'
import { Productos } from '../pages/Productos'
import { Configuracion } from '../pages/Configuracion'

export const MainRoutes = () => {

    return <>
        <Routes>
            <Route path="/" element={<Ventas />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
    </>
}