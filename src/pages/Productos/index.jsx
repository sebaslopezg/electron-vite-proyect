import { Servicios } from './Servicios';
import { Productos } from './Productos';

export const ProductosIndex = () => {
    return (
        <div className="card">
            <div className="card-body">
                {/* PESTAÑAS */}
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" id="borderedTab" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button
                            className="nav-link active"
                            id="productos-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#productos"
                            type="button"
                            role="tab"
                            tabIndex="-1"
                        >
                            Productos
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className="nav-link"
                            id="servicios-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#servicios"
                            type="button"
                            role="tab"
                            tabIndex="-1"
                        >
                            Servicios
                        </button>
                    </li>
                </ul>

                {/* CONTENIDO DE LAS PESTAÑAS */}
                <div className="tab-content pt-2" id="borderedTabContent">
                    <div className="tab-pane fade show active" id="productos" role="tabpanel" aria-labelledby="productos-tab">
                        <Productos />
                    </div>
                    <div className="tab-pane fade" id="servicios" role="tabpanel" aria-labelledby="servicios-tab">
                        <Servicios />
                    </div>
                </div>
            </div>
        </div>
    )
}