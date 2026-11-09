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

    const finalFileName = filename || `Factura_${numFactura}`

    if (format === 'pos') {
        // --- FORMATO TIRILLA (POS) ---
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

        if (configuracion.logo_almacen && configuracion.imprimir_logo_pos === 1) {
            try {
                // Ajuste de tamaño y posición del logo en la tirilla
                doc.addImage(configuracion.logo_almacen, 'JPEG', 25, currentY, 30, 30)
                currentY += 32
            } catch (e) {}
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

        doc.setLineWidth(0.3)
        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

        doc.setFont('helvetica', 'bold')
        centerText(`${configuracion.nombreFactura} N° ${numFactura}`, currentY, 11); currentY += 5;
        doc.setFont('helvetica', 'normal')
        centerText(fechaFormat, currentY, 9); currentY += 5;

        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

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

        doc.save(`${finalFileName}.pdf`)

    } else {
        // --- FORMATO A4 (IDÉNTICO AL IMPRESOR WEB) ---
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()
        
        const textDark = [33, 37, 41]
        const textMuted = [108, 117, 125]
        const borderColor = [108, 117, 125] 

        let currentY = 15;
        let startX = 14;

        // --- HEADER ---
        // Logo (Posicionado a la izquierda del texto)
        if (configuracion.logo_almacen) {
            try {
                doc.addImage(configuracion.logo_almacen, 'JPEG', startX, currentY, 25, 25)
                startX += 30; 
            } catch (e) {}
        }

        // Datos Almacén
        doc.setFontSize(22)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        doc.text(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', startX, currentY + 7)

        doc.setFontSize(10)
        let textY = currentY + 13
        
        if (configuracion.nit_almacen) { 
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...textDark)
            doc.text('NIT:', startX, textY); 
            doc.setFont('helvetica', 'normal'); 
            doc.text(configuracion.nit_almacen, startX + 7, textY); 
            textY += 5; 
        }
        
        if (configuracion.direccion_almacen || configuracion.telefono_almacen) { 
            doc.setFont('helvetica', 'normal'); 
            doc.setTextColor(...textDark)
            let direccionTel = `${configuracion.direccion_almacen || ''}`;
            if (configuracion.direccion_almacen && configuracion.telefono_almacen) direccionTel += ' | ';
            if (configuracion.telefono_almacen) direccionTel += `Tel: ${configuracion.telefono_almacen}`;
            doc.text(direccionTel, startX, textY); 
            textY += 5; 
        }
        
        if (configuracion.email_almacen) { 
            doc.text(configuracion.email_almacen, startX, textY); 
            textY += 5; 
        }
        
        if (configuracion.resolucionDian) {
            doc.setFontSize(9)
            doc.setTextColor(...textMuted)
            doc.text(configuracion.resolucionDian, startX, textY)
        }

        // Datos Factura (Esquina superior derecha)
        const rightMargin = pageWidth - 14
        
        doc.setFontSize(20)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(108, 117, 125) 
        // Usamos una posición X basada en el margen derecho y alineación derecha para evitar solapamientos
        doc.text(`FACTURA DE VENTA`, rightMargin, currentY + 7, { align: 'right' })
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 53, 69) // Color rojo N° VF...
        doc.text(`N° ${numFactura}`, rightMargin, currentY + 15, { align: 'right' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textDark)
        doc.text(`Fecha Emisión: ${fechaFormat}`, rightMargin, currentY + 23, { align: 'right' })

        // Línea gruesa divisora
        // Nos aseguramos de que la línea se dibuje debajo del texto más bajo (sea el logo, la info de empresa o la fecha)
        currentY = Math.max(textY + 5, currentY + 30)
        doc.setDrawColor(33, 37, 41)
        doc.setLineWidth(0.6)
        doc.line(14, currentY, rightMargin, currentY)
        currentY += 8

        // --- CAJA DE CLIENTE ---
        doc.setDrawColor(...borderColor)
        doc.setLineWidth(0.2)
        
        const boxHeight = factura.vendedor ? 22 : 15;
        doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 3, 3)
        
        doc.setFontSize(10)
        let innerY = currentY + 7
        
        // Fila 1: Cliente, CC/NIT, Tel, Estado
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark); doc.text('Cliente:', 18, innerY)
        doc.setFont('helvetica', 'normal'); 
        // Truncar nombre del cliente si es muy largo
        let nombreCliente = factura.nombre_cliente;
        if (doc.getTextWidth(nombreCliente) > 40) {
            nombreCliente = doc.splitTextToSize(nombreCliente, 40)[0] + '...';
        }
        doc.text(nombreCliente, 33, innerY)

        doc.setFont('helvetica', 'bold'); doc.text('CC/NIT:', 75, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.documento_cliente || 'N/A', 90, innerY)
        
        doc.setFont('helvetica', 'bold'); doc.text('Tel:', 130, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.telefono_cliente || factura.telefono || '', 138, innerY)
        
        doc.setFont('helvetica', 'bold'); doc.text('Estado:', 160, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.tipo_pago === 'credito' ? 'Crédito' : 'Contado', 175, innerY)

        // Fila 2: Vendedor (con línea separadora tenue)
        if (factura.vendedor) {
            innerY += 7
            doc.setDrawColor(222, 226, 230) 
            doc.line(15, innerY - 4, rightMargin - 1, innerY - 4) // linea dentro del cuadro

            doc.setFont('helvetica', 'bold'); doc.setTextColor(...textMuted); doc.text('Vendedor(a):', 18, innerY)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...textDark); doc.text(factura.vendedor, 42, innerY)
        }
        
        currentY += boxHeight + 8

        // --- TABLA DE PRODUCTOS ---
        const tableColumn = ["SKU", "Producto", "Cant.", "V. Unitario", "Total"]
        const tableRows = detalles.map(d => [
            `${d.sku_prefix || ''}${d.separador || ''}${d.sku}`,
            d.nombre_producto,
            d.cantidad_producto,
            formatCurr(d.precio_producto),
            formatCurr(d.total)
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0, 0, 0] },
            styles: { fontSize: 10, textColor: [0, 0, 0], font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 3 },
            bodyStyles: { fillColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 35 },
                1: { halign: 'left' },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'right', cellWidth: 35 },
                4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' } 
            }
        })

        // --- CAJA DE PAGOS Y TOTALES ---
        let finalY = doc.lastAutoTable.finalY + 12
        
        // Caja de pagos (Lado izquierdo)
        const leftBoxWidth = 85;
        doc.setDrawColor(...borderColor)
        doc.setLineWidth(0.2)
        
        let pagosHeight = (pagosArray.length > 0 ? (pagosArray.length * 6) : 6) + 15
        doc.roundedRect(14, finalY, leftBoxWidth, pagosHeight, 3, 3)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        doc.text('DETALLE DE PAGOS RECIBIDOS:', 18, finalY + 7)
        
        doc.setFont('helvetica', 'normal')
        let payY = finalY + 14
        if (pagosArray.length > 0) {
            pagosArray.forEach(p => {
                doc.text(p.metodo, 18, payY)
                doc.setFont('helvetica', 'bold')
                doc.text(formatCurr(p.monto || 0), 14 + leftBoxWidth - 4, payY, { align: 'right' })
                doc.setFont('helvetica', 'normal')
                payY += 6
            })
        } else {
            doc.text(factura.metodo_pago || '', 18, payY)
            doc.setFont('helvetica', 'bold')
            doc.text(formatCurr(totalRecibidoReal || 0), 14 + leftBoxWidth - 4, payY, { align: 'right' })
            doc.setFont('helvetica', 'normal')
        }

        // Totales (Lado derecho)
        const rightColX = pageWidth - 45
        const valueColX = rightMargin

        const subtotal = factura.subtotal || 0
        const descuento = factura.descuento || 0
        const iva = factura.iva || 0
        const total = factura.total_factura || 0

        doc.setFontSize(12)
        doc.setTextColor(33, 37, 41)
        
        let sumY = finalY + 5
        doc.setFont('helvetica', 'bold')
        doc.text('Subtotal:', rightColX, sumY, { align: 'right' }); 
        doc.setFont('helvetica', 'normal')
        doc.text(formatCurr(subtotal), valueColX, sumY, { align: 'right' }); 
        sumY += 8
        
        if (descuento > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Descuento:', rightColX, sumY, { align: 'right' }); 
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(220, 53, 69)
            doc.text(`-${formatCurr(descuento)}`, valueColX, sumY, { align: 'right' }); 
            doc.setTextColor(33, 37, 41)
            sumY += 8
        }
        
        if (iva > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('IVA:', rightColX, sumY, { align: 'right' }); 
            doc.setFont('helvetica', 'normal')
            doc.text(formatCurr(iva), valueColX, sumY, { align: 'right' }); 
            sumY += 8
        }

        // Caja bordeada para el TOTAL
        doc.setDrawColor(...borderColor)
        // Se dibuja el rectángulo de forma que el texto "Total:" y el valor queden dentro
        doc.roundedRect(rightColX - 15, sumY - 5, rightMargin - (rightColX - 15) + 3, 10, 3, 3)
        
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Total:', rightColX, sumY + 2, { align: 'right' })
        doc.text(formatCurr(total), valueColX, sumY + 2, { align: 'right' })
        
        sumY += 12

        doc.setFontSize(11)
        doc.setTextColor(...textMuted)
        doc.text('Cambio / Saldo:', rightColX, sumY, { align: 'right' }); 
        doc.text(formatCurr(saldoPendienteReal), valueColX, sumY, { align: 'right' })

        // --- OBSERVACIONES ---
        let bottomY = Math.max(finalY + pagosHeight, sumY) + 10
        if (factura.observaciones) {
            // Limpiamos los \n literales si los hay y dejamos el texto en bruto
            const cleanObs = factura.observaciones.replace(/\\n/g, ' ')
            
            // Calculamos el alto de la caja dinámicamente según el texto
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            
            // El maxTextWidth debe contemplar el margen izquierdo (14) + margen interno (4)
            // + el ancho que ocupa "Observaciones:" (aprox 28) + margen interno final.
            const textStartX = 45;
            const maxTextWidth = pageWidth - textStartX - 18; 
            
            // splitTextToSize divide el texto en líneas que caben en maxTextWidth
            const splitObs = doc.splitTextToSize(cleanObs, maxTextWidth)
            
            // Evaluamos si el cuadro de observaciones y el footer caben en la página actual
            // Cada línea ocupa unos 5 mm, más 6 mm de padding de la caja
            const obsBoxHeight = Math.max(15, (splitObs.length * 5) + 6)
            
            // Verificamos salto de página (agregando un margen de seguridad para el footer de unos 20mm)
            const pageHeight = doc.internal.pageSize.getHeight();
            if (bottomY + obsBoxHeight + 20 > pageHeight) {
                doc.addPage();
                bottomY = 15; // Reiniciar Y al top de la nueva página
            }

            doc.setDrawColor(...borderColor)
            doc.roundedRect(14, bottomY, pageWidth - 28, obsBoxHeight, 3, 3)
            
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...textDark)
            doc.text('Observaciones:', 18, bottomY + 7)
            
            doc.setFont('helvetica', 'normal')
            doc.text(splitObs, textStartX, bottomY + 7)
        }

        // Footer
        if (configuracion.footer_factura) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...textDark)
            const pageHeight = doc.internal.pageSize.getHeight()
            const splitFooter = doc.splitTextToSize(configuracion.footer_factura, pageWidth - 28)
            doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: 'center' })
        }

        doc.save(`${finalFileName}.pdf`)
    }
}

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