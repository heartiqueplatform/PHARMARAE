// utils/requestedItemsPdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define the RequestedItem type locally
interface RequestedItem {
    id: string;
    item_name: string;
    generic_name?: string;
    brand_name?: string;
    category?: string;
    form?: string;
    strength?: string;
    request_count: number;
    status: 'pending' | 'ordered' | 'added_to_inventory' | 'discontinued';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    notes?: string;
    requested_by?: string;
    customer_phone?: string;
    estimated_demand?: number;
    last_requested_at: string;
    created_at?: string;
    updated_at?: string;
}

interface Pharmacy {
    name: string;
    address?: string;
    phone: string;
    currency?: string;
    receipt_header?: string;
    receipt_footer?: string;
}

// Branding footer helper (clean version without emojis)
const addBrandingFooter = (doc: jsPDF, y?: number) => {
    const pageHeight = doc.internal.pageSize.height;
    const startY = y || pageHeight - 12;

    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');

    const footerTexts = [
        'Powered by Pharmienta Kenya',
        'For more info: pharmienta@gmail.com | 0717517371'
    ];

    footerTexts.forEach((line, index) => {
        doc.text(line, doc.internal.pageSize.width / 2, startY + (index * 3), { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
};

/**
 * Generate a Professional PDF Report for Most Requested Items
 * CLEAN VERSION - No emojis, proper text formatting
 */
export function generateMostRequestedReportPdf(
    pharmacy: Pharmacy,
    requestedItems: RequestedItem[],
    currency: string = 'KSh'
) {
    const doc = new jsPDF();
    const currencySymbol = currency;

    // --- HEADER: Pharmienta Kenya Branding ---
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
    doc.text(pharmacy.name, 105, 35, { align: 'center' });

    // --- REPORT TITLE ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('MOST REQUESTED ITEMS REPORT', 105, 42, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 47, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(14, 51, 196, 51);

    // --- CALCULATE KEY METRICS (KPIs) ---
    const totalItems = requestedItems.length;
    const totalRequests = requestedItems.reduce((sum, i) => sum + (i.request_count || 0), 0);
    const urgentCount = requestedItems.filter(i => i.priority === 'urgent').length;
    const highPriorityCount = requestedItems.filter(i => i.priority === 'high').length;
    const pendingCount = requestedItems.filter(i => i.status === 'pending').length;
    const orderedCount = requestedItems.filter(i => i.status === 'ordered').length;
    const addedToInventoryCount = requestedItems.filter(i => i.status === 'added_to_inventory').length;

    // Sort items by request count for the top list
    const sortedItems = [...requestedItems].sort((a, b) => (b.request_count || 0) - (a.request_count || 0));
    const top5Items = sortedItems.slice(0, 5);

    // --- DISPLAY KPIs ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators (KPIs)', 14, 59);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Row 1 of KPIs
    doc.text(`Total Items Monitored: ${totalItems}`, 14, 66);
    doc.text(`Total Customer Requests: ${totalRequests}`, 110, 66);

    // Row 2 of KPIs
    doc.text(`Urgent Items: ${urgentCount}`, 14, 71);
    doc.text(`High Priority Items: ${highPriorityCount}`, 110, 71);

    // Row 3 of KPIs
    doc.text(`Pending Orders: ${pendingCount}`, 14, 76);
    doc.text(`Orders Placed: ${orderedCount}`, 110, 76);

    // Row 4 of KPIs
    doc.text(`Added to Inventory: ${addedToInventoryCount}`, 14, 81);

    // --- TOP 5 MOST REQUESTED ITEMS (Clean version without emojis) ---
    let yPos = 88;

    if (top5Items.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TOP 5 MOST REQUESTED ITEMS', 14, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        top5Items.forEach((item, index) => {
            const rank = `${index + 1}.`;
            const priorityLabel = item.priority.toUpperCase();
            doc.text(
                `${rank} ${item.item_name} - ${item.request_count} requests (${priorityLabel} Priority)`,
                14,
                yPos
            );
            yPos += 4;
        });

        yPos += 4; // Add some spacing
    }

    // --- DETAILED TABLE OF ALL REQUESTED ITEMS ---
    if (requestedItems.length === 0) {
        doc.setFontSize(10);
        doc.text('No items have been requested yet.', 14, yPos);
    } else {
        // Prepare the table data
        const tableRows = sortedItems.map(item => [
            item.item_name,
            item.category || 'N/A',
            item.priority?.toUpperCase() || 'N/A',
            item.status?.replace('_', ' ')?.toUpperCase() || 'N/A',
            (item.request_count || 0).toString(),
            item.estimated_demand ? `${item.estimated_demand}/month` : 'N/A'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [
                ['Product Name', 'Category', 'Priority', 'Status', 'Requests', 'Est. Demand']
            ],
            body: tableRows,
            theme: 'striped',
            styles: { fontSize: 7.5 },
            headStyles: {
                fillColor: [0, 51, 102],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 25, halign: 'center' },
            },
            margin: { left: 14, right: 14 },
            alternateRowStyles: { fillColor: [240, 248, 255] }
        });
    }

    // Get the Y position after the table
    let yPosAfterTable = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : yPos + 20;

    // --- SMART INSIGHTS & RECOMMENDATIONS (Clean version) ---
    if (yPosAfterTable > 230) {
        doc.addPage();
        yPosAfterTable = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('Smart Insights & Recommendations', 14, yPosAfterTable);
    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let insightY = yPosAfterTable + 7;

    // Recommendation 1: Top items to order
    if (top5Items.length > 0) {
        const topNames = top5Items.map(i => i.item_name).join(', ');
        doc.text(`STOCK PRIORITY: The top requested items are: ${topNames}. Consider placing a priority order.`, 14, insightY);
        insightY += 5;
    }

    // Recommendation 2: Urgent items
    const urgentItems = sortedItems.filter(i => i.priority === 'urgent');
    if (urgentItems.length > 0) {
        const urgentNames = urgentItems.map(i => i.item_name).join(', ');
        doc.text(`URGENT ACTION: The following items are marked 'URGENT': ${urgentNames}. These need immediate attention.`, 14, insightY);
        insightY += 5;
    }

    // Recommendation 3: Status-based insight
    if (pendingCount > 0) {
        doc.text(`ORDER STATUS: ${pendingCount} item(s) are marked as "Pending". Follow up on these orders.`, 14, insightY);
        insightY += 5;
    }

    // Recommendation 4: Statistical insight
    if (totalRequests > 0 && totalItems > 0) {
        const avgRequests = (totalRequests / totalItems).toFixed(1);
        doc.text(`DEMAND INSIGHT: On average, each requested item has been requested ${avgRequests} times.`, 14, insightY);
        insightY += 5;
    }

    // Recommendation 5: Items with high estimated demand
    const highDemandItems = sortedItems.filter(i => (i.estimated_demand || 0) > 10);
    if (highDemandItems.length > 0) {
        const demandNames = highDemandItems.map(i => i.item_name).join(', ');
        doc.text(`HIGH DEMAND: Items with estimated monthly demand > 10 units: ${demandNames}.`, 14, insightY);
        insightY += 5;
    }

    // Recommendation 6: Items with many requests but not yet ordered
    const pendingHighDemand = sortedItems.filter(i => i.status === 'pending' && (i.request_count || 0) > 3);
    if (pendingHighDemand.length > 0) {
        const pendingNames = pendingHighDemand.map(i => i.item_name).join(', ');
        doc.text(`REVIEW NEEDED: These items have >3 requests but are still 'Pending': ${pendingNames}.`, 14, insightY);
        insightY += 5;
    }

    // --- EXECUTIVE SUMMARY BOX ---
    if (insightY > 230) {
        doc.addPage();
        insightY = 20;
    }

    insightY += 8;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.rect(14, insightY, 182, 35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text('EXECUTIVE SUMMARY', 20, insightY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Build summary text
    let summaryText = `This report monitors ${totalItems} requested items with a total of ${totalRequests} customer requests. `;
    if (urgentCount > 0) {
        summaryText += `${urgentCount} items are marked as URGENT requiring immediate action. `;
    }
    summaryText += `${pendingCount} orders are still pending. `;
    if (top5Items.length > 0) {
        summaryText += `The top requested item is "${top5Items[0].item_name}" with ${top5Items[0].request_count} requests.`;
    }

    doc.text(
        summaryText,
        20,
        insightY + 14,
        { maxWidth: 170 }
    );

    // --- FOOTER ---
    const footerY = insightY + 45;
    if (footerY > 270) {
        doc.addPage();
        addBrandingFooter(doc, 20);
    } else {
        addBrandingFooter(doc, Math.min(footerY, 280));
    }

    // --- SAVE THE PDF ---
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Most_Requested_Items_Report_${dateStr}.pdf`);
}