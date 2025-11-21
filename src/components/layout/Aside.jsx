import { Link, useLocation } from 'react-router-dom'

export const Aside = () => {

    const location = useLocation()

    const menuItems = [
        { path: '/', label: 'Dashboard', icon: 'bi-grid' },
        { path: '/ventas', label: 'Ventas', icon: 'bi-receipt-cutoff' },
        { path: '/inventario', label: 'Inventario', icon: 'bi-clipboard-check' },
        { path: '/productos', label: 'Productos', icon: 'bi-box-seam' },
        { path: '/settings', label: 'Settings', icon: 'bi-gear' },
    ]

    return <>
    
        <aside id="sidebar" className="sidebar">

            <ul className="sidebar-nav" id="sidebar-nav">

                {menuItems.map((item) => (
                    <li className="nav-item" key={item.path}>
                        <Link 
                            to={item.path} 
                            className={`nav-link ${location.pathname === item.path ? 'active' : 'collapsed'}`}
                        >
                            <i className={`bi ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </Link>
                    </li>
                ))}

            </ul>

        </aside>{/* End Sidebar */}
    </>
}