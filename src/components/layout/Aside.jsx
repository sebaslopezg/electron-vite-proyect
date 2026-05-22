import { Link, useLocation } from 'react-router-dom'
import { menuItems } from '../../routes/AsideRoutes'

export const Aside = ({ currentUser }) => {
    const location = useLocation()

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const menuFiltrado = menuItems.filter(item => !item.permission || hasPermission(item.permission))

    return (
        <>
            <aside id="sidebar" className="sidebar">
                <ul className="sidebar-nav" id="sidebar-nav">
                    {menuFiltrado.map((item) => (
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
            </aside>
        </>
    )
}