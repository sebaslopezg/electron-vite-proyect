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
  customRenders = {},
  customActions = [] // New prop for custom action buttons
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
        let buttons = '';
        
        // Add default Edit button if onEdit exists
        if (onEdit) {
          buttons += `
            <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
              Editar
            </button>
          `;
        }
        
        // Add default Delete button if onDelete exists
        if (onDelete) {
          buttons += `
            <button class="btn btn-sm btn-danger btn-delete-${row.id}">
              Eliminar
            </button>
          `;
        }
        
        // Add custom action buttons
        customActions.forEach((action, index) => {
          buttons += `
            <button class="btn btn-sm ${action.className || 'btn-secondary'} ${action.extraClasses || ''} btn-custom-${action.name}-${row.id}">
              ${action.icon ? `<i class="${action.icon}"></i>` : action.label}
            </button>
          `;
        });
        
        return buttons;
      }
    }
  ];

  const tableColumns = (columns || defaultColumns).map(col => {
    // Check if this is the actions column (data: null and no custom render)
    if (col.data === null && !col.render) {
      return {
        ...col,
        render: function(data, type, row) {
          let buttons = '';
          
          // Add default Edit button if onEdit exists
          if (onEdit) {
            buttons += `
              <button class="btn btn-sm btn-warning me-2 btn-edit-${row.id}">
                Editar
              </button>
            `;
          }
          
          // Add default Delete button if onDelete exists
          if (onDelete) {
            buttons += `
              <button class="btn btn-sm btn-danger me-2 btn-delete-${row.id}">
                Eliminar
              </button>
            `;
          }
          
          // Add custom action buttons
          customActions.forEach((action, index) => {
            buttons += `
              <button class="btn btn-sm ${action.className || 'btn-secondary'} ${action.extraClasses || ''} btn-custom-${action.name}-${row.id}">
                ${action.icon ? `<i class="${action.icon}"></i>` : action.label}
              </button>
            `;
          });
          
          return buttons;
        }
      };
    }
    
    // Apply custom renders for other columns
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
          
          // Attach event listeners to custom action buttons
          customActions.forEach((action) => {
            const customBtn = row.querySelector(`.btn-custom-${action.name}-${data.id}`);
            if (customBtn && action.onClick) {
              customBtn.onclick = () => action.onClick(data);
            }
          });
        }
      }}
    >
    </DataTable>
  );
};

export default DataTableComponent;