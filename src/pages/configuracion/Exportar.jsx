import { Button, Col, Row, Card } from "react-bootstrap";
import Swal from 'sweetalert2';

export const Exportar = () => {

    const handleExport = async () => {
        Swal.fire({
            title: 'Exportando...',
            text: 'Por favor espera un momento',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const result = await window.api.exportDatabase();

        if (result.success) {
            Swal.fire('¡Éxito!', result.message, 'success');
        } else if (result.message !== 'Exportación cancelada') {
            Swal.fire('Error', 'No se pudo exportar la base de datos', 'error');
        } else {
            Swal.close();
        }
    };

    return (<>
        <Card className="text-center shadow-sm border-0 p-5">
            <div className="mb-4">
                <i className="bi bi-database-down text-primary" style={{ fontSize: '4rem' }}></i>
            </div>
            <h3>Respaldo de Seguridad</h3>
            <p className="text-muted">
                Guardar una copia completa de la base de datos.
            </p>
            <Button
                variant="primary"
                size="lg"
                className="px-5 mt-3"
                onClick={handleExport}
            >
                Exportar Base de Datos
            </Button>
        </Card>
    </>);
}