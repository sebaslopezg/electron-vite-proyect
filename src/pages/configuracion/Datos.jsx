import { useState, useEffect } from 'react'
import { Button, Form, Row, Col, Modal } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalPreviewTabla } from './components/ModalPreviewTabla'

export const Datos = () => {
    const [perfiles, setPerfiles] = useState([])
    const [showPerfilModal, setShowPerfilModal] = useState(false)
    const [nuevoPerfilNombre, setNuevoPerfilNombre] = useState('')
    const [showStatsModal, setShowStatsModal] = useState(false)
    const [statsData, setStatsData] = useState({ nombre: '', filename: '', size: '0 KB', tables: [] })
    const [loadingStats, setLoadingStats] = useState(false)

    // NUEVO: Estados para la previsualización de tablas
    const [showPreview, setShowPreview] = useState(false)
    const [previewCols, setPreviewCols] = useState([])
    const [previewData, setPreviewData] = useState([])
    const [previewTableName, setPreviewTableName] = useState('')
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const load = async () => {
        const perfilesData = await window.api.getPerfiles()
        setPerfiles(perfilesData || [])
    }

    const handleCreatePerfil = async (e) => {
        e.preventDefault();
        const result = await window.api.addPerfil({ nombre: nuevoPerfilNombre })
        if (result.success) {
            setShowPerfilModal(false)
            setNuevoPerfilNombre('')
            load()
            Swal.fire("Creado", "Perfil de datos creado correctamente", "success")
        } else {
            Swal.fire("Error", result.error, "error")
        }
    }

    const handleSwitchPerfil = async (id, nombre) => {
        const confirm = await Swal.fire({
            title: `¿Cambiar a ${nombre}?`,
            text: "La aplicación se reiniciará automáticamente para cargar la nueva base de datos de forma segura.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, reiniciar y cambiar',
            cancelButtonText: 'Cancelar'
        })

        if (confirm.isConfirmed) {
            await window.api.switchPerfil(id)
        }
    }

    const handleDeletePerfil = async (id, nombre) => {
        const warnRes = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: `Estás a punto de eliminar toda la tienda "${nombre}". ¡Se perderán todos sus datos!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, estoy seguro',
            cancelButtonText: 'Cancelar'
        })

        if (!warnRes.isConfirmed) return

        const confirmRes = await Swal.fire({
            title: 'Confirmación de Seguridad',
            text: `Escribe el nombre exacto del perfil para eliminarlo: "${nombre}"`,
            input: 'text',
            inputPlaceholder: nombre,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            preConfirm: (inputValue) => {
                if (inputValue !== nombre) Swal.showValidationMessage('El nombre escrito no coincide.')
            }
        })

        if (confirmRes.isConfirmed) {
            const res = await window.api.deletePerfil(id)
            if (res.success) {
                Swal.fire('Eliminado', `El perfil "${nombre}" ha sido destruido.`, 'success')
                load()
            } else {
                Swal.fire('Error', res.error, 'error')
            }
        }
    }

    const handleShowStats = async (filename, nombre) => {
        setLoadingStats(true)
        setStatsData({ nombre, filename, size: 'Calculando...', tables: [] })
        setShowStatsModal(true)

        const result = await window.api.getPerfilStats(filename)
        if (result.success) {
            setStatsData({ nombre, filename, size: result.size, tables: result.tables })
        } else {
            setShowStatsModal(false)
            Swal.fire('Error', result.error, 'error')
        }
        setLoadingStats(false)
    }

    const handleViewTableData = async (tableName) => {
        setPreviewTableName(tableName)
        setIsLoadingPreview(true)
        setShowPreview(true)

        const result = await window.api.getPerfilTableData({ 
            filename: statsData.filename, 
            tableName: tableName 
        })

        if (result.success) {
            setPreviewCols(result.columns)
            setPreviewData(result.data)
        } else {
            setShowPreview(false)
            Swal.fire('Error', result.error, 'error')
        }
        setIsLoadingPreview(false)
    }

    useEffect(() => { 
        load() 
        const handleReactSwitch = (e) => handleSwitchPerfil(e.detail.id, e.detail.nombre)
        const handleReactDelete = (e) => handleDeletePerfil(e.detail.id, e.detail.nombre)
        const handleReactStats = (e) => handleShowStats(e.detail.filename, e.detail.nombre)
        
        window.addEventListener('react-switch-perfil', handleReactSwitch)
        window.addEventListener('react-delete-perfil', handleReactDelete)
        window.addEventListener('react-stats-perfil', handleReactStats)
        
        return () => {
            window.removeEventListener('react-switch-perfil', handleReactSwitch)
            window.removeEventListener('react-delete-perfil', handleReactDelete)
            window.removeEventListener('react-stats-perfil', handleReactStats)
        }
    }, [])

    return <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="card-title p-0 m-0">Perfiles de Bases de Datos</h5>
                    <p className="text-muted small m-0">Cada perfil funciona como una tienda independiente con sus propios productos y facturas.</p>
                </div>
                <Button variant="danger" onClick={() => setShowPerfilModal(true)}>
                    <i className="bi bi-plus-circle me-1"></i> Nuevo Perfil de Datos
                </Button>
            </div>

            <DataTableComponent 
                data={perfiles}
                columns={[
                    { data: 'nombre', title: 'Nombre del Perfil' },
                    { data: 'filename', title: 'Archivo BD', render: (data) => `<code>${data}</code>` },
                    { data: 'date_created', title: 'Fecha Creación', render: (data) => new Date(data).toLocaleDateString('es-CO') },
                    { 
                        data: 'is_active', 
                        title: 'Estado',
                        render: (data) => data === 1 
                            ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i> ACTIVO (En uso)</span>' 
                            : '<span class="badge bg-secondary">Inactivo</span>'
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        render: function (data, type, row) {
                            const isMain = row.filename === 'main.db';
                            const isActive = row.is_active === 1;

                            let switchBtn = isActive 
                                ? `<button class="btn btn-sm btn-light me-2" disabled>En uso</button>`
                                : `<button class="btn btn-sm btn-primary text-white me-2" onclick="document.dispatchEvent(new CustomEvent('switch-perfil-action', {detail: {id: '${row.id}', nombre: '${row.nombre}'}}))" title="Cargar Perfil">
                                        <i class="bi bi-box-arrow-in-right"></i>
                                   </button>`
                            
                            let infoBtn = `<button class="btn btn-sm btn-info text-white me-2" onclick="document.dispatchEvent(new CustomEvent('stats-perfil-action', {detail: {filename: '${row.filename}', nombre: '${row.nombre}'}}))" title="Información de la Base de Datos">
                                        <i class="bi bi-info-circle"></i>
                                   </button>`
                            
                            let deleteBtn = (isMain || isActive)
                                ? `<button class="btn btn-sm btn-secondary" disabled title="No se puede eliminar"><i class="bi bi-trash3"></i></button>`
                                : `<button class="btn btn-sm btn-danger" onclick="document.dispatchEvent(new CustomEvent('delete-perfil-action', {detail: {id: '${row.id}', nombre: '${row.nombre}'}}))" title="Eliminar Base de Datos">
                                        <i class="bi bi-trash3"></i>
                                   </button>`

                            return switchBtn + infoBtn + deleteBtn
                        }
                    }
                ]}
            />

            {/* Modal Nuevo Perfil */}
            <Modal show={showPerfilModal} onHide={() => setShowPerfilModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Crear Nuevo Entorno de Datos</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleCreatePerfil} id="perfilForm">
                        <Form.Group>
                            <Form.Label>Nombre de la nueva tienda <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="text" value={nuevoPerfilNombre} onChange={(e) => setNuevoPerfilNombre(e.target.value)} required autoFocus />
                            <Form.Text className="text-muted">Se generará automáticamente un archivo <code>.db</code> aislado para este perfil.</Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPerfilModal(false)}>Cancelar</Button>
                    <Button variant="danger" type="submit" form="perfilForm">Crear Perfil</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Estadísticas */}
            <Modal size="lg" show={showStatsModal} onHide={() => setShowStatsModal(false)} centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5"><i className="bi bi-server me-2 text-primary"></i>Información de Datos</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center mb-4">
                        <h5 className="mb-0 fw-bold">{statsData.nombre}</h5>
                        <code className="text-muted">{statsData.filename}</code>
                    </div>
                    <Row className="mb-3">
                        <Col>
                            <div className="border rounded p-3 text-center bg-white shadow-sm">
                                <h6 className="text-muted mb-1">Peso en Disco</h6>
                                <h3 className="text-primary mb-0">{statsData.size}</h3>
                            </div>
                        </Col>
                    </Row>
                    <h6 className="fw-bold border-bottom pb-2 mt-4 mb-3">Desglose de Tablas</h6>
                    {loadingStats ? (
                        <div className="text-center py-3"><div className="spinner-border text-primary" role="status"></div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover table-sm border align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Nombre de la Tabla</th>
                                        <th className="text-center" style={{width: '120px'}}>Registros</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsData.tables.map((t, index) => (
                                        <tr key={index}>
                                            <td className="text-capitalize"><i className="bi bi-table me-2 text-muted"></i> {t.name}</td>
                                            <td className="text-center d-flex justify-content-end align-items-center gap-2">
                                                <span className="badge bg-secondary rounded-pill">{t.rows}</span>
                                                <Button 
                                                    variant="outline-info" 
                                                    size="sm" 
                                                    className="py-0 px-2" 
                                                    title="Ver Contenido"
                                                    onClick={() => handleViewTableData(t.name)}
                                                    disabled={t.rows === 0}
                                                >
                                                    <i className="bi bi-eye-fill"></i>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatsModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            <ModalPreviewTabla 
                show={showPreview} 
                onHide={() => setShowPreview(false)} 
                tableName={previewTableName} 
                isLoading={isLoadingPreview} 
                columns={previewCols} 
                data={previewData} 
                totalRows={previewData.length}
            />
        </>
}

// Registro global de eventos
if (!window.perfilListenersRegistered) {
    document.addEventListener('switch-perfil-action', (e) => window.dispatchEvent(new CustomEvent('react-switch-perfil', { detail: e.detail })))
    document.addEventListener('delete-perfil-action', (e) => window.dispatchEvent(new CustomEvent('react-delete-perfil', { detail: e.detail })))
    document.addEventListener('stats-perfil-action', (e) => window.dispatchEvent(new CustomEvent('react-stats-perfil', { detail: e.detail })))
    window.perfilListenersRegistered = true
}