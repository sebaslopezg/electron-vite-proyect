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
        <button className="btn btn-outline-primary mb-3" onClick={reload}>
            <i className="bi bi-arrow-clockwise me-2"></i>Actualizar Listado
        </button>
        
        <DataTableComponent
            data={facturas}
            columns={[
                { data: 'date_created', title: 'Fecha' },
                { data: 'numero_factura', title: 'N° Factura' },
                { data: 'documento_cliente', title: 'Doc Cliente' },
                { data: 'nombre_cliente', title: 'Nombre Cliente' },
                // NUEVA COLUMNA DE ESTADO
                { data: 'notas_aplicadas', title: 'Estado' },
                {
                    data: null,
                    title: 'Acciones',
                    orderable: false,
                    render: function (data, type, row) {
                        return `
                            <button class="btn btn-sm btn-info text-white btn-see-item" data-id="${row.id}" title="Ver Detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                        `;
                    }
                }
            ]}
            customRenders={{
                date_created: (data) => {
                    return new Date(data).toLocaleDateString('es-ES');
                },
                // LÓGICA VISUAL PARA EL ESTADO
                notas_aplicadas: (data) => {
                    // Si data es null o vacío, la factura está normal
                    if (!data) {
                        return '<span class="badge bg-success">Normal</span>';
                    }
                    
                    // Si tiene notas, generamos las píldoras correspondientes
                    let badges = '';
                    if (data.includes('Crédito')) {
                        badges += '<span class="badge bg-warning text-dark me-1">Nota Crédito</span>';
                    }
                    if (data.includes('Débito')) {
                        badges += '<span class="badge bg-secondary me-1">Nota Débito</span>';
                    }
                    return badges;
                }
            }}
        />

        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Detalles de la Factura</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <DataTableComponent
                    data={detalleData}
                    columns={[
                        { data: 'nombre_producto', title: 'Producto' },
                        { data: 'precio_producto', title: 'V. Unitario' },
                        { data: 'cantidad_producto', title: 'Cantidad' },
                        { data: 'total', title: 'Total' },
                    ]}
                    customRenders={{
                        precio_producto: (data) => `$${parseFloat(data).toLocaleString('es-CO')}`,
                        total: (data) => `<strong>$${parseFloat(data).toLocaleString('es-CO')}</strong>`
                    }}
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    </>
}