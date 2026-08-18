// components/views/InventoryView/InventoryPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, ProductBatch, Category, Pharmacy } from '../../../types';

// =============================================
// BRANDING FOOTER HELPER
// =============================================
const addBrandingFooter = (doc: jsPDF, y?: number) => {
    const pageHeight = doc.internal.pageSize.height;
    const startY = y || pageHeight - 12;

    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');

    const footerTexts = [
        'Powered by Pharmienta Kenya',
        'For more info: support@Pharmienta.com | 0717517371'
    ];

    footerTexts.forEach((line, index) => {
        doc.text(line, doc.internal.pageSize.width / 2, startY + (index * 3), { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
};

// =============================================
// GENERATE INVENTORY CATALOG PDF
// =============================================
export function generateInventoryCatalogPdf(
    pharmacy: Pharmacy,
    products: Product[],
    categories: Category[],
    batches: ProductBatch[]
) {
    const doc = new jsPDF('landscape');
    const currency = pharmacy.currency || 'KSh';

    // ---------- PAGE 1: HEADER & SUMMARY ----------

    // Pharmienta Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    const pText = 'PHARM';
    const rText = 'IENTA';
    const pWidth = doc.getTextWidth(pText);
    const rWidth = doc.getTextWidth(rText);
    const startX = (doc.internal.pageSize.width / 2) - ((pWidth + rWidth) / 2);

    doc.setTextColor(0, 51, 102);
    doc.text(pText, startX, 15);
    doc.setTextColor(180, 0, 0);
    doc.text(rText, startX + pWidth, 15);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('KENYA', doc.internal.pageSize.width / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Oriented to Care', doc.internal.pageSize.width / 2, 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');

    // Pharmacy Name
    doc.setFontSize(14);
    doc.text(pharmacy.name, doc.internal.pageSize.width / 2, 36, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Pharmacy Inventory Catalog`, doc.internal.pageSize.width / 2, 43, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, doc.internal.pageSize.width / 2, 48, { align: 'center' });

    // Contact Info
    doc.setFontSize(8);
    doc.text(`Phone: ${pharmacy.phone || 'N/A'}`, doc.internal.pageSize.width / 2, 54, { align: 'center' });
    if (pharmacy.address) {
        doc.text(`Address: ${pharmacy.address}`, doc.internal.pageSize.width / 2, 58, { align: 'center' });
    }

    doc.setLineWidth(0.5);
    doc.line(14, 63, doc.internal.pageSize.width - 14, 63);

    // Summary Cards
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.selling_price || 0)), 0);
    const totalCost = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.default_cost_price || 0)), 0);
    const lowStockCount = products.filter(p => (p.quantity || 0) <= (p.reorder_level || 10)).length;
    const outOfStock = products.filter(p => (p.quantity || 0) <= 0).length;
    const categoriesCount = categories.length;

    // Summary Grid
    const summaryData = [
        ['📦 Total Products', totalProducts.toString()],
        ['📊 Total Stock Units', totalStock.toString()],
        ['🏷️ Categories', categoriesCount.toString()],
        ['📈 Total Retail Value', `${currency} ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['💰 Total Cost Value', `${currency} ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['📉 Potential Profit', `${currency} ${(totalValue - totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['⚠️ Low Stock Items', `${lowStockCount}`],
        ['🚫 Out of Stock', `${outOfStock}`],
    ];

    autoTable(doc, {
        startY: 68,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
    });

    let nextY = (doc as any).lastAutoTable.finalY + 8;

    // Category Breakdown
    if (categories.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Category Breakdown', 14, nextY);
        nextY += 4;

        const categoryData = categories.map(cat => {
            const count = products.filter(p => p.category_id === cat.id).length;
            const stock = products.filter(p => p.category_id === cat.id).reduce((sum, p) => sum + (p.quantity || 0), 0);
            return [cat.name, count.toString(), stock.toString()];
        });

        autoTable(doc, {
            startY: nextY,
            head: [['Category', 'Products', 'Total Stock']],
            body: categoryData,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [14, 116, 144] },
            margin: { left: 14, right: 14 }
        });

        nextY = (doc as any).lastAutoTable.finalY + 8;
    }

    addBrandingFooter(doc);

    // ---------- PAGE 2+: PRODUCT LIST ----------
    doc.addPage();

    // Page Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Complete Product Inventory', 14, 15);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Total: ${products.length} products • Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.setLineWidth(0.3);
    doc.line(14, 25, doc.internal.pageSize.width - 14, 25);

    // Products Table
    const productRows = products.map(p => {
        const stock = p.quantity || 0;
        const status = stock <= 0 ? 'OUT OF STOCK' : stock <= (p.reorder_level || 10) ? 'LOW STOCK' : 'IN STOCK';
        const statusColor = stock <= 0 ? '⚠️' : stock <= (p.reorder_level || 10) ? '🟡' : '✅';

        return [
            p.name,
            p.generic_name || '-',
            p.brand || '-',
            p.category_name || 'General',
            p.form || 'N/A',
            p.strength || '-',
            stock.toString(),
            `${currency} ${(p.selling_price || 0).toFixed(2)}`,
            `${currency} ${(p.default_cost_price || 0).toFixed(2)}`,
            `${statusColor} ${status}`,
            p.zone || p.shelf_number || '-',
            p.storage_condition || 'Ambient'
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [
            ['Product', 'Generic', 'Brand', 'Category', 'Form', 'Strength', 'Stock', 'Price', 'Cost', 'Status', 'Location', 'Storage']
        ],
        body: productRows.length > 0 ? productRows : [['No products found', '', '', '', '', '', '0', '0', '0', 'No Stock', '-', '-']],
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontSize: 6,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
            6: { cellWidth: 12, halign: 'center' },
            7: { cellWidth: 18, halign: 'right' },
            8: { cellWidth: 18, halign: 'right' },
            9: { cellWidth: 22 },
            10: { cellWidth: 18 },
            11: { cellWidth: 18 }
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data: any) => {
            const pageCount = doc.internal.getNumberOfPages();
            const currentPage = doc.internal.currentPage || 1;
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${currentPage} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
            addBrandingFooter(doc, doc.internal.pageSize.height - 15);
        }
    });

    // ---------- PAGE 3+: BATCH INFORMATION ----------
    if (batches.length > 0) {
        doc.addPage();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 51, 102);
        doc.text('Batch & Expiry Tracking', 14, 15);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(`Total: ${batches.length} batches • Generated: ${new Date().toLocaleString()}`, 14, 22);
        doc.setLineWidth(0.3);
        doc.line(14, 25, doc.internal.pageSize.width - 14, 25);

        const today = new Date();
        const ninetyDays = new Date(today);
        ninetyDays.setDate(ninetyDays.getDate() + 90);

        const batchRows = batches.map(b => {
            const product = products.find(p => p.id === b.product_id);
            const isExpiring = new Date(b.expiry_date) <= ninetyDays;
            const isExpired = new Date(b.expiry_date) < today;
            const status = isExpired ? '🔴 EXPIRED' : isExpiring ? '🟡 EXPIRING SOON' : '🟢 GOOD';

            return [
                product?.name || 'Unknown',
                b.batch_number,
                b.expiry_date,
                b.quantity_base.toString(),
                `${currency} ${(b.cost_price || 0).toFixed(2)}`,
                `${currency} ${(b.selling_price || 0).toFixed(2)}`,
                status
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [
                ['Product', 'Batch #', 'Expiry', 'Qty', 'Cost', 'Sell Price', 'Status']
            ],
            body: batchRows,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: {
                fillColor: [14, 116, 144],
                textColor: [255, 255, 255],
                fontSize: 7,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 25 }
            },
            margin: { left: 10, right: 10 },
            didDrawPage: (data: any) => {
                const pageCount = doc.internal.getNumberOfPages();
                const currentPage = doc.internal.currentPage || 1;
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${currentPage} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
                addBrandingFooter(doc, doc.internal.pageSize.height - 15);
            }
        });
    }

    // ---------- FINAL PAGE: SUMMARY & SIGN-OFF ----------
    doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Inventory Summary & Sign-Off', 14, 15);
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(14, 20, doc.internal.pageSize.width - 14, 20);

    let sumY = 26;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Inventory Summary', 14, sumY);
    sumY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summaryDetails = [
        `Pharmacy Name: ${pharmacy.name}`,
        `Total Products: ${products.length}`,
        `Total Categories: ${categories.length}`,
        `Total Batches: ${batches.length}`,
        `Total Stock Units: ${products.reduce((sum, p) => sum + (p.quantity || 0), 0)}`,
        `Total Retail Value: ${currency} ${products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.selling_price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        `Total Cost Value: ${currency} ${products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.default_cost_price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        `Potential Profit: ${currency} ${(products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.selling_price || 0)), 0) - products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.default_cost_price || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        `Low Stock Items: ${products.filter(p => (p.quantity || 0) <= (p.reorder_level || 10)).length}`,
        `Out of Stock: ${products.filter(p => (p.quantity || 0) <= 0).length}`,
        `Expiring Batches (90 days): ${batches.filter(b => new Date(b.expiry_date) <= new Date(new Date().setDate(new Date().getDate() + 90))).length}`,
        `Report Generated: ${new Date().toLocaleString()}`,
        `Generated By: ${pharmacy.name} System`,
    ];

    summaryDetails.forEach(line => {
        doc.text(line, 14, sumY);
        sumY += 5;
    });

    sumY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Sign-Off & Certification', 14, sumY);
    sumY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('This inventory report is a true and accurate representation of the pharmacy stock as of the date above.', 14, sumY);
    sumY += 5;
    doc.text('I hereby confirm that the inventory has been verified and is accurate.', 14, sumY);
    sumY += 8;

    const lineY = sumY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('_________________________', 30, lineY);
    doc.text('_________________________', 130, lineY);
    doc.text('_________________________', doc.internal.pageSize.width - 50, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Pharmacy Manager', 30, lineY + 5);
    doc.text('Pharmacist / Storekeeper', 130, lineY + 5);
    doc.text('Date', doc.internal.pageSize.width - 50, lineY + 5);

    addBrandingFooter(doc);

    const fileName = `Inventory_Catalog_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}