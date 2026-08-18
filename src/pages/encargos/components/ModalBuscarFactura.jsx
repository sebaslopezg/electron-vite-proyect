import { useEffect, useRef } from "react"
import { Modal } from "react-bootstrap"
import DataTableComponent from "../../../components/DataTableComponent"
import { ventasService } from "../../../services/ventasService"

export const ModalBuscarFactura = ({ show, handleClose, handleSearchFactura }) => {
    const modalFacturasRef = useRef(null)

    useEffect(() => {
        const container = modalFacturasRef.current
        if (!container) return

        const handleModalClick = (e) => {
            const btn = e.target.closest('.btn-seleccionar-factura')
            if (btn) {
                const fullnum = btn.dataset.fullnum
                handleSearchFactura(fullnum)
            }
        }

        container.addEventListener('click', handleModalClick)
        return () => container.removeEventListener('click', handleModalClick)
    }, [handleSearchFactura, show])

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-5">Buscar Factura</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div ref={modalFacturasRef} className="p-3">
                    <DataTableComponent
                        tableId="dt-buscar-factura-encargo"
                        ajaxData={(params) => ventasService.getFacturasPaginadas(params)}
                        columns={[
                            { 
                                data: 'date_created', title: 'Fecha',
                                render: data => new Date(data).toLocaleDateString()
                            },
                            { 
                                data: null, title: 'N° Factura',
                                render: (data, type, row) => `<strong>${row.prefijo || ''}${row.separador || ''}${row.numero_factura}</strong>`
                            },
                            { data: 'nombre_cliente', title: 'Cliente' },
                            { 
                                data: null, title: 'Acción', orderable: false, className: 'text-center',
                                render: function (data, type, row) {
                                    return `<button class="btn btn-sm btn-primary btn-seleccionar-factura" data-fullnum="${row.prefijo || ''}${row.separador || ''}${row.numero_factura}">Seleccionar</button>`
                                }
                            }
                        ]}
                    />
                </div>
            </Modal.Body>
        </Modal>
    )
}