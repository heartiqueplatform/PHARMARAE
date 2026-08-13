// hooks/useApp.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { db, seedInitialDataIfNeeded } from '../lib/db';
import { processOfflineSyncQueue, pullFromSupabaseToLocal, isSupabaseConfigured } from '../lib/supabase';
import { normalizePharmacyName } from '../utils/helpers';
import {
    Profile,
    UserRole,
    Product,
    ProductBatch,
    Category,
    Supplier,
    Unit,
    Customer,
    Sale,
    StockMovement,
    AuditLog,
    RequestedItem,
    SalesReturn,
} from '../types';

export interface AppState {
    // Data
    currentProfile: Profile | null;
    profiles: Profile[];
    currentRole: UserRole;
    products: Product[];
    batches: ProductBatch[];
    categories: Category[];
    suppliers: Supplier[];
    units: Unit[];
    customers: Customer[];
    sales: Sale[];
    movements: StockMovement[];
    auditLogs: AuditLog[];
    requestedItems: RequestedItem[];
    salesReturns: SalesReturn[];

    // UI State
    isLoading: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    syncPendingCount: number;
    lastSyncTime: Date | null;
    isAuthenticated: boolean;
    toastMessage: string | null;
    toastType: 'success' | 'error' | 'info' | null;
    toastPosition: 'top' | 'center' | 'bottom'; // NEW - Added position control

    // Modals
    isBarcodeScannerOpen: boolean;
    scannedBarcode: string | null;
    receiptSale: Sale | null;
    isReceiptModalOpen: boolean;
    activeTab: any;

    // Setters
    setCurrentProfile: (profile: Profile | null) => void;
    setCurrentRole: (role: UserRole) => void;
    setIsSyncing: (syncing: boolean) => void;
    setSyncPendingCount: (count: number) => void;
    setLastSyncTime: (time: Date | null) => void;
    setIsAuthenticated: (auth: boolean) => void;
    setIsBarcodeScannerOpen: (open: boolean) => void;
    setScannedBarcode: (code: string | null) => void;
    setReceiptSale: (sale: Sale | null) => void;
    setIsReceiptModalOpen: (open: boolean) => void;
    setActiveTab: (tab: any) => void;
    setToastMessage: (message: string | null) => void;
    setToastType: (type: 'success' | 'error' | 'info' | null) => void;
    setToastPosition: (position: 'top' | 'center' | 'bottom') => void; // NEW
    clearToast: () => void;

    // Actions
    loadDatabaseData: (showLoader?: boolean) => Promise<void>;
    triggerSyncQueue: () => Promise<void>;
}

