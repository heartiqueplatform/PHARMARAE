// App.tsx - CLEAN VERSION (No useAppUpdate)
import React, { useState } from 'react';
import { useApp } from './hooks/useApp';
import { useActions } from './hooks/useActions';
import { useTheme } from './hooks/useTheme';
// ❌ REMOVED: import { useAppUpdate } from './hooks/useAppUpdate';
import { getPharmacyFromProfile, getTodayStr, getExpiryCutoffStr } from './utils/helpers';
import { SecurityView } from './components/views/SecurityView';
import { HardResetView } from './components/views/HardResetView';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/views/DashboardView';
import { PosView } from './components/views/PosView';
import { InventoryView } from './components/views/InventoryView';
import { ReportsView } from './components/views/ReportsView';
import { MoreView } from './components/views/MoreView';
import { RequestedItemsView } from './components/views/RequestedItemsView';
import { SalesReturnsView } from './components/views/SalesReturnsView';
import { AboutView } from '@/components/views/AboutView';
import { PrivacyPolicyView } from '@/components/views/PrivacyPolicyView';
import { TermsConditionsView } from '@/components/views/TermsConditionsView';
import { StatusBar } from './components/StatusBar';

export default function App() {
  // Theme
  const { theme, toggleTheme, isDark } = useTheme();

  // ❌ REMOVED: useAppUpdate hook
  // const { showUpdateNotification, isUpdateAvailable, handleUpdate, handleDismissUpdate } = useAppUpdate();

  // Security View State
  const [showSecurityView, setShowSecurityView] = useState(false);

  // Hard Reset View State
  const [showHardResetView, setShowHardResetView] = useState(false);

  // App State
  const app = useApp();
  const {
    currentProfile,
    profiles,
    currentRole,
    products,
    batches,
    categories,
    suppliers,
    units,
    customers,
    sales,
    movements,
    auditLogs,
    requestedItems,
    salesReturns,
    isLoading,
    isOnline,
    isSyncing,
    syncPendingCount,
    lastSyncTime,
    isAuthenticated,
    // ✅ Status Bar props
    statusMessage,
    statusType,
    showStatusBar,
    // ✅ Toast props (from useApp)
    toastMessage,
    toastType,
    toastPosition,
    hasNewData,
    newDataCount,
    isBarcodeScannerOpen,
    scannedBarcode,
    receiptSale,
    isReceiptModalOpen,
    activeTab,
    setCurrentProfile,
    setCurrentRole,
    setIsAuthenticated,
    setIsBarcodeScannerOpen,
    setScannedBarcode,
    setReceiptSale,
    setIsReceiptModalOpen,
    setActiveTab,
    loadDatabaseData,
    triggerSyncQueue,
    clearStatus,
    clearToast,
  } = app;

  // Actions
  const actions = useActions({
    currentProfile,
    currentRole,
    products,
    batches,
    categories,
    suppliers,
    sales,
    loadDatabaseData,
    setReceiptSale,
    setIsReceiptModalOpen,
    setSyncPendingCount: app.setSyncPendingCount,
  });

  // Computed values
  const todayStr = getTodayStr();
  const todaySales = sales.filter(s => s.sale_date?.startsWith(todayStr) || s.created_at?.startsWith(todayStr));
  const lowStockProducts = products.filter(p => (p.quantity || 0) <= p.reorder_level);
  const expiringBatches = batches.filter(b => b.expiry_date <= getExpiryCutoffStr(90) && b.quantity_base > 0);

  // Get icon based on toast type
  const getToastIcon = (type: string | null) => {
    if (type === 'success') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    } else if (type === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  // Handle refresh when toast is clicked
  const handleToastClick = () => {
    if (toastType === 'info' && hasNewData) {
      triggerSyncQueue();
      clearToast();
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]'
      }`}>
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab: NavTab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={toggleTheme}
        pharmacyName={currentProfile?.pharmacy_name || null}
        currentProfile={currentProfile}
      />

      <div className="flex-1 flex flex-col w-full min-w-0 transition-all duration-300 overflow-y-auto">
        <Header
          pharmacy={getPharmacyFromProfile(currentProfile)}
          currentProfile={currentProfile}
          currentRole={currentRole}
          profiles={profiles}
          isOnline={isOnline}
          syncPendingCount={syncPendingCount}
          isSyncing={isSyncing}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSwitchProfile={(p) => {
            setCurrentProfile(p);
            setCurrentRole(p.role || 'owner');
            localStorage.setItem('medp_current_user_id', p.id);
            loadDatabaseData(true);
          }}
          onTriggerSync={triggerSyncQueue}
          onSignOut={() => {
            localStorage.removeItem('medp_authenticated');
            localStorage.removeItem('medp_current_user_id');
            setIsAuthenticated(false);
          }}
          appVersion="1.0.0"
        />

        {/* ✅ STATUS BAR - for sync/data updates */}
        <div className="h-[30px] flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0">
            <StatusBar
              message={statusMessage}
              type={statusType}
              show={showStatusBar}
              onClose={clearStatus}
            />
          </div>
        </div>

        <main className="flex-1 w-full px-2 sm:px-3 md:px-4 pt-2 sm:pt-4 pb-24 min-w-0 overflow-y-auto">
          {/* =============================================
              HARD RESET VIEW - Full page (rendered FIRST)
              ============================================ */}
          {showHardResetView ? (
            <HardResetView
              theme={theme}
              pharmacyName={currentProfile?.pharmacy_name}
              onCancel={() => setShowHardResetView(false)}
              onComplete={() => {
                setShowHardResetView(false);
                window.location.reload();
              }}
              onTriggerSync={triggerSyncQueue}
            />
          ) : (
            <>
              {/* Security View - Full page */}
              {showSecurityView ? (
                <SecurityView
                  profile={currentProfile}
                  currentRole={currentRole}
                  profiles={profiles}
                  theme={theme}
                  onBack={() => setShowSecurityView(false)}
                  onChangePin={actions.handleChangePin}
                  onChangePassword={actions.handleChangePassword}
                  onDeleteAccount={actions.handleDeleteAccount}
                  onSignOut={() => {
                    localStorage.removeItem('medp_authenticated');
                    localStorage.removeItem('medp_current_user_id');
                    setIsAuthenticated(false);
                  }}
                />
              ) : (
                <>
                  {activeTab === 'home' && (
                    <DashboardView
                      pharmacyName={currentProfile?.pharmacy_name || null}
                      profile={currentProfile}
                      role={currentRole}
                      todaySales={todaySales}
                      lowStockProducts={lowStockProducts}
                      expiringBatches={expiringBatches}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onOpenAddStockModal={() => setActiveTab('stock')}
                      theme={theme}
                      isLoading={isLoading}
                      requestedItems={requestedItems}
                      salesReturns={salesReturns}
                    />
                  )}

                  {activeTab === 'sell' && (
                    <PosView
                      pharmacyName={currentProfile?.pharmacy_name || null}
                      currentProfile={currentProfile}
                      role={currentRole}
                      products={products}
                      batches={batches}
                      customers={customers}
                      onCompleteSale={actions.handleCompleteSale}
                      onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
                      scannedBarcode={scannedBarcode}
                      theme={theme}
                      isLoading={isLoading}
                    />
                  )}

                  {activeTab === 'stock' && (
                    <InventoryView
                      pharmacy={getPharmacyFromProfile(currentProfile)}
                      products={products}
                      batches={batches}
                      categories={categories}
                      suppliers={suppliers}
                      units={units}
                      movements={movements}
                      onAddProduct={actions.handleAddProduct}
                      onAddBatch={actions.handleAddBatch}
                      onUpdateProduct={actions.handleUpdateProduct}
                      onDeleteProduct={actions.handleDeleteProduct}
                      onUpdateBatch={actions.handleUpdateBatch}
                      isLoading={isLoading}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'reports' && (
                    <ReportsView
                      pharmacy={getPharmacyFromProfile(currentProfile)}
                      role={currentRole}
                      sales={sales}
                      products={products}
                      batches={batches}
                      movements={movements}
                      theme={theme}
                      isLoading={isLoading}
                      isSyncing={isSyncing}
                      onRefresh={triggerSyncQueue}
                    />
                  )}

                  {activeTab === 'requests' && (
                    <RequestedItemsView
                      requestedItems={requestedItems || []}
                      pharmacyName={currentProfile?.pharmacy_name || null}
                      currency={currentProfile?.pharmacy_currency || 'KSh'}
                      theme={theme}
                      isLoading={isLoading}
                      onAddRequestedItem={actions.handleAddRequestedItem}
                      onUpdateRequestedItem={actions.handleUpdateRequestedItem}
                      onDeleteRequestedItem={actions.handleDeleteRequestedItem}
                      pharmacy={{
                        name: currentProfile?.pharmacy_name || 'Pharmacy',
                        address: currentProfile?.pharmacy_address || '',
                        phone: currentProfile?.pharmacy_phone || '',
                        currency: currentProfile?.pharmacy_currency || 'KSh'
                      }}
                    />
                  )}

                  {activeTab === 'returns' && (
                    <SalesReturnsView
                      sales={sales}
                      products={products}
                      batches={batches}
                      salesReturns={salesReturns || []}
                      pharmacyName={currentProfile?.pharmacy_name || null}
                      currency={currentProfile?.pharmacy_currency || 'KSh'}
                      theme={theme}
                      isLoading={isLoading}
                      onSalesReturn={actions.handleSalesReturn}
                    />
                  )}

                  {activeTab === 'more' && (
                    <MoreView
                      profile={currentProfile}
                      profiles={profiles}
                      currentRole={currentRole}
                      suppliers={suppliers}
                      auditLogs={auditLogs}
                      isOnline={isOnline}
                      syncPendingCount={syncPendingCount}
                      onUpdateProfile={actions.handleUpdateProfile}
                      onUpdatePharmacyName={actions.handleUpdatePharmacyName}
                      onAddSupplier={actions.handleAddSupplier}
                      onAddStaff={actions.handleAddStaff}
                      onTriggerSync={triggerSyncQueue}
                      theme={theme}
                      onResetLocalCache={actions.handleResetLocalCache}
                      onNavigateToTab={(tab) => setActiveTab(tab)}
                      onNavigateToSecurity={() => setShowSecurityView(true)}
                      onNavigateToHardReset={() => setShowHardResetView(true)}
                    />
                  )}

                  {/* Other Views */}
                  {activeTab === 'about' && <AboutView theme={theme} />}
                  {activeTab === 'privacy' && <PrivacyPolicyView theme={theme} />}
                  {activeTab === 'terms' && <TermsConditionsView theme={theme} />}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* =============================================
    ✅ TOAST NOTIFICATION - Bottom Left (Desktop) / Bottom Center (Mobile)
    ============================================ */}
      {/* =============================================
    ✅ TOAST NOTIFICATION - With Update & Later Buttons
    ============================================ */}
      {toastMessage && toastType && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100] pointer-events-none">
          <div
            className={`
                pointer-events-auto
                flex flex-col
                px-5 py-4
                rounded-2xl
                shadow-2xl
                border-2
                w-full
                animate-slide-up
                backdrop-blur-md
                transition-all duration-200
                ${isDark
                ? 'bg-[#1c2333]/95 border-[#30363d] text-[#f0f6fc]'
                : 'bg-white/95 border-[#d0d7de] text-[#1f2328]'
              }
            `}
            role="alert"
          >
            {/* Top Row: Icon + Message + Close */}
            <div className="flex items-start gap-4">
              {/* Icon Section */}
              <div className="flex-shrink-0">
                {toastType === 'success' && (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {toastType === 'error' && (
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                {toastType === 'info' && (
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Message Section */}
              <div className="flex-1">
                <p className="text-base font-bold">
                  {toastMessage}
                </p>
                {toastType === 'info' && (
                  <p className="text-xs opacity-70 mt-1 font-medium">
                    A new version is available with bug fixes and features.
                  </p>
                )}
                {toastType === 'success' && (
                  <p className="text-xs opacity-70 mt-1 font-medium">
                    Operation completed successfully
                  </p>
                )}
                {toastType === 'error' && (
                  <p className="text-xs opacity-70 mt-1 font-medium">
                    Please try again or contact support
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearToast();
                }}
                className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bottom Row: Buttons - Only for Info type */}
            {toastType === 'info' && (
              <div className="flex gap-3 mt-4 ml-16">
                <button
                  onClick={() => {
                    window.location.reload();
                    clearToast();
                  }}
                  className="
                            flex-1 px-4 py-2.5
                            bg-emerald-600 hover:bg-emerald-700
                            text-white text-sm font-bold
                            rounded-xl
                            transition-all duration-200
                            hover:scale-[1.02] active:scale-95
                            shadow-lg shadow-emerald-500/30
                        "
                >
                  Update Now
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearToast();
                  }}
                  className={`
                            flex-1 px-4 py-2.5
                            text-sm font-medium
                            rounded-xl
                            transition-all duration-200
                            ${isDark
                      ? 'bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                        `}
                >
                  Later
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ❌ REMOVED: Update Notification section (useAppUpdate) */}

      {/* FLOATING REFRESH BUTTON */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-1">
        <button
          onClick={() => {
            triggerSyncQueue();
            clearStatus();
          }}
          className={`
            p-3 rounded-full shadow-lg
            bg-emerald-500 hover:bg-emerald-600
            text-white
            transition-all duration-200
            hover:scale-110 active:scale-95
            flex items-center justify-center
            ${isDark ? 'shadow-emerald-500/20' : 'shadow-emerald-500/30'}
          `}
          style={{
            width: '44px',
            height: '44px',
          }}
          aria-label="Refresh data"
        >
          {isSyncing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
        <span className={`
          text-[10px] font-medium
          ${isDark ? 'text-gray-400' : 'text-gray-600'}
          bg-opacity-80
          px-2 py-0.5 rounded
          ${isDark ? 'bg-gray-800/60' : 'bg-white/60'}
        `}>
          Refresh
        </span>
      </div>

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={(code) => {
          setScannedBarcode(code);
          setIsBarcodeScannerOpen(false);
        }}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        pharmacyName={currentProfile?.pharmacy_name || null}
        pharmacyCurrency={currentProfile?.pharmacy_currency || 'KSh'}
        pharmacyReceiptHeader={currentProfile?.pharmacy_receipt_header || ''}
        pharmacyReceiptFooter={currentProfile?.pharmacy_receipt_footer || ''}
        sale={receiptSale}
        saleItems={receiptSale ? [{
          id: receiptSale.id,
          sale_id: receiptSale.id,
          product_id: receiptSale.product_id,
          product_name: receiptSale.product_name,
          batch_id: receiptSale.batch_id || null,
          batch_number: receiptSale.batch_number || null,
          quantity: receiptSale.quantity,
          unit_id: null,
          unit_name: null,
          unit_price: receiptSale.unit_price,
          discount: 0,
          subtotal: receiptSale.subtotal,
          created_at: receiptSale.created_at
        }] : []}
      />

      {!isAuthenticated && (
        <AuthModal
          onAuthSuccess={(profile) => {
            setCurrentProfile(profile);
            setCurrentRole(profile.role || 'owner');
            setIsAuthenticated(true);
            localStorage.setItem('medp_current_user_id', profile.id);
            loadDatabaseData(true);
          }}
        />
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out forwards;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}