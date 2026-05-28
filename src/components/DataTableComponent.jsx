import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DT);

const spanishLanguage = {
  search: "Buscar:",
  lengthMenu: "Mostrar _MENU_ registros",
  info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
  infoEmpty: "Mostrando 0 a 0 de 0 registros",
  infoFiltered: "(filtrado de _MAX_ registros en total)",
  zeroRecords: "No se encontraron resultados",
  emptyTable: "Ningún dato disponible en esta tabla",
  processing: `
    <div class="d-flex justify-content-center align-items-center" style="background: rgba(255,255,255,0.8); border-radius: 8px; padding: 10px;">
      <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;"></div>
      <span class="ms-2 fw-bold text-primary">Cargando datos...</span>
    </div>
  `,
  paginate: {
    first: "Primero",
    last: "Último",
    next: "Siguiente",
    previous: "Anterior"
  }
};

/**
 * Super Componente DataTable Reutilizable
 * @param {Array} columns - Configuración de columnas (Obligatorio)
 * @param {Number} reloadKey - Variable de estado para forzar el reinicio de la tabla (Opcional)
 * @param {Function} ajaxData - Promesa que llama al backend (Activa el Server-Side Processing)
 * @param {Array} data - Arreglo de datos (Activa el Client-Side Processing)
 * @param {String} tableId - ID único HTML para persistencia de configuración en Caché
 */
const CustomDataTable = ({ columns, reloadKey = 0, ajaxData, data, tableId }) => {

  const isServerSide = !!ajaxData;

  const baseOptions = {
    destroy: true,
    language: spanishLanguage,
    responsive: true,
    autoWidth: false, 
    serverSide: isServerSide,
    processing: isServerSide,
    stateSave: true, 
  };

  if (isServerSide) {
    baseOptions.ajax = function(params, callback) {
      ajaxData(params)
        .then(response => callback(response))
        .catch(err => {
          console.error("DataTable Ajax Error:", err);
          callback({ data: [], recordsTotal: 0, recordsFiltered: 0 });
        });
    };
  }

  return (
    <div className="position-relative">
      <DataTable
        id={tableId}
        key={reloadKey}
        className="table table-striped table-hover table-bordered w-100 align-middle"
        data={!isServerSide ? data : null} 
        options={baseOptions}
        columns={columns}
      />
    </div>
  );
};

export default CustomDataTable;