export const useApp = (): AppState => {
    // Network
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

    // Data
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentRole, setCurrentRole] = useState<UserRole>('owner');
    const [products, setProducts] = useState<Product[]>([]);
    const [batches, setBatches] = useState<ProductBatch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([]);
    const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncPendingCount, setSyncPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('medp_authenticated') === 'true';
    });
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | null>(null);
    const [toastPosition, setToastPosition] = useState<'top' | 'center' | 'bottom'>('center'); // NEW

    // Modals
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<any>('home');

    // Ref to track if this is initial load
    const isInitialLoad = useRef(true);

    const clearToast = useCallback(() => {
        setToastMessage(null);
        setToastType(null);
    }, []);

    // Auto-clear toast after 4 seconds
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                clearToast();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage, clearToast]);

    // Network listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('🌐 Back online, triggering sync...');
            triggerSyncQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-sync every 30 seconds
    useEffect(() => {
        if (!isOnline || !currentProfile) return;

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('Auto-sync interval triggered');
                triggerSyncQueue();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOnline, currentProfile]);

    // Sync when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isOnline && currentProfile) {
                console.log('Tab became visible, checking for updates...');
                triggerSyncQueue();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOnline, currentProfile]);

    // Load data - with option to show/hide loader
    const loadDatabaseData = useCallback(async (showLoader: boolean = true) => {
        // Only show loader if this is initial load or explicitly requested
        const shouldShowLoader = showLoader && isInitialLoad.current;

        if (shouldShowLoader) {
            setIsLoading(true);
        }

        console.log('🔄 Loading data...');

        try {
            await seedInitialDataIfNeeded();

            const userId = localStorage.getItem('medp_current_user_id');
            const allProfiles = await db.profiles.toArray();
            setProfiles(allProfiles);

            let current = null;
            if (userId) {
                current = allProfiles.find(p => p.id === userId) || allProfiles[0] || null;
            } else {
                current = allProfiles[0] || null;
            }

            if (current) {
                const pharmacyName = normalizePharmacyName(current.pharmacy_name);
                setCurrentProfile(current);
                setCurrentRole(current.role || 'owner');

                if (pharmacyName) {
                    if (isOnline && isSupabaseConfigured()) {
                        console.log(`🔄 FORCE PULLING from Supabase for: ${pharmacyName}`);
                        try {
                            const success = await pullFromSupabaseToLocal(pharmacyName);
                            if (success) {
                                console.log('✅ Supabase data pulled successfully!');
                                setLastSyncTime(new Date());

                                // Show toast for background updates (not initial load)
                                if (!isInitialLoad.current) {
                                    const now = new Date();
                                    const timeStr = now.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    });
                                    setToastMessage(`Data refreshed at ${timeStr}`);
                                    setToastType('success');
                                }
                            } else {
                                console.warn('⚠️ Failed to pull from Supabase, using local data');
                            }
                        } catch (err) {
                            console.error('❌ Error pulling from Supabase:', err);
                            if (!isInitialLoad.current) {
                                setToastMessage('Unable to refresh data. Using cached version.');
                                setToastType('error');
                            }
                        }
                    }

                    console.log(`📂 Loading data from Dexie for: ${pharmacyName}`);

                    const allProducts = await db.products.toArray();
                    setProducts(allProducts.filter(p => normalizePharmacyName(p.pharmacy_name) === pharmacyName));

                    const allBatches = await db.product_batches.toArray();
                    setBatches(allBatches.filter(b => normalizePharmacyName(b.pharmacy_name) === pharmacyName));

                    const allCategories = await db.categories.toArray();
                    setCategories(allCategories.filter(c => normalizePharmacyName(c.pharmacy_name) === pharmacyName));

                    const allUnits = await db.units.toArray();
                    setUnits(allUnits.filter(u => normalizePharmacyName(u.pharmacy_name) === pharmacyName));

                    const allSuppliers = await db.suppliers.toArray();
                    setSuppliers(allSuppliers.filter(s => normalizePharmacyName(s.pharmacy_name) === pharmacyName));

                    const allCustomers = await db.customers.toArray();
                    setCustomers(allCustomers.filter(c => normalizePharmacyName(c.pharmacy_name) === pharmacyName));

                    const allSales = await db.sales.toArray();
                    setSales(allSales.filter(s => normalizePharmacyName(s.pharmacy_name) === pharmacyName));

                    const allMovements = await db.stock_movements.toArray();
                    setMovements(allMovements.filter(m => normalizePharmacyName(m.pharmacy_name) === pharmacyName));

                    const allAuditLogs = await db.audit_logs.toArray();
                    setAuditLogs(allAuditLogs.filter(a => normalizePharmacyName(a.pharmacy_name) === pharmacyName));

                    // Load requested items
                    const allRequestedItems = await db.requested_items.toArray();
                    setRequestedItems(allRequestedItems.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName));
                    console.log(`📦 Requested items in Dexie: ${allRequestedItems.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName).length}`);

                    // Load sales returns
                    const allSalesReturns = await db.sales_returns.toArray();
                    setSalesReturns(allSalesReturns.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName));
                    console.log(`📦 Sales returns in Dexie: ${allSalesReturns.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName).length}`);

                    const pendingCount = await db.sync_queue.where('status').equals('pending').count();
                    setSyncPendingCount(pendingCount);
                }
            }
        } catch (err) {
            console.error('Error loading database data:', err);
            if (!isInitialLoad.current) {
                setToastMessage('Could not load latest data. Please check connection.');
                setToastType('error');
            }
        } finally {
            if (shouldShowLoader) {
                const elapsed = Date.now() - startTime;
                const minLoadTime = 500;
                if (elapsed < minLoadTime) {
                    await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
                }
                setIsLoading(false);
                console.log('✅ Loading complete');
                isInitialLoad.current = false;
            }
        }
    }, [isOnline]);

    // Store startTime for the loader
    let startTime = Date.now();

    // Trigger sync
    const triggerSyncQueue = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            console.log('🔄 Starting background sync...');

            const { synced, failed } = await processOfflineSyncQueue();
            if (synced > 0) console.log(`✅ Pushed ${synced} items to Supabase`);
            if (failed > 0) console.warn(`⚠️ ${failed} items failed to sync`);

            if (currentProfile && isSupabaseConfigured() && isOnline) {
                const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
                console.log(`🔄 Pulling fresh data from Supabase for: ${pharmacyName}`);
                const success = await pullFromSupabaseToLocal(pharmacyName);
                if (success) {
                    console.log('✅ Fresh data pulled from Supabase');
                    setLastSyncTime(new Date());

                    // Show toast for successful sync - with time
                    if (!isInitialLoad.current) {
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                        const pendingCount = await db.sync_queue.where('status').equals('pending').count();
                        if (pendingCount > 0) {
                            setToastMessage(`${pendingCount} items pending sync. Will retry automatically.`);
                            setToastType('info');
                        } else {
                            setToastMessage(`All data up to date as of ${timeStr}`);
                            setToastType('success');
                        }
                    }
                }
            }

            const count = await db.sync_queue.where('status').equals('pending').count();
            setSyncPendingCount(count);

            // Load data silently (no loader)
            await loadDatabaseData(false);

            console.log('✅ Background sync complete!');
        } catch (err) {
            console.error('❌ Sync queue error:', err);
            if (!isInitialLoad.current) {
                setToastMessage('Sync in progress. Data will update shortly.');
                setToastType('info');
            }
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, isOnline, currentProfile, loadDatabaseData]);

    // Initial load - show loader
    useEffect(() => {
        loadDatabaseData(true);
    }, [loadDatabaseData]);

    return {
        // Data
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

        // UI State
        isLoading,
        isOnline,
        isSyncing,
        syncPendingCount,
        lastSyncTime,
        isAuthenticated,
        toastMessage,
        toastType,
        toastPosition, // NEW - Added to return

        // Modals
        isBarcodeScannerOpen,
        scannedBarcode,
        receiptSale,
        isReceiptModalOpen,
        activeTab,

        // Setters
        setCurrentProfile,
        setCurrentRole,
        setIsSyncing,
        setSyncPendingCount,
        setLastSyncTime,
        setIsAuthenticated,
        setIsBarcodeScannerOpen,
        setScannedBarcode,
        setReceiptSale,
        setIsReceiptModalOpen,
        setActiveTab,
        setToastMessage,
        setToastType,
        setToastPosition, // NEW - Added to return
        clearToast,

        // Actions
        loadDatabaseData,
        triggerSyncQueue,
    };
};