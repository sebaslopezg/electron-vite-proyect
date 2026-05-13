import { Routes, Route } from 'react-router-dom'
import { Ventas } from '../pages/ventas'
import { Inventario } from '../pages/inventario'
import { Clientes } from '../pages/Clientes'
//import { Configuracion } from '../pages/Configuracion'
import { ConfiguracionIndex as Configuracion } from '../pages/Configuracion/index';
import { Bitacoras } from '../pages/Bitacoras'
import { ProductosIndex } from '../pages/Productos'
import { IndexEncargos } from '../pages/encargos/index'
import { Cartera } from '../pages/cartera/index';
import { ContabilidadIndex } from '../pages/Contabilidad';
import { Compras } from '../pages/compras';

export const MainRoutes = () => {

    return <>
        <Routes>
            <Route path="/" element={<Ventas />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/cartera" element={<Cartera />} />
            <Route path="/productos" element={<ProductosIndex />} />
            <Route path="/encargos" element={<IndexEncargos />} />
            <Route path="/contabilidad" element={<ContabilidadIndex />} />
            <Route path="/bitacoras" element={<Bitacoras />} />
            <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
    </>
}