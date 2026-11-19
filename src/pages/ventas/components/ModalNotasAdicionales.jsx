import { useState, useEffect, useRef } from 'react'
import Modal from 'react-bootstrap/Modal'
import { Button, Form } from 'react-bootstrap'
import { ventasService } from '../../../services/ventasService'
import Swal from 'sweetalert2'

export const ModalNotasAdicionales = ({ show, handleClose, factura, canComment = false }) => {
    const [notes, setNotes] = useState([])
    const [newNote, setNewNote] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (show && factura) {
            loadNotes()
        } else {
            setNotes([])
            setNewNote('')
        }
    }, [show, factura])

    const loadNotes = async () => {
        setIsLoading(true)
        const res = await ventasService.getFacturaNotasAdicionales(factura.id)
        if (res.success) {
            setNotes([...(res.data || [])].reverse())
        }
        setIsLoading(false)
        setTimeout(scrollToBottom, 100)
    }

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    const handleAddNote = async (e) => {
        e.preventDefault()
        if (!canComment || !newNote.trim()) return

        setIsSubmitting(true)
        const res = await ventasService.addFacturaNotaAdicional(factura.id, newNote.trim())
        if (res.success) {
            setNewNote('')
            await loadNotes()
        } else {
            Swal.fire('Error', res.error || 'No se pudo guardar la nota', 'error')
        }
        setIsSubmitting(false)
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

    const formatExactDate = (dateString) => {
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

    const invoiceTitle = factura ? `${factura.prefijo || ''}${factura.separador || ''}${factura.numero_factura}` : ''

    return (
        <>
            <style>{`
                .modal-backdrop.backdrop-notas-adicionales {
                    z-index: 1065 !important;
                }
                .modal.modal-notas-adicionales {
                    z-index: 1070 !important;
                }
                .swal2-container {
                    z-index: 1080 !important;
                }
            `}</style>

            <Modal
                show={show}
                onHide={handleClose}
                size="md"
                centered
                className="modal-notas-adicionales"
                backdropClassName="backdrop-notas-adicionales"
            >
                <Modal.Header closeButton className="bg-light border-bottom">
                    <Modal.Title className="fs-6 text-dark">
                        <i className="bi bi-card-text me-2 text-primary"></i>
                        Notas - Factura {invoiceTitle}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 bg-white d-flex flex-column" style={{ height: '65vh' }}>
                    <div
                        ref={scrollRef}
                        className="flex-grow-1 p-4 overflow-auto"
                    >
                        {isLoading ? (
                            <div className="text-center mt-4 text-muted">
                                <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                                Cargando notas...
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="text-center mt-5 text-muted">
                                <i className="bi bi-inbox fs-1 d-block mb-3 text-secondary opacity-50"></i>
                                <p className="fw-medium">No hay notas registradas.</p>
                            </div>
                        ) : (
                            notes.map(noteItem => (
                                <div key={noteItem.id} className="d-flex mb-4 animate__animated animate__fadeIn animate__faster">
                                    <div className="flex-shrink-0 me-3">
                                        {noteItem.foto_perfil ? (
                                            <img src={noteItem.foto_perfil} alt="avatar" className="rounded-circle shadow-sm" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                        ) : (
                                            <div
                                                className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                                style={{ width: '40px', height: '40px', backgroundColor: getAvatarColor(noteItem.usuario_nombre), fontSize: '1.1rem' }}
                                            >
                                                {getInitials(noteItem.usuario_nombre)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow-1 border-bottom pb-3">
                                        <div className="d-flex justify-content-between align-items-baseline mb-1">
                                            <strong className="text-dark fs-6">{noteItem.usuario_nombre}</strong>
                                            <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                {formatExactDate(noteItem.date_created)}
                                            </small>
                                        </div>
                                        <p className="mb-0 text-secondary" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                            {noteItem.contenido}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 bg-light border-top">
                        {canComment ? (
                            <Form onSubmit={handleAddNote}>
                                <Form.Group className="position-relative">
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Agrega una nota a esta factura..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        disabled={isSubmitting}
                                        className="bg-white border-secondary border-opacity-25"
                                        style={{ resize: 'none', paddingRight: '50px', borderRadius: '8px' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                handleAddNote(e)
                                            }
                                        }}
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        disabled={!newNote.trim() || isSubmitting}
                                        className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm transition-all"
                                        style={{ bottom: '8px', right: '8px', width: '40px', height: '40px' }}
                                        title="Guardar Nota (Ctrl+Enter)"
                                    >
                                        {isSubmitting ? <div className="spinner-border spinner-border-sm text-white"></div> : <i className="bi bi-plus"></i>}
                                    </Button>
                                </Form.Group>
                                <div className="text-end mt-1 me-1">
                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Ctrl + Enter para guardar</small>
                                </div>
                            </Form>
                        ) : (
                            <div className="text-center text-muted small py-1">
                                <i className="bi bi-lock-fill me-1"></i>
                                Solo lectura. Tu rol no tiene permiso para agregar notas a las facturas.
                            </div>
                        )}
                    </div>
                </Modal.Body>
            </Modal>
        </>
    )
}