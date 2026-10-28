import { useState, useEffect, useRef } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Form } from 'react-bootstrap'
import { ventasService } from '../../../services/ventasService'
import Swal from 'sweetalert2'

export const ModalNotasAdicionales = ({ show, handleClose, factura }) => {
    const [notas, setNotas] = useState([])
    const [nuevaNota, setNuevaNota] = useState('')
    const [cargando, setCargando] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (show && factura) {
            cargarNotas()
        } else {
            setNotas([])
            setNuevaNota('')
        }
    }, [show, factura])

    const cargarNotas = async () => {
        setCargando(true)
        const res = await ventasService.getFacturaNotasAdicionales(factura.id)
        if (res.success) {
            // Se invierte para que las notas más recientes queden abajo
            setNotas(res.data.reverse() || [])
        }
        setCargando(false)
        setTimeout(scrollToBottom, 100)
    }

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    const handleAgregarNota = async (e) => {
        e.preventDefault()
        if (!nuevaNota.trim()) return

        setEnviando(true)
        const res = await ventasService.addFacturaNotaAdicional(factura.id, nuevaNota.trim())
        if (res.success) {
            setNuevaNota('')
            await cargarNotas()
        } else {
            Swal.fire('Error', res.error || 'No se pudo guardar la nota', 'error')
        }
        setEnviando(false)
    }

    const getInitials = (name) => {
        if (!name) return '?'
        return name.charAt(0).toUpperCase()
    }

    const getAvatarColor = (name) => {
        if (!name) return '#6c757d' 
        const colors = ['#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1', '#d63384', '#0dcaf0']
        const charCode = name.charCodeAt(0)
        return colors[charCode % colors.length]
    }

    // Fecha exacta como la solicitaste (Día, Mes, Año, Hora)
    const formatoFechaExacta = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        
        return date.toLocaleString('es-CO', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <Modal 
            show={show} 
            onHide={handleClose} 
            size="md" 
            centered
            backdrop="static"
            backdropClassName="d-none" // Oculta el telón oscuro extra
            keyboard={false}
            style={{ zIndex: 1060 }} 
        >
            <Modal.Header closeButton className="bg-light border-bottom shadow-sm z-1">
                <Modal.Title className="fs-6 fw-bold text-secondary">
                    <i className="bi bi-card-text me-2 text-primary"></i>
                    Notas de Seguimiento - Factura N° {factura?.numero_factura}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0 bg-white d-flex flex-column" style={{ height: '65vh' }}>
                
                {/* Contenedor de Comentarios (Estilo Foro / Log Profesional) */}
                <div 
                    ref={scrollRef} 
                    className="flex-grow-1 p-4 overflow-auto"
                >
                    {cargando ? (
                        <div className="text-center mt-4 text-muted">
                            <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                            Cargando notas...
                        </div>
                    ) : notas.length === 0 ? (
                        <div className="text-center mt-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-3 text-secondary opacity-50"></i>
                            <p className="fw-medium">No hay notas registradas.</p>
                        </div>
                    ) : (
                        notas.map(n => (
                            <div key={n.id} className="d-flex mb-4 animate__animated animate__fadeIn animate__faster">
                                <div className="flex-shrink-0 me-3">
                                    {n.foto_perfil ? (
                                        <img src={n.foto_perfil} alt="avatar" className="rounded-circle shadow-sm" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                    ) : (
                                        <div 
                                            className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" 
                                            style={{ width: '40px', height: '40px', backgroundColor: getAvatarColor(n.usuario_nombre), fontSize: '1.1rem' }}
                                        >
                                            {getInitials(n.usuario_nombre)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow-1 border-bottom pb-3">
                                    <div className="d-flex justify-content-between align-items-baseline mb-1">
                                        <strong className="text-dark fs-6">{n.usuario_nombre}</strong>
                                        <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            {formatoFechaExacta(n.date_created)}
                                        </small>
                                    </div>
                                    <p className="mb-0 text-secondary" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                        {n.contenido}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulario de Entrada */}
                <div className="p-3 bg-light border-top">
                    <Form onSubmit={handleAgregarNota}>
                        <Form.Group className="position-relative">
                            <Form.Control 
                                as="textarea" 
                                rows={2} 
                                placeholder="Agregar una nota a esta factura..." 
                                value={nuevaNota}
                                onChange={(e) => setNuevaNota(e.target.value)}
                                disabled={enviando}
                                className="bg-white border-secondary border-opacity-25"
                                style={{ resize: 'none', paddingRight: '50px', borderRadius: '8px' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                        handleAgregarNota(e);
                                    }
                                }}
                            />
                            <Button 
                                type="submit" 
                                variant="primary" 
                                size="sm" 
                                disabled={!nuevaNota.trim() || enviando}
                                className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm transition-all"
                                style={{ bottom: '8px', right: '8px', width: '32px', height: '32px' }}
                                title="Guardar Nota (Ctrl+Enter)"
                            >
                                {enviando ? <div className="spinner-border spinner-border-sm text-white"></div> : <i className="bi bi-send-fill ms-1"></i>}
                            </Button>
                        </Form.Group>
                        <div className="text-end mt-1 me-1">
                            <small className="text-muted" style={{fontSize: '0.65rem'}}>Ctrl + Enter para guardar</small>
                        </div>
                    </Form>
                </div>
            </Modal.Body>
        </Modal>
    )
}