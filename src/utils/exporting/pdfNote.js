import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportNotaPDF = ({ nota, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO' }) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency', currency: moneda, minimumFractionDigits: 0
        }).format(val);
    }

    const isCredito = nota.tipo_nota === 'Crédito';
    let currentY = 15;
    let startX = 14;

    if (configuracion.logo_almacen) {
        try {
            let imgFormat = configuracion.logo_almacen.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(configuracion.logo_almacen, imgFormat, startX, currentY, 25, 25)
            startX += 30; 
        } catch (e) {}
    }

    const textDark = [33, 37, 41]
    const textMuted = [108, 117, 125]
    
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textDark)
    const maxNombreWidth = (pageWidth / 2) - startX + 15;
    const nombreLines = doc.splitTextToSize(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', maxNombreWidth);
    doc.text(nombreLines, startX, currentY + 7)

    let textY = currentY + 7 + ((nombreLines.length - 1) * 8) + 6

    doc.setFontSize(10)
    if (configuracion.nit_almacen) { 
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark)
        doc.text('NIT:', startX, textY); 
        doc.setFont('helvetica', 'normal'); doc.text(configuracion.nit_almacen, startX + 8, textY); 
        textY += 5; 
    }
    
    if (configuracion.direccion_almacen || configuracion.telefono_almacen) { 
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...textDark)
        let direccionTel = `${configuracion.direccion_almacen || ''}`;
        if (configuracion.direccion_almacen && configuracion.telefono_almacen) direccionTel += ' | ';
        if (configuracion.telefono_almacen) direccionTel += `Tel: ${configuracion.telefono_almacen}`;
        doc.text(direccionTel, startX, textY); 
        textY += 5; 
    }
    
    if (configuracion.email_almacen) { doc.text(configuracion.email_almacen, startX, textY); textY += 5; }

    const rightMargin = pageWidth - 14
    const numNota = `${nota.prefijo || 'NC'}-${nota.numero_nota}`
    
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textMuted)
    doc.text(`NOTA ${nota.tipo_nota?.toUpperCase() || 'CRÉDITO'}`, rightMargin, currentY + 7, { align: 'right' })
    
    doc.setFontSize(16)
    if(isCredito) { doc.setTextColor(220, 53, 69); } else { doc.setTextColor(13, 110, 253); }
    doc.text(`N° ${numNota}`, rightMargin, currentY + 15, { align: 'right' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textDark)
    const fechaFormat = new Date(nota.date_created).toLocaleString(formato_numero, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.text(`Fecha: ${fechaFormat}`, rightMargin, currentY + 23, { align: 'right' })

    currentY = Math.max(textY + 10, currentY + 30) 
    doc.setDrawColor(33, 37, 41)
    doc.setLineWidth(0.6)
    doc.line(14, currentY, rightMargin, currentY)
    currentY += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DE LA NOTA:', 14, currentY)
    currentY += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const numFacturaOr = String(nota.numero_factura || nota.numero_factura_origen || '');
    const onlyNums = numFacturaOr.replace(/^\D+/g, '');
    let finalPrefix = nota.prefijo_factura;
    if (!finalPrefix) {
        const match = numFacturaOr.match(/^([A-Za-z]+)/);
        if(match) finalPrefix = match[1];
    }
    const refFactura = finalPrefix ? `${finalPrefix}${configuracion?.separador || '-'}${onlyNums}` : onlyNums;

    doc.text(`Aplica a Factura: ${refFactura}`, 14, currentY)
    doc.text(`Motivo DIAN: ${nota.motivo_dian || 'No especificado'}`, 14, currentY + 5)
    currentY += 12

    const tableColumn = ["Cant.", "Producto", "V. Unitario", "Total"]
    const tableRows = detalles.map(d => [d.cantidad_producto, d.nombre_producto, formatCurr(d.precio_producto), formatCurr(d.total)])

    autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: currentY, theme: 'grid',
        headStyles: { fillColor: [108, 117, 125], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, textColor: [33, 37, 41] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 35 } }
    })

    let finalY = doc.lastAutoTable.finalY + 8
    const rightColX = pageWidth - 45
    const valueColX = rightMargin

    doc.setFillColor(248, 249, 250)
    doc.rect(rightColX - 5, finalY - 4, 50, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL NOTA:', rightColX, finalY + 3)
    
    if(isCredito) { doc.setTextColor(220, 53, 69); } else { doc.setTextColor(13, 110, 253); }
    doc.text(formatCurr(Math.abs(nota.total_final || 0)), valueColX, finalY + 3, { align: 'right' })
    finalY += 12

    doc.setTextColor(33, 37, 41)
    if (nota.notas_internas) {
        finalY += 5
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.text('Notas / Descripciones:', 14, finalY)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        const splitObs = doc.splitTextToSize(nota.notas_internas, pageWidth - 28)
        doc.text(splitObs, 14, finalY + 5)
    }

    if (configuracion.footer_factura) {
        doc.setFontSize(8); doc.setTextColor(108, 117, 125)
        const pageHeight = doc.internal.pageSize.getHeight()
        const splitFooter = doc.splitTextToSize(configuracion.footer_factura, pageWidth - 28)
        doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: 'center' })
    }

    doc.save(`Nota_${numNota}.pdf`)
}