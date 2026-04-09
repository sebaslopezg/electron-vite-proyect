import { useState, useEffect } from 'react'
import { Servicios } from './servicios';
import { Productos } from './Productos';
import ProductModal from '../../components/ProductoModal';


export const ProductosIndex = () => {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [items, setItems] = useState([])
    const [dataInTable, setDataInTable] = useState([])

    const emptyForm = {
        ref_name: '',
        sku: '',
        stock: 0,
        unidad_medida: '',
        iva: 0,
        allow_negative: '',
        descripcion: '',
        precio: 0,
        status: 1,
        tipo: '',
    }

    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)

    const load = async () => {
        const data = await window.api.getProductos()
        setItems(data)
        setDataInTable(data)
    };

    const cleanForm = () => {
        setForm({ ...emptyForm })
    }

    useEffect(() => { load() }, [])

    const handleSubmit = async (e) => {

        e.preventDefault()
        if (editingId) {
            await window.api.updateProducto({ ...form, id: editingId })
            setEditingId(null)
        } else {
            await window.api.addProducto(form)
        }
        cleanForm()
        handleClose()
        load()
    }

    return (
        <>
            <div className="card">
                <div className="card-title"></div>
                <div className="card-body">
                    <div className="row">
                        <div className="row">
                            <div className="col">
                                <button className='btn btn-primary' onClick={(e) => {
                                    setEditingId(null)
                                    cleanForm()
                                    handleShow()
                                }}>Nuevo</button>
                            </div>
                        </div>
                    </div>

                    <ul className="nav nav-tabs nav-tabs-bordered mt-3" id="borderedTab" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link active"
                                id="productos-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#productos"
                                type="button"
                                role="tab"
                                aria-controls="home"
                                aria-selected="false"
                                tabindex="-1"
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
                                aria-controls="home"
                                aria-selected="false"
                                tabindex="-1"
                            >
                                Servicios
                            </button>
                        </li>
                    </ul>

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
            <ProductModal
                show={show}
                handleClose={handleClose}
                handleSubmit={handleSubmit}
                form={form}
                setForm={setForm}
                editingId={editingId}
            />
        </>
    )
}