import { useState, useEffect } from 'react'
import { Facturacion } from './Facturacion.jsx'
import { Configuracion } from './Configuracion.jsx'
import { VerFacturas } from './VerFacturas.jsx'
import { Notas } from './Notas.jsx'
import { Reportes } from './Reportes.jsx'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true
})

export const Ventas = () => {
    const [almacenData, setAlmacenData] = useState([])

    const loadAlmacenConf = async () => {
        const data = await window.api.getAllConfAlmacen()
        if (data) {
            setAlmacenData(data[0])
        } else {
            Toast.fire({ icon: 'error', title: 'Error al intentar cargar la configuración del almacén' })
        }
    }

    useEffect(() => {
        loadAlmacenConf()
    }, [])

    if (!almacenData) {
        return <div>Cargando configuración...</div>
    }

    return <>
        <div className="pagetitle">
            <h1><i className="bi bi-receipt-cutoff me-2"></i>Ventas</h1>
        </div>

        <section className="section">
            <div className="card">
                <div className="card-body pt-3">

                    <ul className="nav nav-tabs nav-tabs-bordered" id="borderedTab" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button 
                                className="nav-link active" 
                                id="facturacion-tab" 
                                data-bs-toggle="tab" 
                                data-bs-target="#facturacion" 
                                type="button" 
                                role="tab" 
                                aria-selected="false" 
                                tabIndex="-1"
                            >Facturacion
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className="nav-link" 
                                id="verFacturas-tab" 
                                data-bs-toggle="tab" 
                                data-bs-target="#verFacturas" 
                                type="button" 
                                role="tab" 
                                aria-selected="false" 
                                tabIndex="-1"
                            >Ver facturas
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className="nav-link" 
                                id="reportes-tab" 
                                data-bs-toggle="tab" 
                                data-bs-target="#reportes" 
                                type="button" 
                                role="tab"
                            >Reportes
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className="nav-link" 
                                id="notas-tab" 
                                data-bs-toggle="tab" 
                                data-bs-target="#notas" 
                                type="button" 
                                role="tab" 
                                aria-selected="false" 
                                tabIndex="-1"
                            >Nota crédito/Nota débito
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className="nav-link" 
                                id="configurar-tab" 
                                data-bs-toggle="tab" 
                                data-bs-target="#config" 
                                type="button" 
                                role="tab" 
                                aria-selected="false" 
                                tabIndex="-1"
                            >Configurar
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content pt-2" id="borderedTabContent">
                        <div 
                            className="tab-pane fade show active" 
                            id="facturacion" 
                            role="tabpanel" 
                            aria-labelledby="facturacion-tab"
                        >
                            <Facturacion />
                        </div>
                        <div 
                            className="tab-pane fade" 
                            id="verFacturas" 
                            role="tabpanel" 
                            aria-labelledby="verFacturas-tab"
                        >
                            <VerFacturas />
                        </div>
                        <div 
                            className="tab-pane fade" 
                            id="reportes" 
                            role="tabpanel" 
                            aria-labelledby="reportes-tab"
                        >
                            <Reportes />
                        </div>
                        <div 
                            className="tab-pane fade" 
                            id="notas" 
                            role="tabpanel" 
                            aria-labelledby="notas-tab"
                        >
                            <Notas />
                        </div>
                        <div 
                            className="tab-pane fade" 
                            id="config" 
                            role="tabpanel" 
                            aria-labelledby="configurar-tab"
                        >
                            <Configuracion data={almacenData} onReload={loadAlmacenConf} />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </>
}