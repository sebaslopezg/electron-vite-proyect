import { Servicios } from './Servicios'
import { Productos } from './Productos'
import { Categorias } from './Categorias' 
import { Subcategorias } from './Subcategorias'
import { Etiquetas } from './Etiquetas'

export const ProductosIndex = () => {
    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-box-seam me-2"></i>Productos</h1>
        </div>
        <div className="card">
            <div className="card-body">
                <ul className="nav nav-tabs nav-tabs-bordered mt-3" id="borderedTab" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button className="nav-link active" id="productos-tab" data-bs-toggle="tab" data-bs-target="#productos" type="button" role="tab">Productos</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="servicios-tab" data-bs-toggle="tab" data-bs-target="#servicios" type="button" role="tab">Servicios</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="categorias-tab" data-bs-toggle="tab" data-bs-target="#categorias" type="button" role="tab">Categorías</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="subcategorias-tab" data-bs-toggle="tab" data-bs-target="#subcategorias" type="button" role="tab">Subcategorías</button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button className="nav-link" id="etiquetas-tab" data-bs-toggle="tab" data-bs-target="#etiquetas" type="button" role="tab">Etiquetas</button>
                    </li>
                </ul>

                <div className="tab-content pt-2" id="borderedTabContent">
                    <div className="tab-pane fade show active" id="productos" role="tabpanel"><Productos /></div>
                    <div className="tab-pane fade" id="servicios" role="tabpanel"><Servicios /></div>
                    <div className="tab-pane fade" id="categorias" role="tabpanel"><Categorias /></div>
                    <div className="tab-pane fade" id="subcategorias" role="tabpanel"><Subcategorias /></div>
                    <div className="tab-pane fade" id="etiquetas" role="tabpanel"><Etiquetas /></div>
                </div>
            </div>
        </div>
    </>
}