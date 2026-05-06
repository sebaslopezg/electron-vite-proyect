import { Puc } from './Puc';
// En el futuro importaremos aquí: import { Terceros } from './Terceros'; etc.

export const ContabilidadIndex = () => {
    return (
        <>
            <div className="pagetitle">
                <h1><i className="bi bi-calculator me-2"></i>Módulo de Contabilidad (NIIF)</h1>
                <nav>
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><a href="/">Inicio</a></li>
                        <li className="breadcrumb-item active">Contabilidad</li>
                    </ol>
                </nav>
            </div>

            <div className="card">
                <div className="card-body">
                    {/* Navegación de Pestañas */}
                    <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#puc" type="button" role="tab">
                                <i className="bi bi-diagram-3 me-1"></i> Plan Único de Cuentas (PUC)
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#terceros" type="button" role="tab">
                                <i className="bi bi-people me-1"></i> Terceros
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#comprobantes" type="button" role="tab">
                                <i className="bi bi-receipt me-1"></i> Comprobantes
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#reportes" type="button" role="tab">
                                <i className="bi bi-graph-up me-1"></i> Reportes Financieros
                            </button>
                        </li>
                    </ul>

                    {/* Contenido de las Pestañas */}
                    <div className="tab-content pt-4">
                        
                        {/* PESTAÑA 1: EL PUC */}
                        <div className="tab-pane fade show active" id="puc" role="tabpanel">
                            <Puc />
                        </div>
                        
                        {/* PESTAÑA 2: TERCEROS (En construcción) */}
                        <div className="tab-pane fade" id="terceros" role="tabpanel">
                            <div className="text-center text-muted p-5">
                                <i className="bi bi-tools fs-1 mb-3"></i>
                                <h4>Directorio de Terceros</h4>
                                <p>Próximamente: Gestión de clientes, proveedores y empleados (NIT/Cédula).</p>
                            </div>
                        </div>

                        {/* PESTAÑA 3: COMPROBANTES (En construcción) */}
                        <div className="tab-pane fade" id="comprobantes" role="tabpanel">
                            <div className="text-center text-muted p-5">
                                <i className="bi bi-tools fs-1 mb-3"></i>
                                <h4>Asientos y Comprobantes</h4>
                                <p>Próximamente: Registro de transacciones y partida doble.</p>
                            </div>
                        </div>

                        {/* PESTAÑA 4: REPORTES (En construcción) */}
                        <div className="tab-pane fade" id="reportes" role="tabpanel">
                            <div className="text-center text-muted p-5">
                                <i className="bi bi-tools fs-1 mb-3"></i>
                                <h4>Reportes NIIF</h4>
                                <p>Próximamente: Estado de Resultados, Balance General y Balance de Prueba.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};