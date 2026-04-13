import { General } from './General';
import { Datos } from './Datos';

export const ConfiguracionIndex = () => {
    return (
        <>
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

                    {/* CONTENIDO DE LAS PESTAÑAS */}
                    <div className="tab-content pt-4">
                        <div className="tab-pane fade show active" id="general" role="tabpanel">
                            <General />
                        </div>
                        <div className="tab-pane fade" id="datos" role="tabpanel">
                            <Datos />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}