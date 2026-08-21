import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Badge } from 'react-bootstrap'
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

const getIconData = (tipo) => {
    switch(tipo) {
        case 'success': return { icon: 'bi-check-circle-fill', color: 'text-success', bg: 'bg-success-light' };
        case 'warning': return { icon: 'bi-exclamation-triangle-fill', color: 'text-warning', bg: 'bg-warning-light' };
        case 'danger': return { icon: 'bi-x-circle-fill', color: 'text-danger', bg: 'bg-danger-light' };
        default: return { icon: 'bi-info-circle-fill', color: 'text-primary', bg: 'bg-primary-light' };
    }
}

export const Notificaciones = () => {
    const [notificaciones, setNotificaciones] = useState([])
    const navigate = useNavigate()

    const loadData = async () => {
        const data = await notificacionesService.getNotificaciones()
        setNotificaciones(data || [])
    }

    useEffect(() => {
        loadData()
        
        window.addEventListener('notificaciones-actualizadas', loadData)
        return () => window.removeEventListener('notificaciones-actualizadas', loadData)
    }, [])

    const handleMarcarLeida = async (noti) => {
        if (noti.leida === 0) {
            await notificacionesService.marcarLeida(noti.id)
            loadData()
            window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'))
        }
        if (noti.link) {
            navigate(noti.link)
        }
    }

    const handleMarcarTodasLeidas = async () => {
        await notificacionesService.marcarLeida('all')
        loadData()
        window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'))
    }

    const noLeidas = notificaciones.filter(n => n.leida === 0).length

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="pagetitle d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1><i className="bi bi-bell me-2"></i>Centro de Notificaciones</h1>
                </div>
                {noLeidas > 0 && (
                    <Button variant="outline-primary" size="sm" onClick={handleMarcarTodasLeidas}>
                        <i className="bi bi-check-all me-2"></i>Marcar todas como leídas
                    </Button>
                )}
            </div>

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    {notificaciones.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-bell-slash fs-1 d-block mb-3 opacity-50"></i>
                            <h5>No tienes notificaciones</h5>
                            <p>Tu bandeja está completamente limpia.</p>
                        </div>
                    ) : (
                        <div className="list-group list-group-flush">
                            {notificaciones.map((noti) => {
                                const { icon, color } = getIconData(noti.tipo);
                                const isUnread = noti.leida === 0;

                                return (
                                    <div 
                                        key={noti.id} 
                                        className={`list-group-item list-group-item-action p-4 border-bottom ${isUnread ? 'bg-light' : 'bg-white'}`}
                                        style={{ cursor: noti.link || isUnread ? 'pointer' : 'default', transition: 'all 0.2s' }}
                                        onClick={() => handleMarcarLeida(noti)}
                                    >
                                        <div className="d-flex w-100 justify-content-between align-items-start">
                                            <div className="d-flex align-items-start gap-3">
                                                <div className={`mt-1 fs-4 ${color}`}>
                                                    <i className={`bi ${icon}`}></i>
                                                </div>
                                                <div>
                                                    <h6 className={`mb-1 ${isUnread ? 'fw-bold text-dark' : 'text-secondary'}`}>
                                                        {noti.titulo}
                                                        {isUnread && <Badge bg="danger" className="ms-2" pill style={{fontSize: '0.6rem'}}>NUEVA</Badge>}
                                                    </h6>
                                                    <p className={`mb-1 small ${isUnread ? 'text-dark' : 'text-muted'}`}>
                                                        {noti.mensaje}
                                                    </p>
                                                    <small className="text-muted">
                                                        <i className="bi bi-clock me-1"></i>
                                                        {timeAgo(noti.date_created)}
                                                        <span className="mx-2">•</span>
                                                        {new Date(noti.date_created).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </small>
                                                </div>
                                            </div>
                                            
                                            {noti.link && (
                                                <div className="text-muted ms-3 d-none d-md-block mt-2">
                                                    <i className="bi bi-chevron-right"></i>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    )
}