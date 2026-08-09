import React, { useState } from 'react';
import { Pharmacy, Sale, SaleItem, Product, ProductBatch, StockMovement, UserRole } from '../../types';
import { generateDailyReportPdf, generateMonthlyReportPdf, generateReceiptPdf } from '../../lib/pdf';
import { BarChart3, Download, Calendar, Printer, RefreshCw, FileText, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

interface ReportsViewProps {
  pharmacy: Pharmacy | null;
  role: UserRole;
  sales: Sale[];
  saleItems: SaleItem[];
  products: Product[];
  batches: ProductBatch[];
  movements: StockMovement[];
  onProcessReturn?: (saleId: string, reason: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  pharmacy,
  role,
  sales,
  saleItems,
  products,
  batches,
  movements,
  onProcessReturn,
  theme = 'dark',
}) => {
  const currency = pharmacy?.currency || 'KSh';
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]' : 'bg-white border-[#d0d7de] text-[#1f2328] shadow-sm';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] border-[#30363d] text-[#f0f6fc]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]';

  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'monthly' | 'history'>('daily');
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  // Date pickers
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthlyPeriod, setMonthlyPeriod] = useState<string>(new Date().toISOString().substring(0, 7));

  // Return modal
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState<string>('Damaged / Wrong medication dispensed');

  if (!pharmacy) return null;

  // Filter Daily Sales
  const filteredDailySales = sales.filter(s => s.created_at.startsWith(dailyDate));
  const dailyTotalRevenue = filteredDailySales.reduce((acc, s) => acc + s.total, 0);

  // Filter Monthly Sales
  const filteredMonthlySales = sales.filter(s => s.created_at.startsWith(monthlyPeriod));
  const monthlyTotalRevenue = filteredMonthlySales.reduce((acc, s) => acc + s.total, 0);

  // Get items for a sale
  const getSaleItems = (saleId: string) => {
    return saleItems.filter(item => item.sale_id === saleId);
  };

  // Toggle expanded sale
  const toggleExpanded = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  // Low stock products
  const lowStockProducts = products.filter(p => (p.quantity || 0) <= p.reorder_level);

  // Expiring batches
  const todayStr = new Date().toISOString().split('T')[0];
  const expiringBatches = batches.filter(b => b.expiry_date <= todayStr && b.quantity_base > 0);

  // Trigger Daily PDF Download
  const handleDownloadDailyPdf = () => {
    generateDailyReportPdf(
      pharmacy,
      dailyDate,
      filteredDailySales,
      saleItems,
      movements,
      lowStockProducts,
      expiringBatches
    );
  };

  // Trigger Monthly PDF Download
  const handleDownloadMonthlyPdf = () => {
    generateMonthlyReportPdf(
      pharmacy,
      monthlyPeriod,
      filteredMonthlySales,
      saleItems,
      batches,
      products
    );
  };

  const handleReturnSubmit = async () => {
    if (!selectedSaleForReturn || !onProcessReturn) return;
    await onProcessReturn(selectedSaleForReturn.id, returnReason);
    setSelectedSaleForReturn(null);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">

      {/* Header */}
      <div className={`border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg}`}>
        <div>
          <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
            <BarChart3 className="w-5 h-5 text-[#2ea043]" />
            <span>Pharmacy Reports & Business Audits</span>
          </h2>
          <p className={`text-xs mt-0.5 ${textMuted}`}>
            Export daily reports, monthly audit statements, and inspect transactions.
          </p>
        </div>

        {/* Subtabs */}
        <div className={`flex p-1 rounded-xl text-xs font-bold gap-1 ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa] border border-[#d0d7de]'
          }`}>
          <button
            onClick={() => setActiveReportTab('daily')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeReportTab === 'daily' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
              }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveReportTab('monthly')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeReportTab === 'monthly' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
              }`}
          >
            Monthly Audit
          </button>
          <button
            onClick={() => setActiveReportTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeReportTab === 'history' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
              }`}
          >
            Sales Log
          </button>
        </div>
      </div>

      {/* Daily Report View */}
      {activeReportTab === 'daily' && (
        <div className="space-y-4">

          {/* Controls Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-[#2ea043]" />
              <span className={`text-xs font-bold ${textMuted}`}>Select Date:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className={`text-xs rounded-xl px-3 py-1.5 focus:outline-none ${inputBg}`}
              />
            </div>

            <button
              onClick={handleDownloadDailyPdf}
              className="w-full sm:w-auto px-4 py-2 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Daily PDF</span>
            </button>
          </div>

          {/* Daily Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Revenue</p>
              <p className="text-lg font-extrabold text-[#2ea043] mt-1">
                {currency} {dailyTotalRevenue.toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Transactions</p>
              <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                {filteredDailySales.length}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Items Sold</p>
              <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                {filteredDailySales.reduce((acc, s) => {
                  const items = getSaleItems(s.id);
                  return acc + items.reduce((sum, item) => sum + item.quantity, 0);
                }, 0)}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Low Stock</p>
              <p className={`text-lg font-extrabold mt-1 ${lowStockProducts.length > 0 ? 'text-amber-500' : textTitle}`}>
                {lowStockProducts.length}
              </p>
            </div>
          </div>

          {/* Daily Transactions with Items */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
            <div className={`p-3 border-b font-bold text-xs ${borderLine} ${textTitle}`}>
              Transactions for {dailyDate}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-bold text-[10px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                  }`}>
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Receipt #</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Staff</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderLine}`}>
                  {filteredDailySales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`p-8 text-center ${textMuted}`}>
                        No transactions recorded on this date.
                      </td>
                    </tr>
                  ) : (
                    filteredDailySales.map(s => {
                      const items = getSaleItems(s.id);
                      const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
                      const isExpanded = expandedSales.has(s.id);

                      return (
                        <React.Fragment key={s.id}>
                          {/* Main Sale Row */}
                          <tr
                            className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                              }`}
                            onClick={() => toggleExpanded(s.id)}
                          >
                            <td className="p-3">
                              {items.length > 0 && (
                                isExpanded ?
                                  <ChevronDown className="w-3 h-3 text-[#2ea043]" /> :
                                  <ChevronRight className="w-3 h-3 text-[#2ea043]" />
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-[#2ea043]">#{s.sale_number}</td>
                            <td className={`p-3 ${textMuted}`}>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className={`p-3 font-semibold ${textTitle}`}>{s.sold_by_name || 'Staff'}</td>
                            <td className={`p-3 ${textMuted}`}>
                              {items.map((item, idx) => (
                                <span key={idx} className="inline-block mr-1">
                                  {item.product_name}
                                  {idx < items.length - 1 && ', '}
                                </span>
                              ))}
                              <span className="text-[10px] text-[#2ea043] ml-1">({itemCount} units)</span>
                            </td>
                            <td className={`p-3 font-extrabold ${textTitle}`}>{currency} {s.total.toFixed(2)}</td>
                          </tr>

                          {/* Expanded Items Row */}
                          {isExpanded && items.length > 0 && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <div className={`p-3 ml-8 border-t ${borderLine} ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'}`}>
                                  <table className="w-full text-left text-xs">
                                    <thead className={`text-[9px] uppercase font-bold ${textMuted}`}>
                                      <tr>
                                        <th className="p-1.5">Product</th>
                                        <th className="p-1.5">Qty</th>
                                        <th className="p-1.5">Price</th>
                                        <th className="p-1.5">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((item, idx) => (
                                        <tr key={idx} className={`border-t ${borderLine}`}>
                                          <td className="p-1.5 font-medium">{item.product_name}</td>
                                          <td className="p-1.5">{item.quantity}</td>
                                          <td className="p-1.5">{currency} {item.unit_price.toFixed(2)}</td>
                                          <td className="p-1.5 font-bold">{currency} {item.subtotal.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <div className={`border border-amber-500/30 rounded-2xl p-4 ${isDark ? 'bg-amber-950/20' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-xs">Low Stock Alert</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockProducts.slice(0, 5).map(p => (
                  <span key={p.id} className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-amber-950/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    {p.name}: {p.quantity || 0} left (Reorder: {p.reorder_level})
                  </span>
                ))}
                {lowStockProducts.length > 5 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                    +{lowStockProducts.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Audit View - Keep as is */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-[#2ea043]" />
              <span className={`text-xs font-bold ${textMuted}`}>Select Month:</span>
              <input
                type="month"
                value={monthlyPeriod}
                onChange={(e) => setMonthlyPeriod(e.target.value)}
                className={`text-xs rounded-xl px-3 py-1.5 focus:outline-none ${inputBg}`}
              />
            </div>
            <button
              onClick={handleDownloadMonthlyPdf}
              className="w-full sm:w-auto px-4 py-2 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Monthly Audit</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Revenue</p>
              <p className="text-lg font-extrabold text-[#2ea043] mt-1">
                {currency} {monthlyTotalRevenue.toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Transactions</p>
              <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                {filteredMonthlySales.length}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Avg. Transaction</p>
              <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                {currency} {filteredMonthlySales.length > 0 ? (monthlyTotalRevenue / filteredMonthlySales.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-xs font-semibold ${textMuted}`}>Products Sold</p>
              <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                {saleItems.filter(item => {
                  const sale = sales.find(s => s.id === item.sale_id);
                  return sale && sale.created_at.startsWith(monthlyPeriod);
                }).reduce((acc, item) => acc + item.quantity, 0)}
              </p>
            </div>
          </div>

          {/* Top Products */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
            <div className={`p-3 border-b font-bold text-xs ${borderLine} ${textTitle}`}>
              Top Selling Products ({monthlyPeriod})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-bold text-[10px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                  }`}>
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Quantity Sold</th>
                    <th className="p-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderLine}`}>
                  {(() => {
                    const productSales: Record<string, { quantity: number; revenue: number; name: string }> = {};
                    saleItems.forEach(item => {
                      const sale = sales.find(s => s.id === item.sale_id);
                      if (sale && sale.created_at.startsWith(monthlyPeriod)) {
                        if (!productSales[item.product_id]) {
                          productSales[item.product_id] = {
                            quantity: 0,
                            revenue: 0,
                            name: item.product_name || 'Unknown'
                          };
                        }
                        productSales[item.product_id].quantity += item.quantity;
                        productSales[item.product_id].revenue += item.subtotal;
                      }
                    });
                    const sorted = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
                    return sorted.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={`p-8 text-center ${textMuted}`}>No sales data for this month.</td>
                      </tr>
                    ) : (
                      sorted.map((p, idx) => (
                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'}`}>
                          <td className={`p-3 font-semibold ${textTitle}`}>{p.name}</td>
                          <td className={`p-3 font-bold ${textTitle}`}>{p.quantity}</td>
                          <td className={`p-3 font-extrabold text-[#2ea043]`}>{currency} {p.revenue.toFixed(2)}</td>
                        </tr>
                      ))
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sales Log View - With Expandable Items */}
      {activeReportTab === 'history' && (
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-bold text-[10px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                }`}>
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderLine}`}>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                      No sales history found.
                    </td>
                  </tr>
                ) : (
                  sales.slice(0, 50).map(s => {
                    const items = getSaleItems(s.id);
                    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
                    const isExpanded = expandedSales.has(s.id);

                    return (
                      <React.Fragment key={s.id}>
                        {/* Main Sale Row */}
                        <tr
                          className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                            }`}
                          onClick={() => toggleExpanded(s.id)}
                        >
                          <td className="p-3">
                            {items.length > 0 && (
                              isExpanded ?
                                <ChevronDown className="w-3 h-3 text-[#2ea043]" /> :
                                <ChevronRight className="w-3 h-3 text-[#2ea043]" />
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#2ea043]">#{s.sale_number}</td>
                          <td className={`p-3 ${textMuted}`}>
                            {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`p-3 font-semibold ${textTitle}`}>{s.customer_name || 'Guest'}</td>
                          <td className={`p-3 ${textMuted}`}>
                            {items.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="inline-block mr-1">
                                {item.product_name}
                                {idx < Math.min(items.length, 3) - 1 && ', '}
                              </span>
                            ))}
                            {items.length > 3 && <span className="text-[#2ea043]">+{items.length - 3} more</span>}
                            <span className="text-[10px] text-[#2ea043] ml-1">({itemCount} units)</span>
                          </td>
                          <td className={`p-3 font-extrabold ${textTitle}`}>{currency} {s.total.toFixed(2)}</td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateReceiptPdf(pharmacy, s, items, 'print');
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold mr-1 border ${isDark ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-slate-200'
                                }`}
                            >
                              Print
                            </button>
                            {onProcessReturn && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSaleForReturn(s);
                                }}
                                className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 rounded text-[10px] font-bold"
                              >
                                Return
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Items Row */}
                        {isExpanded && items.length > 0 && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className={`p-3 ml-8 border-t ${borderLine} ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'}`}>
                                <table className="w-full text-left text-xs">
                                  <thead className={`text-[9px] uppercase font-bold ${textMuted}`}>
                                    <tr>
                                      <th className="p-1.5">#</th>
                                      <th className="p-1.5">Product</th>
                                      <th className="p-1.5">Qty</th>
                                      <th className="p-1.5">Unit Price</th>
                                      <th className="p-1.5">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, idx) => (
                                      <tr key={idx} className={`border-t ${borderLine}`}>
                                        <td className="p-1.5 text-muted">{idx + 1}</td>
                                        <td className="p-1.5 font-medium">{item.product_name}</td>
                                        <td className="p-1.5">{item.quantity}</td>
                                        <td className="p-1.5">{currency} {item.unit_price.toFixed(2)}</td>
                                        <td className="p-1.5 font-bold">{currency} {item.subtotal.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                    {/* Show totals row */}
                                    <tr className={`border-t-2 ${borderLine}`}>
                                      <td colSpan={3}></td>
                                      <td className="p-1.5 font-bold">Total:</td>
                                      <td className="p-1.5 font-extrabold text-[#2ea043]">{currency} {s.total.toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedSaleForReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-sm mb-2 ${textTitle}`}>
              Process Sale Return #{selectedSaleForReturn.sale_number}
            </h3>
            <p className={`text-xs mb-3 ${textMuted}`}>
              This will restore stock and log a return entry.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Return Reason *</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl p-2 focus:outline-none ${inputBg}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedSaleForReturn(null)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnSubmit}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};