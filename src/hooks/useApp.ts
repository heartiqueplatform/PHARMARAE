// hooks/useApp.ts - fixed hook order, pharmacy-scale loading, no emojis

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, seedInitialDataIfNeeded, forceDataFlush } from '../lib/db';
import {
    processOfflineSyncQueue,
    isSupabaseConfigured,
    smartPullFromSupabase,
} from '../lib/supabase';
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

const APP_VERSION = '1.0.0';
const VERSION_KEY = 'PHARMARAE_app_version';
const LAST_UPDATE_CHECK = 'PHARMARAE_last_update_check';
const PROFILE_SYNC_COOLDOWN_MS = 60000;
const ACTIVE_MOBILE_SYNC_MS = 30000;
const ACTIVE_DESKTOP_SYNC_MS = 60000;
const LOAD_COOLDOWN_MS = 3000;
const MIN_INITIAL_LOAD_MS = 300;

const getLastProfileSyncTime = (pharmacyName: string) => {
    const lastSyncStr = localStorage.getItem(`medp_last_sync_${pharmacyName}`);
    return lastSyncStr ? new Date(lastSyncStr) : null;
};

const shouldPullProfileData = (lastProfileSyncTime: Date | null) => {
    return !lastProfileSyncTime || Date.now() - lastProfileSyncTime.getTime() > PROFILE_SYNC_COOLDOWN_MS;
};

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
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
        const stored = localStorage.getItem('medp_last_sync_time');
        return stored ? new Date(stored) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('medp_authenticated') === 'true';
    });

    // Status Bar state
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<'loading' | 'success' | 'error' | 'info' | null>(null);
    const [showStatusBar, setShowStatusBar] = useState(false);

    // Toast state
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
    const lastLoadTimeRef = useRef<number>(0);
    const loadInProgressRef = useRef(false);
    const syncInProgressRef = useRef(false);
    const networkSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

    const showStatus = useCallback((message: string, type: 'loading' | 'success' | 'error' | 'info', autoHide: boolean = true) => {
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

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info', position: 'top' | 'center' | 'bottom' = 'bottom', autoHide: boolean = true) => {
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

    const refreshChangedData = useCallback(async (pharmacyName: string) => {
        const normalized = normalizePharmacyName(pharmacyName);

        try {
            const [
                changedProducts,
                changedBatches,
                changedSales,
                changedMovements,
                changedRequestedItems,
                changedSalesReturns,
            ] = await Promise.all([
                db.products.where('pharmacy_name').equals(normalized).toArray(),
                db.product_batches.where('pharmacy_name').equals(normalized).toArray(),
                db.sales.where('pharmacy_name').equals(normalized).toArray(),
                db.stock_movements.where('pharmacy_name').equals(normalized).toArray(),
                db.requested_items.where('pharmacy_name').equals(normalized).toArray(),
                db.sales_returns.where('pharmacy_name').equals(normalized).toArray(),
            ]);

            setProducts(changedProducts);
            setBatches(changedBatches);
            setSales(changedSales);
            setMovements(changedMovements);
            setRequestedItems(changedRequestedItems);
            setSalesReturns(changedSalesReturns);
        } catch (err) {
            console.warn('Unable to refresh changed pharmacy data:', err);
        }
    }, []);

    const triggerSyncQueue = useCallback(async () => {
        if (syncInProgressRef.current) {
            console.info('Sync already in progress. Skipping duplicate request.');
            return;
        }

        if (!isOnline || !currentProfile) {
            console.info('Sync skipped because the app is offline or no profile is active.');
            return;
        }

        syncInProgressRef.current = true;
        setIsSyncing(true);
        showStatus('Syncing pharmacy data', 'loading', false);

        try {
            const result = await processOfflineSyncQueue();
            const { synced, failed } = result;

            if (isSupabaseConfigured() && isOnline) {
                const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
                const lastProfileSyncTime = getLastProfileSyncTime(pharmacyName);

                if (shouldPullProfileData(lastProfileSyncTime)) {
                    try {
                        const success = await smartPullFromSupabase(pharmacyName, lastProfileSyncTime || undefined);
                        if (success) {
                            const syncTime = new Date();
                            setLastSyncTime(syncTime);
                            localStorage.setItem(`medp_last_sync_${pharmacyName}`, syncTime.toISOString());
                            localStorage.setItem('medp_last_sync_time', syncTime.toISOString());

                            if (!isInitialLoad.current) {
                                await refreshChangedData(pharmacyName);
                            }
                        }
                    } catch (err) {
                        console.warn('Pull from remote data store failed:', err);
                    }
                }
            }

            const pendingCount = await db.sync_queue.where('status').equals('pending').count();
            setSyncPendingCount(pendingCount);

            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });

            if (!isInitialLoad.current) {
                if (synced > 0 && failed === 0) {
                    showStatus(`${synced} records synced at ${timeStr}`, 'success');
                } else if (synced > 0 && failed > 0) {
                    showStatus(`${synced} synced, ${failed} need review`, 'info');
                } else if (failed > 0) {
                    showStatus(`${failed} records could not sync`, 'error');
                } else {
                    showStatus(`Pharmacy data updated at ${timeStr}`, 'success');
                }
            }
        } catch (err) {
            console.error('Sync failed:', err);
            if (!isInitialLoad.current) {
                showStatus('Sync paused. The app will retry automatically', 'info');
            }
        } finally {
            setIsSyncing(false);
            syncInProgressRef.current = false;

            if (statusTimeoutRef.current === null) {
                statusTimeoutRef.current = setTimeout(() => {
                    clearStatus();
                }, 1000);
            }
        }
    }, [
        isOnline,
        currentProfile,
        showStatus,
        refreshChangedData,
        clearStatus,
    ]);

    const loadDatabaseData = useCallback(async (showLoader: boolean = true) => {
        if (loadInProgressRef.current) {
            return;
        }

        const now = Date.now();
        const loadCooldown = isInitialLoad.current ? 0 : LOAD_COOLDOWN_MS;
        if (!isInitialLoad.current && now - lastLoadTimeRef.current < loadCooldown) {
            return;
        }

        loadInProgressRef.current = true;
        lastLoadTimeRef.current = now;

        const loadStartedAt = Date.now();
        const shouldShowLoader = showLoader && isInitialLoad.current;

        if (shouldShowLoader) {
            setIsLoading(true);
        }

        try {
            await seedInitialDataIfNeeded();

            const userId = localStorage.getItem('medp_current_user_id');
            const allProfiles = await db.profiles.toArray();
            setProfiles(allProfiles);

            const selectedProfile = userId
                ? allProfiles.find(profile => profile.id === userId) || allProfiles[0] || null
                : allProfiles[0] || null;

            if (!selectedProfile) {
                return;
            }

            const pharmacyName = normalizePharmacyName(selectedProfile.pharmacy_name);
            setCurrentProfile(selectedProfile);
            setCurrentRole(selectedProfile.role || 'owner');

            if (!pharmacyName) {
                return;
            }

            const [
                pharmacyProducts,
                pharmacyBatches,
                pharmacyCategories,
                pharmacyUnits,
                pharmacySuppliers,
                pharmacyCustomers,
                pharmacySales,
                pharmacyMovements,
                pharmacyAuditLogs,
                pharmacyRequestedItems,
                pharmacySalesReturns,
            ] = await Promise.all([
                db.products.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.product_batches.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.categories.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.units.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.suppliers.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.customers.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.sales.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.stock_movements.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.audit_logs.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.requested_items.where('pharmacy_name').equals(pharmacyName).toArray(),
                db.sales_returns.where('pharmacy_name').equals(pharmacyName).toArray(),
            ]);

            setProducts(pharmacyProducts);
            setBatches(pharmacyBatches);
            setCategories(pharmacyCategories);
            setUnits(pharmacyUnits);
            setSuppliers(pharmacySuppliers);
            setCustomers(pharmacyCustomers);
            setSales(pharmacySales);
            setMovements(pharmacyMovements);
            setAuditLogs(pharmacyAuditLogs);
            setRequestedItems(pharmacyRequestedItems);
            setSalesReturns(pharmacySalesReturns);

            if (isOnline && isSupabaseConfigured() && !syncInProgressRef.current) {
                const lastProfileSyncTime = getLastProfileSyncTime(pharmacyName);

                if (shouldPullProfileData(lastProfileSyncTime)) {
                    try {
                        const success = await smartPullFromSupabase(pharmacyName, lastProfileSyncTime || undefined);
                        if (success) {
                            const syncTime = new Date();
                            setLastSyncTime(syncTime);
                            localStorage.setItem(`medp_last_sync_${pharmacyName}`, syncTime.toISOString());
                            localStorage.setItem('medp_last_sync_time', syncTime.toISOString());
                            await refreshChangedData(pharmacyName);
                        }
                    } catch (err) {
                        console.warn('Initial remote refresh failed:', err);
                    }
                }
            }

            const pendingCount = await db.sync_queue.where('status').equals('pending').count();
            setSyncPendingCount(pendingCount);
        } catch (err) {
            console.error('Unable to load pharmacy data:', err);
            if (!isInitialLoad.current) {
                showStatus('Could not load pharmacy data', 'error');
            }
        } finally {
            if (shouldShowLoader) {
                const elapsed = Date.now() - loadStartedAt;
                if (elapsed < MIN_INITIAL_LOAD_MS) {
                    await new Promise(resolve => setTimeout(resolve, MIN_INITIAL_LOAD_MS - elapsed));
                }
                setIsLoading(false);
                isInitialLoad.current = false;
            }
            loadInProgressRef.current = false;
        }
    }, [
        isOnline,
        showStatus,
        refreshChangedData,
    ]);

    useEffect(() => {
        isMountedRef.current = true;

        const checkForUpdate = () => {
            if (versionCheckDoneRef.current) {
                return;
            }

            const storedVersion = localStorage.getItem(VERSION_KEY);
            const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK);
            const now = Date.now();
            const shouldCheck = !lastCheck || now - parseInt(lastCheck, 10) > 3600000;

            if (storedVersion !== APP_VERSION && shouldCheck) {
                localStorage.setItem(VERSION_KEY, APP_VERSION);
                localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
                versionCheckDoneRef.current = true;

                if (isMountedRef.current && !versionToastShownRef.current) {
                    versionToastShownRef.current = true;
                    showToast(
                        `Version ${APP_VERSION} is available. Tap "Update Now" to refresh.`,
                        'info',
                        'bottom',
                        false
                    );
                }
            }

            if (shouldCheck) {
                localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
            }
        };

        const updateTimer = setTimeout(checkForUpdate, 500);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            clearTimeout(updateTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showToast]);

    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
            if (networkSyncTimeoutRef.current) {
                clearTimeout(networkSyncTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            console.info('Network online.');
            setIsOnline(true);

            if (networkSyncTimeoutRef.current) {
                clearTimeout(networkSyncTimeoutRef.current);
                networkSyncTimeoutRef.current = null;
            }

            networkSyncTimeoutRef.current = setTimeout(() => {
                if (currentProfile && !syncInProgressRef.current) {
                    triggerSyncQueue();
                }
                networkSyncTimeoutRef.current = null;
            }, 1000);
        };

        const handleOffline = () => {
            console.info('Network offline.');
            setIsOnline(false);

            if (networkSyncTimeoutRef.current) {
                clearTimeout(networkSyncTimeoutRef.current);
                networkSyncTimeoutRef.current = null;
            }

            showStatus('Offline mode. Changes will sync when connected', 'info');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (networkSyncTimeoutRef.current) {
                clearTimeout(networkSyncTimeoutRef.current);
                networkSyncTimeoutRef.current = null;
            }
        };
    }, [currentProfile, triggerSyncQueue, showStatus]);

    useEffect(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        if (!isOnline || !currentProfile) return;

        const syncInterval = isMobile ? ACTIVE_MOBILE_SYNC_MS : ACTIVE_DESKTOP_SYNC_MS;

        syncIntervalRef.current = setInterval(() => {
            if (!syncInProgressRef.current && (document.visibilityState === 'visible' || isMobile)) {
                triggerSyncQueue();
            }
        }, syncInterval);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [isOnline, currentProfile, isMobile, triggerSyncQueue]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (isOnline && currentProfile && !syncInProgressRef.current) {
                    loadDatabaseData(false);
                    triggerSyncQueue();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOnline, currentProfile, triggerSyncQueue, loadDatabaseData]);

    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                if (isOnline && currentProfile && !syncInProgressRef.current) {
                    loadDatabaseData(false);
                    triggerSyncQueue();
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [isOnline, currentProfile, triggerSyncQueue, loadDatabaseData]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                forceDataFlush();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            forceDataFlush();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        loadDatabaseData(true);
    }, [loadDatabaseData]);

    return {
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
        statusMessage,
        statusType,
        showStatusBar,
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
        loadDatabaseData,
        triggerSyncQueue,
    };
};
