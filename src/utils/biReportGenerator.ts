// utils/biReportGenerator.ts - Fixed Layout Version with Detailed Summary
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BIReportData {
    pharmacyName: string;
    currency: string;
    period: string;
    generatedAt: string;
    metrics: {
        totalRevenue: number;
        totalItems: number;
        totalTransactions: number;
        uniqueCustomers: number;
        avgTransaction: number;
        profitMargin: number;
    };
    topProducts: Array<{
        name: string;
        quantity: number;
        revenue: number;
    }>;
    paymentMethods: Array<{
        method: string;
        count: number;
        revenue: number;
        percentage: number;
    }>;
    peakHours: Array<{
        hour: number;
        revenue: number;
        count: number;
    }>;
    insights: Array<{
        title: string;
        description: string;
        type: 'positive' | 'warning' | 'critical' | 'info';
    }>;
    detailedSummary?: string; // Add this field
}

// Branding footer
const addFooter = (doc: jsPDF) => {
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');

    const footerTexts = [
        'Powered by Pharmienta Kenya',
        'For more info: pharmienta@gmail.com | 0717 517 371'
    ];

    footerTexts.forEach((line, index) => {
        doc.text(line, doc.internal.pageSize.width / 2, pageHeight - 10 + (index * 3), { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
};

// Add branded header
const addHeader = (doc: jsPDF, pharmacyName: string, period: string) => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');

    const pTitle = 'Pharm';
    const rTitle = 'ienta';
    const pTitleWidth = doc.getTextWidth(pTitle);
    const rTitleWidth = doc.getTextWidth(rTitle);
    const startXTitle = 105 - ((pTitleWidth + rTitleWidth) / 2);

    doc.setTextColor(0, 51, 102);
    doc.text(pTitle, startXTitle, 15);
    doc.setTextColor(180, 0, 0);
    doc.text(rTitle, startXTitle + pTitleWidth, 15);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('KENYA', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Oriented To Care', 105, 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(pharmacyName, 105, 35, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BUSINESS INTELLIGENCE REPORT', 105, 42, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${period}`, 105, 47, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 52, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 56, 196, 56);
};

// Draw a pie chart
const drawPieChart = (doc: jsPDF, data: number[], labels: string[], x: number, y: number, radius: number, colors: string[]) => {
    const total = data.reduce((sum, val) => sum + val, 0);
    if (total === 0) return;

    let startAngle = 0;
    const centerX = x;
    const centerY = y;

    data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const color = colors[index % colors.length] || '#2ea043';

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        doc.setFillColor(r, g, b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);

        doc.moveTo(centerX, centerY);
        const segments = 30;
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * sliceAngle;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            doc.lineTo(px, py);
        }
        doc.lineTo(centerX, centerY);
        doc.fill();
        doc.stroke();

        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = radius * 0.65;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;

        const percentage = ((value / total) * 100);
        if (percentage > 5) {
            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(`${percentage.toFixed(1)}%`, labelX, labelY, { align: 'center' });
            doc.setFont('helvetica', 'normal');
        }

        startAngle = endAngle;
    });

    // Legend - positioned below the pie chart
    const legendStartY = y + radius + 15;
    const cols = Math.min(3, labels.length);
    const itemsPerCol = Math.ceil(labels.length / cols);
    const legendSpacing = 15;

    labels.forEach((label, index) => {
        const color = colors[index % colors.length] || '#2ea043';
        const col = Math.floor(index / itemsPerCol);
        const row = index % itemsPerCol;

        const legendX = x - (cols - 1) * 30 + col * 60;
        const legendY = legendStartY + row * legendSpacing;

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        doc.setFillColor(r, g, b);
        doc.rect(legendX, legendY, 5, 5, 'F');
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text(label, legendX + 8, legendY + 4);
    });
};

// Draw a bar chart
const drawBarChart = (doc: jsPDF, data: number[], labels: string[], x: number, y: number, width: number, height: number, colors: string[]) => {
    const maxValue = Math.max(...data, 1);
    const barWidth = Math.min(width / data.length * 0.7, 15);
    const gap = (width - (barWidth * data.length)) / (data.length + 1);

    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * height;
        const barX = x + gap + index * (barWidth + gap);
        const barY = y + height - barHeight;
        const color = colors[index % colors.length] || '#2ea043';

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        doc.setFillColor(r, g, b);
        doc.rect(barX, barY, barWidth, barHeight, 'F');

        if (value > 0) {
            doc.setFontSize(5);
            doc.setTextColor(50, 50, 50);
            doc.text(value.toString(), barX + barWidth / 2, barY - 2, { align: 'center' });
        }
    });

    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    labels.forEach((label, index) => {
        const labelX = x + gap + index * (barWidth + gap) + barWidth / 2;
        doc.text(label, labelX, y + height + 4, { align: 'center' });
    });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    for (let i = 1; i < 5; i++) {
        const yPos = y + height - (i / 4) * height;
        doc.line(x, yPos, x + width, yPos);
    }
};

// Draw a line chart
const drawLineChart = (doc: jsPDF, data: number[], labels: string[], x: number, y: number, width: number, height: number, color: string) => {
    const maxValue = Math.max(...data, 1);
    const points = data.map((value, index) => {
        const xPos = x + (index / (data.length - 1 || 1)) * width;
        const yPos = y + height - (value / maxValue) * height;
        return { x: xPos, y: yPos };
    });

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1);
    points.forEach((point, index) => {
        if (index === 0) {
            doc.moveTo(point.x, point.y);
        } else {
            doc.lineTo(point.x, point.y);
        }
    });
    doc.stroke();

    points.forEach((point) => {
        doc.setFillColor(r, g, b);
        doc.circle(point.x, point.y, 2, 'F');
    });

    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    const step = Math.max(1, Math.floor(labels.length / 12));
    labels.forEach((label, index) => {
        if (index % step === 0 || index === labels.length - 1) {
            const labelX = x + (index / (labels.length - 1 || 1)) * width;
            doc.text(label, labelX, y + height + 4, { align: 'center' });
        }
    });

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const value = (maxValue / ySteps) * i;
        const yPos = y + height - (i / ySteps) * height;
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100);
        doc.text(value.toFixed(0), x - 6, yPos, { align: 'right' });
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    for (let i = 1; i < 5; i++) {
        const yPos = y + height - (i / 5) * height;
        doc.line(x, yPos, x + width, yPos);
    }
};

// Add metrics section
const addMetricsSection = (doc: jsPDF, data: BIReportData, startY: number) => {
    const { metrics, currency } = data;
    let y = startY;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('KEY PERFORMANCE METRICS', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const metricRows = [
        ['Total Revenue', `${currency} ${metrics.totalRevenue.toLocaleString()}`],
        ['Total Items Sold', metrics.totalItems.toLocaleString()],
        ['Total Transactions', metrics.totalTransactions.toLocaleString()],
        ['Unique Customers', metrics.uniqueCustomers.toLocaleString()],
        ['Average Transaction Value', `${currency} ${metrics.avgTransaction.toFixed(2)}`],
        ['Profit Margin', `${metrics.profitMargin.toFixed(1)}%`],
    ];

    const colWidth = 70;
    const rowHeight = 6;
    let currentX = 14;
    let currentY = y;

    metricRows.forEach((row, index) => {
        const colIndex = index % 3;
        const rowIndex = Math.floor(index / 3);

        if (colIndex === 0 && rowIndex > 0) {
            currentX = 14;
            currentY += rowHeight;
        }

        doc.text(`${row[0]}:`, currentX, currentY);
        doc.setFont('helvetica', 'bold');
        doc.text(row[1], currentX + 55, currentY);
        doc.setFont('helvetica', 'normal');

        currentX += colWidth + 5;
    });

    return currentY + 10;
};

// Add top products section with bar chart
const addTopProductsSection = (doc: jsPDF, data: BIReportData, startY: number) => {
    let y = startY;

    if (data.topProducts.length === 0) return y;

    // Check if we need a new page
    if (y > 180) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('TOP SELLING PRODUCTS', 14, y);
    y += 5;

    const topProducts = data.topProducts.slice(0, 8);
    const productNames = topProducts.map(p => p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name);
    const revenues = topProducts.map(p => p.revenue);
    const quantities = topProducts.map(p => p.quantity);
    const colors = ['#2ea043', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#10b981', '#f97316'];

    // Draw bar chart for revenue
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Revenue by Product', 14, y + 4);
    drawBarChart(doc, revenues, productNames, 14, y + 8, 90, 45, colors);

    // Draw bar chart for quantity
    doc.text('Quantity Sold by Product', 110, y + 4);
    drawBarChart(doc, quantities, productNames, 110, y + 8, 80, 45, colors);

    y += 65;

    // Table with detailed data
    if (y > 220) { doc.addPage(); y = 20; }

    const productRows = data.topProducts.slice(0, 10).map((p, idx) => [
        `#${idx + 1}`,
        p.name,
        p.quantity.toString(),
        `${data.currency} ${p.revenue.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Rank', 'Product', 'Qty Sold', 'Revenue']],
        body: productRows,
        theme: 'striped',
        styles: { fontSize: 7 },
        headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

// Add payment methods section with pie chart
const addPaymentMethodsSection = (doc: jsPDF, data: BIReportData, startY: number) => {
    let y = startY;

    if (data.paymentMethods.length === 0) return y;

    // Check if we need a new page
    if (y > 180) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('PAYMENT METHODS BREAKDOWN', 14, y);
    y += 5;

    const methods = data.paymentMethods.map(p => p.method.charAt(0).toUpperCase() + p.method.slice(1));
    const revenues = data.paymentMethods.map(p => p.revenue);
    const colors = ['#10b981', '#059669', '#3b82f6', '#8b5cf6', '#06b6d4', '#6b7280'];

    // Draw pie chart with smaller radius to fit
    const pieRadius = 40;
    const pieX = 60;
    const pieY = y + 35;

    drawPieChart(doc, revenues, methods, pieX, pieY, pieRadius, colors);

    // Calculate the total height used by the pie chart and legend
    const legendHeight = Math.ceil(methods.length / 3) * 15 + 10;
    y = pieY + pieRadius + legendHeight + 10;

    // Table with detailed data
    if (y > 220) { doc.addPage(); y = 20; }

    const paymentRows = data.paymentMethods.map(p => [
        p.method.charAt(0).toUpperCase() + p.method.slice(1),
        p.count.toString(),
        `${data.currency} ${p.revenue.toFixed(2)}`,
        `${p.percentage.toFixed(1)}%`
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Method', 'Transactions', 'Revenue', 'Percentage']],
        body: paymentRows,
        theme: 'striped',
        styles: { fontSize: 7 },
        headStyles: {
            fillColor: [14, 116, 144],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 45, halign: 'right' },
            3: { cellWidth: 35, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

// Add peak hours section with line chart
const addPeakHoursSection = (doc: jsPDF, data: BIReportData, startY: number) => {
    let y = startY;

    if (data.peakHours.length === 0) return y;

    if (y > 180) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('PEAK BUSINESS HOURS', 14, y);
    y += 5;

    const sortedHours = [...data.peakHours].sort((a, b) => a.hour - b.hour);
    const hourLabels = sortedHours.map(h => {
        if (h.hour === 0) return '12am';
        if (h.hour < 12) return `${h.hour}am`;
        if (h.hour === 12) return '12pm';
        return `${h.hour - 12}pm`;
    });
    const revenues = sortedHours.map(h => h.revenue);

    // Draw line chart
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Revenue by Hour', 14, y + 4);
    drawLineChart(doc, revenues, hourLabels, 14, y + 8, 130, 45, '#2ea043');
    y += 60;

    // Table with detailed data
    if (y > 220) { doc.addPage(); y = 20; }

    const hourRows = data.peakHours.slice(0, 8).map(h => {
        const hourStr = h.hour >= 12 ? `${h.hour === 0 ? 12 : h.hour - 12}:00 ${h.hour >= 12 ? 'PM' : 'AM'}` : `${h.hour}:00 AM`;
        return [
            hourStr,
            h.count.toString(),
            `${data.currency} ${h.revenue.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['Time', 'Transactions', 'Revenue']],
        body: hourRows,
        theme: 'striped',
        styles: { fontSize: 7 },
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: 50, halign: 'center' },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

// Add insights section
const addInsightsSection = (doc: jsPDF, data: BIReportData, startY: number) => {
    let y = startY;

    if (data.insights.length === 0) return y;

    if (y > 180) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('SMART INSIGHTS & RECOMMENDATIONS', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    data.insights.slice(0, 8).forEach((insight, index) => {
        const color = insight.type === 'positive' ? [0, 150, 0] :
            insight.type === 'warning' ? [200, 150, 0] :
                insight.type === 'critical' ? [200, 0, 0] :
                    [0, 100, 200];

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${insight.title}`, 14, y);
        y += 4.5;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(insight.description, 175);
        lines.forEach((line: string) => {
            doc.text(`   ${line}`, 14, y);
            y += 4;
        });

        y += 3;
    });

    return y + 6;
};

// Add detailed summary section
const addDetailedSummarySection = (doc: jsPDF, data: BIReportData, startY: number) => {
    let y = startY;

    // Check if we have a detailed summary
    if (!data.detailedSummary) return y;

    // Check if we need a new page
    if (y > 180) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('DETAILED EXECUTIVE SUMMARY', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Split the summary into lines
    const summaryLines = data.detailedSummary.split('\n');

    summaryLines.forEach((line) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
            // Add section title on new page
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 51, 102);
            doc.text('DETAILED EXECUTIVE SUMMARY (continued)', 14, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
        }

        // Check if it's a section header (contains ':' or is all caps)
        const isHeader = line.includes(':') || line === line.toUpperCase();
        const isSeparator = line.startsWith('=') || line.startsWith('-');

        if (isHeader && !isSeparator) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 51, 102);
        } else if (isSeparator) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
        }

        // Handle indentation
        const indent = line.startsWith('  ') ? 6 : 0;
        const text = line.trim();

        if (text) {
            const splitLines = doc.splitTextToSize(text, 180 - indent);
            splitLines.forEach((splitLine: string) => {
                doc.text(splitLine, 14 + indent, y);
                y += 4;
            });
        } else {
            y += 2; // Empty line
        }
    });

    // Reset text color and font
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    return y + 6;
};

// Main export function
export function generateBIReportPdf(data: BIReportData) {
    const doc = new jsPDF();

    // Add header
    const periodStr = data.period || 'All Time';
    addHeader(doc, data.pharmacyName, periodStr);

    let y = 64;

    // Metrics
    y = addMetricsSection(doc, data, y);

    // Top Products with Charts
    y = addTopProductsSection(doc, data, y);

    // Payment Methods with Pie Chart
    y = addPaymentMethodsSection(doc, data, y);

    // Peak Hours with Line Chart
    y = addPeakHoursSection(doc, data, y);

    // Insights
    y = addInsightsSection(doc, data, y);

    // Detailed Summary
    y = addDetailedSummarySection(doc, data, y);

    // Footer
    if (y > 270) {
        doc.addPage();
        addFooter(doc);
    } else {
        addFooter(doc);
    }

    // Save
    const todayStr = new Date().toISOString().split('T')[0];
    doc.save(`BI_Report_${todayStr}.pdf`);
}