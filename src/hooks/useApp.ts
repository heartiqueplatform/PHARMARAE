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

// ✅ VERSION CONSTANTS
const APP_VERSION = '1.0.0';
const VERSION_KEY = 'PHARMARAE_app_version';
const LAST_UPDATE_CHECK = 'PHARMARAE_last_update_check';

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
    statusMessage: string | null;
    statusType: 'loading' | 'success' | 'error' | 'info' | null;
    showStatusBar: boolean;
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
    setStatusMessage: (message: string | null) => void;
    setStatusType: (type: 'loading' | 'success' | 'error' | 'info' | null) => void;
    setShowStatusBar: (show: boolean) => void;
    setToastMessage: (message: string | null) => void;
    setToastType: (type: 'success' | 'error' | 'info' | null) => void;
    setToastPosition: (position: 'top' | 'center' | 'bottom') => void;
    setHasNewData: (has: boolean) => void;
    setNewDataCount: (count: number) => void;
    clearStatus: () => void;
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

    // Status Bar state
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<'loading' | 'success' | 'error' | 'info' | null>(null);
    const [showStatusBar, setShowStatusBar] = useState(false);

    // Toast state - default to 'bottom'
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | null>(null);
    const [toastPosition, setToastPosition] = useState<'top' | 'center' | 'bottom'>('bottom');

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
    const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(false);
    const versionToastShownRef = useRef(false);
    const versionCheckDoneRef = useRef(false);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // =============================================
    // STATUS BAR HELPERS
    // =============================================
    const clearStatus = useCallback(() => {
        setShowStatusBar(false);
        setStatusMessage(null);
        setStatusType(null);
        setHasNewData(false);
        setNewDataCount(0);

        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = null;
        }
    }, []);

    const showStatus = useCallback((
        message: string,
        type: 'loading' | 'success' | 'error' | 'info',
        autoHide: boolean = true
    ) => {
        setStatusMessage(message);
        setStatusType(type);
        setShowStatusBar(true);

        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = null;
        }

        if (autoHide && type !== 'loading') {
            statusTimeoutRef.current = setTimeout(() => {
                clearStatus();
            }, 1500);
        }
    }, [clearStatus]);

    // =============================================
    // TOAST HELPERS
    // =============================================
    const clearToast = useCallback(() => {
        setToastMessage(null);
        setToastType(null);
        setHasNewData(false);
        setNewDataCount(0);

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
    }, []);

    const showToast = useCallback((
        message: string,
        type: 'success' | 'error' | 'info',
        position: 'top' | 'center' | 'bottom' = 'bottom',
        autoHide: boolean = true
    ) => {
        console.log(`📣 [showToast] Called with: "${message}" (${type})`);
        console.log(`📣 [showToast] isMounted: ${isMountedRef.current}`);

        // ✅ Force show even if not mounted (queue it)
        if (!isMountedRef.current) {
            console.log('🔴 Toast skipped: Component not mounted yet, queueing...');
            // Store toast to show after mount
            const checkAndShow = () => {
                if (isMountedRef.current) {
                    console.log('✅ Mounted now, showing queued toast');
                    setToastMessage(message);
                    setToastType(type);
                    setToastPosition(position);

                    if (toastTimeoutRef.current) {
                        clearTimeout(toastTimeoutRef.current);
                        toastTimeoutRef.current = null;
                    }

                    if (autoHide) {
                        toastTimeoutRef.current = setTimeout(() => {
                            clearToast();
                        }, 4000);
                    }
                } else {
                    console.log('⏳ Still not mounted, checking again...');
                    setTimeout(checkAndShow, 500);
                }
            };
            setTimeout(checkAndShow, 300);
            return;
        }

        console.log(`✅ Showing toast: ${message}`);
        setToastMessage(message);
        setToastType(type);
        setToastPosition(position);

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }

        if (autoHide) {
            toastTimeoutRef.current = setTimeout(() => {
                clearToast();
            }, 4000);
        }
    }, [clearToast]);

    // =============================================
    // ✅ APP VERSION CHECK - FIXED FOR MOBILE
    // =============================================
    useEffect(() => {
        // Mark component as mounted
        isMountedRef.current = true;
        console.log('📱 Component mounted, checking for updates...');

        const checkForUpdate = () => {
            // Prevent multiple checks
            if (versionCheckDoneRef.current) {
                console.log('⏭️ Version check already done, skipping...');
                return;
            }

            const storedVersion = localStorage.getItem(VERSION_KEY);
            const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK);
            const now = Date.now();
            const shouldCheck = !lastCheck || (now - parseInt(lastCheck) > 3600000);

            console.log(`🔍 Version check: stored=${storedVersion}, current=${APP_VERSION}, shouldCheck=${shouldCheck}`);

            // ✅ Check if version has changed
            if (storedVersion !== APP_VERSION && shouldCheck) {
                console.log(`🔄 App update detected: ${storedVersion} → ${APP_VERSION}`);
                localStorage.setItem(VERSION_KEY, APP_VERSION);
                localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
                versionCheckDoneRef.current = true;

                // ✅ Don't show again
                versionToastShownRef.current = true;

                // ✅ Show toast with multiple attempts to ensure it shows
                const showUpdateToast = (attempt = 0) => {
                    console.log(`📢 Showing update toast (attempt ${attempt + 1})`);
                    if (isMountedRef.current) {
                        showToast(
                            `✨ Version ${APP_VERSION} is available! Tap "Update Now" to refresh.`,
                            'info',
                            'bottom',
                            false // Don't auto-hide
                        );
                        console.log('✅ Update toast shown successfully!');
                    } else if (attempt < 5) {
                        console.log(`⏳ Waiting for mount (attempt ${attempt + 1})...`);
                        setTimeout(() => showUpdateToast(attempt + 1), 500);
                    } else {
                        console.log('❌ Failed to show toast after 5 attempts');
                    }
                };

                // Show immediately if mounted, or wait
                if (isMountedRef.current) {
                    setTimeout(() => showUpdateToast(0), 500);
                } else {
                    // Wait for mount
                    const waitForMount = setInterval(() => {
                        if (isMountedRef.current) {
                            clearInterval(waitForMount);
                            showUpdateToast(0);
                        }
                    }, 200);
                    setTimeout(() => clearInterval(waitForMount), 5000);
                }
            } else if (storedVersion !== APP_VERSION && !shouldCheck) {
                console.log('⏳ Version changed but check skipped (cooldown)');
            } else {
                console.log('✅ Version is up to date');
            }

            if (shouldCheck) {
                localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
            }
        };

        // Check immediately
        setTimeout(checkForUpdate, 500);

        // Also check after a longer delay (in case UI needs to render first)
        setTimeout(checkForUpdate, 3000);

        // Check again when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Tab became visible, checking for updates...');
                checkForUpdate();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Check on page show (for bfcache)
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                console.log('📄 Page restored, checking for updates...');
                checkForUpdate();
            }
        };
        window.addEventListener('pageshow', handlePageShow);

        return () => {
            isMountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, [showToast]);

    // Auto-clear status on unmount
    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

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

    // Auto-sync
    useEffect(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        if (!isOnline || !currentProfile) return;

        const syncInterval = isMobile ? 15000 : 30000;

        syncIntervalRef.current = setInterval(() => {
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

    // Force data reload when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible, refreshing data...');
                if (isOnline && currentProfile) {
                    loadDatabaseData(false);
                    triggerSyncQueue();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOnline, currentProfile]);

    // Handle page restore from bfcache
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
                                    showStatus(`Data updated at ${timeStr}`, 'success');
                                }
                            } else {
                                console.warn('Failed to pull from Supabase, using local data');
                            }
                        } catch (err) {
                            console.error('Error pulling from Supabase:', err);
                            if (!isInitialLoad.current) {
                                showStatus('Using cached data', 'info');
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
                showStatus('Could not load data', 'error');
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
    }, [isOnline, showStatus]);

    let startTime = Date.now();

    // =============================================
    // SYNC QUEUE
    // =============================================
    const triggerSyncQueue = useCallback(async () => {
        if (isSyncing) {
            console.log('Sync already in progress, skipping...');
            return;
        }

        setIsSyncing(true);
        showStatus('Syncing data...', 'loading', false);
        console.log('Starting background sync...');

        try {
            const pendingItems = await db.sync_queue.where('status').equals('pending').toArray();
            console.log(`Found ${pendingItems.length} pending items in queue`);

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
                            showStatus(`Data updated at ${timeStr}`, 'success');
                        }
                    } else {
                        showStatus('Sync completed', 'success');
                    }
                } else {
                    showStatus('Data is up to date', 'success');
                }
                const count = await db.sync_queue.where('status').equals('pending').count();
                setSyncPendingCount(count);
                await loadDatabaseData(false);
                console.log('Background sync complete! (no pending items)');
                return;
            }

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
                            showStatus(`${syncedCount} items synced at ${timeStr}`, 'success');
                        } else if (syncedCount > 0 && failedCount > 0) {
                            showStatus(`${syncedCount} synced, ${failedCount} failed`, 'info');
                        } else {
                            showStatus(`Data updated at ${timeStr}`, 'success');
                        }
                    }
                } else {
                    if (syncedCount > 0) {
                        showStatus(`${syncedCount} items synced`, 'success');
                    } else {
                        showStatus('Sync completed', 'success');
                    }
                }
            } else {
                if (syncedCount > 0) {
                    showStatus(`${syncedCount} items synced locally`, 'success');
                } else {
                    showStatus('Sync completed', 'success');
                }
            }

            const remainingCount = await db.sync_queue.where('status').equals('pending').count();
            setSyncPendingCount(remainingCount);
            await loadDatabaseData(false);

            console.log(`Background sync complete! ${syncedCount} synced, ${failedCount} failed, ${remainingCount} pending`);

        } catch (err: any) {
            console.error('Sync queue error:', err);
            showStatus('Sync in progress...', 'info');
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, isOnline, currentProfile, loadDatabaseData, showStatus]);

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
        statusMessage,
        statusType,
        showStatusBar,
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
        setStatusMessage,
        setStatusType,
        setShowStatusBar,
        setToastMessage,
        setToastType,
        setToastPosition,
        setHasNewData,
        setNewDataCount,
        clearStatus,
        clearToast,

        // Actions
        loadDatabaseData,
        triggerSyncQueue,
    };
};