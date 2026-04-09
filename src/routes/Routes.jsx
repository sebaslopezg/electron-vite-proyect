import { Routes, Route } from 'react-router-dom'
import { Ventas } from '../pages/ventas'
import { Inventario } from '../pages/inventario'
import { Clientes } from '../pages/Clientes'
import { Configuracion } from '../pages/Configuracion'
import { Bitacoras } from '../pages/Bitacoras'
import { ProductosIndex } from '../pages/Productos'
import { Encargos } from '../pages/encargos/Encargos'

export const MainRoutes = () => {

    return <>
        <Routes>
            <Route path="/" element={<Ventas />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<ProductosIndex />} />
            <Route path="/encargos" element={<Encargos />} />
            <Route path="/bitacoras" element={<Bitacoras />} />
            <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
    </>
}