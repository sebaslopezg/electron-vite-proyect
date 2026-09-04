import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Badge } from 'react-bootstrap'
import defaultLogo from './../../assets/favicon.png'
import { notificacionesService } from '../../services/notificacionesService'

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} hr${diffHrs > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
}

const getTextColor = (hexColor) => {
    if (!hexColor) return '#ffffff'
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#000000' : '#ffffff'
}

export const Header = ({ currentUser, onLogout }) => {
    const [searchBarShow, setSearchBarShow] = useState(false)
    const [appName, setAppName] = useState('Caedro')
    const [appLogo, setAppLogo] = useState(defaultLogo)
    const [userVisual, setUserVisual] = useState(currentUser)
    
    const [notificaciones, setNotificaciones] = useState([])
    const navigate = useNavigate()

    const loadConfig = async () => {
        try {
            const data = await window.api.getConfiguracion()
            const appConf = data.find(r => r.key === 'confApp')
            if (appConf && appConf.value) {
                const parsed = JSON.parse(appConf.value)
                if (parsed.nombre) setAppName(parsed.nombre)
                if (parsed.logo) setAppLogo(parsed.logo)
                
                document.title = parsed.nombre || 'Caedro'
                if (window.api.updateWindow) window.api.updateWindow({ nombre: parsed.nombre, logo: parsed.logo })
            }
        } catch (error) {
            console.error("Error cargando configuración en Header:", error)
        }
    }

    const loadNotificaciones = async () => {
        try {
            const data = await notificacionesService.getNotificaciones();
            setNotificaciones(data || []);
        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        }
    }

    useEffect(() => {
        loadConfig()
        loadNotificaciones()

        const handleUpdate = () => loadConfig()
        const handleProfileUpdate = (e) => setUserVisual(e.detail)
        const handleNotifUpdate = () => loadNotificaciones()

        window.addEventListener('config-actualizada', handleUpdate)
        window.addEventListener('perfil-actualizado', handleProfileUpdate)
        window.addEventListener('notificaciones-actualizadas', handleNotifUpdate)

        const interval = setInterval(loadNotificaciones, 120000)

        return () => {
            window.removeEventListener('config-actualizada', handleUpdate)
            window.removeEventListener('perfil-actualizado', handleProfileUpdate)
            window.removeEventListener('notificaciones-actualizadas', handleNotifUpdate)
            clearInterval(interval)
        }
    }, [])

    useEffect(() => {
        if (currentUser) setUserVisual(currentUser)
    }, [currentUser])

    const handleSidebarToggle = () => {
        document.body.classList.toggle('toggle-sidebar')
    }

    const handleSearchBarToggle = (e) => {
        e.preventDefault()
        setSearchBarShow(!searchBarShow)
    }

    const handleMarcarLeida = async (e, notificacion) => {
        e.preventDefault();
        if (notificacion.leida === 0) {
            await notificacionesService.marcarLeida(notificacion.id);
            loadNotificaciones();
            window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));
        }
        if (notificacion.link) {
            navigate(notificacion.link);
        }
    }

    const handleMarcarTodasLeidas = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await notificacionesService.marcarLeida('all');
        loadNotificaciones();
        window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));
    }

    const handleEliminarUna = async (e, id) => {
        e.preventDefault();
        e.stopPropagation()
        await notificacionesService.deleteNotificacion(id);
        loadNotificaciones();
        window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));
    }

    const primerNombre = userVisual?.nombre_completo?.split(' ')[0] || 'Usuario'
    const rolColor = userVisual?.rol_color || '#0d6efd'
    const rolTextColor = getTextColor(rolColor)
    
    const notificacionesNoLeidas = notificaciones.filter(n => n.leida === 0);
    const contador = notificacionesNoLeidas.length;

    const getIconData = (tipo) => {
        switch(tipo) {
            case 'success': return { icon: 'bi-check-circle', color: 'text-success' };
            case 'warning': return { icon: 'bi-exclamation-circle', color: 'text-warning' };
            case 'danger': return { icon: 'bi-x-circle', color: 'text-danger' };
            default: return { icon: 'bi-info-circle', color: 'text-primary' };
        }
    }

    return <>
        <style>
            {`
                /* Corrección para el deslizamiento del header al abrir modales */
                #header.fixed-top {
                    transition: left 0.5s, top 0.5s, width 0.5s, background-color 0.5s !important;
                }
            `}
        </style>
        <header id="header" className="header fixed-top d-flex align-items-center">
            <div className="d-flex align-items-center justify-content-between">
                <Link to="/" className="logo d-flex align-items-center text-decoration-none">
                    <img src={appLogo} alt="Logo" style={{ maxHeight: '40px', objectFit: 'contain' }} />
                    <span className="d-none d-lg-block ms-2">{appName}</span>
                </Link>
                <i 
                    className="bi bi-list toggle-sidebar-btn ms-3" 
                    onClick={handleSidebarToggle}
                    style={{ cursor: 'pointer' }}
                ></i>
            </div>

            <nav className="header-nav ms-auto">
                <ul className="d-flex align-items-center">
                    <li className="nav-item d-block d-lg-none">
                        <a 
                            className="nav-link nav-icon search-bar-toggle" 
                            href="#" onClick={handleSearchBarToggle}
                        >
                            <i className="bi bi-search"></i>
                        </a>
                    </li>

                    <li className="nav-item dropdown">
                        <a className="nav-link nav-icon" href="#" data-bs-toggle="dropdown">
                            <i className="bi bi-bell"></i>
                            {contador > 0 && (
                                <span className="badge bg-primary badge-number animate__animated animate__pulse animate__infinite">
                                    {contador > 99 ? '99+' : contador}
                                </span>
                            )}
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow notifications shadow-sm">
                            <li className="dropdown-header">
                                {contador > 0 ? `Tienes ${contador} notificaciones nuevas` : 'No hay notificaciones nuevas'}
                                {contador > 0 && (
                                    <a href="#" onClick={handleMarcarTodasLeidas}>
                                        <span className="badge rounded-pill bg-primary p-2 ms-2 hover-opacity">Marcar leídas</span>
                                    </a>
                                )}
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            {notificaciones.length === 0 ? (
                                <li className="notification-item py-4 text-center text-muted">
                                    <i className="bi bi-bell-slash fs-4 d-block mb-2"></i>
                                    Al día
                                </li>
                            ) : (
                                notificaciones.slice(0, 5).map((noti) => {
                                    const { icon, color } = getIconData(noti.tipo);
                                    return (
                                        <div key={noti.id} className="position-relative">
                                            <li className={`notification-item ${noti.leida === 0 ? 'bg-light' : ''} pe-5`} style={{ cursor: 'pointer' }} onClick={(e) => handleMarcarLeida(e, noti)}>
                                                <i className={`bi ${icon} ${color}`}></i>
                                                <div>
                                                    <h4 className={noti.leida === 0 ? 'fw-bold' : ''}>{noti.titulo}</h4>
                                                    <p>{noti.mensaje}</p>
                                                    <p className="text-muted small">{timeAgo(noti.date_created)}</p>
                                                </div>
                                            </li>
                                            
                                            <Button 
                                                variant="link" 
                                                className="text-secondary p-1 border-0 position-absolute opacity-50" 
                                                style={{ top: '10px', right: '15px', zIndex: 10 }}
                                                title="Eliminar notificación"
                                                onClick={(e) => handleEliminarUna(e, noti.id)}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </Button>
                                            
                                            <li><hr className="dropdown-divider" /></li>
                                        </div>
                                    )
                                })
                            )}

                            <li className="dropdown-footer">
                                <Link to="/notificaciones">Ver todas las notificaciones</Link>
                            </li>
                        </ul>
                    </li> 

                    <li className="nav-item dropdown pe-4">
                        <a className="nav-link nav-profile d-flex align-items-center pe-0" href="#" data-bs-toggle="dropdown">
                            {userVisual?.foto_perfil ? (
                                <img src={userVisual.foto_perfil} alt="Profile" className="rounded-circle" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                            ) : (
                                <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" 
                                    style={{ width: '36px', height: '36px', fontSize: '0.95rem', minWidth: '36px', backgroundColor: rolColor, color: rolTextColor }}
                                >
                                    {userVisual?.nombre_completo ? userVisual.nombre_completo.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                            <span className="d-none d-md-block dropdown-toggle ps-2 fw-bold text-secondary">{primerNombre}</span>
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow profile shadow-sm border-0">
                            <li className="dropdown-header text-start px-4 pt-3 pb-2 bg-light rounded-top">
                                <h6 className="fw-bold text-dark mb-1">{userVisual?.nombre_completo || 'Usuario del Sistema'}</h6>
                                <span className="badge shadow-sm" style={{ backgroundColor: rolColor, color: rolTextColor }}>
                                    {userVisual?.rol || 'No asignado'}
                                </span>
                            </li>
                            <li><hr className="dropdown-divider m-0" /></li>

                            <li>
                                <Link className="dropdown-item d-flex align-items-center py-2 px-4" to="/perfil">
                                    <i className="bi bi-person fs-5 me-3 text-secondary"></i>
                                    <span className="fw-medium">Mi Perfil Personal</span>
                                </Link>
                            </li>
                            <li><hr className="dropdown-divider m-0" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center text-danger py-2 px-4" href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>
                                    <i className="bi bi-box-arrow-right fs-5 me-3"></i>
                                    <span className="fw-bold">Cerrar Sesión</span>
                                </a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </nav>
        </header>
    </>
}