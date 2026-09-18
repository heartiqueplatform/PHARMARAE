// components/views/DashboardView.tsx
import React, { useMemo } from 'react';
import {
  Pharmacy,
  Profile,
  UserRole,
  Sale,
  Product,
  ProductBatch,
  RequestedItem,
  SalesReturn,
  Customer,
  LoyaltyTransaction,
} from '../../types';
import {
  ShoppingBag,
  PlusCircle,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Undo2,
  List,
  Brain,
  BarChart3,
  PieChart,
  LineChart,
  Sparkles,
  ShoppingCart,
  Gift,
  Crown,
  Star,
  Award,
  Users,
} from 'lucide-react';
import PharmientaPro from '../PharmientaPro';
import { PwaInstallPrompt } from '../PwaInstallPrompt';

interface DashboardViewProps {
  pharmacy: Pharmacy | null;
  profile: Profile | null;
  role: UserRole;
  todaySales: Sale[];
  lowStockProducts: Product[];
  expiringBatches: ProductBatch[];
  requestedItems?: RequestedItem[];
  salesReturns?: SalesReturn[];
  loyaltyCustomers?: Customer[];
  loyaltyTransactions?: LoyaltyTransaction[];
  onNavigate: (tab: any) => void;
  onOpenAddStockModal: () => void;
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

// =============================================
// AVATAR HELPERS (module-level — stable across renders)
// =============================================
const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-purple-600',
];

