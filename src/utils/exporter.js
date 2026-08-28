import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportToExcel = (data, filename, sheetName = "Reporte") => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export const exportToPDF = ({ title, subtitle, columns, data, filename }) => {
    const doc = new jsPDF()
    
    doc.setFontSize(14)
    doc.text(title, 14, 15)
    
    if (subtitle) {
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(subtitle, 14, 22)
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
            )
            
            if (rowIsTotal) {
                dataCell.cell.styles.fontStyle = 'bold'
                dataCell.cell.styles.fillColor = [240, 240, 240]
            }
        }
    })

    doc.save(`${filename}.pdf`)
}

export const exportInvoicePDF = ({ factura, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO' }) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency',
            currency: moneda,
            minimumFractionDigits: 0
        }).format(val);
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', 14, 22)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(108, 117, 125)
    let currentY = 28
    if (configuracion.nit_almacen) { doc.text(`NIT: ${configuracion.nit_almacen}`, 14, currentY); currentY += 5; }
    if (configuracion.direccion_almacen) { doc.text(`Dirección: ${configuracion.direccion_almacen}`, 14, currentY); currentY += 5; }
    if (configuracion.telefono_almacen) { doc.text(`Teléfono: ${configuracion.telefono_almacen}`, 14, currentY); currentY += 5; }
    if (configuracion.email_almacen) { doc.text(`Email: ${configuracion.email_almacen}`, 14, currentY); currentY += 5; }

    const rightMargin = pageWidth - 14
    const numFactura = `${factura.prefijo || ''}${factura.separador || ''}${factura.numero_factura}`
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text(`FACTURA DE VENTA`, rightMargin, 22, { align: 'right' })
    
    doc.setFontSize(14)
    doc.setTextColor(220, 53, 69)
    doc.text(`N° ${numFactura}`, rightMargin, 29, { align: 'right' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(33, 37, 41)
    const fechaFormat = new Date(factura.date_created).toLocaleString(formato_numero, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.text(`Fecha: ${fechaFormat}`, rightMargin, 36, { align: 'right' })
    
    if (configuracion.resolucionDian) {
        doc.setFontSize(8)
        doc.setTextColor(108, 117, 125)
        const textLines = doc.splitTextToSize(`Resolución DIAN: ${configuracion.resolucionDian}`, 70)
        doc.text(textLines, rightMargin, 42, { align: 'right' })
    }

    // --- LÍNEA SEPARADORA ---
    currentY = Math.max(currentY, 50)
    doc.setDrawColor(222, 226, 230)
    doc.setLineWidth(0.5)
    doc.line(14, currentY, rightMargin, currentY)
    currentY += 8

    // --- DATOS DEL CLIENTE ---
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text('FACTURAR A:', 14, currentY)
    currentY += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Cliente: ${factura.nombre_cliente}`, 14, currentY)
    doc.text(`CC/NIT: ${factura.documento_cliente || 'N/A'}`, 14, currentY + 5)
    
    doc.text(`Método de Pago: ${factura.metodo_pago}`, pageWidth / 2, currentY)
    doc.text(`Tipo: ${factura.tipo_pago === 'credito' ? 'CRÉDITO' : 'CONTADO'}`, pageWidth / 2, currentY + 5)
    
    currentY += 12

    // --- TABLA DE PRODUCTOS ---
    const tableColumn = ["Cant.", "Descripción", "V. Unitario", "IVA", "Dscto.", "Subtotal"]
    const tableRows = detalles.map(d => [
        d.cantidad_producto,
        d.nombre_producto,
        formatCurr(d.precio_producto),
        formatCurr(d.iva || 0),
        formatCurr(d.descuento || 0),
        formatCurr(d.total)
    ])

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, textColor: [33, 37, 41] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 30 }
        }
    })

    // --- RESUMEN DE TOTALES ---
    let finalY = doc.lastAutoTable.finalY + 8
    const rightColX = pageWidth - 45
    const valueColX = rightMargin

    const subtotal = factura.subtotal || 0
    const descuento = factura.descuento || 0
    const iva = factura.iva || 0
    const total = factura.total_factura || 0
    const recibido = factura.total_recibido || 0
    const saldo = factura.saldo_pendiente || 0

    doc.setFontSize(10)
    doc.setTextColor(33, 37, 41)
    
    doc.text('Subtotal:', rightColX, finalY); doc.text(formatCurr(subtotal), valueColX, finalY, { align: 'right' }); finalY += 6
    if (descuento > 0) {
        doc.text('Descuento:', rightColX, finalY); doc.text(`-${formatCurr(descuento)}`, valueColX, finalY, { align: 'right' }); finalY += 6
    }
    if (iva > 0) {
        doc.text('IVA:', rightColX, finalY); doc.text(formatCurr(iva), valueColX, finalY, { align: 'right' }); finalY += 6
    }

    // Caja gris para el TOTAL FINAL
    doc.setFillColor(248, 249, 250)
    doc.rect(rightColX - 5, finalY - 4, 50, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', rightColX, finalY + 3)
    doc.text(formatCurr(total), valueColX, finalY + 3, { align: 'right' })
    finalY += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Pagado:', rightColX, finalY); doc.text(formatCurr(recibido), valueColX, finalY, { align: 'right' }); finalY += 6
    if (saldo > 0) {
        doc.setTextColor(220, 53, 69)
        doc.text('Saldo Pendiente:', rightColX, finalY); doc.text(formatCurr(saldo), valueColX, finalY, { align: 'right' })
        doc.setTextColor(33, 37, 41)
    }

    // --- OBSERVACIONES Y FOOTER ---
    finalY = doc.lastAutoTable.finalY + 10
    
    if (factura.observaciones) {
        doc.setFont('helvetica', 'bold')
        doc.text('Observaciones:', 14, finalY)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const splitObs = doc.splitTextToSize(factura.observaciones, 100)
        doc.text(splitObs, 14, finalY + 5)
    }

    if (configuracion.footer_factura) {
        doc.setFontSize(8)
        doc.setTextColor(108, 117, 125)
        const pageHeight = doc.internal.pageSize.getHeight()
        const splitFooter = doc.splitTextToSize(configuracion.footer_factura, pageWidth - 28)
        doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: 'center' })
    }

    doc.save(`Factura_${numFactura}.pdf`)
}

// NUEVA FUNCIÓN: Exportar el detalle de una Nota Crédito / Débito
export const exportNotaPDF = ({ nota, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO' }) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency',
            currency: moneda,
            minimumFractionDigits: 0
        }).format(val);
    }

    const isCredito = nota.tipo_nota === 'Crédito';

    // --- HEADER (INFO ALMACEN) ---
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', 14, 22)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(108, 117, 125)
    let currentY = 28
    if (configuracion.nit_almacen) { doc.text(`NIT: ${configuracion.nit_almacen}`, 14, currentY); currentY += 5; }
    if (configuracion.direccion_almacen) { doc.text(`Dirección: ${configuracion.direccion_almacen}`, 14, currentY); currentY += 5; }
    if (configuracion.telefono_almacen) { doc.text(`Teléfono: ${configuracion.telefono_almacen}`, 14, currentY); currentY += 5; }

    const rightMargin = pageWidth - 14
    const numNota = `${nota.prefijo || 'NC'}-${nota.numero_nota}`
    
    // Título principal (NOTA CRÉDITO o NOTA DÉBITO)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text(`NOTA ${nota.tipo_nota?.toUpperCase() || 'CRÉDITO'}`, rightMargin, 22, { align: 'right' })
    
    // Color según el tipo de nota (Rojo Crédito, Azul Débito)
    doc.setFontSize(14)
    if(isCredito) {
        doc.setTextColor(220, 53, 69); 
    } else {
        doc.setTextColor(13, 110, 253);
    }
    doc.text(`N° ${numNota}`, rightMargin, 29, { align: 'right' })

    // Fecha
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(33, 37, 41)
    const fechaFormat = new Date(nota.date_created).toLocaleString(formato_numero, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.text(`Fecha: ${fechaFormat}`, rightMargin, 36, { align: 'right' })

    // --- LÍNEA SEPARADORA ---
    currentY = Math.max(currentY, 42)
    doc.setDrawColor(222, 226, 230)
    doc.setLineWidth(0.5)
    doc.line(14, currentY, rightMargin, currentY)
    currentY += 8

    // --- DATOS DE LA NOTA ---
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DE LA NOTA:', 14, currentY)
    currentY += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Formatear la factura original correctamente
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

    // --- TABLA DE DETALLES ---
    const tableColumn = ["Cant.", "Producto", "V. Unitario", "Total"]
    const tableRows = detalles.map(d => [
        d.cantidad_producto,
        d.nombre_producto,
        formatCurr(d.precio_producto),
        formatCurr(d.total)
    ])

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [108, 117, 125], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, textColor: [33, 37, 41] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
        }
    })

    // --- RESUMEN FINAL ---
    let finalY = doc.lastAutoTable.finalY + 8
    const rightColX = pageWidth - 45
    const valueColX = rightMargin

    // Caja gris para el TOTAL NOTA
    doc.setFillColor(248, 249, 250)
    doc.rect(rightColX - 5, finalY - 4, 50, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL NOTA:', rightColX, finalY + 3)
    
    if(isCredito) { doc.setTextColor(220, 53, 69); } 
    else { doc.setTextColor(13, 110, 253); }
    
    doc.text(formatCurr(Math.abs(nota.total_final || 0)), valueColX, finalY + 3, { align: 'right' })
    finalY += 12

    // --- OBSERVACIONES / NOTAS INTERNAS ---
    doc.setTextColor(33, 37, 41)
    if (nota.notas_internas) {
        finalY += 5
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Notas / Descripciones:', 14, finalY)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const splitObs = doc.splitTextToSize(nota.notas_internas, pageWidth - 28)
        doc.text(splitObs, 14, finalY + 5)
    }

    if (configuracion.footer_factura) {
        doc.setFontSize(8)
        doc.setTextColor(108, 117, 125)
        const pageHeight = doc.internal.pageSize.getHeight()
        const splitFooter = doc.splitTextToSize(configuracion.footer_factura, pageWidth - 28)
        doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: 'center' })
    }

    doc.save(`Nota_${numNota}.pdf`)
}