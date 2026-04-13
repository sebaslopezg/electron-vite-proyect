import { useState, useEffect, useRef } from 'react';
import { Button, Form, Row, Col, Modal } from 'react-bootstrap'
import Swal from 'sweetalert2'
import DataTableComponent from '../components/DataTableComponent' // Asegúrate que la ruta sea correcta

export const Configuracion = () => {
    // ESTADOS: General
    const [form, setForm] = useState({ nombre: '', logo: '' });
    const fileInputRef = useRef(null);

    // ESTADOS: Perfiles de Datos
    const [perfiles, setPerfiles] = useState([]);
    const [showPerfilModal, setShowPerfilModal] = useState(false);
    const [nuevoPerfilNombre, setNuevoPerfilNombre] = useState('');

    useEffect(() => {
        const handleReactSwitch = (e) => handleSwitchPerfil(e.detail.id, e.detail.nombre);
        window.addEventListener('react-switch-perfil', handleReactSwitch);
        return () => window.removeEventListener('react-switch-perfil', handleReactSwitch);
    }, []);

    const load = async () => {
        // Cargar Config General
        const data = await window.api.getConfiguracion()
        const appConf = data.find(row => row.key === 'confApp')
        if (appConf) {
            try {
                const parsed = JSON.parse(appConf.value)
                setForm({ nombre: parsed.nombre || '', logo: parsed.logo || '' })
            } catch (error) { console.error(error) }
        }

        // Cargar Perfiles
        const perfilesData = await window.api.getPerfiles();
        setPerfiles(perfilesData || []);
    }

    // --- LÓGICA GENERAL ---
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, logo: reader.result });
            reader.readAsDataURL(file);
        }
    }

    const handleSaveGeneral = async (e) => {
        e.preventDefault(); 
        const payload = { key: 'confApp', value: JSON.stringify(form) };
        try {
            const result = await window.api.updateConfiguracion(payload); 
            if (result.success) {
                Swal.fire({ title: "Guardado", text: "Configuración guardada exitosamente", icon: "success", timer: 1500 });
                window.dispatchEvent(new CustomEvent('config-actualizada'));
                document.title = form.nombre;
                if (window.api.updateWindow) window.api.updateWindow(form);
            } else {
                Swal.fire("Error", result.error, "error");
            }
        } catch (error) { Swal.fire("Error", error.toString(), "error"); }
    }

    // --- LÓGICA DE PERFILES ---
    const handleCreatePerfil = async (e) => {
        e.preventDefault();
        const result = await window.api.addPerfil({ nombre: nuevoPerfilNombre });
        if (result.success) {
            setShowPerfilModal(false);
            setNuevoPerfilNombre('');
            load();
            Swal.fire("Creado", "Perfil de datos creado correctamente", "success");
        } else {
            Swal.fire("Error", result.error, "error");
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
        });

        if (confirm.isConfirmed) {
            await window.api.switchPerfil(id);
            // La app se cerrará sola desde el backend
        }
    }

    const handleDeletePerfil = async (id, nombre) => {
        // Alerta 1: Advertencia de peligro
        const warnRes = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: `Estás a punto de eliminar toda la tienda "${nombre}". ¡Se perderán todos sus productos, facturas y clientes de forma IRREVERSIBLE!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, estoy seguro',
            cancelButtonText: 'Cancelar'
        });

        if (!warnRes.isConfirmed) return;

        // Alerta 2: Validación por escritura
        const confirmRes = await Swal.fire({
            title: 'Confirmación de Seguridad',
            text: `Para evitar accidentes, escribe el nombre exacto del perfil para eliminarlo: "${nombre}"`,
            input: 'text',
            inputPlaceholder: nombre,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Eliminar definitivamente',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            preConfirm: (inputValue) => {
                if (inputValue !== nombre) {
                    Swal.showValidationMessage('El nombre escrito no coincide. Intenta de nuevo.');
                }
            }
        });

        if (confirmRes.isConfirmed) {
            const res = await window.api.deletePerfil(id);
            if (res.success) {
                Swal.fire('Eliminado', `El perfil de datos "${nombre}" ha sido destruido.`, 'success');
                load();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    }

    useEffect(() => { 
        load() 
        const handleReactSwitch = (e) => handleSwitchPerfil(e.detail.id, e.detail.nombre);
        const handleReactDelete = (e) => handleDeletePerfil(e.detail.id, e.detail.nombre);
        
        window.addEventListener('react-switch-perfil', handleReactSwitch);
        window.addEventListener('react-delete-perfil', handleReactDelete); // <--- NUEVO
        
        return () => {
            window.removeEventListener('react-switch-perfil', handleReactSwitch);
            window.removeEventListener('react-delete-perfil', handleReactDelete);
        }
    }, [])

    return <>
        <div className="pagetitle">
          <h1>Configuración del Sistema</h1>
        </div>

        <div className="card">
            <div className="card-body">
                {/* PESTAÑAS */}
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#general" type="button" role="tab">General</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link text-danger" data-bs-toggle="tab" data-bs-target="#datos" type="button" role="tab">
                            <i className="bi bi-database-fill-gear me-1"></i> Manejo de Datos
                        </button>
                    </li>
                </ul>

                <div className="tab-content pt-4">
                    {/* TAB: GENERAL */}
                    <div className="tab-pane fade show active" id="general" role="tabpanel">
                        <Form onSubmit={handleSaveGeneral}>
                            <Row>
                                <Col md={4} className="text-center mb-4">
                                    <div className="border rounded d-flex align-items-center justify-content-center bg-light mx-auto" 
                                        style={{ width: '150px', height: '150px', overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => fileInputRef.current.click()}>
                                        {form.logo ? (
                                            <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div className="text-muted text-center">
                                                <i className="bi bi-image fs-1 d-block"></i><small>Subir Logo</small>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" className="d-none" ref={fileInputRef} onChange={handleImageChange}/>
                                    <Button variant="outline-secondary" size="sm" className="mt-2" onClick={() => fileInputRef.current.click()}>Cambiar Logo</Button>
                                </Col>
                                
                                <Col md={8}>
                                    <h5 className="card-title p-0 mb-3">Datos del Entorno Actual</h5>
                                    <Form.Group className="mb-3">
                                        <Form.Label htmlFor="appName">Nombre del Sistema / Empresa</Form.Label>
                                        <Form.Control id="appName" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} type="text" required/>
                                        <Form.Text className="text-muted">Este nombre y logo se guardarán exclusivamente para el Perfil de Datos actual.</Form.Text>
                                    </Form.Group>
                                    <Button variant="primary" type="submit" size="lg" className="mt-3">Guardar Cambios</Button>
                                </Col>
                            </Row>
                        </Form>
                    </div>

                    {/* TAB: MANEJO DE DATOS */}
                    <div className="tab-pane fade" id="datos" role="tabpanel">
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
                                            : `<button class="btn btn-sm btn-primary text-white me-2" onclick="document.dispatchEvent(new CustomEvent('switch-perfil-action', {detail: {id: '${row.id}', nombre: '${row.nombre}'}}))">
                                                    <i class="bi bi-box-arrow-in-right me-1"></i> Cargar
                                               </button>`;
                                        
                                        let deleteBtn = (isMain || isActive)
                                            ? `<button class="btn btn-sm btn-secondary" disabled title="No se puede eliminar"><i class="bi bi-trash3"></i></button>`
                                            : `<button class="btn btn-sm btn-danger" onclick="document.dispatchEvent(new CustomEvent('delete-perfil-action', {detail: {id: '${row.id}', nombre: '${row.nombre}'}}))" title="Eliminar Base de Datos">
                                                    <i class="bi bi-trash3"></i>
                                               </button>`;

                                        return switchBtn + deleteBtn;
                                    }
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Modal Nuevo Perfil */}
        <Modal show={showPerfilModal} onHide={() => setShowPerfilModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title>Crear Nuevo Entorno de Datos</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleCreatePerfil} id="perfilForm">
                    <Form.Group>
                        <Form.Label>Nombre de la nueva tienda / entorno <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="Ej: Tienda Sucursal Norte" 
                            value={nuevoPerfilNombre}
                            onChange={(e) => setNuevoPerfilNombre(e.target.value)}
                            required
                            autoFocus
                        />
                        <Form.Text className="text-muted">Se generará automáticamente un archivo <code>.db</code> aislado para este perfil.</Form.Text>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowPerfilModal(false)}>Cancelar</Button>
                <Button variant="danger" type="submit" form="perfilForm">Crear Perfil</Button>
            </Modal.Footer>
        </Modal>
    </>
}

document.addEventListener('switch-perfil-action', (e) => {
    window.dispatchEvent(new CustomEvent('react-switch-perfil', { detail: e.detail }));
});

document.addEventListener('delete-perfil-action', (e) => {
    window.dispatchEvent(new CustomEvent('react-delete-perfil', { detail: e.detail }));
});