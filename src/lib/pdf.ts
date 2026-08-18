import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pharmacy, Sale, Product, ProductBatch, StockMovement, SaleItem } from '../types';

// Branding footer helper
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

// =============================================
// Helper: Group sales by sale_number for multi-item receipts
// =============================================
const groupSalesBySaleNumber = (sales: Sale[]): Record<string, Sale[]> => {
  const groups: Record<string, Sale[]> = {};
  for (const sale of sales) {
    const key = sale.sale_number;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(sale);
  }
  return groups;
};

// =============================================
// Helper: Calculate group totals
// =============================================
const calculateGroupTotals = (saleGroup: Sale[]) => {
  let total = 0;
  let subtotal = 0;
  let discount = 0;
  let totalQuantity = 0;

  for (const sale of saleGroup) {
    total += sale.total || 0;
    subtotal += sale.subtotal || 0;
    discount += sale.discount || 0;
    totalQuantity += sale.quantity || 0;
  }

  return { total, subtotal, discount, totalQuantity };
};

/**
 * Generate Professional Sales Receipt PDF
 * 🆕 FIXED: Calculates ALL totals from items array, ignores sale object for totals
 */
export function generateReceiptPdf(
  pharmacy: Pharmacy,
  sale: Sale,
  saleItems: SaleItem[],
  action: 'download' | 'print' = 'download'
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200]
  });

  const currency = pharmacy.currency || 'KSh';

  // Get items - if empty, create from sale
  let items = saleItems || [];

  if (items.length === 0 && sale.product_id) {
    items = [{
      id: sale.id,
      sale_id: sale.id,
      product_id: sale.product_id || '',
      product_name: sale.product_name || 'Unknown Product',
      quantity: sale.quantity || 1,
      unit_price: sale.unit_price || 0,
      subtotal: sale.subtotal || 0,
      batch_id: sale.batch_id || null,
      batch_number: sale.batch_number || null,
      discount: 0,
      created_at: sale.created_at
    }];
  }

  // =============================================
  // ✅ FIXED: Calculate ALL totals from items array ONLY
  // =============================================
  const subtotalTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // ✅ Discount: sum from all items OR use sale.discount
  // For multi-item sales, discount might be stored on each item or on the sale
  let discountAmount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

  // If no discount on items, use sale.discount (might be the total discount)
  if (discountAmount === 0 && sale.discount) {
    discountAmount = sale.discount;
  }

  // ✅ Final total = subtotal - discount (calculated from items, NOT sale.total)
  const finalTotal = Math.max(0, subtotalTotal - discountAmount);

  // ✅ Get sale info from the first item or sale object
  const saleNumber = sale.sale_number || `INV-${Date.now()}`;
  const customerName = sale.customer_name || 'Cash Customer';
  const soldByName = sale.sold_by_name || 'Cashier';
  const saleDate = sale.sale_date || sale.created_at || new Date().toISOString();
  const paymentMethod = sale.payment_method || 'cash';
  const paymentReference = sale.payment_reference || null;

  // Header - Pharmienta Kenya
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);

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
  doc.text(`RECEIPT #: ${saleNumber}`, 5, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(saleDate).toLocaleString()}`, 5, yPos);
  yPos += 4;
  doc.text(`Served By: ${soldByName}`, 5, yPos);
  if (customerName) {
    yPos += 4;
    doc.text(`Customer: ${customerName}`, 5, yPos);
  }

  yPos += 3;
  doc.line(5, yPos, 75, yPos);
  yPos += 5;

  // Build table rows from ALL items
  const tableRows = items.map(item => [
    item.product_name || 'Unknown Product',
    item.quantity.toString(),
    `${currency} ${(item.unit_price || 0).toFixed(2)}`,
    `${currency} ${(item.subtotal || 0).toFixed(2)}`
  ]);

  if (tableRows.length === 0) {
    tableRows.push(['No items', '0', `${currency} 0.00`, `${currency} 0.00`]);
  }

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

  // =============================================
  // ✅ FIXED: Display totals using calculated values from items
  // =============================================
  let ty = finalY + 4;
  doc.setFontSize(7);

  // Show subtotal
  doc.text(`Subtotal:`, 35, ty);
  doc.text(`${currency} ${subtotalTotal.toFixed(2)}`, 75, ty, { align: 'right' });
  ty += 4;

  if (discountAmount > 0) {
    doc.text(`Discount:`, 35, ty);
    doc.text(`-${currency} ${discountAmount.toFixed(2)}`, 75, ty, { align: 'right' });
    ty += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`TOTAL PAID:`, 35, ty);
  doc.text(`${currency} ${finalTotal.toFixed(2)}`, 75, ty, { align: 'right' });
  ty += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  // Show item counts
  doc.text(`Total Items: ${totalQuantity}`, 5, ty);
  ty += 4;

  if (items.length > 1) {
    doc.text(`Unique Products: ${items.length}`, 5, ty);
    ty += 4;
  }

  doc.text(`Payment Method: ${paymentMethod.toUpperCase()}`, 5, ty);

  if (paymentReference) {
    ty += 4;
    doc.text(`Ref: ${paymentReference}`, 5, ty);
  }

  // Show batch info if available
  const batches = items.filter(item => item.batch_number);
  if (batches.length > 0) {
    ty += 4;
    doc.setFontSize(6);
    const batchText = batches.map(b => b.batch_number).join(', ');
    const splitBatch = doc.splitTextToSize(`Batch(es): ${batchText}`, 65);
    doc.text(splitBatch, 5, ty);
    doc.setFontSize(7);
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
    doc.save(`Receipt_${saleNumber}.pdf`);
  } else {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
}

// =============================================
// Generate Professional Daily Report PDF
// 🆕 UPDATED: Supports multi-item sales with correct grouping
// =============================================
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

  // Title & Header - Pharmienta together
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

  // ✅ Group sales by sale_number for accurate totals
  const groupedSales = groupSalesBySaleNumber(sales);
  const uniqueSales = Object.keys(groupedSales).length;

  // Summary Cards Data
  let totalRevenue = 0;
  let totalDiscounts = 0;
  let totalItemsSold = 0;

  for (const [saleNumber, saleGroup] of Object.entries(groupedSales)) {
    const totals = calculateGroupTotals(saleGroup);
    totalRevenue += totals.total;
    totalDiscounts += totals.discount;
    totalItemsSold += totals.totalQuantity;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Performance Indicators', 14, 59);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Sales Revenue: ${currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 66);
  doc.text(`Total Completed Transactions: ${uniqueSales}`, 14, 71);
  doc.text(`Total Drug Items Dispensed: ${totalItemsSold}`, 110, 66);
  doc.text(`Total Discount Granted: ${currency} ${totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 110, 71);

  // Payment Breakdown - use grouped sales for accurate totals
  const paymentMethodTotals: Record<string, number> = {};
  for (const [saleNumber, saleGroup] of Object.entries(groupedSales)) {
    const firstSale = saleGroup[0];
    const method = firstSale.payment_method || 'cash';
    const totals = calculateGroupTotals(saleGroup);
    paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + totals.total;
  }

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

  // ✅ Detailed Transactions - grouped by sale_number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detailed Transactions & Items Sold', 14, nextY);

  const sortedSaleNumbers = Object.keys(groupedSales).sort();

  for (const saleNumber of sortedSaleNumbers) {
    const saleGroup = groupedSales[saleNumber];
    const firstSale = saleGroup[0];
    const totals = calculateGroupTotals(saleGroup);
    nextY += 6;

    if (nextY > 240) {
      doc.addPage();
      nextY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Detailed Transactions & Items Sold (continued)', 14, nextY);
      nextY += 6;
    }

    // ✅ Show header with group info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text(
      `Receipt #${saleNumber} | ${new Date(firstSale.sale_date || firstSale.created_at).toLocaleTimeString()} | ${firstSale.sold_by_name || 'Cashier'} | ${currency} ${totals.total.toFixed(2)} (${saleGroup.length} items, ${totals.totalQuantity} units)`,
      14,
      nextY
    );
    doc.setTextColor(0, 0, 0);
    nextY += 4;

    // ✅ Build rows for ALL items in this group
    const itemRows = saleGroup.map(s => [
      s.product_name || 'Unknown',
      (s.quantity || 1).toString(),
      `${currency} ${(s.unit_price || 0).toFixed(2)}`,
      `${currency} ${(s.subtotal || 0).toFixed(2)}`
    ]);

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

    // ✅ Show group summary
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Subtotal: ${currency} ${totals.subtotal.toFixed(2)} | Discount: ${currency} ${totals.discount.toFixed(2)} | Total: ${currency} ${totals.total.toFixed(2)}`,
      18,
      nextY
    );
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

// =============================================
// Generate Professional Monthly Audit Report PDF
// 🆕 UPDATED: Supports multi-item sales with correct aggregation
// =============================================
export function generateMonthlyReportPdf(
  pharmacy: Pharmacy,
  monthYearStr: string,
  monthlySales: Sale[],
  batches: ProductBatch[],
  products: Product[]
) {
  const doc = new jsPDF();
  const currency = pharmacy.currency || 'KSh';

  // Title - Pharmienta together
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

  // ✅ Group sales by sale_number for accurate metrics
  const groupedSales = groupSalesBySaleNumber(monthlySales);
  const uniqueSales = Object.keys(groupedSales).length;

  // Financial Metrics - using grouped totals
  let totalRevenue = 0;
  let totalItems = 0;
  for (const [saleNumber, saleGroup] of Object.entries(groupedSales)) {
    const totals = calculateGroupTotals(saleGroup);
    totalRevenue += totals.total;
    totalItems += totals.totalQuantity;
  }
  const avgSale = uniqueSales > 0 ? totalRevenue / uniqueSales : 0;

  // Inventory Valuation
  const totalInventoryValuation = batches.reduce((sum, b) => sum + (b.quantity_base * b.cost_price), 0);
  const totalPotentialRetail = batches.reduce((sum, b) => sum + (b.quantity_base * b.selling_price), 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Monthly Financial & Inventory Summary', 14, 54);

  const metricsBody = [
    ['Total Recorded Monthly Revenue', `${currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Total Transactions Count', `${uniqueSales}`],
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

  // Payment Method Breakdown - using grouped sales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Method Breakdown', 14, nextY);

  const monthlyPaymentTotals: Record<string, number> = {};
  for (const [saleNumber, saleGroup] of Object.entries(groupedSales)) {
    const firstSale = saleGroup[0];
    const method = firstSale.payment_method || 'cash';
    const totals = calculateGroupTotals(saleGroup);
    monthlyPaymentTotals[method] = (monthlyPaymentTotals[method] || 0) + totals.total;
  }

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

  // ✅ Top Selling Products - aggregated across all sale rows
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

  // ✅ Daily Summary - using grouped sales for accurate daily totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Daily Sales Summary', 14, nextY);
  nextY += 4;

  const dailyTotals: Record<string, { count: number; revenue: number; items: number }> = {};
  for (const [saleNumber, saleGroup] of Object.entries(groupedSales)) {
    const firstSale = saleGroup[0];
    const day = (firstSale.sale_date || firstSale.created_at).substring(0, 10);
    const totals = calculateGroupTotals(saleGroup);

    if (!dailyTotals[day]) {
      dailyTotals[day] = { count: 0, revenue: 0, items: 0 };
    }
    dailyTotals[day].count += 1;
    dailyTotals[day].revenue += totals.total;
    dailyTotals[day].items += totals.totalQuantity;
  }

  const dailyRows = Object.entries(dailyTotals).map(([day, data]) => [
    new Date(day).toLocaleDateString(),
    data.count.toString(),
    data.items.toString(),
    `${currency} ${data.revenue.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: nextY,
    head: [['Date', 'Transactions', 'Items Sold', 'Revenue']],
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