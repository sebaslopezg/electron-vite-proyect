import { useState, useEffect } from 'react'
import DataTableComponent from '../../components/DataTableComponent'
import Swal from 'sweetalert2'
import { NuevaNota } from './NuevaNota.jsx' // <--- Importa el nuevo componente

export const Notas = () => {
    const [notasData, setNotasData] = useState([])
    // Estado para controlar si mostramos la tabla o el formulario
    const [showForm, setShowForm] = useState(false) 

    const loadNotas = async () => {
        try {
            // Llama a tu backend real
            const data = await window.api.getNotas() 
            setNotasData(data || [])
        } catch (error) {
            console.error("Error cargando notas:", error)
        }
    }

    useEffect(() => {
        loadNotas()
    }, [])

    const handleViewDetails = (row) => {
        // ... misma lógica de antes
    }

    const handlePrint = (row) => {
        // ... misma lógica de antes
    }

    // SI SHOWFORM ES TRUE, RENDERIZA EL FORMULARIO
    if (showForm) {
        return <NuevaNota 
            onBack={() => setShowForm(false)} 
            onSuccess={() => {
                setShowForm(false);
                loadNotas(); // Recargar la tabla después de guardar
            }} 
        />
    }

    // SI SHOWFORM ES FALSE, RENDERIZA LA TABLA ORIGINAL
    return (
        <div className="container-fluid mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title m-0">Gestión de Notas Crédito / Débito</h5>
                {/* ESTE BOTÓN AHORA CAMBIA EL ESTADO */}
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="bi bi-plus-circle me-2"></i>Nueva Nota
                </button>
            </div>

            <DataTableComponent 
                data={notasData}
                columns={[
                    { data: 'numero_nota', title: 'Número' },
                    { data: 'tipo_nota', title: 'Tipo' },
                    { data: 'numero_factura_origen', title: 'Factura Relacionada' },
                    { data: 'date_created', title: 'Fecha' },
                    { data: 'motivo_dian', title: 'Motivo' },
                    { data: 'total_final', title: 'Total' },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false
                    }
                ]}
                customActions={[
                    // ... tus acciones de Ver e Imprimir
                ]}
                customRenders={{
                    tipo_nota: (data) => {
                        const badgeColor = data === 'Crédito' ? 'success' : 'danger'
                        return `<span class="badge bg-${badgeColor}">${data}</span>`
                    },
                    total_final: (data) => {
                        return `$${parseFloat(data).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
                    },
                    date_created: (data) => {
                        return new Date(data).toLocaleDateString('es-CO')
                    }
                }}
            />
        </div>
    )
}