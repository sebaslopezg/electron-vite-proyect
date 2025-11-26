import { Link, useLocation } from 'react-router-dom'
import { menuItems } from '../../routes/AsideRoutes'

export const Aside = () => {

    const location = useLocation()

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