function getAvatarGradient(name: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getTierFromPoints(points: number) {
  if (points >= 500)
    return { label: 'Platinum', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Crown };
  if (points >= 200)
    return { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/20', icon: Star };
  if (points >= 100)
    return { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-400/20', icon: Award };
  if (points >= 50)
    return { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-500/20', icon: Award };
  return { label: 'Member', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Users };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pharmacy,
  profile,
  role,
  todaySales,
  lowStockProducts,
  expiringBatches,
  requestedItems = [],
  salesReturns = [],
  loyaltyCustomers = [],
  loyaltyTransactions = [],
  onNavigate,
  onOpenAddStockModal,
  theme = 'dark',
  isLoading = false,
}) => {
  // Get pharmacy details from profile
  const pharmacyName = profile?.pharmacy_name || pharmacy?.name || 'Pharmienta Kenya';
  const pharmacyCurrency = profile?.pharmacy_currency || pharmacy?.currency || 'KSh';
  const pharmacyReceiptHeader =
    profile?.pharmacy_receipt_header ||
    pharmacy?.receipt_header ||
    'Quality Medicines & Professional Care';
  const pharmacyReceiptFooter =
    profile?.pharmacy_receipt_footer ||
    pharmacy?.receipt_footer ||
    'Thank you for your visit. Get well soon!';

  const currency = pharmacyCurrency;
  const isDark = theme === 'dark';

  // Card & Theme variables — NO border classes
  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const itemBg = isDark ? 'bg-[#21262d]/50' : 'bg-[#f6f8fa]';

  // Theme-aware skeleton colors
  const skeletonBg = isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]';
  const skeletonLight = isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]';

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Metrics using single-table sales data
  const totalSalesRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const totalTransactions = todaySales.length;
  const totalItemsSold = todaySales.reduce((acc, s) => acc + (s.quantity || 0), 0);

  // Simple metrics
  const totalRequests = requestedItems.length;
  const pendingRequests = requestedItems.filter(i => i.status === 'pending').length;
  const totalReturns = salesReturns.length;
  const todayReturns = salesReturns.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.created_at?.startsWith(today);
  }).length;

  const canViewFinancials = role === 'owner' || role === 'admin' || role === 'pharmacist';

  // =============================================
  // LOYALTY METRICS (memoized)
  // =============================================
  const { topLoyaltyCustomers, totalPointsOutstanding, todayPointsEarned, totalEarns } =
    useMemo(() => {
      const top = [...loyaltyCustomers]
        .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
        .slice(0, 20);

      const outstanding = loyaltyCustomers.reduce(
        (sum, c) => sum + (c.loyalty_points || 0),
        0
      );

      const today = new Date().toISOString().split('T')[0];
      const todayEarned = loyaltyTransactions
        .filter(t => t.points > 0 && t.created_at?.startsWith(today))
        .reduce((sum, t) => sum + t.points, 0);

      const totalEarns = loyaltyTransactions.filter(t => t.points > 0).length;

      return {
        topLoyaltyCustomers: top,
        totalPointsOutstanding: outstanding,
        todayPointsEarned: todayEarned,
        totalEarns,
      };
    }, [loyaltyCustomers, loyaltyTransactions]);

  // =============================================
  // SKELETON COMPONENTS
  // =============================================
  const SkeletonMetric = () => (
    <div className={`rounded-2xl p-3.5 animate-pulse ${cardBg}`}>
      <div className="flex items-center justify-between mb-1">
        <div className={`h-3 ${skeletonBg} rounded w-16`}></div>
        <div className={`w-4 h-4 ${skeletonBg} rounded`}></div>
      </div>
      <div className={`h-6 ${skeletonBg} rounded w-20 mt-1`}></div>
      <div className={`h-3 ${skeletonLight} rounded w-16 mt-1`}></div>
    </div>
  );

  const SkeletonSaleItem = () => (
    <div className={`flex items-center justify-between p-2.5 rounded-xl animate-pulse ${itemBg}`}>
      <div>
        <div className={`h-4 ${skeletonBg} rounded w-20`}></div>
        <div className={`h-3 ${skeletonLight} rounded w-16 mt-1`}></div>
      </div>
      <div className="text-right">
        <div className={`h-4 ${skeletonBg} rounded w-16`}></div>
        <div className={`h-3 ${skeletonLight} rounded w-12 mt-1`}></div>
      </div>
    </div>
  );

  const SkeletonWarning = () => (
    <div className={`p-2.5 rounded-xl animate-pulse ${isDark ? 'bg-amber-950/20' : 'bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`h-4 ${skeletonBg} rounded w-24`}></div>
          <div className={`h-3 ${skeletonLight} rounded w-16 mt-1`}></div>
        </div>
        <div className={`h-5 ${skeletonBg} rounded w-16`}></div>
      </div>
    </div>
  );

  const SkeletonBanner = () => (
    <div
      className={`rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden animate-pulse mx-0 ${isDark ? 'bg-[#161b22]' : 'bg-[#e8eaed]'
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className={`h-4 ${isDark ? 'bg-[#21262d]' : 'bg-[#d0d7de]'} rounded w-32`}></div>
          <div className={`h-6 ${isDark ? 'bg-[#21262d]' : 'bg-[#d0d7de]'} rounded w-48 mt-2`}></div>
          <div className={`h-3 ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'} rounded w-64 mt-2`}></div>
        </div>
        <div className={`h-10 ${isDark ? 'bg-[#21262d]' : 'bg-[#d0d7de]'} rounded-xl w-32`}></div>
      </div>
    </div>
  );

  // Helpers
  const getSaleProductName = (sale: Sale): string => {
    return sale.product_name || 'Unknown Product';
  };

  const getSaleQuantity = (sale: Sale): number => {
    return sale.quantity || 1;
  };

  return (
    <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">
      {/* Welcome Banner with Image Background */}
      {isLoading ? (
        <SkeletonBanner />
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-lg mx-0">
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url('/pharmacy-banner.jpg')`,
              backgroundSize: 'contain',
              backgroundPosition: 'right center',
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-black/0" />

          <div className="relative z-10 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  {greeting}, {profile?.full_name?.split(' ')[0] || 'Pharmacist'}
                </p>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                  {pharmacyName}
                </h2>
                <p className="text-xs text-white/80 mt-1">
                  {profile?.pharmacy_trading_name ||
                    pharmacy?.trading_name ||
                    'Ready for fast dispensing & stock auditing today.'}
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
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 px-0 md:px-0">
        {isLoading ? (
          <>
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
          </>
        ) : (
          <>
            {/* Today's Sales */}
            <div className={`rounded-2xl p-3.5 ${cardBg}`}>
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Today's Sales Status</span>
                <TrendingUp className="w-4 h-4 text-[#2ea043]" />
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-[#2ea043]">
                {canViewFinancials
                  ? `${currency} ${totalSalesRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                  })}`
                  : '••••••'}
              </p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>Total revenue</p>
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
              <p className={`text-[10px] mt-1 ${textMuted}`}>Receipts today</p>
            </div>

            {/* Items Sold */}
            <div className={`rounded-2xl p-3.5 ${cardBg}`}>
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Items Sold</span>
                <Package className="w-4 h-4 text-[#d2a8ff]" />
              </div>
              <p className={`text-lg sm:text-xl font-extrabold ${textTitle}`}>{totalItemsSold}</p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>Units dispensed</p>
            </div>

            {/* Low Stock Alert */}
            <button
              onClick={() => onNavigate('stock')}
              className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
            >
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Low Stock</span>
                <AlertTriangle
                  className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-amber-500' : textMuted
                    }`}
                />
              </div>
              <p
                className={`text-lg sm:text-xl font-extrabold ${lowStockProducts.length > 0 ? 'text-amber-500' : textTitle
                  }`}
              >
                {lowStockProducts.length}
              </p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>Need reorder</p>
            </button>

            {/* Requests */}
            <button
              onClick={() => onNavigate('requests')}
              className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
            >
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Requests</span>
                <List className="w-4 h-4 text-[#d2a8ff]" />
              </div>
              <p className={`text-lg sm:text-xl font-extrabold ${textTitle}`}>{totalRequests}</p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {pendingRequests > 0 ? `${pendingRequests} pending` : 'No pending'}
              </p>
            </button>

            {/* Returns */}
            <button
              onClick={() => onNavigate('returns')}
              className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
            >
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Returns</span>
                <Undo2
                  className={`w-4 h-4 ${totalReturns > 0 ? 'text-amber-500' : textMuted}`}
                />
              </div>
              <p
                className={`text-lg sm:text-xl font-extrabold ${totalReturns > 0 ? 'text-amber-500' : textTitle
                  }`}
              >
                {totalReturns}
              </p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {todayReturns > 0 ? `${todayReturns} today` : 'No returns'}
              </p>
            </button>

            {/* Business Intelligence Card */}
            <button
              onClick={() => onNavigate('intelligence')}
              className={`text-left rounded-2xl p-3.5 transition-all ${cardBg} ${cardHover} relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2ea043]/5 via-transparent to-[#58a6ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                  <span>My Business Intel</span>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#f0883e]" />
                    <Brain className="w-4 h-4 text-[#2ea043]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-lg sm:text-xl font-extrabold ${textTitle}`}>Insights</p>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043]">
                    NEW
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <BarChart3 className="w-3 h-3 text-[#2ea043]" />
                  <PieChart className="w-3 h-3 text-[#58a6ff]" />
                  <LineChart className="w-3 h-3 text-[#f0883e]" />
                  <span className={`text-[9px] ${textMuted} ml-1`}>Smart analytics</span>
                </div>
                <p className={`text-[10px] mt-1 ${textMuted}`}>Revenue & product trends</p>
              </div>
            </button>

            {/* Orders Metric */}
            <button
              onClick={() => onNavigate('orders')}
              className={`text-left rounded-2xl p-3.5 transition-colors ${cardBg} ${cardHover}`}
            >
              <div className={`flex items-center justify-between text-xs mb-1 ${textMuted}`}>
                <span>Need Reorder</span>
                <ShoppingCart
                  className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-[#f0883e]' : textMuted
                    }`}
                />
              </div>
              <p
                className={`text-lg sm:text-xl font-extrabold ${lowStockProducts.length > 0 ? 'text-[#f0883e]' : textTitle
                  }`}
              >
                {lowStockProducts.length}
              </p>
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {lowStockProducts.length > 0
                  ? `${lowStockProducts.filter(p => (p.quantity || 0) <= 5).length} critical`
                  : 'All stocks healthy'}
              </p>
            </button>
          </>
        )}
      </div>

      {/* =============================================
          🆕 LOYALTY MEMBERS STRIP
          ============================================= */}
      {/* =============================================
          🆕 LOYALTY MEMBERS STRIP
          Shows empty state when no members exist
          ============================================= */}
      {!isLoading && (
        <div className={`rounded-2xl p-4 ${cardBg}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">

              <div>
                <h3 className={`text-xs font-extrabold  tracking-wider ${textTitle}`}>
                  Loyalty Members
                </h3>
                <p className={`text-[10px] ${textMuted} mt-0.5`}>
                  {loyaltyCustomers.length > 0
                    ? `${loyaltyCustomers.length} member${loyaltyCustomers.length === 1 ? '' : 's'} • ${totalPointsOutstanding.toLocaleString()} pts outstanding`
                    : 'No members yet'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('loyalty')}
              className="text-xs text-[#2ea043] hover:underline flex items-center gap-1 font-bold"
            >
              <span>{loyaltyCustomers.length > 0 ? 'Manage' : 'Set up'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loyaltyCustomers.length === 0 ? (
            /* =============================================
               EMPTY STATE — no loyalty members yet
               ============================================= */
            <div className="flex flex-col items-center text-center py-6 gap-3">
              <div
                className={`w-16 h-16 rounded-full ${isDark ? 'bg-amber-500/10' : 'bg-amber-500/5'
                  } flex items-center justify-center`}
              >
                <Gift className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className={`text-sm font-bold ${textTitle}`}>No loyalty members yet</p>
                <p className={`text-xs ${textMuted} mt-1 max-w-[280px] mx-auto leading-relaxed`}>
                  Add a customer at the POS to start giving loyalty points. They'll
                  appear here automatically after their first sale.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => onNavigate('sell')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2ea043] hover:bg-[#2c9b3e] text-white text-xs font-bold transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Start a sale</span>
                </button>
                <button
                  onClick={() => onNavigate('loyalty')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2] text-[#1f2328]'}`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Configure rewards</span>
                </button>
              </div>

              {/* Educational footer */}
              <div className={`mt-2 pt-3 border-t w-full ${isDark ? 'border-[#21262d]' : 'border-[#eaeef2]'}`}>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-black text-[#2ea043]">1</p>
                    <p className={`text-[9px] uppercase font-bold ${textMuted} leading-tight`}>
                      Add customer to sale
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-[#2ea043]">2</p>
                    <p className={`text-[9px] uppercase font-bold ${textMuted} leading-tight`}>
                      Points awarded automatically
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-[#2ea043]">3</p>
                    <p className={`text-[9px] uppercase font-bold ${textMuted} leading-tight`}>
                      Redeem for rewards
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================
               MEMBERS EXIST — show story strip + metrics
               ============================================= */
            <>
              {/* Horizontal story scroller */}
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {topLoyaltyCustomers.map(customer => {
                  const points = customer.loyalty_points || 0;
                  const tier = getTierFromPoints(points);
                  const TierIcon = tier.icon;
                  const gradient = getAvatarGradient(customer.name || '?');
                  const initials = getInitials(customer.name || '?');

                  return (
                    <button
                      key={customer.id}
                      onClick={() => onNavigate('loyalty')}
                      className={`shrink-0 w-[110px] flex flex-col items-center text-center p-2.5 rounded-2xl transition-transform active:scale-95 ${itemBg}`}
                    >
                      <div className="relative mb-2">
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-black ring-2 ${isDark ? 'ring-[#0d1117]' : 'ring-white'
                            }`}
                        >
                          {initials}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${tier.bg} ring-2 ${isDark ? 'ring-[#21262d]' : 'ring-white'
                            } flex items-center justify-center`}
                        >
                          <TierIcon className={`w-2.5 h-2.5 ${tier.color}`} />
                        </div>
                      </div>

                      <p className={`text-[11px] font-bold ${textTitle} truncate w-full`}>
                        {customer.name?.split(' ')[0] || 'Unknown'}
                      </p>

                      <div className="flex items-center gap-0.5 mt-1">
                        <Gift className="w-2.5 h-2.5 text-[#2ea043]" />
                        <span className="text-[10px] font-black text-[#2ea043]">{points}</span>
                      </div>

                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </button>
                  );
                })}

                {/* View-all tail card */}
                <button
                  onClick={() => onNavigate('loyalty')}
                  className={`shrink-0 w-[110px] flex flex-col items-center justify-center text-center p-2.5 rounded-2xl ${itemBg} transition-transform active:scale-95`}
                >
                  <div
                    className={`w-14 h-14 rounded-full ${isDark ? 'bg-[#30363d]' : 'bg-slate-200'
                      } flex items-center justify-center mb-2`}
                  >
                    <ArrowRight className={`w-6 h-6 ${textMuted}`} />
                  </div>
                  <p className={`text-[11px] font-bold ${textTitle}`}>View all</p>
                  <p className={`text-[9px] ${textMuted} mt-0.5`}>
                    {loyaltyCustomers.length} members
                  </p>
                </button>
              </div>

              {/* Loyalty metrics row */}
              <div
                className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDark ? 'border-[#21262d]' : 'border-[#eaeef2]'
                  }`}
              >
                <div className="text-center">
                  <p className="text-lg font-black text-[#2ea043]">
                    {todayPointsEarned.toLocaleString()}
                  </p>
                  <p className={`text-[9px] uppercase font-bold ${textMuted}`}>Points Earned Today</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-black ${textTitle}`}>
                    {totalPointsOutstanding.toLocaleString()}
                  </p>
                  <p className={`text-[9px] uppercase font-bold ${textMuted}`}>Points With Users</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-amber-500">{totalEarns}</p>
                  <p className={`text-[9px] uppercase font-bold ${textMuted}`}>Points Earned (Times)</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* Quick Action Hub */}
      <div className={`rounded-2xl p-4 ${cardBg}`}>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${textMuted}`}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('sell')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2ea043]/15 hover:bg-[#2ea043]/25 text-[#2ea043] font-bold text-xs transition-colors"
          >
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">SELL</div>
              <div className="text-[10px] opacity-80 font-normal">New Transaction</div>
            </div>
          </button>

          <button
            onClick={onOpenAddStockModal}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#58a6ff]/15 hover:bg-[#58a6ff]/25 text-[#58a6ff] font-bold text-xs transition-colors"
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">ADD STOCK</div>
              <div className="text-[10px] opacity-80 font-normal">Receive Batch</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('stock')}
            className={`flex items-center gap-2.5 p-3 rounded-xl font-bold text-xs transition-colors ${isDark
              ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
              : 'bg-[#f6f8fa] text-[#1f2328] hover:bg-slate-200'
              }`}
          >
            <Package className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">INVENTORY</div>
              <div className={`text-[10px] font-normal ${textMuted}`}>Catalog & Batches</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('requests')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#d2a8ff]/15 hover:bg-[#d2a8ff]/25 text-[#d2a8ff] font-bold text-xs transition-colors"
          >
            <List className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">REQUESTS</div>
              <div className="text-[10px] opacity-80 font-normal">
                {pendingRequests > 0 ? `${pendingRequests} pending` : 'Track items'}
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('returns')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 font-bold text-xs transition-colors"
          >
            <Undo2 className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold">RETURNS</div>
              <div className="text-[10px] opacity-80 font-normal">
                {todayReturns > 0 ? `${todayReturns} today` : 'Process returns'}
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f0883e]/15 hover:bg-[#f0883e]/25 text-[#f0883e] font-bold text-xs transition-colors"
          >
            <FileText className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="font-extrabold flex items-center gap-1.5">
                ORDERS
                <span className="text-[8px] font-black px-1 py-0.5 rounded bg-[#f0883e]/20 text-[#f0883e]">
                  Smart
                </span>
              </div>
              <div className="text-[10px] opacity-80 font-normal">Supplier orders</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('intelligence')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-[#2ea043]/15 to-[#58a6ff]/15 hover:from-[#2ea043]/25 hover:to-[#58a6ff]/25 text-[#2ea043] font-bold text-xs transition-colors group"
          >
            <Brain className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-extrabold flex items-center gap-1.5">
                INSIGHTS

              </div>
              <div className="text-[10px] opacity-80 font-normal">Smart analytics</div>
            </div>
          </button>

          {/* 🆕 Loyalty quick action */}
          <button
            onClick={() => onNavigate('loyalty')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-pink-500/15 hover:from-amber-500/25 hover:to-pink-500/25 text-amber-500 font-bold text-xs transition-colors group"
          >
            <Sparkles className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-extrabold flex items-center gap-1.5">
                LOYALTY

              </div>
              <div className="text-[10px] opacity-80 font-normal">Rewards & points</div>
            </div>
          </button>
        </div>
      </div>


      <PharmientaPro theme={theme} />

      {/* Smart Stock Alerts & Recent Sales Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-0 md:px-0">
        {/* Recent Transactions List */}
        <div className={`rounded-2xl p-4 flex flex-col ${cardBg}`}>
          <div
            className={`flex items-center justify-between pb-3 mb-3 ${isDark ? 'border-b border-[#30363d]' : 'border-b border-[#d0d7de]'
              }`}
          >
            <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textTitle}`}>
              Today's Recent Sales Status
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-[#2ea043] hover:underline flex items-center gap-1 font-bold"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
              <SkeletonSaleItem />
              <SkeletonSaleItem />
              <SkeletonSaleItem />
              <SkeletonSaleItem />
            </div>
          ) : todaySales.length === 0 ? (
            <div className={`py-8 text-center text-xs ${textMuted}`}>
              <CheckCircle2 className="w-8 h-8 opacity-40 mx-auto mb-2" />
              No sales completed yet today. Tap{' '}
              <span className="text-[#2ea043] font-extrabold">SELL NOW</span> to record the first
              transaction!
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-84 pr-1">
              {todaySales.slice(0, 5).map(sale => {
                const productName = sale.product_name || 'Unknown Product';
                const quantity = sale.quantity || 1;

                return (
                  <div
                    key={sale.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${itemBg}`}
                  >
                    <div>
                      <div className={`font-bold ${textTitle}`}>
                        #{sale.sale_number} - {productName}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${textMuted}`}>
                        {new Date(sale.sale_date || sale.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' • '}
                        {sale.sold_by_name || 'Cashier'}
                        {' • '}×{quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-[#2ea043]">
                        {canViewFinancials
                          ? `${currency} ${sale.total.toFixed(2)}`
                          : 'Completed'}
                      </div>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${isDark
                          ? 'bg-[#30363d] text-[#c9d1d9]'
                          : 'bg-slate-200 text-slate-800'
                          }`}
                      >
                        {sale.payment_method || 'cash'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock & Expiry Warnings */}
        <div className={`rounded-2xl p-4 flex flex-col ${cardBg}`}>
          <div
            className={`flex items-center justify-between pb-3 mb-3 ${isDark ? 'border-b border-[#30363d]' : 'border-b border-[#d0d7de]'
              }`}
          >
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

          {isLoading ? (
            <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
              <SkeletonWarning />
              <SkeletonWarning />
              <SkeletonWarning />
            </div>
          ) : lowStockProducts.length === 0 && expiringBatches.length === 0 ? (
            <div className={`py-8 text-center text-xs ${textMuted}`}>
              <CheckCircle2 className="w-8 h-8 text-[#2ea043] opacity-50 mx-auto mb-2" />
              All stock levels are healthy and no batches expire within 90 days.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-84 pr-1">
              {lowStockProducts.map(prod => (
                <div
                  key={prod.id}
                  className="p-2.5 bg-amber-500/10 rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-amber-600 dark:text-amber-300">{prod.name}</div>
                    <div className="text-[10px] text-amber-600/80 dark:text-amber-300/70">
                      Category: {prod.category_name || 'General'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Stock: {prod.quantity || 0} (Reorder: {prod.reorder_level})
                    </span>
                  </div>
                </div>
              ))}

              {expiringBatches.map(batch => (
                <div
                  key={batch.id}
                  className="p-2.5 bg-rose-500/10 rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-300">
                      {batch.product_name || 'Drug Batch'}
                    </div>
                    <div className="text-[10px] text-rose-600/80 dark:text-rose-300/70">
                      Batch: {batch.batch_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      Expires: {batch.expiry_date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PwaInstallPrompt theme={theme} />
    </div>
  );
};