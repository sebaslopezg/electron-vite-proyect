import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, filename, sheetName = "Reporte") => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = ({ title, subtitle, columns, data, filename }) => {
    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    
    if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 22);
    }

    autoTable(doc, {
        head: [columns],
        body: data,
        startY: subtitle ? 28 : 22,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 110, 253] },
        didParseCell: function(dataCell) {
            const rowIsTotal = dataCell.row.raw.some(cell => 
                typeof cell === 'string' && cell.toUpperCase().includes("TOTALES")
            );
            
            if (rowIsTotal) {
                dataCell.cell.styles.fontStyle = 'bold';
                dataCell.cell.styles.fillColor = [240, 240, 240];
            }
        }
    });

    doc.save(`${filename}.pdf`);
};