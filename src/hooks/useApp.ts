// hooks/useApp.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { db, seedInitialDataIfNeeded } from '../lib/db';
import { processOfflineSyncQueue, pullFromSupabaseToLocal, isSupabaseConfigured, getSupabaseClient, mapEntityTypeToTable } from '../lib/supabase';
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
    toastPosition: 'top' | 'center' | 'bottom';
    hasNewData: boolean;
    newDataCount: number;

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
    setToastPosition: (position: 'top' | 'center' | 'bottom') => void;
    setHasNewData: (has: boolean) => void;
    setNewDataCount: (count: number) => void;
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
    const [toastPosition, setToastPosition] = useState<'top' | 'center' | 'bottom'>('center');
    const [hasNewData, setHasNewData] = useState(false);
    const [newDataCount, setNewDataCount] = useState(0);

    // Modals
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<any>('home');

    // Refs
    const isInitialLoad = useRef(true);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 🆕 Detect if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const clearToast = useCallback(() => {
        setToastMessage(null);
        setToastType(null);
        setHasNewData(false);
        setNewDataCount(0);
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
            console.log('Back online, triggering sync...');
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

    // 🆕 Auto-sync with mobile-friendly interval
    useEffect(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        if (!isOnline || !currentProfile) return;

        // Use shorter interval on mobile (15 seconds) vs desktop (30 seconds)
        const syncInterval = isMobile ? 15000 : 30000;

        syncIntervalRef.current = setInterval(() => {
            // On mobile, sync more aggressively even if tab is hidden
            if (document.visibilityState === 'visible' || isMobile) {
                console.log('Auto-sync interval triggered');
                triggerSyncQueue();
            }
        }, syncInterval);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [isOnline, currentProfile, isMobile]);

    // 🆕 Force data reload when tab becomes visible (mobile fix)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible, refreshing data...');
                if (isOnline && currentProfile) {
                    // Always reload data when returning to app
                    loadDatabaseData(false);
                    triggerSyncQueue();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOnline, currentProfile]);

    // 🆕 Handle page restore from bfcache (mobile fix)
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                console.log('Page restored from bfcache, reloading data...');
                if (isOnline && currentProfile) {
                    loadDatabaseData(false);
                    triggerSyncQueue();
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [isOnline, currentProfile]);

    // Load data
    const loadDatabaseData = useCallback(async (showLoader: boolean = true) => {
        const shouldShowLoader = showLoader && isInitialLoad.current;

        if (shouldShowLoader) {
            setIsLoading(true);
        }

        console.log('Loading data...');

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
                        console.log(`Force pulling from Supabase for: ${pharmacyName}`);
                        try {
                            const success = await pullFromSupabaseToLocal(pharmacyName);
                            if (success) {
                                console.log('Supabase data pulled successfully!');
                                setLastSyncTime(new Date());

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
                                console.warn('Failed to pull from Supabase, using local data');
                            }
                        } catch (err) {
                            console.error('Error pulling from Supabase:', err);
                            if (!isInitialLoad.current) {
                                setToastMessage('Unable to refresh data. Using cached version.');
                                setToastType('error');
                            }
                        }
                    }

                    console.log(`Loading data from Dexie for: ${pharmacyName}`);

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

                    const allRequestedItems = await db.requested_items.toArray();
                    setRequestedItems(allRequestedItems.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName));

                    const allSalesReturns = await db.sales_returns.toArray();
                    setSalesReturns(allSalesReturns.filter(r => normalizePharmacyName(r.pharmacy_name) === pharmacyName));

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
                console.log('Loading complete');
                isInitialLoad.current = false;
            }
        }
    }, [isOnline]);

    let startTime = Date.now();

    // =============================================
    // HIGH PERFORMANCE SYNC QUEUE
    // =============================================
    const triggerSyncQueue = useCallback(async () => {
        if (isSyncing) {
            console.log('Sync already in progress, skipping...');
            return;
        }

        setIsSyncing(true);
        console.log('Starting background sync...');

        try {
            // STEP 1: Check pending items
            const pendingItems = await db.sync_queue.where('status').equals('pending').toArray();
            console.log(`Found ${pendingItems.length} pending items in queue`);

            // STEP 2: If no pending items, just pull fresh data
            if (pendingItems.length === 0) {
                console.log('No pending items to sync');
                if (currentProfile && isSupabaseConfigured() && isOnline) {
                    console.log('Pulling fresh data from Supabase...');
                    const success = await pullFromSupabaseToLocal(normalizePharmacyName(currentProfile.pharmacy_name));
                    if (success) {
                        console.log('Fresh data pulled from Supabase');
                        setLastSyncTime(new Date());
                        if (!isInitialLoad.current) {
                            const now = new Date();
                            const timeStr = now.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                            setToastMessage(`Data up to date as of ${timeStr}`);
                            setToastType('success');
                        }
                    }
                }
                const count = await db.sync_queue.where('status').equals('pending').count();
                setSyncPendingCount(count);
                await loadDatabaseData(false);
                console.log('Background sync complete! (no pending items)');
                return;
            }

            // STEP 3: Process each pending item individually
            let syncedCount = 0;
            let failedCount = 0;
            const errors: string[] = [];

            for (const item of pendingItems) {
                try {
                    console.log(`Processing ${item.entity_type} ${item.operation}`);

                    const client = getSupabaseClient();
                    if (!client) {
                        throw new Error('No Supabase client available');
                    }

                    const tableName = mapEntityTypeToTable(item.entity_type);
                    let error: any = null;

                    if (item.operation === 'INSERT') {
                        const { error: insertErr } = await client
                            .from(tableName)
                            .upsert(item.payload, { onConflict: 'id' });
                        error = insertErr;
                    } else if (item.operation === 'UPDATE') {
                        const { error: updateErr } = await client
                            .from(tableName)
                            .update(item.payload)
                            .eq('id', item.payload.id);
                        error = updateErr;
                    } else if (item.operation === 'DELETE') {
                        const { error: delErr } = await client
                            .from(tableName)
                            .delete()
                            .eq('id', item.payload.id);
                        error = delErr;
                    }

                    if (error) {
                        console.error(`Error syncing ${item.entity_type}:`, error);
                        throw new Error(error.message || 'Sync error');
                    }

                    await db.sync_queue.delete(item.id);
                    syncedCount++;
                    console.log(`Synced ${item.entity_type} ${item.operation}`);

                } catch (err: any) {
                    failedCount++;
                    errors.push(`${item.entity_type}: ${err.message}`);
                    console.error(`Failed to sync ${item.entity_type}:`, err);

                    if (item.id) {
                        const retryCount = (item.retry_count || 0) + 1;
                        await db.sync_queue.update(item.id, {
                            status: 'failed',
                            retry_count: retryCount,
                            error: err.message || 'Sync error'
                        });

                        if (retryCount > 5) {
                            console.warn(`${item.entity_type} failed ${retryCount} times, marking as permanent failure`);
                            await db.sync_queue.update(item.id, {
                                status: 'permanent_failure',
                                error: `Failed ${retryCount} times: ${err.message}`
                            });
                        }
                    }
                }
            }

            // STEP 4: Pull fresh data
            if (currentProfile && isSupabaseConfigured() && isOnline) {
                console.log(`Pulling fresh data from Supabase...`);
                const success = await pullFromSupabaseToLocal(normalizePharmacyName(currentProfile.pharmacy_name));
                if (success) {
                    console.log('Fresh data pulled from Supabase');
                    setLastSyncTime(new Date());

                    if (!isInitialLoad.current) {
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });

                        if (syncedCount > 0 && failedCount === 0) {
                            setToastMessage(`${syncedCount} items synced. Data up to date as of ${timeStr}`);
                            setToastType('success');
                        } else if (syncedCount > 0 && failedCount > 0) {
                            setToastMessage(`${syncedCount} synced, ${failedCount} failed. Check console.`);
                            setToastType('info');
                        } else {
                            setToastMessage(`Data refreshed at ${timeStr}`);
                            setToastType('success');
                        }
                    }
                }
            }

            // STEP 5: Update state
            const remainingCount = await db.sync_queue.where('status').equals('pending').count();
            setSyncPendingCount(remainingCount);
            await loadDatabaseData(false);

            console.log(`Background sync complete! ${syncedCount} synced, ${failedCount} failed, ${remainingCount} pending`);

        } catch (err: any) {
            console.error('Sync queue error:', err);
            if (!isInitialLoad.current) {
                setToastMessage('Sync in progress. Data will update shortly.');
                setToastType('info');
            }
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, isOnline, currentProfile, loadDatabaseData]);

    // Initial load
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
        toastPosition,
        hasNewData,
        newDataCount,

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
        setToastPosition,
        setHasNewData,
        setNewDataCount,
        clearToast,

        // Actions
        loadDatabaseData,
        triggerSyncQueue,
    };
};