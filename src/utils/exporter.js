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

// CORRECCIÓN: Agregado el parámetro 'filename' a la desestructuración de exportInvoicePDF
export const exportInvoicePDF = ({ factura, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO', format = 'a4', filename }) => {
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency',
            currency: moneda,
            minimumFractionDigits: 0
        }).format(val);
    }

    const numFactura = `${factura.prefijo || ''}${factura.separador || ''}${factura.numero_factura}`;
    const fechaFormat = new Date(factura.date_created).toLocaleString(formato_numero, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const pagosArray = factura.pagos_multiples ? JSON.parse(factura.pagos_multiples) : []
    const totalRecibidoReal = factura.total_recibido_original ?? factura.total_recibido
    const saldoPendienteReal = factura.saldo_pendiente_original ?? factura.saldo_pendiente

    // Construir un nombre de archivo seguro si no nos lo proporcionan
    const finalFileName = filename || `Factura_${numFactura}`

    if (format === 'pos') {
        // --- FORMATO TIRILLA (POS) ---
        // Ancho estándar POS 80mm
        const doc = new jsPDF('p', 'mm', [80, 297])
        let currentY = 10
        const marginX = 4
        const rightMargin = 76
        const center = 40

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        
        const centerText = (text, y, size) => {
            doc.setFontSize(size)
            doc.text(text, center, y, { align: 'center' })
        }

        centerText(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', currentY, 14); currentY += 5;
        
        doc.setFont('helvetica', 'normal')
        if (configuracion.nit_almacen) { centerText(`NIT: ${configuracion.nit_almacen}`, currentY, 9); currentY += 4; }
        if (configuracion.direccion_almacen) { centerText(configuracion.direccion_almacen, currentY, 9); currentY += 4; }
        if (configuracion.telefono_almacen) { centerText(`Tel: ${configuracion.telefono_almacen}`, currentY, 9); currentY += 4; }
        if (configuracion.email_almacen) { centerText(configuracion.email_almacen, currentY, 9); currentY += 4; }
        
        if (configuracion.resolucionDian) {
            doc.setFontSize(8)
            const resLines = doc.splitTextToSize(configuracion.resolucionDian, 72)
            doc.text(resLines, center, currentY, { align: 'center' })
            currentY += (resLines.length * 3.5) + 2
        }

        // Línea divisora
        doc.setLineWidth(0.3)
        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

        doc.setFont('helvetica', 'bold')
        centerText(`${configuracion.nombreFactura} N° ${numFactura}`, currentY, 11); currentY += 5;
        doc.setFont('helvetica', 'normal')
        centerText(fechaFormat, currentY, 9); currentY += 5;

        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

        // Cliente
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Cliente:', marginX, currentY); doc.setFont('helvetica', 'normal'); doc.text(factura.nombre_cliente, marginX + 13, currentY); currentY += 4;
        doc.setFont('helvetica', 'bold')
        doc.text('CC/NIT:', marginX, currentY); doc.setFont('helvetica', 'normal'); doc.text(factura.documento_cliente || 'N/A', marginX + 13, currentY); currentY += 4;
        
        if (factura.telefono_cliente || factura.telefono) {
            doc.setFont('helvetica', 'bold')
            doc.text('Teléfono:', marginX, currentY); doc.setFont('helvetica', 'normal'); doc.text(factura.telefono_cliente || factura.telefono, marginX + 16, currentY); currentY += 4;
        }
        
        if (factura.vendedor) {
            doc.setFont('helvetica', 'bold')
            doc.text('Vendedor:', marginX, currentY); doc.setFont('helvetica', 'normal'); doc.text(factura.vendedor, marginX + 16, currentY); currentY += 4;
        }

        currentY += 2
        
        // Tabla de productos adaptada para POS
        const tableColumn = ["Cant", "Producto", "Total"]
        const tableRows = detalles.map(d => [
            d.cantidad_producto,
            d.nombre_producto,
            formatCurr(d.total)
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1, textColor: [0,0,0] },
            headStyles: { fontStyle: 'bold', borderBottomColor: [0, 0, 0], borderBottomWidth: 0.3 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 38 },
                2: { cellWidth: 24, halign: 'right' }
            },
            margin: { left: marginX, right: marginX }
        })

        currentY = doc.lastAutoTable.finalY + 4

        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

        // Totales
        doc.setFontSize(9)
        const subtotal = factura.subtotal || 0
        const descuento = factura.descuento || 0
        const iva = factura.iva || 0
        const total = factura.total_factura || 0

        doc.text('Subtotal:', marginX, currentY); doc.text(formatCurr(subtotal), rightMargin, currentY, { align: 'right' }); currentY += 4;
        if (descuento > 0) {
            doc.text('Descuento:', marginX, currentY); doc.text(`-${formatCurr(descuento)}`, rightMargin, currentY, { align: 'right' }); currentY += 4;
        }
        if (iva > 0) {
            doc.text('IVA:', marginX, currentY); doc.text(formatCurr(iva), rightMargin, currentY, { align: 'right' }); currentY += 4;
        }

        currentY += 2
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('TOTAL:', marginX, currentY); doc.text(formatCurr(total), rightMargin, currentY, { align: 'right' }); currentY += 6;

        // Pagos
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Estado: ${factura.tipo_pago === 'credito' ? 'CRÉDITO' : 'CONTADO'}`, marginX, currentY); currentY += 5;
        
        doc.setFont('helvetica', 'bold')
        doc.text('Pagos Recibidos:', marginX, currentY); currentY += 4;
        doc.setFont('helvetica', 'normal')
        
        if (pagosArray.length > 0) {
            pagosArray.forEach(p => {
                doc.text(p.metodo + ':', marginX + 2, currentY); doc.text(formatCurr(p.monto || 0), rightMargin, currentY, { align: 'right' }); currentY += 4;
            })
        } else {
            doc.text(factura.metodo_pago + ':', marginX + 2, currentY); doc.text(formatCurr(totalRecibidoReal || 0), rightMargin, currentY, { align: 'right' }); currentY += 4;
        }

        currentY += 2
        doc.setFont('helvetica', 'bold')
        doc.text('Cambio/Saldo:', marginX, currentY); doc.text(formatCurr(saldoPendienteReal), rightMargin, currentY, { align: 'right' }); currentY += 6;

        if (factura.observaciones) {
            doc.line(marginX, currentY, rightMargin, currentY)
            currentY += 4
            doc.text('Observaciones:', marginX, currentY); currentY += 4;
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            const obsLines = doc.splitTextToSize(factura.observaciones, 72)
            doc.text(obsLines, marginX, currentY)
            currentY += (obsLines.length * 3.5) + 2
        }

        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5
        
        if (configuracion.footer_factura) {
            doc.setFontSize(8)
            const footerLines = doc.splitTextToSize(configuracion.footer_factura, 72)
            doc.text(footerLines, center, currentY, { align: 'center' })
        }

        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
             doc.setPage(i);
        }

        // CORRECCIÓN: Usamos finalFileName, no importan si es POS
        doc.save(`${finalFileName}.pdf`)

    } else {
        // --- FORMATO A4 ---
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()

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
        doc.text(`Fecha: ${fechaFormat}`, rightMargin, 36, { align: 'right' })
        
        if (configuracion.resolucionDian) {
            doc.setFontSize(8)
            doc.setTextColor(108, 117, 125)
            const textLines = doc.splitTextToSize(`Resolución DIAN: ${configuracion.resolucionDian}`, 70)
            doc.text(textLines, rightMargin, 42, { align: 'right' })
        }

        currentY = Math.max(currentY, 50)
        doc.setDrawColor(222, 226, 230)
        doc.setLineWidth(0.5)
        doc.line(14, currentY, rightMargin, currentY)
        currentY += 8

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

        let finalY = doc.lastAutoTable.finalY + 8
        const rightColX = pageWidth - 45
        const valueColX = rightMargin

        const subtotal = factura.subtotal || 0
        const descuento = factura.descuento || 0
        const iva = factura.iva || 0
        const total = factura.total_factura || 0

        doc.setFontSize(10)
        doc.setTextColor(33, 37, 41)
        
        doc.text('Subtotal:', rightColX, finalY); doc.text(formatCurr(subtotal), valueColX, finalY, { align: 'right' }); finalY += 6
        if (descuento > 0) {
            doc.text('Descuento:', rightColX, finalY); doc.text(`-${formatCurr(descuento)}`, valueColX, finalY, { align: 'right' }); finalY += 6
        }
        if (iva > 0) {
            doc.text('IVA:', rightColX, finalY); doc.text(formatCurr(iva), valueColX, finalY, { align: 'right' }); finalY += 6
        }

        doc.setFillColor(248, 249, 250)
        doc.rect(rightColX - 5, finalY - 4, 50, 10, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('TOTAL:', rightColX, finalY + 3)
        doc.text(formatCurr(total), valueColX, finalY + 3, { align: 'right' })
        finalY += 12

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text('Pagado:', rightColX, finalY); doc.text(formatCurr(totalRecibidoReal), valueColX, finalY, { align: 'right' }); finalY += 6
        if (saldoPendienteReal > 0) {
            doc.setTextColor(220, 53, 69)
            doc.text('Saldo Pendiente:', rightColX, finalY); doc.text(formatCurr(saldoPendienteReal), valueColX, finalY, { align: 'right' })
            doc.setTextColor(33, 37, 41)
        }

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

        // CORRECCIÓN: Usamos finalFileName
        doc.save(`${finalFileName}.pdf`)
    }
}

export const exportNotaPDF = ({ nota, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO' }) => {
    // ... [código original de exportNotaPDF]
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
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(33, 37, 41)
    doc.text(`NOTA ${nota.tipo_nota?.toUpperCase() || 'CRÉDITO'}`, rightMargin, 22, { align: 'right' })
    
    doc.setFontSize(14)
    if(isCredito) {
        doc.setTextColor(220, 53, 69); 
    } else {
        doc.setTextColor(13, 110, 253);
    }
    doc.text(`N° ${numNota}`, rightMargin, 29, { align: 'right' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(33, 37, 41)
    const fechaFormat = new Date(nota.date_created).toLocaleString(formato_numero, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.text(`Fecha: ${fechaFormat}`, rightMargin, 36, { align: 'right' })

    currentY = Math.max(currentY, 42)
    doc.setDrawColor(222, 226, 230)
    doc.setLineWidth(0.5)
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

    let finalY = doc.lastAutoTable.finalY + 8
    const rightColX = pageWidth - 45
    const valueColX = rightMargin

    doc.setFillColor(248, 249, 250)
    doc.rect(rightColX - 5, finalY - 4, 50, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL NOTA:', rightColX, finalY + 3)
    
    if(isCredito) { doc.setTextColor(220, 53, 69); } 
    else { doc.setTextColor(13, 110, 253); }
    
    doc.text(formatCurr(Math.abs(nota.total_final || 0)), valueColX, finalY + 3, { align: 'right' })
    finalY += 12

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