// App.tsx
import React, { useState } from 'react';
import { useApp } from './hooks/useApp';
import { useActions } from './hooks/useActions';
import { useTheme } from './hooks/useTheme';
import { useAppUpdate } from './hooks/useAppUpdate';
import { getPharmacyFromProfile, getTodayStr, getExpiryCutoffStr } from './utils/helpers';
import { SecurityView } from './components/views/SecurityView';

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

export default function App() {
  // Theme
  const { theme, toggleTheme, isDark } = useTheme();

  // App Updates
  const { showUpdateNotification, isUpdateAvailable, handleUpdate, handleDismissUpdate } = useAppUpdate();

  // Security View State
  const [showSecurityView, setShowSecurityView] = useState(false);

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
    toastMessage,
    toastType,
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

        <main className="flex-1 w-full px-2 sm:px-3 md:px-4 pt-2 sm:pt-4 pb-0 min-w-0 overflow-y-auto">
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
                />
              )}
            </>
          )}
        </main>
      </div>

    // App.tsx - Update the Toast section (around line 200-220)

      {/* TOAST NOTIFICATION - TOP CENTERED */}
      {toastMessage && toastType && (
        <div className="fixed top-4 left-0 right-0 z-[100] pointer-events-none px-4 flex justify-center">
          <div
            className={`
              pointer-events-auto
              flex items-center gap-3
              px-4 sm:px-5 py-3 sm:py-4
              rounded-2xl
              shadow-2xl
              border
              max-w-sm w-full
              animate-slide-down
              backdrop-blur-sm
              bg-opacity-95
              ${toastType === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : ''}
              ${toastType === 'error' ? 'bg-red-500 text-white border-red-400' : ''}
              ${toastType === 'info' ? 'bg-blue-500 text-white border-blue-400' : ''}
            `}
            role="alert"
          >
            <div className="flex-shrink-0">
              {getToastIcon(toastType)}
            </div>
            <p className="text-sm font-medium flex-1 text-center">
              {toastMessage}
            </p>
            <button
              onClick={clearToast}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Update Notification */}
      {showUpdateNotification && isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Update Available</h4>
              <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
                Version 1.0.0 is ready. Refresh to get the latest features.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUpdate}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={handleDismissUpdate}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissUpdate}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Other Views */}
      {activeTab === 'about' && <AboutView theme={theme} />}
      {activeTab === 'privacy' && <PrivacyPolicyView theme={theme} />}
      {activeTab === 'terms' && <TermsConditionsView theme={theme} />}

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