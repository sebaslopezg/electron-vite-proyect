import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportInvoicePDF = ({ factura, detalles, configuracion, moneda = 'COP', formato_numero = 'es-CO', format = 'a4', filename }) => {
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency', currency: moneda, minimumFractionDigits: 0
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
                let imgFormat = configuracion.logo_almacen.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(configuracion.logo_almacen, imgFormat, 25, currentY, 30, 30)
                currentY += 32
            } catch (e) {}
        }

        centerText(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', currentY, 14); currentY += 5;
        
        doc.setFont('helvetica', 'normal')
        if (configuracion.nit_almacen) { centerText(`NIT: ${configuracion.nit_almacen}`, currentY, 9); currentY += 4; }
        if (configuracion.direccion_almacen) { centerText(configuracion.direccion_almacen, currentY, 9); currentY += 4; }
        if (configuracion.telefono_almacen) { centerText(`Tel: ${configuracion.telefono_almacen}`, currentY, 9); currentY += 4; }
        
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
        
        if (factura.vendedor) {
            doc.setFont('helvetica', 'bold')
            doc.text('Vendedor:', marginX, currentY); doc.setFont('helvetica', 'normal'); doc.text(factura.vendedor, marginX + 16, currentY); currentY += 4;
        }

        currentY += 2
        
        const tableColumn = ["Cant", "Producto", "Total"]
        const tableRows = detalles.map(d => [d.cantidad_producto, d.nombre_producto, formatCurr(d.total)])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1, textColor: [0,0,0] },
            headStyles: { fontStyle: 'bold', borderBottomColor: [0, 0, 0], borderBottomWidth: 0.3 },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 38 }, 2: { cellWidth: 24, halign: 'right' } },
            margin: { left: marginX, right: marginX }
        })

        currentY = doc.lastAutoTable.finalY + 4

        doc.line(marginX, currentY, rightMargin, currentY)
        currentY += 5

        doc.setFontSize(9)
        const subtotal = factura.subtotal || 0; const descuento = factura.descuento || 0; const iva = factura.iva || 0; const total = factura.total_factura || 0;

        doc.text('Subtotal:', marginX, currentY); doc.text(formatCurr(subtotal), rightMargin, currentY, { align: 'right' }); currentY += 4;
        if (descuento > 0) { doc.text('Descuento:', marginX, currentY); doc.text(`-${formatCurr(descuento)}`, rightMargin, currentY, { align: 'right' }); currentY += 4; }
        if (iva > 0) { doc.text('IVA:', marginX, currentY); doc.text(formatCurr(iva), rightMargin, currentY, { align: 'right' }); currentY += 4; }

        currentY += 2
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('TOTAL:', marginX, currentY); doc.text(formatCurr(total), rightMargin, currentY, { align: 'right' }); currentY += 6;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text(`Estado: ${factura.tipo_pago === 'credito' ? 'CRÉDITO' : 'CONTADO'}`, marginX, currentY); currentY += 5;
        doc.setFont('helvetica', 'bold'); doc.text('Pagos Recibidos:', marginX, currentY); currentY += 4;
        doc.setFont('helvetica', 'normal')
        
        if (pagosArray.length > 0) {
            pagosArray.forEach(p => {
                doc.text(p.metodo + ':', marginX + 2, currentY); doc.text(formatCurr(p.monto || 0), rightMargin, currentY, { align: 'right' }); currentY += 4;
            })
        } else {
            doc.text(factura.metodo_pago + ':', marginX + 2, currentY); doc.text(formatCurr(totalRecibidoReal || 0), rightMargin, currentY, { align: 'right' }); currentY += 4;
        }

        currentY += 2; doc.setFont('helvetica', 'bold')
        doc.text('Cambio/Saldo:', marginX, currentY); doc.text(formatCurr(saldoPendienteReal), rightMargin, currentY, { align: 'right' }); currentY += 6;

        if (factura.observaciones) {
            doc.line(marginX, currentY, rightMargin, currentY); currentY += 4
            doc.text('Observaciones:', marginX, currentY); currentY += 4;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
            const cleanObs = factura.observaciones.replace(/\\n/g, '\n') // Convierte los strings de salto
            const obsLines = doc.splitTextToSize(cleanObs, 72)
            doc.text(obsLines, marginX, currentY)
            currentY += (obsLines.length * 3.5) + 2
        }

        doc.line(marginX, currentY, rightMargin, currentY); currentY += 5
        
        if (configuracion.footer_factura) {
            doc.setFontSize(8)
            const footerLines = doc.splitTextToSize(configuracion.footer_factura, 72)
            doc.text(footerLines, center, currentY, { align: 'center' })
        }

        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) doc.setPage(i);
        doc.save(`${finalFileName}.pdf`)

    } else {
        // --- FORMATO A4 (IDÉNTICO AL IMPRESOR WEB) ---
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()
        
        const textDark = [33, 37, 41]; const textMuted = [108, 117, 125]; const borderColor = [108, 117, 125] 

        let currentY = 15;
        let startX = 14;

        // 1. Detección automática del formato de imagen (Soluciona que no aparecía el Logo)
        if (configuracion.logo_almacen) {
            try {
                let imgFormat = 'JPEG';
                if (configuracion.logo_almacen.includes('image/png')) imgFormat = 'PNG';
                else if (configuracion.logo_almacen.includes('image/webp')) imgFormat = 'WEBP';
                
                doc.addImage(configuracion.logo_almacen, imgFormat, startX, currentY, 25, 25)
                startX += 30; 
            } catch (e) { console.warn("No se pudo cargar el logo", e) }
        }

        const rightMargin = pageWidth - 14
        
        // 2. Control estricto del ancho del nombre (Evita que se solape con "Factura de Venta")
        doc.setFontSize(20) // Bajamos a 20 para que se vea más profesional
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        const maxNombreWidth = 85; // Tope estricto de milimetros para el nombre de la empresa
        const nombreLineas = doc.splitTextToSize(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', maxNombreWidth);
        doc.text(nombreLineas, startX, currentY + 7)
        
        // Compensamos la Y en caso de que el nombre ocupe 2 o más líneas
        let textY = currentY + 7 + ((nombreLineas.length - 1) * 7) + 6

        doc.setFontSize(10)
        
        if (configuracion.nit_almacen) { 
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark); doc.text('NIT:', startX, textY); 
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
        
        if (configuracion.resolucionDian) {
            doc.setFontSize(9); doc.setTextColor(...textMuted)
            const resLines = doc.splitTextToSize(configuracion.resolucionDian, maxNombreWidth);
            doc.text(resLines, startX, textY)
        }

        // Títulos de la derecha
        doc.setFontSize(20)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textMuted) 
        doc.text(`FACTURA DE VENTA`, rightMargin, currentY + 7, { align: 'right' })
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 53, 69) 
        doc.text(`N° ${numFactura}`, rightMargin, currentY + 15, { align: 'right' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textDark)
        doc.text(`Fecha Emisión: ${fechaFormat}`, rightMargin, currentY + 23, { align: 'right' })

        currentY = Math.max(textY + 10, currentY + 30) 
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
        
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark); doc.text('Cliente:', 18, innerY)
        doc.setFont('helvetica', 'normal'); 
        
        let nombreCliente = factura.nombre_cliente;
        if (doc.getTextWidth(nombreCliente) > 40) {
            nombreCliente = doc.splitTextToSize(nombreCliente, 40)[0] + '...';
        }
        doc.text(nombreCliente, 33, innerY)

        doc.setFont('helvetica', 'bold'); doc.text('CC/NIT:', 75, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.documento_cliente || 'N/A', 90, innerY)
        
        doc.setFont('helvetica', 'bold'); doc.text('Tel:', 130, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.telefono_cliente || factura.telefono || '', 138, innerY)
        
        doc.setFont('helvetica', 'bold'); doc.text('Estado:', 163, innerY)
        doc.setFont('helvetica', 'normal'); doc.text(factura.tipo_pago === 'credito' ? 'Crédito' : 'Contado', 178, innerY)

        if (factura.vendedor) {
            innerY += 7
            doc.setDrawColor(222, 226, 230) 
            doc.line(15, innerY - 4, rightMargin - 1, innerY - 4)

            doc.setFont('helvetica', 'bold'); doc.setTextColor(...textMuted); doc.text('Vendedor(a):', 18, innerY)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...textDark); doc.text(factura.vendedor, 42, innerY)
        }
        
        currentY += boxHeight + 8

        // --- TABLA DE PRODUCTOS ---
        const tableColumn = ["SKU", "Producto", "Cant.", "V. Unitario", "Total"]
        const tableRows = detalles.map(d => [
            `${d.sku_prefix || ''}${d.separador || ''}${d.sku}`,
            d.nombre_producto, d.cantidad_producto,
            formatCurr(d.precio_producto), formatCurr(d.total)
        ])

        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: currentY, theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0, 0, 0] },
            styles: { fontSize: 10, textColor: [0, 0, 0], font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 3 },
            bodyStyles: { fillColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            columnStyles: { 0: { halign: 'center', cellWidth: 35 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 35 }, 4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' } }
        })

        // --- CAJA DE PAGOS Y TOTALES ---
        let finalY = doc.lastAutoTable.finalY + 12
        const pageHeight = doc.internal.pageSize.getHeight();
        
        if (finalY + 50 > pageHeight) { doc.addPage(); finalY = 15; }

        const leftBoxWidth = 85;
        doc.setDrawColor(...borderColor)
        doc.setLineWidth(0.2)
        
        let pagosHeight = (pagosArray.length > 0 ? (pagosArray.length * 6) : 6) + 12 
        doc.roundedRect(14, finalY, leftBoxWidth, pagosHeight, 3, 3)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        doc.text('DETALLE DE PAGOS RECIBIDOS:', 18, finalY + 6) 
        
        doc.setFont('helvetica', 'normal')
        let payY = finalY + 13
        if (pagosArray.length > 0) {
            pagosArray.forEach(p => {
                doc.text(p.metodo, 18, payY); doc.setFont('helvetica', 'bold'); doc.text(formatCurr(p.monto || 0), 14 + leftBoxWidth - 4, payY, { align: 'right' })
                doc.setFont('helvetica', 'normal'); payY += 6
            })
        } else {
            doc.text(factura.metodo_pago || '', 18, payY); doc.setFont('helvetica', 'bold'); doc.text(formatCurr(totalRecibidoReal || 0), 14 + leftBoxWidth - 4, payY, { align: 'right' }); doc.setFont('helvetica', 'normal')
        }

        // Totales (Lado derecho)
        const rightColX = pageWidth - 45
        const valueColX = rightMargin

        const subtotal = factura.subtotal || 0; const descuento = factura.descuento || 0; const iva = factura.iva || 0; const total = factura.total_factura || 0

        doc.setFontSize(12); doc.setTextColor(...textDark)
        let sumY = finalY + 5 
        doc.setFont('helvetica', 'bold'); doc.text('Subtotal:', rightColX, sumY, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.text(formatCurr(subtotal), valueColX, sumY, { align: 'right' }); sumY += 8
        if (descuento > 0) { doc.setFont('helvetica', 'bold'); doc.text('Descuento:', rightColX, sumY, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.setTextColor(220, 53, 69); doc.text(`-${formatCurr(descuento)}`, valueColX, sumY, { align: 'right' }); doc.setTextColor(...textDark); sumY += 8 }
        if (iva > 0) { doc.setFont('helvetica', 'bold'); doc.text('IVA:', rightColX, sumY, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.text(formatCurr(iva), valueColX, sumY, { align: 'right' }); sumY += 8 }

        doc.setDrawColor(...borderColor)
        doc.roundedRect(rightColX - 20, sumY - 6, rightMargin - (rightColX - 20) + 0, 11, 3, 3)
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Total:', rightColX, sumY + 2, { align: 'right' }); doc.text(formatCurr(total), valueColX - 2, sumY + 2, { align: 'right' }); sumY += 12

        doc.setFontSize(11); doc.setTextColor(...textMuted)
        doc.text('Cambio / Saldo:', rightColX, sumY, { align: 'right' }); doc.text(formatCurr(saldoPendienteReal), valueColX, sumY, { align: 'right' })

        // 3. OBSERVACIONES: Eliminando el solapamiento 
        let bottomY = Math.max(finalY + pagosHeight, sumY) + 10

        if (factura.observaciones) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            
            // CONVIERTE LOS \n EN VERDADEROS SALTOS DE LÍNEA PARA QUE splitTextToSize HAGA SU TRABAJO
            const cleanObs = factura.observaciones.replace(/\\n/g, '\n') 
            
            const textStartX = 45;
            const maxTextWidth = pageWidth - textStartX - 14; 
            
            const splitObs = doc.splitTextToSize(cleanObs, maxTextWidth)
            
            // Calculamos una altura dinámica perfecta en base a cuántas líneas resultan
            const obsBoxHeight = Math.max(12, (splitObs.length * 5) + 6)
            
            if (bottomY + obsBoxHeight + 20 > pageHeight) { doc.addPage(); bottomY = 15; }

            doc.setDrawColor(...borderColor)
            doc.roundedRect(14, bottomY, pageWidth - 28, obsBoxHeight, 3, 3)
            
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark)
            doc.text('Observaciones:', 18, bottomY + 7)
            
            doc.setFont('helvetica', 'normal')
            doc.text(splitObs, textStartX, bottomY + 7)
            
            bottomY += obsBoxHeight 
        }

        // Footer
        if (configuracion.footer_factura) {
            if (bottomY + 15 > pageHeight) { doc.addPage(); }
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark)
            const splitFooter = doc.splitTextToSize(configuracion.footer_factura, pageWidth - 28)
            doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: 'center' })
        }

        doc.save(`${finalFileName}.pdf`)
    }
}