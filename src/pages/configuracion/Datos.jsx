import { useState, useEffect, useRef, useMemo } from 'react'
import { Button, Form, Row, Col, Modal } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../../components/DataTableComponent'
import { ModalPreviewTabla } from './components/ModalPreviewTabla'

export const Datos = ({ currentUser }) => {
    const [perfiles, setPerfiles] = useState([])
    const [showPerfilModal, setShowPerfilModal] = useState(false)
    const [nuevoPerfilNombre, setNuevoPerfilNombre] = useState('')
    const [showStatsModal, setShowStatsModal] = useState(false)
    const [statsData, setStatsData] = useState({ nombre: '', filename: '', size: '0 KB', tables: [] })
    const [loadingStats, setLoadingStats] = useState(false)

    const [showPreview, setShowPreview] = useState(false)
    const [previewCols, setPreviewCols] = useState([])
    const [previewData, setPreviewData] = useState([])
    const [previewTableName, setPreviewTableName] = useState('')
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    const tableContainerRef = useRef(null) // Referencia para el contenedor de la tabla

    const hasPermission = (permissionKey) => {
        if (!currentUser) return false
        if (currentUser.permisos?.includes('ALL')) return true
        return currentUser.permisos?.includes(permissionKey)
    }

    const load = async () => {
        const perfilesData = await window.api.getPerfiles()
        setPerfiles(perfilesData || [])
    }

    useEffect(() => { load() }, [])

    const handleCreatePerfil = async (e) => {
        e.preventDefault();
        const result = await window.api.addPerfil({ nombre: nuevoPerfilNombre })
        if (result.success) {
            setShowPerfilModal(false)
            setNuevoPerfilNombre('')
            load()
            Swal.fire("Creado", "Perfil de datos creado correctamente", "success")
        } else Swal.fire("Error", result.error, "error")
    }

    const handleSwitchPerfil = async (id, nombre) => {
        const confirm = await Swal.fire({
            title: `¿Cambiar a ${nombre}?`,
            text: "La aplicación se reiniciará automáticamente para cargar la nueva base de datos de forma segura.",
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, reiniciar y cambiar', cancelButtonText: 'Cancelar'
        })
        if (confirm.isConfirmed) await window.api.switchPerfil(id)
    }

    const handleDeletePerfil = async (id, nombre) => {
        const warnRes = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: `Estás a punto de eliminar toda la tienda "${nombre}". ¡Se perderán todos sus datos!`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sí, estoy seguro', cancelButtonText: 'Cancelar'
        })

        if (!warnRes.isConfirmed) return

        const confirmRes = await Swal.fire({
            title: 'Confirmación de Seguridad',
            text: `Escribe el nombre exacto del perfil para eliminarlo: "${nombre}"`,
            input: 'text', inputPlaceholder: nombre, icon: 'error', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#d33',
            preConfirm: (inputValue) => {
                if (inputValue !== nombre) Swal.showValidationMessage('El nombre escrito no coincide.')
            }
        })

        if (confirmRes.isConfirmed) {
            const res = await window.api.deletePerfil(id)
            if (res.success) {
                Swal.fire('Eliminado', `El perfil "${nombre}" ha sido destruido.`, 'success')
                load()
            } else Swal.fire('Error', res.error, 'error')
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

        const result = await window.api.getPerfilTableData({ filename: statsData.filename, tableName: tableName })
        if (result.success) {
            setPreviewCols(result.columns)
            setPreviewData(result.data)
        } else {
            setShowPreview(false)
            Swal.fire('Error', result.error, 'error')
        }
        setIsLoadingPreview(false)
    }

    const handleClearTable = async (tableName, filename) => {
        const warnRes = await Swal.fire({
            title: '¿Vaciar tabla?',
            text: `Estás a punto de eliminar TODOS los registros de la tabla "${tableName}". ¡Este proceso NO se puede deshacer!`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar'
        });

        if (!warnRes.isConfirmed) return;

        const confirmRes = await Swal.fire({
            title: 'Confirmación de Seguridad',
            text: `Escribe el nombre exacto de la tabla para vaciarla: "${tableName}"`,
            input: 'text', inputPlaceholder: tableName, icon: 'error', showCancelButton: true, confirmButtonText: 'Vaciar Contenido', cancelButtonText: 'Cancelar', confirmButtonColor: '#d33',
            preConfirm: (inputValue) => {
                if (inputValue !== tableName) {
                    Swal.showValidationMessage('El nombre de la tabla no coincide.');
                }
            }
        });

        if (confirmRes.isConfirmed) {
            const res = await window.api.clearPerfilTableData({ filename, tableName });
            if (res.success) {
                Swal.fire('Vaciada', `La tabla "${tableName}" ha sido limpiada exitosamente.`, 'success');
                handleShowStats(filename, statsData.nombre);
            } else Swal.fire('Error', res.error, 'error');
        }
    };

    // CORREGIDO: Escuchador nativo por delegación de eventos en el contenedor
    useEffect(() => {
        const container = tableContainerRef.current
        if (!container) return

        const handleTableClick = (e) => {
            const btn = e.target.closest('button[data-alldata]')
            if (!btn || !container.contains(btn)) return
            
            try {
                const item = JSON.parse(decodeURIComponent(btn.dataset.alldata))
                if (btn.classList.contains('btn-switch-profile')) {
                    handleSwitchPerfil(item.id, item.nombre)
                } else if (btn.classList.contains('btn-info-profile')) {
                    handleShowStats(item.filename, item.nombre)
                } else if (btn.classList.contains('btn-delete-profile')) {
                    handleDeletePerfil(item.id, item.nombre)
                }
            } catch(err) { 
                console.error("Error procesando acción de perfil", err) 
            }
        }

        container.addEventListener('click', handleTableClick)
        return () => container.removeEventListener('click', handleTableClick)
    }, [perfiles, currentUser])

    // Memorizamos las columnas para inyectar las clases de captura en lugar de onclicks globales
    const columnasTabla = useMemo(() => [
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

                const canSwitch = hasPermission('datos_perfiles_cambiar');
                const canViewInfo = hasPermission('datos_info_ver');
                const canDelete = hasPermission('datos_perfiles_eliminar');
                
                const safeData = encodeURIComponent(JSON.stringify(row));

                let switchBtn = isActive 
                    ? `<button class="btn btn-sm btn-light me-2" disabled>En uso</button>`
                    : (canSwitch ? `<button class="btn btn-sm btn-primary text-white me-2 btn-switch-profile" data-alldata="${safeData}" title="Cargar Perfil"><i class="bi bi-box-arrow-in-right"></i></button>` : '');
                
                let infoBtn = canViewInfo ? `<button class="btn btn-sm btn-info text-white me-2 btn-info-profile" data-alldata="${safeData}" title="Información de la Base de Datos"><i class="bi bi-info-circle"></i></button>` : '';
                
                let deleteBtn = '';
                if (canDelete) {
                    deleteBtn = (isMain || isActive)
                    ? `<button class="btn btn-sm btn-secondary" disabled title="No se puede eliminar"><i class="bi bi-trash3"></i></button>`
                    : `<button class="btn btn-sm btn-danger btn-delete-profile" data-alldata="${safeData}" title="Eliminar Base de Datos"><i class="bi bi-trash3"></i></button>`;
                }

                return switchBtn + infoBtn + deleteBtn
            }
        }
    ], [currentUser?.permisos, perfiles])

    return <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="card-title p-0 m-0">Perfiles de Bases de Datos</h5>
                    <p className="text-muted small m-0">Cada perfil funciona como una tienda independiente con sus propios productos y facturas.</p>
                </div>
                {hasPermission('datos_perfiles_crear') && (
                    <Button variant="danger" onClick={() => setShowPerfilModal(true)}>
                        <i className="bi bi-plus-circle me-1"></i> Nuevo Perfil de Datos
                    </Button>
                )}
            </div>

            {/* CORREGIDO: Se añadió la referencia del contenedor perimetral */}
            <div ref={tableContainerRef} className="w-100 overflow-hidden">
                <DataTableComponent 
                    key={currentUser?.permisos?.length}
                    data={perfiles}
                    columns={columnasTabla} 
                />
            </div>

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

            <Modal size="lg" show={showStatsModal} onHide={() => setShowStatsModal(false)} centered scrollable enforceFocus={false}>               
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
                                        <th className="text-center" style={{width: '180px'}}>Registros / Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsData.tables.map((t, index) => (
                                        <tr key={index}>
                                            <td className="text-capitalize"><i className="bi bi-table me-2 text-muted"></i> {t.name}</td>
                                            <td className="text-center d-flex justify-content-end align-items-center gap-2">
                                                <span className="badge bg-secondary rounded-pill me-1">{t.rows}</span>
                                                
                                                {hasPermission('datos_tablas_ver') && (
                                                    <Button 
                                                        variant="outline-info" size="sm" className="py-0 px-2" title="Ver Contenido"
                                                        onClick={() => handleViewTableData(t.name)} disabled={t.rows === 0}
                                                    >
                                                        <i className="bi bi-eye-fill"></i>
                                                    </Button>
                                                )}

                                                {hasPermission('datos_tablas_vaciar') && (
                                                    <Button 
                                                        variant="outline-danger" size="sm" className="py-0 px-2" title="Vaciar Toda la Tabla"
                                                        onClick={() => handleClearTable(t.name, statsData.filename)} disabled={t.rows === 0}
                                                    >
                                                        <i className="bi bi-eraser-fill"></i>
                                                    </Button>
                                                )}
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
                show={showPreview} onHide={() => setShowPreview(false)} tableName={previewTableName} 
                isLoading={isLoadingPreview} columns={previewCols} data={previewData} totalRows={previewData.length}
            />
    </>
}