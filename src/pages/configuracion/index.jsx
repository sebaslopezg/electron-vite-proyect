import { General } from './General';
import { Datos } from './Datos';
import { Importar } from './Importar';
import { Exportar } from './Exportar';
import { Actualizaciones } from './Actualizaciones'

export const ConfiguracionIndex = () => {
    return (
        <>
            <div className="pagetitle">
                <h1><i className="bi bi-gear me-2"></i>Configuración del Sistema</h1>
            </div>

            <div className="card">
                <div className="card-body">
                    <ul className="nav nav-tabs nav-tabs-bordered mt-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#general" type="button" role="tab">General</button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#actualizaciones" type="button" role="tab">
                                <i className="bi bi-arrow-repeat me-1"></i> Actualizaciones
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#datos" type="button" role="tab">
                                <i className="bi bi-database-fill-gear me-1"></i> Manejo de Datos
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#importar" type="button" role="tab">
                                <i className="bi bi-cloud-upload me-1"></i> Importar Datos
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#exportar" type="button" role="tab">
                                <i className="bi bi-cloud-download me-1"></i> Exportar Datos
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content pt-4">
                        <div className="tab-pane fade show active" id="general" role="tabpanel">
                            <General />
                        </div>
                        <div className="tab-pane fade" id="datos" role="tabpanel">
                            <Datos />
                        </div>
                        <div className="tab-pane fade" id="importar" role="tabpanel">
                            <Importar />
                        </div>
                        <div className="tab-pane fade" id="exportar" role="tabpanel">
                            <Exportar />
                        </div>
                        <div className="tab-pane fade" id="actualizaciones" role="tabpanel">
                            <Actualizaciones />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}