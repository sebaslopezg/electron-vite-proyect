import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportToPDF = ({ 
    title, 
    subtitle, 
    columns, 
    data, 
    filename, 
    configuracion = null,
    totales = null,
    moneda = 'COP', 
    formato_numero = 'es-CO' 
}) => {
    
    const formatCurr = (val) => {
        return new Intl.NumberFormat(formato_numero, {
            style: 'currency',
            currency: moneda,
            minimumFractionDigits: 0
        }).format(val);
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const textDark = [33, 37, 41]
    const textMuted = [108, 117, 125]
    const borderColor = [108, 117, 125] 

    let currentY = 15;
    let startX = 14;
    const rightMargin = pageWidth - 14

    if (configuracion) {
        if (configuracion.logo_almacen) {
            try {
                let imgFormat = 'JPEG';
                if (configuracion.logo_almacen.includes('image/png')) imgFormat = 'PNG';
                else if (configuracion.logo_almacen.includes('image/webp')) imgFormat = 'WEBP';
                
                doc.addImage(configuracion.logo_almacen, imgFormat, startX, currentY, 20, 20)
                startX += 25; 
            } catch (e) {}
        }

        doc.setFontSize(22)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textMuted) 
        doc.text(title.toUpperCase(), rightMargin, currentY + 7, { align: 'right' })
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textMuted)
        
        const subtitleLines = doc.splitTextToSize(subtitle, 80);
        doc.text(subtitleLines, rightMargin, currentY + 13, { align: 'right' })
        
        doc.setFontSize(9)
        doc.text(`Generado: ${new Date().toLocaleString(formato_numero)}`, rightMargin, currentY + 18 + (subtitleLines.length-1)*4, { align: 'right' })

        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        const maxNombreWidth = (pageWidth / 2) - startX + 10;
        const nombreLineas = doc.splitTextToSize(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', maxNombreWidth);
        doc.text(nombreLineas, startX, currentY + 7)
        
        let textY = currentY + 7 + ((nombreLineas.length - 1) * 7) + 6

        doc.setFontSize(10)
        if (configuracion.nit_almacen) { 
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...textDark)
            doc.text('NIT:', startX, textY); 
            doc.setFont('helvetica', 'normal'); doc.text(configuracion.nit_almacen, startX + 8, textY); 
        }

        currentY = Math.max(textY + 10, currentY + 28) 
        doc.setDrawColor(33, 37, 41)
        doc.setLineWidth(0.6)
        doc.line(14, currentY, rightMargin, currentY)
        currentY += 6

        if (totales) {
            const boxWidth = (pageWidth - 28 - 10) / 3
            let box1X = 14
            let box2X = 14 + boxWidth + 5
            let box3X = 14 + (boxWidth * 2) + 10
            
            const metodos = Object.entries(totales.metodos || {})
            const reqHeightByMethods = 22 + (metodos.length * 6)
            const boxHeight = Math.max(47, reqHeightByMethods) // Incrementé un poquito la altura base para acomodar mejor

            doc.setDrawColor(...borderColor)
            doc.setLineWidth(0.2)

            // CAJA 1: RESUMEN FINANCIERO
            doc.roundedRect(box1X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text("RESUMEN FINANCIERO", box1X + (boxWidth/2), currentY + 7, { align: 'center' })
            doc.line(box1X + 4, currentY + 10, box1X + boxWidth - 4, currentY + 10)
            
            doc.setFontSize(10)
            let inY1 = currentY + 16;
            
            const countFacturas = data.filter(r => !r[r.length-1]?.toString().includes('TOTALES')).length;
            doc.setFont('helvetica', 'normal'); doc.text("Facturas Emitidas:", box1X + 4, inY1); doc.setFont('helvetica', 'bold'); doc.text(countFacturas.toString(), box1X + boxWidth - 4, inY1, { align: 'right' }); inY1 += 6;
            
            doc.setFont('helvetica', 'normal'); doc.text("Subtotal Neto:", box1X + 4, inY1); doc.setFont('helvetica', 'bold'); doc.text(formatCurr(totales.subtotal || 0), box1X + boxWidth - 4, inY1, { align: 'right' }); inY1 += 6;
            doc.setFont('helvetica', 'normal'); doc.text("Descuentos:", box1X + 4, inY1); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 53, 69); doc.text(`-${formatCurr(totales.descuentos || 0)}`, box1X + boxWidth - 4, inY1, { align: 'right' }); doc.setTextColor(...textDark); inY1 += 6;
            doc.setFont('helvetica', 'normal'); doc.text("Impuestos (IVA):", box1X + 4, inY1); doc.setFont('helvetica', 'bold'); doc.text(formatCurr(totales.iva || 0), box1X + boxWidth - 4, inY1, { align: 'right' }); inY1 += 4;

            // --- SECCIÓN TOTAL CORREGIDA ---
            // Le damos formato al TOTAL VENTAS para que no se salga de la caja (boxWidth)
            doc.setFontSize(11)
            doc.setTextColor(13, 110, 253) // Azul principal
            
            // Creamos una separación visual
            inY1 += 2
            
            // Dibujamos "TOTAL" y "VENTAS:" alineados a la izquierda
            doc.text("TOTAL", box1X + 4, inY1 + 5); 
            doc.text("VENTAS:", box1X + 4, inY1 + 10);
            
            // Dibujamos el valor de la moneda alineado totalmente a la derecha, en una sola línea y centrado respecto a los dos textos de la izquierda
            doc.setFontSize(11) 
            doc.text(formatCurr(totales.totalFacturado || 0), box1X + boxWidth - 4, inY1 + 7.5, { align: 'right' });
            
            doc.setTextColor(...textDark) // Restauramos color

            // CAJA 2: TIPO DE VENTA
            doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text("TIPO DE VENTA", box2X + (boxWidth/2), currentY + 7, { align: 'center' })
            doc.line(box2X + 4, currentY + 10, box2X + boxWidth - 4, currentY + 10)
            
            doc.setFontSize(11)
            let inY2 = currentY + 20;
            doc.setFont('helvetica', 'normal'); doc.text("Contado:", box2X + 4, inY2); doc.setFont('helvetica', 'bold'); doc.setTextColor(25, 135, 84); doc.text(formatCurr(totales.contado || 0), box2X + boxWidth - 4, inY2, { align: 'right' }); doc.setTextColor(...textDark); inY2 += 12;
            doc.setFont('helvetica', 'normal'); doc.text("Crédito:", box2X + 4, inY2); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 193, 7); doc.text(formatCurr(totales.credito || 0), box2X + boxWidth - 4, inY2, { align: 'right' }); doc.setTextColor(...textDark);

            // CAJA 3: MÉTODOS DE PAGO
            doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text("MÉTODOS DE PAGO", box3X + (boxWidth/2), currentY + 7, { align: 'center' })
            doc.line(box3X + 4, currentY + 10, box3X + boxWidth - 4, currentY + 10)
            
            doc.setFontSize(10)
            let inY3 = currentY + 18;
            metodos.forEach(([metodo, valor]) => {
                doc.setFont('helvetica', 'normal'); 
                
                let metName = metodo;
                if(doc.getTextWidth(metName) > boxWidth - 25){
                    metName = metName.substring(0, 15) + '...';
                }

                doc.text(metName + ':', box3X + 4, inY3); 
                doc.setFont('helvetica', 'bold'); 
                doc.text(formatCurr(valor), box3X + boxWidth - 4, inY3, { align: 'right' }); 
                inY3 += 7;
            })

            currentY += boxHeight + 10
        }
    } else {
        doc.setFontSize(14)
        doc.text(title, 14, 15)
        if (subtitle) {
            doc.setFontSize(10)
            doc.setTextColor(100)
            doc.text(subtitle, 14, 22)
            currentY = 28
        }
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textMuted)
    doc.text("Desglose de Facturas", 14, currentY)
    currentY += 2
    doc.setLineWidth(0.2)
    doc.line(14, currentY, rightMargin, currentY)
    currentY += 4

    const pureData = data.filter(row => !row.includes("TOTALES GLOBALES"));

    autoTable(doc, {
        head: [columns],
        body: pureData,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [248, 249, 250], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
        styles: { fontSize: 9, textColor: [0, 0, 0], font: 'helvetica', lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2, valign: 'middle' },
        bodyStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center' }, 
            1: { halign: 'center', fontStyle: 'bold' }, 
            2: { halign: 'left' },   
            3: { halign: 'center' }, 
            4: { halign: 'right', fontStyle: 'bold' },   
            5: { halign: 'right', fontStyle: 'bold', textColor: [25, 135, 84] }    
        }
    })

    doc.save(`${filename}.pdf`)
}