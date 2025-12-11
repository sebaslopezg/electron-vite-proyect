import { useState } from 'react'
import { useEffect } from 'react'

import { Facturacion } from './Facturacion.jsx'
import { Configuracion } from './Configuracion.jsx'
import { VerFacturas } from './VerFacturas.jsx'



export const Ventas = () => {

  const [almacenData, setAlmacenData] = useState([])

  const loadAlmacenConf = async () => {
    const data = await window.api.getAllConfAlmacen()
    if (data) {
        setAlmacenData(data[0])
    }else{
        await Swal.fire({
            title: "Error",
            text: `Error al intentar cargar la configuracion del almacen`, 
            icon: "error"
        })
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
            <h1>Ventas</h1>
        </div>

        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">

            <ul className="nav nav-tabs nav-tabs-bordered" id="borderedTab" role="tablist">
                <li className="nav-item" role="presentation">
                    <button 
                        className="nav-link active" 
                        id="facturacion-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#facturacion" 
                        type="button" 
                        role="tab" 
                        aria-controls="home" 
                        aria-selected="false" 
                        tabindex="-1"
                    >
                        Facturacion
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
                        aria-controls="home" 
                        aria-selected="false" 
                        tabindex="-1"
                    >
                        Ver facturas
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
                        aria-controls="contact" 
                        aria-selected="false" 
                        tabindex="-1"
                    >
                        Configurar
                    </button>
                </li>
            </ul>

            <div className="tab-content pt-2" id="borderedTabContent">
                <div className="tab-pane fade show active" id="facturacion" role="tabpanel" aria-labelledby="facturacion-tab">
                    <Facturacion />
                </div>
                <div className="tab-pane fade" id="verFacturas" role="tabpanel" aria-labelledby="verFacturas-tab">
                    <VerFacturas />
                </div>
                <div className="tab-pane fade" id="config" role="tabpanel" aria-labelledby="configurar-tab">
                    <Configuracion data={almacenData} onReload={loadAlmacenConf} />
                </div>
            </div>

            </div>
        </div>
    </>
}