import React from 'react';
import { Pharmacy, Profile, UserRole, Sale, Product, ProductBatch } from '../../types';
import { ShoppingBag, PlusCircle, Package, FileText, AlertTriangle, Clock, ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react';

interface DashboardViewProps {
  pharmacy: Pharmacy | null;
  profile: Profile | null;
  role: UserRole;
  todaySales: Sale[];
  lowStockProducts: Product[];
  expiringBatches: ProductBatch[];
  onNavigate: (tab: any) => void;
  onOpenAddStockModal: () => void;
  theme?: 'dark' | 'light';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pharmacy,
  profile,
  role,
  todaySales,
  lowStockProducts,
  expiringBatches,
  onNavigate,
  onOpenAddStockModal,
  theme = 'dark',
}) => {
  // Get pharmacy details from profile (since we store everything in profiles now)
  const pharmacyName = profile?.pharmacy_name || pharmacy?.name || 'PHARMARAE KENYA';
  const pharmacyCurrency = profile?.pharmacy_currency || pharmacy?.currency || 'KSh';
  const pharmacyReceiptHeader = profile?.pharmacy_receipt_header || pharmacy?.receipt_header || 'Quality Medicines & Professional Care';
  const pharmacyReceiptFooter = profile?.pharmacy_receipt_footer || pharmacy?.receipt_footer || 'Thank you for your visit. Get well soon!';

  const currency = pharmacyCurrency;
  const isDark = theme === 'dark';

  // Card & Theme variables - REMOVED ALL border-* classes
  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const itemBg = isDark ? 'bg-[#21262d]/50' : 'bg-[#f6f8fa]';

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Metrics
  const totalSalesRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalTransactions = todaySales.length;

  const canViewFinancials = role === 'owner' || role === 'admin' || role === 'pharmacist';

  return (
    <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">
      {/* REMOVED padding on container for edge-to-edge on mobile */}

      {/* Welcome Banner - REMOVED border */}
      <div className={`rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-colors mx-0 ${isDark
        ? 'bg-gradient-to-r from-[#161b22] via-[#21262d] to-[#161b22] text-white'
        : 'bg-gradient-to-r from-[#0969da] via-[#1f883d] to-[#0969da] text-white'
        }`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Pharmacist'}
            </p>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
              {pharmacyName}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              {profile?.pharmacy_trading_name || pharmacy?.trading_name || 'Ready for fast dispensing & stock auditing today.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('sell')}
            className="self-start sm:self-auto bg-[#2ea043] hover:bg-[#3fb950] text-white px-5 py-2.5 rounded-xl font-extrabold text-sm shadow-xl flex items-center gap-2 transition-transform active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>SELL NOW</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Grid - REMOVED border from all cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-0 md:px-0">

        {/* Today's Sales */}
        <div className={`rounded-2xl p-3.5 ${cardBg}`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
            <span>Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-[#2ea043]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[#2ea043]">
            {canViewFinancials
              ? `${currency} ${totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
              : '••••••'}
          </p>
          <p className={`text-[10px] mt-1 ${textMuted}`}>Total revenue recorded</p>
        </div>

        {/* Transactions */}
        <div className={`rounded-2xl p-3.5 ${cardBg}`}>
          <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
            <span>Transactions</span>
            <FileText className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${textTitle}`}>
            {totalTransactions}
          </p>
          <p className={`text-[10px] mt-1 ${textMuted}`}>Receipts completed</p>
        </div>

        {/* Low Stock Alert */}
        <button
          onClick={() => onNavigate('stock')}
          className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
            <span>Low Stock</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-amber-500' : textMuted}`} />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${lowStockProducts.length > 0 ? 'text-amber-500' : textTitle}`}>
            {lowStockProducts.length}
          </p>
          <p className={`text-[10px] mt-1 ${textMuted}`}>Products below reorder</p>
        </button>

        {/* Expiring Soon */}
        <button
          onClick={() => onNavigate('stock')}
          className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
            <span>Expiring Soon</span>
            <Clock className={`w-4 h-4 ${expiringBatches.length > 0 ? 'text-rose-500' : textMuted}`} />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${expiringBatches.length > 0 ? 'text-rose-500' : textTitle}`}>
            {expiringBatches.length}
          </p>
          <p className={`text-[10px] mt-1 ${textMuted}`}>Batches expiring in 90 days</p>
        </button>

      </div>

      {/* Quick Action Hub - REMOVED border */}
      <div className={`rounded-2xl p-4 ${cardBg}`}>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${textMuted}`}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigate('sell')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2ea043]/15 hover:bg-[#2ea043]/25 border border-[#2ea043]/30 text-[#2ea043] font-bold text-xs transition-colors"
          >
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">SELL</div>
              <div className="text-[10px] opacity-80 font-normal">New Transaction</div>
            </div>
          </button>

          <button
            onClick={onOpenAddStockModal}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#58a6ff]/15 hover:bg-[#58a6ff]/25 border border-[#58a6ff]/30 text-[#58a6ff] font-bold text-xs transition-colors"
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">ADD STOCK</div>
              <div className="text-[10px] opacity-80 font-normal">Receive Batch</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('stock')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border font-bold text-xs transition-colors ${isDark ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-slate-200'
              }`}
          >
            <Package className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">INVENTORY</div>
              <div className={`text-[10px] font-normal ${textMuted}`}>Catalog & Batches</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border font-bold text-xs transition-colors ${isDark ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-slate-200'
              }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">REPORTS</div>
              <div className={`text-[10px] font-normal ${textMuted}`}>Daily & PDF Audit</div>
            </div>
          </button>
        </div>
      </div>

      {/* Smart Stock Alerts & Recent Sales Section - REMOVED borders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-0 md:px-0">

        {/* Recent Transactions List - REMOVED border */}
        <div className={`rounded-2xl p-4 flex flex-col ${cardBg}`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${borderLine}`}>
            <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textTitle}`}>
              Today's Recent Sales
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-[#2ea043] hover:underline flex items-center gap-1 font-bold"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySales.length === 0 ? (
            <div className={`py-8 text-center text-xs ${textMuted}`}>
              <CheckCircle2 className="w-8 h-8 opacity-40 mx-auto mb-2" />
              No sales completed yet today. Tap <span className="text-[#2ea043] font-extrabold">SELL NOW</span> to record the first transaction!
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
              {todaySales.slice(0, 5).map(sale => (
                <div
                  key={sale.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${itemBg}`}
                >
                  <div>
                    <div className={`font-bold ${textTitle}`}>#{sale.sale_number}</div>
                    <div className={`text-[10px] mt-0.5 ${textMuted}`}>
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.sold_by_name || 'Cashier'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[#2ea043]">
                      {canViewFinancials ? `${currency} ${sale.total.toFixed(2)}` : 'Completed'}
                    </div>
                    <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold ${isDark ? 'bg-[#30363d] text-[#c9d1d9] border-[#484f58]' : 'bg-slate-200 text-slate-800 border-slate-300'
                      }`}>
                      {sale.payment_method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock & Expiry Warnings - REMOVED border */}
        <div className={`rounded-2xl p-4 flex flex-col ${cardBg}`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${borderLine}`}>
            <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textTitle}`}>
              Stock Warnings & FEFO Alerts
            </h3>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Manage Batches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
            {lowStockProducts.length === 0 && expiringBatches.length === 0 ? (
              <div className={`py-8 text-center text-xs ${textMuted}`}>
                <CheckCircle2 className="w-8 h-8 text-[#2ea043] opacity-50 mx-auto mb-2" />
                All stock levels are healthy and no batches expire within 90 days.
              </div>
            ) : (
              <>
                {lowStockProducts.map(prod => (
                  <div key={prod.id} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-600 dark:text-amber-300">{prod.name}</div>
                      <div className="text-[10px] text-amber-600/80 dark:text-amber-300/70">
                        Category: {prod.category_name || 'General'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Stock: {prod.total_stock_base || 0} (Reorder: {prod.reorder_level})
                      </span>
                    </div>
                  </div>
                ))}

                {expiringBatches.map(batch => (
                  <div key={batch.id} className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-rose-600 dark:text-rose-300">{batch.product_name || 'Drug Batch'}</div>
                      <div className="text-[10px] text-rose-600/80 dark:text-rose-300/70">
                        Batch: {batch.batch_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        Expires: {batch.expiry_date}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};