// components/views/ReportsView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Pharmacy, Sale, Product, ProductBatch, StockMovement, UserRole, SaleItem } from '../../types';
import { generateDailyReportPdf, generateMonthlyReportPdf, generateReceiptPdf } from '../../lib/pdf';
import { BarChart3, Download, Calendar, Printer, RefreshCw, FileText, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Undo2, Package, Receipt, Pencil, Save, X, Filter, Search, XCircle } from 'lucide-react';

interface ReportsViewProps {
  pharmacy: Pharmacy | null;
  role: UserRole;
  sales: Sale[];
  products: Product[];
  batches: ProductBatch[];
  movements: StockMovement[];
  onProcessReturn?: (saleId: string, reason: string) => Promise<void>;
  onUpdateSale?: (saleId: string, updates: Partial<Sale>) => Promise<void>;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
  isSyncing?: boolean;
  onRefresh?: () => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  pharmacy,
  role,
  sales,
  products,
  batches,
  movements,
  onProcessReturn,
  onUpdateSale,
  theme = 'dark',
  isLoading = false,
  isSyncing = false,
  onRefresh,
}) => {
  const currency = pharmacy?.currency || 'KSh';
  const isDark = theme === 'dark';

  // Base card styles
  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

  const touchTarget = 'min-h-[44px] min-w-[44px]';
  const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

  const skeletonBg = isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]';
  const skeletonLight = isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]';

  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'monthly' | 'history' | 'multi'>('daily');
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [expandedMultiSales, setExpandedMultiSales] = useState<Set<string>>(new Set());

  // Filter state
  const [filterText, setFilterText] = useState<string>('');
  const [filterField, setFilterField] = useState<'customer' | 'product' | 'payment' | 'all'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // Edit state with paymentMethod
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    quantity: number;
    unitPrice: number;
    discount: number;
    paymentMethod: string;
  }>({ quantity: 1, unitPrice: 0, discount: 0, paymentMethod: 'cash' });

  // Date pickers
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthlyPeriod, setMonthlyPeriod] = useState<string>(new Date().toISOString().substring(0, 7));
  const [multiDate, setMultiDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Return modal
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState<string>('Customer returned item');

  // Force re-render key when sales data changes
  const [renderKey, setRenderKey] = useState(0);

  // Watch for sales changes and force re-render
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [sales.length]);

  if (!pharmacy) return null;

  // Helper: Get product details from sale
  const getSaleProductDetails = (sale: Sale) => {
    return {
      productName: sale.product_name || 'Unknown Product',
      productId: sale.product_id,
      quantity: sale.quantity || 0,
      unitPrice: sale.unit_price || 0,
      subtotal: sale.subtotal || 0,
      batchNumber: sale.batch_number || null,
      batchId: sale.batch_id || null,
      productDetails: sale.product_details || null,
    };
  };

  // Filter function for sales
  const applyFilters = (salesList: Sale[]): Sale[] => {
    if (!filterText.trim()) return salesList;

    const searchLower = filterText.toLowerCase().trim();

    return salesList.filter(sale => {
      const customerName = (sale.customer_name || 'Guest').toLowerCase();
      const productName = (sale.product_name || '').toLowerCase();
      const paymentMethod = (sale.payment_method || '').toLowerCase();
      const saleNumber = (sale.sale_number || '').toLowerCase();
      const notes = (sale.notes || '').toLowerCase();

      switch (filterField) {
        case 'customer':
          return customerName.includes(searchLower);
        case 'product':
          return productName.includes(searchLower);
        case 'payment':
          return paymentMethod.includes(searchLower);
        case 'all':
        default:
          return customerName.includes(searchLower) ||
            productName.includes(searchLower) ||
            paymentMethod.includes(searchLower) ||
            saleNumber.includes(searchLower) ||
            notes.includes(searchLower);
      }
    });
  };

  // Start editing a sale
  const startEditing = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setEditValues({
      quantity: sale.quantity || 1,
      unitPrice: sale.unit_price || 0,
      discount: sale.discount || 0,
      paymentMethod: sale.payment_method || 'cash',
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSaleId(null);
    setEditValues({ quantity: 1, unitPrice: 0, discount: 0, paymentMethod: 'cash' });
  };

  // Save edited sale
  const saveEditing = async (sale: Sale) => {
    if (!onUpdateSale) return;

    try {
      const newSubtotal = editValues.quantity * editValues.unitPrice;
      const newTotal = Math.max(0, newSubtotal - editValues.discount);

      await onUpdateSale(sale.id, {
        quantity: editValues.quantity,
        unit_price: editValues.unitPrice,
        subtotal: newSubtotal,
        discount: editValues.discount,
        total: newTotal,
        payment_method: editValues.paymentMethod as any,
      });

      setEditingSaleId(null);
      setEditValues({ quantity: 1, unitPrice: 0, discount: 0, paymentMethod: 'cash' });

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to update sale:', error);
      alert('Failed to update sale. Please try again.');
    }
  };

  // Helper: Group sales by sale_id to get multi-item receipts
  const getGroupedSales = (salesList: Sale[]) => {
    const groups: Record<string, { sale_id: string; sale_number: string; customer_name: string; items: Sale[]; total: number; discount: number; payment_method: string; sale_date: string; created_at: string }> = {};

    for (const sale of salesList) {
      const groupKey = sale.sale_number;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          sale_id: sale.id,
          sale_number: sale.sale_number,
          customer_name: sale.customer_name || 'Guest',
          items: [],
          total: sale.total || 0,
          discount: sale.discount || 0,
          payment_method: sale.payment_method || 'cash',
          sale_date: sale.sale_date || sale.created_at,
          created_at: sale.created_at,
        };
      }

      const existingItem = groups[groupKey].items.find(i => i.product_id === sale.product_id);
      if (!existingItem) {
        groups[groupKey].items.push(sale);
      }
      groups[groupKey].total = sale.total || 0;
      groups[groupKey].discount = sale.discount || 0;
    }

    return Object.values(groups);
  };

  // Filter Daily Sales
  const filteredDailySalesRaw = useMemo(() => {
    return sales.filter(s => {
      const date = s.sale_date || s.created_at;
      return date?.startsWith(dailyDate);
    });
  }, [sales, dailyDate]);

  const filteredDailySales = useMemo(() => {
    return applyFilters(filteredDailySalesRaw);
  }, [filteredDailySalesRaw, filterText, filterField]);

  const dailyTotalRevenue = useMemo(() => {
    return filteredDailySales.reduce((acc, s) => acc + s.total, 0);
  }, [filteredDailySales]);

  // Filter Monthly Sales
  const filteredMonthlySalesRaw = useMemo(() => {
    return sales.filter(s => {
      const date = s.sale_date || s.created_at;
      return date?.startsWith(monthlyPeriod);
    });
  }, [sales, monthlyPeriod]);

  const filteredMonthlySales = useMemo(() => {
    return applyFilters(filteredMonthlySalesRaw);
  }, [filteredMonthlySalesRaw, filterText, filterField]);

  const monthlyTotalRevenue = useMemo(() => {
    return filteredMonthlySales.reduce((acc, s) => acc + s.total, 0);
  }, [filteredMonthlySales]);

  // Filter Multi-Item Sales (grouped by sale_number)
  const filteredMultiSalesRaw = useMemo(() => {
    const salesForDate = sales.filter(s => {
      const date = s.sale_date || s.created_at;
      return date?.startsWith(multiDate);
    });
    return getGroupedSales(salesForDate).filter(group => group.items.length > 1);
  }, [sales, multiDate]);

  const filteredMultiSales = useMemo(() => {
    if (!filterText.trim()) return filteredMultiSalesRaw;

    const searchLower = filterText.toLowerCase().trim();

    return filteredMultiSalesRaw.filter(group => {
      const customerName = group.customer_name.toLowerCase();
      const paymentMethod = (group.payment_method || '').toLowerCase();
      const saleNumber = group.sale_number.toLowerCase();

      const itemMatches = group.items.some(item => {
        const productName = (item.product_name || '').toLowerCase();
        return productName.includes(searchLower);
      });

      switch (filterField) {
        case 'customer':
          return customerName.includes(searchLower);
        case 'product':
          return itemMatches;
        case 'payment':
          return paymentMethod.includes(searchLower);
        case 'all':
        default:
          return customerName.includes(searchLower) ||
            itemMatches ||
            paymentMethod.includes(searchLower) ||
            saleNumber.includes(searchLower);
      }
    });
  }, [filteredMultiSalesRaw, filterText, filterField]);

  const multiTotalRevenue = useMemo(() => {
    return filteredMultiSales.reduce((acc, group) => acc + group.total, 0);
  }, [filteredMultiSales]);

  // Apply filters to history sales
  const filteredHistorySales = useMemo(() => {
    return applyFilters(sales);
  }, [sales, filterText, filterField]);

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

  // Toggle expanded multi-item sale
  const toggleMultiExpanded = (saleNumber: string) => {
    const newExpanded = new Set(expandedMultiSales);
    if (newExpanded.has(saleNumber)) {
      newExpanded.delete(saleNumber);
    } else {
      newExpanded.add(saleNumber);
    }
    setExpandedMultiSales(newExpanded);
  };

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter(p => (p.quantity || 0) <= p.reorder_level);
  }, [products]);

  // Expiring batches
  const todayStr = new Date().toISOString().split('T')[0];
  const expiringBatches = useMemo(() => {
    return batches.filter(b => b.expiry_date <= todayStr && b.quantity_base > 0);
  }, [batches, todayStr]);

  // Handle Daily PDF Download
  const handleDownloadDailyPdf = () => {
    generateDailyReportPdf(
      pharmacy,
      dailyDate,
      filteredDailySales,
      movements,
      lowStockProducts,
      expiringBatches
    );
  };

  // Handle Monthly PDF Download
  const handleDownloadMonthlyPdf = () => {
    generateMonthlyReportPdf(
      pharmacy,
      monthlyPeriod,
      filteredMonthlySales,
      batches,
      products
    );
  };

  // Handle Multi-Item Receipt Print
  const handlePrintMultiReceipt = (group: any) => {
    const items = group.items.map((sale: Sale) => ({
      id: sale.id,
      sale_id: sale.id,
      product_id: sale.product_id || '',
      product_name: sale.product_name || 'Unknown Product',
      batch_id: sale.batch_id || null,
      batch_number: sale.batch_number || null,
      quantity: sale.quantity || 0,
      unit_id: null,
      unit_name: null,
      unit_price: sale.unit_price || 0,
      discount: 0,
      subtotal: sale.subtotal || 0,
      created_at: sale.created_at
    }));

    const mainSale = group.items[0];
    generateReceiptPdf(pharmacy, mainSale, items, 'print');
  };

  // Handle Return Submit
  const handleReturnSubmit = async () => {
    if (!selectedSaleForReturn || !onProcessReturn) return;
    await onProcessReturn(selectedSaleForReturn.id, returnReason);
    setSelectedSaleForReturn(null);
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    if (onRefresh && !isSyncing) {
      await onRefresh();
      setRenderKey(prev => prev + 1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterText('');
    setFilterField('all');
    setShowFilterPanel(false);
  };

  // Skeleton Components
  const SkeletonRow = ({ cols = 6 }) => (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <div className={`h-4 ${skeletonBg} rounded w-16`}></div>
        </td>
      ))}
    </tr>
  );

  const SkeletonStat = () => (
    <div className={`p-4 rounded-2xl animate-pulse ${cardBg}`}>
      <div className={`h-4 ${skeletonBg} rounded w-20 mb-2`}></div>
      <div className={`h-7 ${skeletonBg} rounded w-24`}></div>
    </div>
  );

  const SkeletonTable = ({ rows = 5, cols = 6 }) => (
    <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
      <div className={`p-4 ${borderLine}`}>
        <div className={`h-5 ${skeletonBg} rounded w-48`}></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
            }`}>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="p-3">
                  <div className={`h-3 ${skeletonBg} rounded w-12`}></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${borderLine}`}>
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonRow key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render a sale row with product details from the sale record
  const renderSaleRow = (sale: Sale) => {
    const isExpanded = expandedSales.has(sale.id);
    const productDetails = getSaleProductDetails(sale);
    const isEditing = editingSaleId === sale.id;

    return (
      <React.Fragment key={sale.id}>
        {/* Main Sale Row */}
        <tr
          className={`transition-colors ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
            }`}
        >
          <td className="p-3 cursor-pointer" onClick={() => toggleExpanded(sale.id)}>
            {productDetails.productName && (
              isExpanded ?
                <ChevronDown className="w-4 h-4 text-[#2ea043]" /> :
                <ChevronRight className="w-4 h-4 text-[#2ea043]" />
            )}
          </td>
          <td className="p-3 font-mono font-bold text-[#2ea043]">#{sale.sale_number}</td>
          <td className={`p-3 ${textMuted}`}>
            {new Date(sale.sale_date || sale.created_at).toLocaleDateString()}
            <span className="ml-1 text-[10px]">
              {new Date(sale.sale_date || sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </td>
          <td className={`p-3 font-semibold ${textTitle}`}>{sale.customer_name || 'Guest'}</td>
          <td className={`p-3 ${textMuted}`}>
            <span className="font-medium">{productDetails.productName}</span>
            {isEditing ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min="0"
                  value={editValues.quantity}
                  onChange={(e) => setEditValues({ ...editValues, quantity: Number(e.target.value) || 0 })}
                  className={`w-14 text-center rounded px-2 py-1 text-sm ${inputBg} ${touchTargetSmall}`}
                />
                <span className="text-[11px] text-[#2ea043]">units</span>
              </div>
            ) : (
              <span className="text-[11px] text-[#2ea043] ml-1">(x{productDetails.quantity})</span>
            )}
            {productDetails.batchNumber && (
              <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded ${isDark ? 'bg-[#30363d]' : 'bg-slate-200'}`}>
                Batch: {productDetails.batchNumber}
              </span>
            )}
          </td>
          <td className={`p-3 font-extrabold ${textTitle}`}>
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValues.unitPrice}
                  onChange={(e) => setEditValues({ ...editValues, unitPrice: Number(e.target.value) || 0 })}
                  className={`w-20 text-right rounded px-2 py-1 text-sm ${inputBg} ${touchTargetSmall}`}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValues.discount}
                  onChange={(e) => setEditValues({ ...editValues, discount: Number(e.target.value) || 0 })}
                  className={`w-20 text-right rounded px-2 py-1 text-sm text-amber-500 ${inputBg} ${touchTargetSmall}`}
                  placeholder="discount"
                />
                <select
                  value={editValues.paymentMethod}
                  onChange={(e) => setEditValues({ ...editValues, paymentMethod: e.target.value })}
                  className={`w-24 rounded px-2 py-1 text-sm ${inputBg} ${touchTargetSmall}`}
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                  <option value="credit">Credit</option>
                  <option value="insurance">Insurance</option>
                </select>
                <span className="text-[10px] text-[#2ea043]">
                  Total: {currency} {(editValues.quantity * editValues.unitPrice - editValues.discount).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span>{currency} {sale.total.toFixed(2)}</span>
                <span className={`text-[10px] font-normal ${textMuted}`}>
                  {sale.payment_method || 'cash'}
                </span>
              </div>
            )}
          </td>
          <td className="p-2 sm:p-3" onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <div className="flex items-center justify-end gap-1 sm:gap-2">
                <button
                  onClick={() => saveEditing(sale)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold ${touchTargetSmall} bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center min-w-[44px]`}
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1">Save</span>
                </button>
                <button
                  onClick={cancelEditing}
                  className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'} flex items-center justify-center min-w-[44px]`}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1">Cancel</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                <button
                  onClick={() => startEditing(sale)}
                  className={`px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl text-sm font-bold ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'} flex items-center justify-center min-w-[44px]`}
                  title="Edit sale"
                >
                  <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1">Edit</span>
                </button>
                <button
                  onClick={() => {
                    const tempItems = [{
                      id: sale.id,
                      sale_id: sale.id,
                      product_id: sale.product_id,
                      product_name: sale.product_name,
                      batch_id: sale.batch_id || null,
                      batch_number: sale.batch_number || null,
                      quantity: sale.quantity || 0,
                      unit_id: null,
                      unit_name: null,
                      unit_price: sale.unit_price || 0,
                      discount: 0,
                      subtotal: sale.subtotal || 0,
                      created_at: sale.created_at
                    }];
                    generateReceiptPdf(pharmacy, sale, tempItems, 'print');
                  }}
                  className={`px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl text-sm font-bold ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'} flex items-center justify-center min-w-[44px]`}
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1">Print</span>
                </button>
                {onProcessReturn && (
                  <button
                    onClick={() => setSelectedSaleForReturn(sale)}
                    className={`px-2.5 sm:px-3 py-2.5 sm:py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 rounded-xl text-sm font-bold ${touchTargetSmall} flex items-center justify-center min-w-[44px]`}
                  >
                    <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline ml-1">Return</span>
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>

        {/* Expanded Product Details Row */}
        {isExpanded && productDetails.productName && (
          <tr>
            <td colSpan={7} className="p-0">
              <div className={`p-3 ml-8 ${borderLine} ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Product</p>
                    <p className={`font-semibold ${textTitle}`}>{productDetails.productName}</p>
                    {productDetails.productDetails?.generic_name && (
                      <p className={`text-xs ${textMuted}`}>{productDetails.productDetails.generic_name}</p>
                    )}
                    {productDetails.productDetails?.brand && (
                      <p className={`text-xs ${textMuted}`}>Brand: {productDetails.productDetails.brand}</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Quantity</p>
                    <p className={`font-bold ${textTitle}`}>{productDetails.quantity}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Unit Price</p>
                    <p className={`font-bold ${textTitle}`}>{currency} {productDetails.unitPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Subtotal</p>
                    <p className={`font-extrabold text-[#2ea043]`}>{currency} {productDetails.subtotal.toFixed(2)}</p>
                  </div>
                  {productDetails.batchNumber && (
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Batch</p>
                      <p className={`text-xs font-mono ${textTitle}`}>{productDetails.batchNumber}</p>
                    </div>
                  )}
                  {sale.discount > 0 && (
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Discount</p>
                      <p className={`text-amber-500 font-bold`}>-{currency} {sale.discount.toFixed(2)}</p>
                      {sale.discount_reason && (
                        <p className={`text-xs ${textMuted}`}>{sale.discount_reason}</p>
                      )}
                    </div>
                  )}
                  {sale.payment_method && (
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Payment</p>
                      <p className={`capitalize font-semibold ${textTitle}`}>{sale.payment_method}</p>
                    </div>
                  )}
                  {sale.payment_reference && (
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Reference</p>
                      <p className={`text-xs font-mono ${textMuted}`}>{sale.payment_reference}</p>
                    </div>
                  )}
                  {sale.notes && (
                    <div className="col-span-2">
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Notes</p>
                      <p className={`text-xs ${textMuted}`}>{sale.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // Render a grouped multi-item sale row
  const renderMultiSaleRow = (group: any) => {
    const isExpanded = expandedMultiSales.has(group.sale_number);
    const itemCount = group.items.length;
    const totalQuantity = group.items.reduce((sum: number, s: Sale) => sum + (s.quantity || 0), 0);

    return (
      <React.Fragment key={group.sale_number}>
        {/* Main Group Row */}
        <tr
          className={`transition-colors cursor-pointer ${touchTargetSmall} ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
            }`}
          onClick={() => toggleMultiExpanded(group.sale_number)}
        >
          <td className="p-3">
            {isExpanded ?
              <ChevronDown className="w-4 h-4 text-[#2ea043]" /> :
              <ChevronRight className="w-4 h-4 text-[#2ea043]" />
            }
          </td>
          <td className="p-3 font-mono font-bold text-[#2ea043]">#{group.sale_number}</td>
          <td className={`p-3 ${textMuted}`}>
            {new Date(group.sale_date || group.created_at).toLocaleDateString()}
            <span className="ml-1 text-[10px]">
              {new Date(group.sale_date || group.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </td>
          <td className={`p-3 font-semibold ${textTitle}`}>{group.customer_name || 'Guest'}</td>
          <td className={`p-3 ${textMuted}`}>
            <span className="font-medium flex items-center gap-1">
              <Package className="w-3 h-3 text-[#2ea043]" />
              {itemCount} items
            </span>
            <span className="text-[11px] text-[#2ea043] ml-1">({totalQuantity} units)</span>
            <div className="text-[10px] text-amber-500 mt-0.5">
              {group.items.slice(0, 2).map((sale: Sale, idx: number) => (
                <span key={idx}>
                  {idx > 0 && ', '}
                  {sale.product_name} (x{sale.quantity})
                </span>
              ))}
              {group.items.length > 2 && ` +${group.items.length - 2} more`}
            </div>
          </td>
          <td className={`p-3 font-extrabold text-[#2ea043]`}>{currency} {group.total.toFixed(2)}</td>
          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrintMultiReceipt(group);
              }}
              className={`px-3 py-2 rounded-xl text-sm font-bold mr-2 ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'
                }`}
            >
              <Receipt className="w-4 h-4 inline mr-1" />
              Print All
            </button>
            {onProcessReturn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSaleForReturn(group.items[0]);
                }}
                className={`px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 rounded-xl text-sm font-bold ${touchTargetSmall}`}
              >
                Return
              </button>
            )}
          </td>
        </tr>

        {/* Expanded Items Details Row */}
        {isExpanded && (
          <tr>
            <td colSpan={7} className="p-0">
              <div className={`p-3 ml-8 ${borderLine} ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-[#2ea043]" />
                    <span className={`text-sm font-bold ${textTitle}`}>
                      All Items in this Sale ({itemCount} items)
                    </span>
                    <span className={`text-xs ${textMuted}`}>
                      (Total: {totalQuantity} units)
                    </span>
                  </div>

                  {group.items.map((sale: Sale, idx: number) => {
                    const details = getSaleProductDetails(sale);
                    return (
                      <div key={idx} className={`grid grid-cols-2 md:grid-cols-5 gap-2 text-sm p-2 rounded-lg ${isDark ? 'bg-[#21262d]/50' : 'bg-white/50'}`}>
                        <div className="col-span-2">
                          <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Product</p>
                          <p className={`font-semibold ${textTitle}`}>{details.productName}</p>
                          {details.productDetails?.generic_name && (
                            <p className={`text-xs ${textMuted}`}>{details.productDetails.generic_name}</p>
                          )}
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Qty</p>
                          <p className={`font-bold ${textTitle}`}>{details.quantity}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Unit Price</p>
                          <p className={`font-bold ${textTitle}`}>{currency} {details.unitPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Subtotal</p>
                          <p className={`font-extrabold text-[#2ea043]`}>{currency} {details.subtotal.toFixed(2)}</p>
                        </div>
                        {details.batchNumber && (
                          <div className="col-span-5">
                            <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Batch</p>
                            <p className={`text-xs font-mono ${textTitle}`}>{details.batchNumber}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Summary row */}
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 ${borderLine}`}>
                    {group.discount > 0 && (
                      <div>
                        <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Discount</p>
                        <p className={`text-amber-500 font-bold`}>-{currency} {group.discount.toFixed(2)}</p>
                      </div>
                    )}
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Payment</p>
                      <p className={`capitalize font-semibold ${textTitle}`}>{group.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Items</p>
                      <p className={`font-semibold ${textTitle}`}>{itemCount} ({totalQuantity} units)</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${textMuted}`}>Total</p>
                      <p className={`font-extrabold text-[#2ea043]`}>{currency} {group.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // Filter UI Component
  const FilterUI = () => (
    <div className={`p-3 rounded-xl ${isDark ? 'bg-[#21262d]/80' : 'bg-[#f6f8fa]'}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Search className={`w-4 h-4 ${textMuted}`} />
          <input
            type="text"
            placeholder="Search sales..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className={`p-1.5 rounded-lg ${touchTargetSmall} ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-slate-200'}`}
            >
              <XCircle className="w-4 h-4 text-[#8b949e]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value as any)}
            className={`rounded-lg px-3 py-2 text-sm focus:outline-none ${inputBg} ${touchTargetSmall}`}
          >
            <option value="all">All Fields</option>
            <option value="customer">Customer Name</option>
            <option value="product">Product Name</option>
            <option value="payment">Payment Method</option>
          </select>

          {filterText && (
            <button
              onClick={clearFilters}
              className={`px-3 py-2 rounded-lg text-sm font-bold ${touchTargetSmall} ${isDark ? 'bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58]' : 'bg-slate-200 text-[#1f2328] hover:bg-slate-300'}`}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {filterText && (
        <div className={`mt-2 text-xs ${textMuted}`}>
          Showing results for: <span className="font-bold text-[#2ea043]">"{filterText}"</span>
          {filterField !== 'all' && <span> in <span className="font-bold">{filterField}</span></span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6" key={renderKey}>
      {/* Header */}
      <div className={`p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg}`}>
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex p-1 rounded-xl text-sm font-bold gap-1 flex-wrap ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
            <button
              onClick={() => setActiveReportTab('daily')}
              className={`px-4 py-2 rounded-lg transition-colors ${touchTargetSmall} ${activeReportTab === 'daily' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
                }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setActiveReportTab('monthly')}
              className={`px-4 py-2 rounded-lg transition-colors ${touchTargetSmall} ${activeReportTab === 'monthly' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
                }`}
            >
              Monthly Audit
            </button>
            <button
              onClick={() => setActiveReportTab('history')}
              className={`px-4 py-2 rounded-lg transition-colors ${touchTargetSmall} ${activeReportTab === 'history' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
                }`}
            >
              Sales Log
            </button>
            <button
              onClick={() => setActiveReportTab('multi')}
              className={`px-4 py-2 rounded-lg transition-colors ${touchTargetSmall} ${activeReportTab === 'multi' ? 'bg-[#2ea043] text-white font-extrabold shadow' : textMuted
                }`}
            >
              <Receipt className="w-4 h-4 inline mr-1" />
              Multi-Item Receipts
            </button>
          </div>
        </div>
      </div>

      {/* Daily Report View */}
      {activeReportTab === 'daily' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <Calendar className="w-5 h-5 text-[#2ea043]" />
              <span className={`text-sm font-bold ${textMuted}`}>Select Date:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className={`text-sm rounded-xl px-4 py-3 focus:outline-none ${inputBg} ${touchTargetSmall}`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${touchTargetSmall} ${showFilterPanel ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {filterText && <span className="bg-[#2ea043] text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>}
              </button>

              <button
                onClick={handleDownloadDailyPdf}
                className={`w-full sm:w-auto px-5 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
              >
                <Download className="w-5 h-5" />
                <span>Download Daily PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
              <FilterUI />
            </div>
          )}

          {/* Daily Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isLoading ? (
              <>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
              </>
            ) : (
              <>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Revenue</p>
                  <p className="text-xl font-extrabold text-[#2ea043] mt-1">
                    {currency} {dailyTotalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Transactions</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredDailySales.length}
                    {filterText && filteredDailySales.length !== filteredDailySalesRaw.length && (
                      <span className={`text-xs font-normal ${textMuted} ml-1`}>
                        (of {filteredDailySalesRaw.length})
                      </span>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Items Sold</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredDailySales.reduce((acc, s) => acc + (s.quantity || 0), 0)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Low Stock</p>
                  <p className={`text-xl font-extrabold mt-1 ${lowStockProducts.length > 0 ? 'text-amber-500' : textTitle}`}>
                    {lowStockProducts.length}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Daily Transactions */}
          {isLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : (
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
              <div className={`p-4 font-bold text-sm flex items-center justify-between ${borderLine} ${textTitle}`}>
                <span>Transactions for {dailyDate}</span>
                {filterText && (
                  <span className={`text-xs font-normal ${textMuted}`}>
                    Filtered: {filteredDailySales.length} of {filteredDailySalesRaw.length}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                    }`}>
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Item</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderLine}`}>
                    {filteredDailySales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                          {filterText ? 'No transactions match your filter criteria.' : 'No transactions recorded on this date.'}
                        </td>
                      </tr>
                    ) : (
                      filteredDailySales.map(s => renderSaleRow(s))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Alert */}
          {!isLoading && lowStockProducts.length > 0 && (
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-amber-950/20' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-sm">Low Stock Alert</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockProducts.slice(0, 5).map(p => (
                  <span key={p.id} className={`text-sm px-3 py-1.5 rounded-full ${touchTargetSmall} ${isDark ? 'bg-amber-950/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    {p.name}: {p.quantity || 0} left (Reorder: {p.reorder_level})
                  </span>
                ))}
                {lowStockProducts.length > 5 && (
                  <span className={`text-sm px-3 py-1.5 rounded-full ${touchTargetSmall} ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                    +{lowStockProducts.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Audit View */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <Calendar className="w-5 h-5 text-[#2ea043]" />
              <span className={`text-sm font-bold ${textMuted}`}>Select Month:</span>
              <input
                type="month"
                value={monthlyPeriod}
                onChange={(e) => setMonthlyPeriod(e.target.value)}
                className={`text-sm rounded-xl px-4 py-3 focus:outline-none ${inputBg} ${touchTargetSmall}`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${touchTargetSmall} ${showFilterPanel ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {filterText && <span className="bg-[#2ea043] text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>}
              </button>

              <button
                onClick={handleDownloadMonthlyPdf}
                className={`w-full sm:w-auto px-5 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
              >
                <Download className="w-5 h-5" />
                <span>Download Monthly Audit</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
              <FilterUI />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isLoading ? (
              <>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
              </>
            ) : (
              <>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Revenue</p>
                  <p className="text-xl font-extrabold text-[#2ea043] mt-1">
                    {currency} {monthlyTotalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Transactions</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredMonthlySales.length}
                    {filterText && filteredMonthlySales.length !== filteredMonthlySalesRaw.length && (
                      <span className={`text-xs font-normal ${textMuted} ml-1`}>
                        (of {filteredMonthlySalesRaw.length})
                      </span>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Avg. Transaction</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {currency} {filteredMonthlySales.length > 0 ? (monthlyTotalRevenue / filteredMonthlySales.length).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Total Items</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredMonthlySales.reduce((acc, s) => acc + (s.quantity || 0), 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Top Products */}
          {isLoading ? (
            <SkeletonTable rows={5} cols={3} />
          ) : (
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
              <div className={`p-4 font-bold text-sm flex items-center justify-between ${borderLine} ${textTitle}`}>
                <span>Top Selling Products ({monthlyPeriod})</span>
                {filterText && (
                  <span className={`text-xs font-normal ${textMuted}`}>
                    Filtered: {filteredMonthlySales.length} of {filteredMonthlySalesRaw.length}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                    }`}>
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Units Sold</th>
                      <th className="p-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderLine}`}>
                    {(() => {
                      const productSales: Record<string, { quantity: number; revenue: number; name: string }> = {};

                      filteredMonthlySales.forEach(sale => {
                        if (!sale.product_name) return;
                        const key = sale.product_id || sale.product_name;
                        if (!productSales[key]) {
                          productSales[key] = {
                            quantity: 0,
                            revenue: 0,
                            name: sale.product_name
                          };
                        }
                        productSales[key].quantity += (sale.quantity || 0);
                        productSales[key].revenue += (sale.subtotal || 0);
                      });

                      const sorted = Object.values(productSales)
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 10);

                      return sorted.length === 0 ? (
                        <tr>
                          <td colSpan={3} className={`p-8 text-center ${textMuted}`}>
                            {filterText ? 'No sales match your filter criteria.' : 'No sales data for this month.'}
                          </td>
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
          )}
        </div>
      )}

      {/* Sales Log View */}
      {activeReportTab === 'history' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${touchTargetSmall} ${showFilterPanel ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {filterText && <span className="bg-[#2ea043] text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>}
              </button>
              <span className={`text-sm ${textMuted}`}>
                Showing {filteredHistorySales.length} of {sales.length} sales
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isSyncing}
              className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
              <FilterUI />
            </div>
          )}

          {isLoading ? (
            <SkeletonTable rows={5} cols={7} />
          ) : (
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
              <div className={`p-4 font-bold text-sm flex items-center justify-between ${borderLine} ${textTitle}`}>
                <span>Sales History</span>
                {filterText && (
                  <span className={`text-xs font-normal ${textMuted}`}>
                    Filtered: {filteredHistorySales.length} of {sales.length}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                    }`}>
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Item</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderLine}`}>
                    {filteredHistorySales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                          {filterText ? 'No sales match your filter criteria.' : 'No sales history found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredHistorySales.slice(0, 50).map(s => renderSaleRow(s))
                    )}
                  </tbody>
                </table>
                {filteredHistorySales.length > 50 && (
                  <div className={`p-4 text-center ${textMuted} text-sm border-t ${borderLine}`}>
                    Showing first 50 of {filteredHistorySales.length} results
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Item Receipts View */}
      {activeReportTab === 'multi' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${cardBg}`}>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <Calendar className="w-5 h-5 text-[#2ea043]" />
              <span className={`text-sm font-bold ${textMuted}`}>Select Date:</span>
              <input
                type="date"
                value={multiDate}
                onChange={(e) => setMultiDate(e.target.value)}
                className={`text-sm rounded-xl px-4 py-3 focus:outline-none ${inputBg} ${touchTargetSmall}`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${touchTargetSmall} ${showFilterPanel ? 'bg-[#2ea043] text-white' : isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {filterText && <span className="bg-[#2ea043] text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>}
              </button>

              <div className={`text-sm ${textMuted}`}>
                Found {filteredMultiSales.length} multi-item sales
                {filterText && filteredMultiSales.length !== filteredMultiSalesRaw.length && (
                  <span className="text-xs ml-1">(of {filteredMultiSalesRaw.length})</span>
                )}
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
              <FilterUI />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {isLoading ? (
              <>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
              </>
            ) : (
              <>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Multi-Item Sales</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredMultiSales.length}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Total Revenue</p>
                  <p className="text-xl font-extrabold text-[#2ea043] mt-1">
                    {currency} {multiTotalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${cardBg}`}>
                  <p className={`text-sm font-semibold ${textMuted}`}>Avg Items per Sale</p>
                  <p className={`text-xl font-extrabold mt-1 ${textTitle}`}>
                    {filteredMultiSales.length > 0
                      ? (filteredMultiSales.reduce((acc, g) => acc + g.items.length, 0) / filteredMultiSales.length).toFixed(1)
                      : '0'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Multi-Item Sales List */}
          {isLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : (
            <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
              <div className={`p-4 font-bold text-sm flex items-center justify-between ${borderLine} ${textTitle}`}>
                <span>Multi-Item Sales for {multiDate}</span>
                {filterText && (
                  <span className={`text-xs font-normal ${textMuted}`}>
                    Filtered: {filteredMultiSales.length} of {filteredMultiSalesRaw.length}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`uppercase font-bold text-[11px] tracking-wider ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                    }`}>
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderLine}`}>
                    {filteredMultiSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`p-8 text-center ${textMuted}`}>
                          {filterText ? 'No multi-item sales match your filter criteria.' : 'No multi-item sales found for this date.'}
                          <p className="text-xs mt-1">Multi-item sales are sales with more than one item purchased by the same customer.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMultiSales.map(group => renderMultiSaleRow(group))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Return Modal */}
      {selectedSaleForReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-base mb-2 ${textTitle}`}>
              Process Sale Return #{selectedSaleForReturn.sale_number}
            </h3>
            <p className={`text-sm mb-3 ${textMuted}`}>
              Return product: <strong>{selectedSaleForReturn.product_name}</strong> (x{selectedSaleForReturn.quantity})
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Return Reason *</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl p-3 focus:outline-none ${inputBg} ${touchTarget}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedSaleForReturn(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnSubmit}
                  className={`px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-sm ${touchTargetSmall}`}
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