import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';

DataTable.use(DT);

const DataTableComponent = ({ 
  data, 
  columns, 
  onEdit, 
  onDelete,
  onShow,
  title = 'Acciones',
  customRenders = {}
}) => {
  
  const defaultColumns = [
    { data: 'id', title: 'ID' },
    { data: 'ref_name', title: 'Nombre Referencia' },
    { data: 'sku', title: 'SKU' },
    { data: 'status', title: 'Estado' },
    { data: 'date_created', title: 'Fecha Creación' },
    { data: 'date_modify', title: 'Fecha Modificación' },
    {
      data: null,
      title: title,
      orderable: false,
      render: function(data, type, row) {
        return `
          <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
            Editar
          </button>
          <button class="btn btn-sm btn-danger btn-delete-${row.id}">
            Eliminar
          </button>
        `;
      }
    }
  ];

  const tableColumns = (columns || defaultColumns).map(col => {
    if (customRenders[col.data]) {
      return {
        ...col,
        render: customRenders[col.data]
      };
    }
    return col;
  });

  return (
    <DataTable 
      data={data} 
      className="display table table-striped"
      options={{
        language: {
          search: "Buscar:",
          lengthMenu: "Mostrar _MENU_ registros",
          info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
          infoEmpty: "Mostrando 0 a 0 de 0 registros",
          infoFiltered: "(filtrado de _MAX_ registros totales)",
          zeroRecords: "No se encontraron registros",
          paginate: {
            first: "Primero",
            last: "Último",
            next: "Siguiente",
            previous: "Anterior"
          }
        },
        columns: tableColumns,
        createdRow: function(row, data, dataIndex) {
          const editBtn = row.querySelector(`.btn-edit-${data.id}`);
          const deleteBtn = row.querySelector(`.btn-delete-${data.id}`);
          
          if (editBtn && onEdit) {
            editBtn.onclick = () => {
              onEdit(data);
              if (onShow) onShow();
            };
          }
          
          if (deleteBtn && onDelete) {
            deleteBtn.onclick = () => onDelete(data.id);
          }
        }
      }}
    >
    </DataTable>
  );
};

export default DataTableComponent;