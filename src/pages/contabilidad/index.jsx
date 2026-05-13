import { Puc } from './Puc'
import { Terceros } from './Terceros'
import { Comprobantes } from './Comprobantes'
import { Reportes } from './Reportes'
import { ConfiguracionContable } from './ConfiguracionContable'

export const ContabilidadIndex = () => {
    return (
        <>
            <div className="pagetitle">
                <h1><i className="bi bi-calculator me-2"></i>Módulo de Contabilidad (NIIF)</h1>
            </div>

            <div className="card">
                <div className="card-body">
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
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" data-bs-toggle="tab" data-bs-target="#configContable" type="button" role="tab">
                                <i className="bi bi-gear me-1"></i> Configuración
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content pt-4">
                        
                        <div className="tab-pane fade show active" id="puc" role="tabpanel">
                            <Puc />
                        </div>
                        
                        <div className="tab-pane fade" id="terceros" role="tabpanel">
                            <Terceros />
                        </div>

                        <div className="tab-pane fade" id="comprobantes" role="tabpanel">
                            <Comprobantes />
                        </div>

                        <div className="tab-pane fade" id="reportes" role="tabpanel">
                            <Reportes />
                        </div>
                        <div className="tab-pane fade" id="configContable" role="tabpanel">
                            <ConfiguracionContable />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};