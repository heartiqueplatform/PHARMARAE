import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pharmacy, Sale, Product, ProductBatch, StockMovement } from '../types';

// Branding footer helper
const addBrandingFooter = (doc: jsPDF, y?: number) => {
  const pageHeight = doc.internal.pageSize.height;
  const startY = y || pageHeight - 12;

  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');

  const footerTexts = [
    'Powered by MEDRAE NURSING KENYA',
    'For more info: medraenursing@gmail.com | 0704473503'
  ];

  footerTexts.forEach((line, index) => {
    doc.text(line, doc.internal.pageSize.width / 2, startY + (index * 3), { align: 'center' });
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
};

/**
 * Generate Professional Sales Receipt PDF
 * ✅ UPDATED: Uses single sale record (no sale_items array)
 */
export function generateReceiptPdf(
  pharmacy: Pharmacy,
  sale: Sale,
  saleItems: any[], // Kept for backward compatibility, but we use sale directly
  action: 'download' | 'print' = 'download'
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200]
  });

  const currency = pharmacy.currency || 'KSh';

  // Header - PHARMIENTA KENYA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);

  // "PHARMA" in navy blue
  const pText = 'PHARM';
  const rText = 'IENTA';
  const pWidth = doc.getTextWidth(pText);
  const rWidth = doc.getTextWidth(rText);
  const startX = 40 - ((pWidth + rWidth) / 2);

  doc.setTextColor(0, 51, 102);
  doc.text(pText, startX, 6);
  doc.setTextColor(180, 0, 0);
  doc.text(rText, startX + pWidth, 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.text('KENYA', 40, 10, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5);
  doc.setTextColor(80, 80, 80);
  doc.text('Oriented To Care ', 40, 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Pharmacy Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(pharmacy.name, 40, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let yPos = 24;
  if (pharmacy.address) {
    doc.text(pharmacy.address, 40, yPos, { align: 'center' });
    yPos += 4;
  }
  doc.text(`Phone: ${pharmacy.phone}`, 40, yPos, { align: 'center' });
  yPos += 4;

  if (pharmacy.receipt_header) {
    const headerLines = doc.splitTextToSize(pharmacy.receipt_header, 70);
    doc.text(headerLines, 40, yPos, { align: 'center' });
    yPos += 3 * headerLines.length;
  }

  doc.setLineWidth(0.3);
  doc.line(5, yPos + 2, 75, yPos + 2);
  yPos += 6;

  // Sale Details
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`RECEIPT #: ${sale.sale_number}`, 5, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(sale.sale_date || sale.created_at).toLocaleString()}`, 5, yPos);
  yPos += 4;
  doc.text(`Served By: ${sale.sold_by_name || 'Cashier'}`, 5, yPos);
  if (sale.customer_name) {
    yPos += 4;
    doc.text(`Customer: ${sale.customer_name}`, 5, yPos);
  }

  yPos += 3;
  doc.line(5, yPos, 75, yPos);
  yPos += 5;

  // ✅ Single Item from Sale (since we sell one item at a time)
  const itemName = sale.product_name || 'Unknown Product';
  const itemQty = sale.quantity || 1;
  const itemPrice = sale.unit_price || 0;
  const itemSubtotal = sale.subtotal || 0;

  const tableRows = [[
    itemName,
    itemQty.toString(),
    `${currency} ${itemPrice.toFixed(2)}`,
    `${currency} ${itemSubtotal.toFixed(2)}`
  ]];

  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: tableRows,
    theme: 'plain',
    styles: { fontSize: 6.5, cellPadding: 1 },
    headStyles: { fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' }
    },
    margin: { left: 5, right: 5 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 3;
  doc.line(5, finalY, 75, finalY);

  // Totals
  let ty = finalY + 4;
  doc.setFontSize(7);
  if (sale.discount > 0) {
    doc.text(`Subtotal:`, 35, ty);
    doc.text(`${currency} ${sale.subtotal.toFixed(2)}`, 75, ty, { align: 'right' });
    ty += 4;
    doc.text(`Discount:`, 35, ty);
    doc.text(`-${currency} ${sale.discount.toFixed(2)}`, 75, ty, { align: 'right' });
    ty += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`TOTAL PAID:`, 35, ty);
  doc.text(`${currency} ${sale.total.toFixed(2)}`, 75, ty, { align: 'right' });
  ty += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const paymentMethod = sale.payment_method || 'cash';
  doc.text(`Payment Method: ${paymentMethod.toUpperCase()}`, 5, ty);

  if (sale.payment_reference) {
    ty += 4;
    doc.text(`Ref: ${sale.payment_reference}`, 5, ty);
  }

  // Footer
  ty += 6;
  doc.setLineWidth(0.2);
  doc.line(10, ty, 70, ty);
  ty += 4;
  doc.setFontSize(6);
  const footerText = pharmacy.receipt_footer || 'Thank you for your visit. Get well soon!';
  const splitFooter = doc.splitTextToSize(footerText, 65);
  doc.text(splitFooter, 40, ty, { align: 'center' });

  // Branding Footer
  ty += 6;
  addBrandingFooter(doc, ty + 4);

  if (action === 'download') {
    doc.save(`Receipt_${sale.sale_number}.pdf`);
  } else {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
}

/**
 * Generate Professional Daily Report PDF
 * ✅ UPDATED: Uses single sale record with product details directly
 */
export function generateDailyReportPdf(
  pharmacy: Pharmacy,
  dateStr: string,
  sales: Sale[],
  movements: StockMovement[],
  lowStockItems: Product[],
  expiringItems: ProductBatch[]
) {
  const doc = new jsPDF();
  const currency = pharmacy.currency || 'KSh';

  // Title & Header - PHARMIENTA together
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  const pTitle = 'PHARM';
  const rTitle = 'IENTA';
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
  doc.text('Oriented To Care ', 105, 28, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(pharmacy.name, 105, 35, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`DAILY PHARMACY AUDIT REPORT — ${new Date(dateStr).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 42, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 47, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(14, 51, 196, 51);

  // Summary Cards Data - ✅ Using sale fields directly
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = sales.length;
  const totalItemsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalDiscounts = sales.reduce((sum, s) => sum + (s.discount || 0), 0);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Performance Indicators', 14, 59);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Sales Revenue: ${currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 66);
  doc.text(`Total Completed Transactions: ${totalTransactions}`, 14, 71);
  doc.text(`Total Drug Items Dispensed: ${totalItemsSold}`, 110, 66);
  doc.text(`Total Discount Granted: ${currency} ${totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 110, 71);

  // Payment Breakdown - ✅ Using sale.payment_method directly
  const paymentMethodTotals: Record<string, number> = {};
  sales.forEach(s => {
    const method = s.payment_method || 'cash';
    paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + s.total;
  });

  const paymentRows = Object.entries(paymentMethodTotals).map(([method, val]) => [
    method.toUpperCase(),
    `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: 77,
    head: [['Payment Method', 'Amount']],
    body: paymentRows.length > 0 ? paymentRows : [['None', `${currency} 0.00`]],
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 116, 144] },
    margin: { left: 14, right: 14 }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  // Detailed Transactions - ✅ Using sale fields directly
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detailed Transactions & Items Sold', 14, nextY);

  for (const sale of sales) {
    nextY += 6;

    if (nextY > 240) {
      doc.addPage();
      nextY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Detailed Transactions & Items Sold (continued)', 14, nextY);
      nextY += 6;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text(`Receipt #${sale.sale_number} | ${new Date(sale.sale_date || sale.created_at).toLocaleTimeString()} | ${sale.sold_by_name || 'Cashier'} | ${currency} ${sale.total.toFixed(2)}`, 14, nextY);
    doc.setTextColor(0, 0, 0);
    nextY += 4;

    // ✅ Single item from sale
    const itemRows = [[
      sale.product_name || 'Unknown',
      (sale.quantity || 1).toString(),
      `${currency} ${(sale.unit_price || 0).toFixed(2)}`,
      `${currency} ${(sale.subtotal || 0).toFixed(2)}`
    ]];

    autoTable(doc, {
      startY: nextY,
      head: [['Product', 'Qty', 'Unit Price', 'Subtotal']],
      body: itemRows,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 18, right: 14 }
    });

    nextY = (doc as any).lastAutoTable.finalY + 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Total items: ${sale.quantity || 0} units`, 18, nextY);
    nextY += 4;
    doc.setLineWidth(0.1);
    doc.line(18, nextY, 190, nextY);
    nextY += 3;
  }

  nextY += 4;

  // Low Stock Alerts
  if (lowStockItems.length > 0) {
    if (nextY > 240) { doc.addPage(); nextY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9);
    doc.text(`Low Stock Warnings (${lowStockItems.length} items)`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const lowRows = lowStockItems.map(p => [
      p.name,
      p.category_name || 'General',
      p.quantity?.toString() || '0',
      p.reorder_level?.toString() || '10'
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Product Name', 'Category', 'Current Stock', 'Reorder Level']],
      body: lowRows,
      theme: 'plain',
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expiring Items
  if (expiringItems && expiringItems.length > 0) {
    if (nextY > 240) { doc.addPage(); nextY = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Expiring Items (${expiringItems.length} batches)`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const expRows = expiringItems.map(b => [
      b.product_name || 'Unknown',
      b.batch_number,
      b.expiry_date,
      b.quantity_base?.toString() || '0'
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Product', 'Batch', 'Expiry Date', 'Qty']],
      body: expRows,
      theme: 'plain',
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
  }

  // Branding Footer
  addBrandingFooter(doc);

  doc.save(`Daily_Report_${dateStr}.pdf`);
}

/**
 * Generate Professional Monthly Audit Report PDF
 * ✅ UPDATED: Uses single sale record with product details directly
 */
export function generateMonthlyReportPdf(
  pharmacy: Pharmacy,
  monthYearStr: string,
  monthlySales: Sale[],
  batches: ProductBatch[],
  products: Product[]
) {
  const doc = new jsPDF();
  const currency = pharmacy.currency || 'KSh';

  // Title - PHARMIENTA together
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  const pMonth = 'PHARM';
  const rMonth = 'IENTA';
  const pMonthWidth = doc.getTextWidth(pMonth);
  const rMonthWidth = doc.getTextWidth(rMonth);
  const startXMonth = 105 - ((pMonthWidth + rMonthWidth) / 2);

  doc.setTextColor(0, 51, 102);
  doc.text(pMonth, startXMonth, 15);
  doc.setTextColor(180, 0, 0);
  doc.text(rMonth, startXMonth + pMonthWidth, 15);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text('KENYA', 105, 22, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Oriented To Care ', 105, 28, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(pharmacy.name, 105, 35, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`MONTHLY BUSINESS & AUDIT REPORT — ${monthYearStr}`, 105, 42, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(14, 46, 196, 46);

  // Financial Metrics - ✅ Using sale fields directly
  const totalRevenue = monthlySales.reduce((sum, s) => sum + s.total, 0);
  const avgSale = monthlySales.length > 0 ? totalRevenue / monthlySales.length : 0;

  // Inventory Valuation
  const totalInventoryValuation = batches.reduce((sum, b) => sum + (b.quantity_base * b.cost_price), 0);
  const totalPotentialRetail = batches.reduce((sum, b) => sum + (b.quantity_base * b.selling_price), 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Monthly Financial & Inventory Summary', 14, 54);

  const metricsBody = [
    ['Total Recorded Monthly Revenue', `${currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Total Transactions Count', `${monthlySales.length}`],
    ['Average Ticket Value per Sale', `${currency} ${avgSale.toFixed(2)}`],
    ['Current Stock Valuation (at Cost)', `${currency} ${totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Potential Retail Value of Stock', `${currency} ${totalPotentialRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
  ];

  autoTable(doc, {
    startY: 58,
    head: [['Metric Description', 'Value']],
    body: metricsBody,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: 14, right: 14 }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  // Payment Method Breakdown - ✅ Using sale.payment_method directly
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Method Breakdown', 14, nextY);

  const monthlyPaymentTotals: Record<string, number> = {};
  monthlySales.forEach(s => {
    const method = s.payment_method || 'cash';
    monthlyPaymentTotals[method] = (monthlyPaymentTotals[method] || 0) + s.total;
  });

  const monthlyPaymentRows = Object.entries(monthlyPaymentTotals).map(([method, val]) => [
    method.toUpperCase(),
    `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Payment Method', 'Amount']],
    body: monthlyPaymentRows.length > 0 ? monthlyPaymentRows : [['None', `${currency} 0.00`]],
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 116, 144] },
    margin: { left: 14, right: 14 }
  });

  nextY = (doc as any).lastAutoTable.finalY + 10;

  // Top Selling Products - ✅ Using sale fields directly
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Top Moving Medicines & Products', 14, nextY);

  const productQtyMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  monthlySales.forEach(sale => {
    if (!sale.product_id) return;
    if (!productQtyMap[sale.product_id]) {
      productQtyMap[sale.product_id] = {
        name: sale.product_name || 'Drug',
        qty: 0,
        revenue: 0
      };
    }
    productQtyMap[sale.product_id].qty += (sale.quantity || 0);
    productQtyMap[sale.product_id].revenue += (sale.subtotal || 0);
  });

  const topProducts = Object.values(productQtyMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const topRows = topProducts.map((p, idx) => [
    `${idx + 1}`,
    p.name,
    p.qty.toString(),
    `${currency} ${p.revenue.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['#', 'Product Name', 'Units Sold', 'Total Revenue']],
    body: topRows.length > 0 ? topRows : [['-', 'No products recorded', '0', `${currency} 0.00`]],
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 14, right: 14 }
  });

  nextY = (doc as any).lastAutoTable.finalY + 10;

  // Daily Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Daily Sales Summary', 14, nextY);
  nextY += 4;

  const dailyTotals: Record<string, { count: number; revenue: number }> = {};
  monthlySales.forEach(s => {
    const day = (s.sale_date || s.created_at).substring(0, 10);
    if (!dailyTotals[day]) {
      dailyTotals[day] = { count: 0, revenue: 0 };
    }
    dailyTotals[day].count += 1;
    dailyTotals[day].revenue += s.total;
  });

  const dailyRows = Object.entries(dailyTotals).map(([day, data]) => [
    new Date(day).toLocaleDateString(),
    data.count.toString(),
    `${currency} ${data.revenue.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: nextY,
    head: [['Date', 'Transactions', 'Revenue']],
    body: dailyRows,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 100, 100] },
    margin: { left: 14, right: 14 }
  });

  nextY = (doc as any).lastAutoTable.finalY + 10;

  // Recommendations & Smart Insights
  if (nextY > 230) { doc.addPage(); nextY = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Smart System Recommendations & Stock Audit', 14, nextY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('• Replenishment Suggestion: Reorder items based on 30-day velocity.', 14, nextY + 6);
  doc.text('• Expiry Advisory: Inspect batches expiring soon to ensure FEFO priority.', 14, nextY + 12);
  doc.text('• Audit Integrity: All sales transactions carry timestamp, cashier user_id and inventory movement entries.', 14, nextY + 18);

  // Branding Footer
  addBrandingFooter(doc);

  doc.save(`Monthly_Audit_Report_${monthYearStr}.pdf`);
}