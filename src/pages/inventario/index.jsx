import { useState } from 'react'
import { useEffect } from 'react'
import DataTableComponent from '../../components/DataTableComponent'

export const Inventario = () => {

    const [dataInTable, setDataInTable] = useState([])

    const load = async () => {
        const data = await window.api.getInventario()
        //console.log(data)
        setDataInTable(data)
    }

    useEffect(() => { load() }, [])

    const handleDelete = () =>{}
    const handleClose = () =>{}
    const handleEdit = () => {}
    const handleShow = () => {}


    return <>
        <div className="pagetitle">
            <h1>Inventario</h1>
        </div>

        <div className="card">
            <div className="card-title"></div>
            <div className="card-body">

                <DataTableComponent 
                    data={dataInTable}
                    columns={[
                    { data: 'ref_name', title: 'Nombre' },
                    { data: 'sku', title: 'Referencia / Código' },
                    { data: 'stock', title: 'Stock' },
                    { data: 'precio', title: 'Precio' },
                    {
                    data: null,
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        return `
                        <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
                            Editar
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-${row.id}">
                        Eliminar
                        </button>
                        `
                        }
                    }
                    ]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShow={handleShow}
                    customRenders={{
                        date_created: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES');
                        },
                        // Only show date_modify if needed, else remove
                        date_modify: (data, type, row) => {
                            return new Date(data).toLocaleDateString('es-ES');
                        }
                    }}
                />

            </div>
        </div>
    </>
}