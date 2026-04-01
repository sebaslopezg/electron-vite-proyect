import { useEffect, useState } from "react"
import DataTableComponent from "../../components/DataTableComponent"
import { useFacturas } from "../../hooks/useFacturas"
import Modal from 'react-bootstrap/Modal'
import { Button } from 'react-bootstrap'

export const VerFacturas = () => {
    const { facturas, loading, reload } = useFacturas();
    const [show, setShow] = useState(false)
    const [detalleData, setDetalleData] = useState([])

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    useEffect(() => {
        const handleClicks = (e) => {
            const id = e.target.getAttribute('data-id') || e.target.closest('button')?.getAttribute('data-id');

            if (!id) return;

            if (e.target.closest('.btn-see-item')) {
                verDetalle(id);
            }
        }
        document.addEventListener('click', handleClicks);
        return () => {
            document.removeEventListener('click', handleClicks)
        }
    }, [])

    const verDetalle = async (facturaId) => {
        const data = await window.api.getDetalle(facturaId)
        setDetalleData(data.data)
        handleShow()
    }

    return <>
        <button className="btn btn-outline-primary" onClick={reload}>
            Actualizar Listado
        </button>
        <DataTableComponent
            data={facturas}
            columns={[
                { data: 'date_created', title: 'Fecha' },
                { data: 'numero_factura', title: 'Numero factura' },
                { data: 'documento_cliente', title: 'Doc cliente' },
                { data: 'nombre_cliente', title: 'Nombre cliente' },
                {
                    data: null,
                    title: 'Actions',
                    orderable: false,
                    render: function (data, type, row) {
                        return `
            <button class="btn btn-sm btn-info btn-see-item" data-id="${row.id}">
          <i class="bi bi-eye"></i>
        </button>
            `;
                    }
                }
            ]}
            customRenders={{
                date_created: (data, type, row) => {
                    return new Date(data).toLocaleDateString('es-ES');
                }
            }}
        />

        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Detalles de la factura</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {<DataTableComponent
                    data={detalleData}
                    columns={[
                        { data: 'nombre_producto', title: 'Producto' },
                        { data: 'precio_producto', title: 'Precio producto' },
                        { data: 'cantidad_producto', title: 'Cantidad' },
                        { data: 'total', title: 'Total' },
                    ]}
                />}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}