import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const isCreditBalanceMethod = (methodName) => {
    return String(methodName || '').trim().toLowerCase() === 'saldo a favor'
}

const fitFontSize = (doc, text, maxWidth, baseSize, minSize = 7.5) => {
    let currentSize = baseSize
    doc.setFontSize(currentSize)
    while (doc.getTextWidth(text) > maxWidth && currentSize > minSize) {
        currentSize -= 0.5
        doc.setFontSize(currentSize)
    }
    return currentSize
}

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
        }).format(val || 0)
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    const textDark = [33, 37, 41]
    const textMuted = [108, 117, 125]
    const borderColor = [108, 117, 125]
    const primaryBlue = [13, 110, 253]
    const successGreen = [25, 135, 84]
    const dangerRed = [220, 53, 69]
    const warningAmber = [217, 140, 0]

    let currentY = 15
    let startX = 14
    const rightMargin = pageWidth - 14

    if (configuracion) {
        if (configuracion.logo_almacen) {
            try {
                let imgFormat = 'JPEG'
                if (configuracion.logo_almacen.includes('image/png')) imgFormat = 'PNG'
                else if (configuracion.logo_almacen.includes('image/webp')) imgFormat = 'WEBP'

                doc.addImage(configuracion.logo_almacen, imgFormat, startX, currentY, 20, 20)
                startX += 25
            } catch (err) {
                console.error('Error rendering store logo in report PDF', err)
            }
        }

        doc.setFontSize(22)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textMuted)
        doc.text(title.toUpperCase(), rightMargin, currentY + 7, { align: 'right' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...textMuted)

        const subtitleLines = doc.splitTextToSize(subtitle || '', 85)
        doc.text(subtitleLines, rightMargin, currentY + 13, { align: 'right' })

        doc.setFontSize(9)
        const generatedY = currentY + 18 + Math.max(0, subtitleLines.length - 1) * 4
        doc.text(`Generado: ${new Date().toLocaleString(formato_numero)}`, rightMargin, generatedY, { align: 'right' })

        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textDark)
        const maxStoreNameWidth = (pageWidth / 2) - startX + 10
        const storeNameLines = doc.splitTextToSize(configuracion.nombre_almacen?.toUpperCase() || 'MI EMPRESA', maxStoreNameWidth)
        doc.text(storeNameLines, startX, currentY + 7)

        const textY = currentY + 7 + ((storeNameLines.length - 1) * 7) + 6

        doc.setFontSize(10)
        if (configuracion.nit_almacen) {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...textDark)
            doc.text('NIT:', startX, textY)
            doc.setFont('helvetica', 'normal')
            doc.text(configuracion.nit_almacen, startX + 8, textY)
        }

        currentY = Math.max(textY + 10, generatedY + 6, currentY + 28)
        doc.setDrawColor(...textDark)
        doc.setLineWidth(0.6)
        doc.line(14, currentY, rightMargin, currentY)
        currentY += 6

        if (totales) {
            const boxWidth = (pageWidth - 28 - 10) / 3
            const box1X = 14
            const box2X = 14 + boxWidth + 5
            const box3X = 14 + (boxWidth * 2) + 10
            const innerPad = 3.5

            const rawMethods = totales.metodosPago || totales.metodos || {}
            const methodEntries = Object.entries(rawMethods).filter(([methodName]) => methodName !== 'Crédito')
            const hasCreditBalanceMethod = methodEntries.some(([methodName]) => isCreditBalanceMethod(methodName))

            const invoicesCount = totales.facturasCount ?? data.filter(row => !row.some(cell => String(cell).includes('TOTALES'))).length
            const paymentsCount = Number(totales.abonosCount) || 0
            const pendingDebt = Number(totales.saldoPendiente) || 0
            const cashInflowTotal = Number(totales.ingresoTotalCaja) || 0
            const totalInvoiced = Number(totales.totalFacturado) || 0

            // Compute required height for each box so nothing ever overflows
            const box1BaseLines = 4 + (paymentsCount > 0 ? 1 : 0)
            const box1Height = 14 + (box1BaseLines * 5) + 15.5
            const box2Height = pendingDebt > 0 ? 44 : 36
            const box3Height = 15 + (Math.max(1, methodEntries.length) * 5.5) + (hasCreditBalanceMethod ? 7 : 3)
            const boxHeight = Math.max(48, box1Height, box2Height, box3Height)

            doc.setDrawColor(...borderColor)
            doc.setLineWidth(0.2)

            // --- BOX 1: RESUMEN FINANCIERO ---
            doc.roundedRect(box1X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...textDark)
            doc.text('RESUMEN FINANCIERO', box1X + (boxWidth / 2), currentY + 6.5, { align: 'center' })
            doc.line(box1X + innerPad, currentY + 9.5, box1X + boxWidth - innerPad, currentY + 9.5)

            doc.setFontSize(9)
            let box1Y = currentY + 14.5

            const drawSummaryRow = (label, valueText, valueColor = textDark) => {
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(...textDark)
                doc.setFontSize(9)
                doc.text(label, box1X + innerPad, box1Y)

                doc.setFont('helvetica', 'bold')
                doc.setTextColor(...valueColor)
                fitFontSize(doc, valueText, boxWidth * 0.48, 9, 7.5)
                doc.text(valueText, box1X + boxWidth - innerPad, box1Y, { align: 'right' })
                box1Y += 5
            }

            drawSummaryRow('Facturas Emitidas:', String(invoicesCount))
            if (paymentsCount > 0) {
                drawSummaryRow('Abonos Cartera:', String(paymentsCount))
            }
            drawSummaryRow('Subtotal Neto:', formatCurr(totales.subtotal || 0))
            drawSummaryRow('Descuentos:', `-${formatCurr(totales.descuentos || 0)}`, dangerRed)
            drawSummaryRow('Impuestos (IVA):', formatCurr(totales.iva || 0))

            doc.setDrawColor(...borderColor)
            doc.line(box1X + innerPad, box1Y - 2, box1X + boxWidth - innerPad, box1Y - 2)
            box1Y += 3

            const drawTotalHighlightRow = (label, amountValue, color) => {
                const valueStr = formatCurr(amountValue)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(...color)

                doc.setFontSize(8.5)
                doc.text(label, box1X + innerPad, box1Y)

                const labelWidth = doc.getTextWidth(label)
                const availableValueWidth = Math.max(14, boxWidth - (innerPad * 2) - labelWidth - 2)
                fitFontSize(doc, valueStr, availableValueWidth, 9.5, 7)
                doc.text(valueStr, box1X + boxWidth - innerPad, box1Y, { align: 'right' })
                box1Y += 5.5
            }

            drawTotalHighlightRow('TOTAL FACTURADO:', totalInvoiced, primaryBlue)
            drawTotalHighlightRow('INGRESO CAJA:', cashInflowTotal, successGreen)

            doc.setTextColor(...textDark)

            // --- BOX 2: TIPO DE VENTA ---
            doc.setDrawColor(...borderColor)
            doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('TIPO DE VENTA', box2X + (boxWidth / 2), currentY + 6.5, { align: 'center' })
            doc.line(box2X + innerPad, currentY + 9.5, box2X + boxWidth - innerPad, currentY + 9.5)

            let box2Y = currentY + 19
            const cashSalesStr = formatCurr(totales.contado || 0)
            doc.setFontSize(10.5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...textDark)
            doc.text('Contado:', box2X + innerPad, box2Y)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...successGreen)
            fitFontSize(doc, cashSalesStr, boxWidth - 24, 11, 8)
            doc.text(cashSalesStr, box2X + boxWidth - innerPad, box2Y, { align: 'right' })

            box2Y += 10
            const creditSalesStr = formatCurr(totales.credito || 0)
            doc.setFontSize(10.5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...textDark)
            doc.text('Crédito:', box2X + innerPad, box2Y)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...warningAmber)
            fitFontSize(doc, creditSalesStr, boxWidth - 24, 11, 8)
            doc.text(creditSalesStr, box2X + boxWidth - innerPad, box2Y, { align: 'right' })

            if (pendingDebt > 0) {
                box2Y += 5.5
                doc.setDrawColor(222, 226, 230)
                doc.line(box2X + innerPad, box2Y, box2X + boxWidth - innerPad, box2Y)
                box2Y += 5.5

                const pendingStr = formatCurr(pendingDebt)
                doc.setFontSize(8.5)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(...textMuted)
                doc.text('Pendiente Cartera:', box2X + innerPad, box2Y)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(...dangerRed)
                fitFontSize(doc, pendingStr, boxWidth - 32, 9, 7.5)
                doc.text(pendingStr, box2X + boxWidth - innerPad, box2Y, { align: 'right' })
            }

            doc.setTextColor(...textDark)

            // --- BOX 3: MÉTODOS DE PAGO ---
            doc.setDrawColor(...borderColor)
            doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('MÉTODOS DE PAGO', box3X + (boxWidth / 2), currentY + 6.5, { align: 'center' })
            doc.line(box3X + innerPad, currentY + 9.5, box3X + boxWidth - innerPad, currentY + 9.5)

            let box3Y = currentY + 15.5
            if (methodEntries.length === 0) {
                doc.setFontSize(8.5)
                doc.setFont('helvetica', 'italic')
                doc.setTextColor(...textMuted)
                doc.text('Sin ingresos registrados.', box3X + (boxWidth / 2), box3Y + 4, { align: 'center' })
            } else {
                methodEntries.forEach(([methodName, amountValue]) => {
                    const isCredit = isCreditBalanceMethod(methodName)
                    const amountStr = formatCurr(amountValue)

                    doc.setFontSize(9)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(...(isCredit ? textMuted : textDark))

                    let displayLabel = `${methodName}${isCredit ? '*' : ''}:`
                    const maxLabelWidth = boxWidth - (innerPad * 2) - 20
                    while (doc.getTextWidth(displayLabel) > maxLabelWidth && displayLabel.length > 6) {
                        displayLabel = `${displayLabel.slice(0, -4)}...:`
                    }

                    doc.text(displayLabel, box3X + innerPad, box3Y)
                    doc.setFont('helvetica', 'bold')
                    fitFontSize(doc, amountStr, 22, 9, 7.5)
                    doc.text(amountStr, box3X + boxWidth - innerPad, box3Y, { align: 'right' })
                    box3Y += 5.5
                })

                if (hasCreditBalanceMethod) {
                    doc.setFontSize(7.5)
                    doc.setFont('helvetica', 'italic')
                    doc.setTextColor(...textMuted)
                    doc.text('* No suma a Ingreso Caja', box3X + innerPad, currentY + boxHeight - 3)
                }
            }

            doc.setTextColor(...textDark)
            currentY += boxHeight + 9
        }
    } else {
        doc.setFontSize(14)
        doc.setTextColor(...textDark)
        doc.text(title, 14, 15)
        if (subtitle) {
            doc.setFontSize(10)
            doc.setTextColor(100)
            doc.text(subtitle, 14, 22)
            currentY = 28
        }
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textMuted)
    doc.text(totales ? 'Desglose de Transacciones' : 'Detalle de Registros', 14, currentY)
    currentY += 2
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.2)
    doc.line(14, currentY, rightMargin, currentY)
    currentY += 4

    const pureData = data.filter(row => !row.includes('TOTALES GLOBALES'))

    const dynamicColumnStyles = {}
    columns.forEach((colLabel, idx) => {
        const lowerLabel = String(colLabel || '').toLowerCase()
        if (lowerLabel.includes('hora') || lowerLabel.includes('fecha')) {
            dynamicColumnStyles[idx] = { halign: 'center' }
        } else if (lowerLabel.includes('documento') || lowerLabel.includes('factura')) {
            dynamicColumnStyles[idx] = { halign: 'center', fontStyle: 'bold' }
        } else if (lowerLabel.includes('cliente') || lowerLabel.includes('concepto')) {
            dynamicColumnStyles[idx] = { halign: 'left' }
        } else if (lowerLabel.includes('ingreso') || lowerLabel.includes('abono')) {
            dynamicColumnStyles[idx] = { halign: 'right', fontStyle: 'bold' }
        } else if (lowerLabel.includes('venta') || lowerLabel.includes('total') || lowerLabel.includes('deuda')) {
            dynamicColumnStyles[idx] = { halign: 'right', fontStyle: 'bold' }
        }
    })

    autoTable(doc, {
        head: [columns],
        body: pureData,
        startY: currentY,
        theme: 'grid',
        headStyles: {
            fillColor: [248, 249, 250],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.2,
            lineColor: [0, 0, 0]
        },
        styles: {
            fontSize: 8.5,
            textColor: [0, 0, 0],
            font: 'helvetica',
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            cellPadding: 2,
            valign: 'middle'
        },
        bodyStyles: { fillColor: [255, 255, 255] },
        columnStyles: dynamicColumnStyles,
        didParseCell: (cellData) => {
            if (cellData.section !== 'body') return

            const colHeader = String(columns[cellData.column.index] || '').toLowerCase()
            const rawText = String(cellData.cell.raw || '').trim()

            if (colHeader.includes('ingreso') || colHeader.includes('abono')) {
                const isOnlyCredit = rawText.toLowerCase().startsWith('saldo a favor')
                const isZero = rawText === '$0' || rawText === '$ 0' || rawText === '0' || rawText === '-'

                if (isOnlyCredit || isZero) {
                    cellData.cell.styles.textColor = textMuted
                    cellData.cell.styles.fontStyle = 'normal'
                } else {
                    cellData.cell.styles.textColor = successGreen
                    cellData.cell.styles.fontStyle = 'bold'
                }
            }
        }
    })

    doc.save(`${filename}.pdf`)
}