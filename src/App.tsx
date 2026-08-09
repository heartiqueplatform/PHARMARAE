import React, { useState, useEffect, useCallback } from 'react';
import { db, seedInitialDataIfNeeded } from './lib/db';
import { processOfflineSyncQueue, queueOfflineMutation, pullFromSupabaseToLocal, isSupabaseConfigured, getSupabaseClient } from './lib/supabase';
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
  SaleItem,
  StockMovement,
  AuditLog,
  Pharmacy
} from './types';
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
import { AboutView } from '@/components/views/AboutView';
import { PrivacyPolicyView } from '@/components/views/PrivacyPolicyView';
import { TermsConditionsView } from '@/components/views/TermsConditionsView';
const APP_VERSION = '1.0.0';
const APP_NAME = 'PHARMARAE KENYA';
const VERSION_KEY = 'pharmarae_app_version';
const LAST_UPDATE_CHECK = 'pharmarae_last_update_check';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncPendingCount, setSyncPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Core Data State - SINGLE TABLE ARCHITECTURE
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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals & Scanners
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptSaleItems, setReceiptSaleItems] = useState<SaleItem[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('medp_authenticated') === 'true';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('medp_theme') as 'dark' | 'light') || 'light';
  });
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('medp_theme', next);
  };
  // =============================================
  // CHECK FOR APP UPDATES
  // =============================================
  const checkForUpdates = useCallback(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK);
    const now = Date.now();

    // Check every hour (3600000 ms)
    const shouldCheck = !lastCheck || (now - parseInt(lastCheck) > 3600000);

    if (storedVersion !== APP_VERSION && shouldCheck) {
      console.log(`🔄 App update detected: ${storedVersion} → ${APP_VERSION}`);
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      localStorage.setItem(LAST_UPDATE_CHECK, now.toString());

      // Check if service worker has an update
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        });
      }

      setIsUpdateAvailable(true);
      setShowUpdateNotification(true);
      return true;
    }

    if (shouldCheck) {
      localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
    }

    return false;
  }, []);

  const isDark = theme === 'dark';
  // =============================================
  // HANDLE APP UPDATE
  // =============================================
  const handleUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          // Send skip waiting message to service worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    // Reload the page to apply updates
    setShowUpdateNotification(false);
    window.location.reload();
  }, []);

  const handleDismissUpdate = useCallback(() => {
    setShowUpdateNotification(false);
  }, []);
  // =============================================
  // NORMALIZE PHARMACY NAME HELPER
  // =============================================
  const normalizePharmacyName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  };

  const displayPharmacyName = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
  };

  // Network Online / Offline Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
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

  // Auto-sync every 30 seconds when online and app is visible
  useEffect(() => {
    if (!isOnline || !currentProfile) return;

    const interval = setInterval(() => {
      // Only sync if tab is visible to save resources
      if (document.visibilityState === 'visible') {
        console.log('⏰ Auto-sync interval triggered');
        triggerSyncQueue();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, currentProfile]);

  // Sync when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && currentProfile) {
        console.log('👁️ Tab became visible, checking for updates...');
        triggerSyncQueue();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOnline, currentProfile]);
  // =============================================
  // CHECK FOR UPDATES ON MOUNT
  // =============================================
  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();

    // Listen for service worker update messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setIsUpdateAvailable(true);
        setShowUpdateNotification(true);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Check for service worker updates
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates every 30 seconds
        const intervalId = setInterval(() => {
          registration.update().then(() => {
            if (registration.waiting) {
              console.log('🔄 New service worker waiting...');
              setIsUpdateAvailable(true);
              setShowUpdateNotification(true);
            }
          });
        }, 30000);

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New service worker installed!');
                setIsUpdateAvailable(true);
                setShowUpdateNotification(true);
              }
            });
          }
        });

        return () => clearInterval(intervalId);
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [checkForUpdates]);
  // Helper function to convert Profile to Pharmacy
  const getPharmacyFromProfile = (profile: Profile | null): Pharmacy | null => {
    if (!profile) return null;
    return {
      id: profile.id,
      name: displayPharmacyName(profile.pharmacy_name),
      trading_name: profile.pharmacy_trading_name || '',
      phone: profile.pharmacy_phone || '',
      email: profile.pharmacy_email || '',
      address: profile.pharmacy_address || '',
      county: profile.pharmacy_county || '',
      town: profile.pharmacy_town || '',
      logo_url: profile.avatar_url || '',
      receipt_header: profile.pharmacy_receipt_header || 'Quality Medicines & Professional Care',
      receipt_footer: profile.pharmacy_receipt_footer || 'Thank you for your visit. Get well soon!',
      currency: profile.pharmacy_currency || 'KSh',
      settings: profile.pharmacy_settings || {
        allow_negative_stock: false,
        low_stock_threshold: 10,
        expiry_warning_days: 90
      },
      is_active: profile.pharmacy_is_active !== undefined ? profile.pharmacy_is_active : true,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
  };

  // =============================================
  // LOAD DATA - WITH FORCED SUPABASE PULL
  // =============================================
  const loadDatabaseData = useCallback(async () => {
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
          // ✅ FORCE PULL FROM SUPABASE IF ONLINE
          if (isOnline && isSupabaseConfigured()) {
            console.log(`🔄 FORCE PULLING from Supabase for: ${pharmacyName}`);
            try {
              const success = await pullFromSupabaseToLocal(pharmacyName);
              if (success) {
                console.log('✅ Supabase data pulled successfully!');
                setLastSyncTime(new Date());
              } else {
                console.warn('⚠️ Failed to pull from Supabase, using local data');
              }
            } catch (err) {
              console.error('❌ Error pulling from Supabase:', err);
            }
          }

          // Load from Dexie (which now has fresh data)
          console.log(`📂 Loading data from Dexie for: ${pharmacyName}`);

          // Products - use case-insensitive filter
          const allProducts = await db.products.toArray();
          const filteredProducts = allProducts.filter(p =>
            normalizePharmacyName(p.pharmacy_name) === pharmacyName
          );
          console.log(`📦 Products in Dexie: ${filteredProducts.length}`);
          setProducts(filteredProducts);

          // Batches
          const allBatches = await db.product_batches.toArray();
          const filteredBatches = allBatches.filter(b =>
            normalizePharmacyName(b.pharmacy_name) === pharmacyName
          );
          console.log(`📦 Batches in Dexie: ${filteredBatches.length}`);
          setBatches(filteredBatches);

          // Categories
          const allCategories = await db.categories.toArray();
          setCategories(allCategories.filter(c =>
            normalizePharmacyName(c.pharmacy_name) === pharmacyName
          ));

          // Units
          const allUnits = await db.units.toArray();
          setUnits(allUnits.filter(u =>
            normalizePharmacyName(u.pharmacy_name) === pharmacyName
          ));

          // Suppliers
          const allSuppliers = await db.suppliers.toArray();
          setSuppliers(allSuppliers.filter(s =>
            normalizePharmacyName(s.pharmacy_name) === pharmacyName
          ));

          // Customers
          const allCustomers = await db.customers.toArray();
          setCustomers(allCustomers.filter(c =>
            normalizePharmacyName(c.pharmacy_name) === pharmacyName
          ));

          // Sales
          const allSales = await db.sales.toArray();
          const filteredSales = allSales.filter(s =>
            normalizePharmacyName(s.pharmacy_name) === pharmacyName
          );
          setSales(filteredSales);

          // Sale Items
          const allSaleItems = await db.sale_items.toArray();
          setSaleItems(allSaleItems);

          // Movements
          const allMovements = await db.stock_movements.toArray();
          setMovements(allMovements.filter(m =>
            normalizePharmacyName(m.pharmacy_name) === pharmacyName
          ));

          // Audit Logs
          const allAuditLogs = await db.audit_logs.toArray();
          setAuditLogs(allAuditLogs.filter(a =>
            normalizePharmacyName(a.pharmacy_name) === pharmacyName
          ));

          // Sync pending count
          const pendingCount = await db.sync_queue.where('status').equals('pending').count();
          setSyncPendingCount(pendingCount);
        }
      }
    } catch (err) {
      console.error('Error loading database data:', err);
    }
  }, [isOnline]);
  // Add this useEffect in your App component (around line 100)
  useEffect(() => {
    // Update body background when theme changes
    if (isDark) {
      document.body.style.backgroundColor = '#0d1117';
      document.body.style.color = '#c9d1d9';
    } else {
      document.body.style.backgroundColor = '#f6f8fa';
      document.body.style.color = '#1f2328';
    }
  }, [isDark]);
  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // =============================================
  // SYNC QUEUE RUNNER - WITH FULL BACKGROUND SYNC
  // =============================================
  const triggerSyncQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      console.log('🔄 Starting background sync...');

      // Step 1: Process pending offline mutations (push to Supabase)
      const { synced, failed } = await processOfflineSyncQueue();
      if (synced > 0) {
        console.log(`✅ Pushed ${synced} items to Supabase`);
      }
      if (failed > 0) {
        console.warn(`⚠️ ${failed} items failed to sync`);
      }

      // Step 2: Pull fresh data from Supabase
      if (currentProfile && isSupabaseConfigured() && isOnline) {
        const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
        console.log(`🔄 Pulling fresh data from Supabase for: ${pharmacyName}`);
        const success = await pullFromSupabaseToLocal(pharmacyName);
        if (success) {
          console.log('✅ Fresh data pulled from Supabase');
          setLastSyncTime(new Date());
        }
      }

      // Step 3: Update pending count
      const count = await db.sync_queue.where('status').equals('pending').count();
      setSyncPendingCount(count);

      // Step 4: Reload UI data
      await loadDatabaseData();

      console.log('✅ Background sync complete!');
    } catch (err) {
      console.error('❌ Sync queue error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // =============================================
  // FORCE SYNC - User triggered with feedback
  // =============================================
  const handleForceSync = async () => {
    if (!currentProfile) {
      alert('No profile found. Please login.');
      return;
    }

    if (!isSupabaseConfigured()) {
      alert('Supabase not configured. Please check your settings.');
      return;
    }

    if (!isOnline) {
      alert('You are offline. Please connect to the internet and try again.');
      return;
    }

    setIsSyncing(true);
    try {
      const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
      console.log(`🔄 FORCE SYNC from Supabase for: ${pharmacyName}`);

      // Process pending mutations
      const { synced, failed } = await processOfflineSyncQueue();
      console.log(`✅ Pushed ${synced} items, ${failed} failed`);

      // Pull fresh data
      const success = await pullFromSupabaseToLocal(pharmacyName);
      if (success) {
        console.log('✅ Force sync complete!');
        setLastSyncTime(new Date());
        await loadDatabaseData();
        alert('✅ Data synced successfully!');
      } else {
        alert('❌ Sync failed. Please check your connection and try again.');
      }
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      alert('Sync failed: ' + (error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper for generating standard valid UUIDs
  const genUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // =============================================
  // PROCESS SALE - COMPLETE WITH STOCK UPDATES
  // =============================================
  const handleCompleteSale = async (saleData: Partial<Sale>, cartItems: any[]) => {
    if (!currentProfile) {
      console.error('No profile found');
      return;
    }

    const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
    if (!pharmacyName) {
      console.error('No pharmacy name found');
      return;
    }

    // STEP 1: Validate Stock
    for (const item of cartItems) {
      const product = await db.products.get(item.product.id);
      if (!product) {
        throw new Error(`Product ${item.product.name} not found`);
      }
      if ((product.quantity || 0) < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}. Available: ${product.quantity || 0}`);
      }
    }

    // STEP 2: Create Sale Record
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const countToday = sales.filter(s => s.created_at.startsWith(now.toISOString().substring(0, 10))).length + 1;
    const saleNumber = `INV-${yearMonth}-${countToday.toString().padStart(4, '0')}`;
    const saleId = genUUID();

    const newSale: Sale = {
      id: saleId,
      pharmacy_name: pharmacyName,
      sale_number: saleNumber,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name,
      sold_by: currentProfile?.id,
      sold_by_name: currentProfile?.full_name,
      subtotal: saleData.subtotal || 0,
      discount: saleData.discount || 0,
      tax: 0,
      total: saleData.total || 0,
      payment_status: 'paid',
      status: 'completed',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    await db.sales.put(newSale);

    const supabaseSale = {
      id: saleId,
      pharmacy_name: pharmacyName,
      sale_number: saleNumber,
      customer_id: saleData.customer_id || null,
      sold_by: currentProfile?.id || null,
      subtotal: saleData.subtotal || 0,
      discount: saleData.discount || 0,
      tax: 0,
      total: saleData.total || 0,
      payment_status: 'paid',
      status: 'completed',
      offline_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'sale', 'INSERT', supabaseSale);

    // STEP 3: Process Sale Items & Update Stock
    const newSaleItems: SaleItem[] = [];
    const todayStr = now.toISOString().split('T')[0];

    for (const item of cartItems) {
      const prod = item.product;
      const quantitySold = item.quantity;

      const availableBatches = batches
        .filter(b => b.product_id === prod.id && b.quantity_base > 0 && b.expiry_date >= todayStr)
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

      let remainingToDeduct = quantitySold;
      let usedBatch: any = null;

      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;

        const deductFromBatch = Math.min(remainingToDeduct, batch.quantity_base);
        const newBatchQty = batch.quantity_base - deductFromBatch;

        await db.product_batches.update(batch.id, {
          quantity_base: newBatchQty,
          updated_at: now.toISOString()
        });

        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'UPDATE', {
          id: batch.id,
          quantity_base: newBatchQty,
          updated_at: now.toISOString()
        });

        remainingToDeduct -= deductFromBatch;

        if (!usedBatch) {
          usedBatch = batch;
        }
      }

      const product = await db.products.get(prod.id);
      if (product) {
        const newQuantity = Math.max(0, (product.quantity || 0) - quantitySold);
        await db.products.update(prod.id, {
          quantity: newQuantity,
          updated_at: now.toISOString()
        });

        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', {
          id: prod.id,
          quantity: newQuantity,
          updated_at: now.toISOString()
        });

        if (newQuantity <= (product.reorder_level || 10)) {
          console.log(`⚠️ LOW STOCK ALERT: ${product.name} has ${newQuantity} units left. Reorder level: ${product.reorder_level}`);
        }
      }

      const saleItemId = genUUID();
      const sItem: SaleItem = {
        id: saleItemId,
        sale_id: saleId,
        product_id: prod.id,
        product_name: prod.name,
        batch_id: usedBatch?.id || null,
        batch_number: usedBatch?.batch_number || null,
        quantity: quantitySold,
        quantity_base: quantitySold,
        unit_id: null,
        unit_name: null,
        unit_price: item.unitPrice,
        discount: 0,
        subtotal: item.subtotal,
        created_at: now.toISOString()
      };

      await db.sale_items.put(sItem);
      newSaleItems.push(sItem);

      const supabaseSaleItem = {
        id: saleItemId,
        sale_id: saleId,
        product_id: prod.id,
        batch_id: usedBatch?.id || null,
        unit_id: null,
        quantity: quantitySold,
        unit_price: item.unitPrice,
        discount: 0,
        subtotal: item.subtotal,
        created_at: now.toISOString(),
        pharmacy_name: pharmacyName
      };
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'sale_item', 'INSERT', supabaseSaleItem);

      const movId = genUUID();
      const movement: StockMovement = {
        id: movId,
        pharmacy_name: pharmacyName,
        product_id: prod.id,
        product_name: prod.name,
        batch_id: usedBatch?.id || null,
        batch_number: usedBatch?.batch_number || null,
        movement_type: 'sale',
        quantity_base: -quantitySold,
        reference_type: 'sale',
        reference_id: saleId,
        performed_by: currentProfile?.id,
        performed_by_name: currentProfile?.full_name,
        reason: `Sale transaction #${saleNumber}`,
        created_at: now.toISOString()
      };

      await db.stock_movements.put(movement);

      const supabaseMovement = {
        id: movId,
        pharmacy_name: pharmacyName,
        product_id: prod.id,
        batch_id: usedBatch?.id || null,
        movement_type: 'sale',
        quantity_base: -quantitySold,
        reference_type: 'sale',
        reference_id: saleId,
        performed_by: currentProfile?.id || null,
        reason: `Sale transaction #${saleNumber}`,
        created_at: now.toISOString()
      };
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'stock_movement', 'INSERT', supabaseMovement);
    }

    // STEP 4: Record Audit Log
    const auditId = genUUID();
    await db.audit_logs.put({
      id: auditId,
      pharmacy_name: pharmacyName,
      user_id: currentProfile?.id,
      user_name: currentProfile?.full_name,
      action: 'SALE_COMPLETED',
      entity_type: 'SALE',
      entity_id: saleId,
      old_data: null,
      new_data: null,
      metadata: null,
      created_at: now.toISOString()
    });

    // STEP 5: Refresh & Show Receipt
    await loadDatabaseData();
    setReceiptSale(newSale);
    setReceiptSaleItems(newSaleItems);
    setIsReceiptModalOpen(true);

    console.log('✅ Sale completed successfully!');
  };

  // =============================================
  // ADD PRODUCT - WITH AUTO SYNC
  // =============================================
  const handleAddProduct = async (prodData: Partial<Product>) => {
    if (!currentProfile) return;

    const pharmacyName = normalizePharmacyName(prodData.pharmacy_name || currentProfile.pharmacy_name);
    if (!pharmacyName) {
      console.error('❌ No pharmacy_name found');
      return;
    }

    const id = genUUID();

    const newProd: Product = {
      id,
      pharmacy_name: pharmacyName,
      name: prodData.name || '',
      generic_name: prodData.generic_name || null,
      brand: prodData.brand || null,
      category_id: prodData.category_id || null,
      category_name: categories.find(c => c.id === prodData.category_id)?.name || null,
      description: prodData.description || null,
      notes: prodData.notes || null,
      product_type: prodData.product_type || 'medication',
      form: prodData.form || 'tablet',
      strength: prodData.strength || null,
      manufacturer: prodData.manufacturer || null,
      schedule_type: prodData.schedule_type || 'none',
      prescription_required: prodData.prescription_required || false,
      size: prodData.size || null,
      color: prodData.color || null,
      material: prodData.material || null,
      is_sterile: prodData.is_sterile || false,
      selling_price: prodData.selling_price || 0,
      default_cost_price: prodData.default_cost_price || 0,
      quantity: prodData.quantity || 0,
      reorder_level: prodData.reorder_level || 10,
      low_stock_threshold: prodData.low_stock_threshold || 5,
      is_active: true,
      is_controlled: prodData.is_controlled || false,
      barcode: prodData.barcode || null,
      sku: prodData.sku || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Saving product to Dexie:', newProd);
    await db.products.put(newProd);

    const supabaseProd = {
      id: id,
      pharmacy_name: pharmacyName,
      name: prodData.name || '',
      generic_name: prodData.generic_name || null,
      brand: prodData.brand || null,
      description: prodData.description || null,
      notes: prodData.notes || null,
      product_type: prodData.product_type || 'medication',
      category_id: prodData.category_id || null,
      category_name: categories.find(c => c.id === prodData.category_id)?.name || null,
      form: prodData.form || 'tablet',
      strength: prodData.strength || null,
      manufacturer: prodData.manufacturer || null,
      schedule_type: prodData.schedule_type || 'none',
      prescription_required: prodData.prescription_required || false,
      size: prodData.size || null,
      color: prodData.color || null,
      material: prodData.material || null,
      is_sterile: prodData.is_sterile || false,
      selling_price: Number(prodData.selling_price) || 0,
      default_cost_price: Number(prodData.default_cost_price) || 0,
      quantity: Number(prodData.quantity) || 0,
      reorder_level: Number(prodData.reorder_level) || 10,
      low_stock_threshold: Number(prodData.low_stock_threshold) || 5,
      is_active: true,
      is_controlled: prodData.is_controlled || false,
      barcode: prodData.barcode || null,
      sku: prodData.sku || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('☁️ Sending to Supabase:', supabaseProd);

    try {
      const client = getSupabaseClient();
      if (!client) {
        console.warn('⚠️ No Supabase client, queuing for sync');
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'INSERT', supabaseProd);
        await loadDatabaseData();
        return;
      }

      const { error } = await client
        .from('products')
        .upsert(supabaseProd, { onConflict: 'id' });

      if (error) {
        console.error('❌ Supabase error:', error);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'INSERT', supabaseProd);
      } else {
        console.log('✅ Product synced to Supabase!');
      }
    } catch (err) {
      console.error('❌ Supabase request failed:', err);
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'INSERT', supabaseProd);
    }

    await loadDatabaseData();
    console.log('✅ Product saved successfully!');
  };

  // =============================================
  // UPDATE PRODUCT
  // =============================================
  const handleUpdateProduct = async (productId: string, productData: Partial<Product>) => {
    if (!currentProfile) return;

    const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
    if (!pharmacyName) {
      console.error('❌ No pharmacy_name found');
      return;
    }

    const existingProduct = await db.products.get(productId);
    if (!existingProduct) {
      console.error('❌ Product not found');
      return;
    }

    const updatedProduct: Product = {
      ...existingProduct,
      ...productData,
      updated_at: new Date().toISOString()
    };

    console.log('📦 Updating product:', updatedProduct);
    await db.products.put(updatedProduct);

    const supabaseProd = {
      id: productId,
      pharmacy_name: pharmacyName,
      name: productData.name || existingProduct.name,
      generic_name: productData.generic_name !== undefined ? productData.generic_name : existingProduct.generic_name,
      brand: productData.brand !== undefined ? productData.brand : existingProduct.brand,
      description: productData.description !== undefined ? productData.description : existingProduct.description,
      notes: productData.notes !== undefined ? productData.notes : existingProduct.notes,
      product_type: productData.product_type || existingProduct.product_type || 'medication',
      category_id: productData.category_id !== undefined ? productData.category_id : existingProduct.category_id,
      category_name: productData.category_id ? categories.find(c => c.id === productData.category_id)?.name : existingProduct.category_name,
      form: productData.form || existingProduct.form || 'tablet',
      strength: productData.strength !== undefined ? productData.strength : existingProduct.strength,
      manufacturer: productData.manufacturer !== undefined ? productData.manufacturer : existingProduct.manufacturer,
      schedule_type: productData.schedule_type || existingProduct.schedule_type || 'none',
      prescription_required: productData.prescription_required !== undefined ? productData.prescription_required : existingProduct.prescription_required,
      size: productData.size !== undefined ? productData.size : existingProduct.size,
      color: productData.color !== undefined ? productData.color : existingProduct.color,
      material: productData.material !== undefined ? productData.material : existingProduct.material,
      is_sterile: productData.is_sterile !== undefined ? productData.is_sterile : existingProduct.is_sterile,
      selling_price: Number(productData.selling_price) || existingProduct.selling_price || 0,
      default_cost_price: Number(productData.default_cost_price) || existingProduct.default_cost_price || 0,
      quantity: Number(productData.quantity) || existingProduct.quantity || 0,
      reorder_level: Number(productData.reorder_level) || existingProduct.reorder_level || 10,
      low_stock_threshold: Number(productData.low_stock_threshold) || existingProduct.low_stock_threshold || 5,
      is_active: productData.is_active !== undefined ? productData.is_active : existingProduct.is_active,
      is_controlled: productData.is_controlled !== undefined ? productData.is_controlled : existingProduct.is_controlled,
      barcode: productData.barcode !== undefined ? productData.barcode : existingProduct.barcode,
      sku: productData.sku !== undefined ? productData.sku : existingProduct.sku,
      created_at: existingProduct.created_at,
      updated_at: new Date().toISOString()
    };

    console.log('☁️ Updating in Supabase:', supabaseProd);

    try {
      const client = getSupabaseClient();
      if (!client) {
        console.warn('⚠️ No Supabase client, queuing for sync');
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', supabaseProd);
        await loadDatabaseData();
        return;
      }

      const { error } = await client
        .from('products')
        .upsert(supabaseProd, { onConflict: 'id' });

      if (error) {
        console.error('❌ Supabase update error:', error);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', supabaseProd);
      } else {
        console.log('✅ Product updated in Supabase!');
      }
    } catch (err) {
      console.error('❌ Supabase request failed:', err);
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'UPDATE', supabaseProd);
    }

    await loadDatabaseData();
    console.log('✅ Product updated successfully!');
  };

  // =============================================
  // DELETE PRODUCT
  // =============================================
  const handleDeleteProduct = async (productId: string) => {
    if (!currentProfile) return;

    const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
    if (!pharmacyName) {
      console.error('❌ No pharmacy_name found');
      return;
    }

    const productBatches = await db.product_batches.where('product_id').equals(productId).toArray();
    if (productBatches.length > 0) {
      if (!confirm(`This product has ${productBatches.length} batch(es). Deleting it will also delete all associated batches and stock movements. Continue?`)) {
        return;
      }
    }

    try {
      console.log('🗑️ Deleting product:', productId);

      for (const batch of productBatches) {
        await db.stock_movements.where('batch_id').equals(batch.id).delete();
        await db.product_batches.delete(batch.id);
      }

      await db.products.delete(productId);

      const client = getSupabaseClient();
      if (client) {
        const { error } = await client
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) {
          console.error('❌ Supabase delete error:', error);
          await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'product', 'DELETE', { id: productId });
        } else {
          console.log('✅ Product deleted from Supabase!');
        }
      }

      await db.audit_logs.put({
        id: genUUID(),
        pharmacy_name: pharmacyName,
        user_id: currentProfile?.id,
        user_name: currentProfile?.full_name,
        action: 'DELETE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: productId,
        details: `Deleted product with ${productBatches.length} batch(es)`,
        created_at: new Date().toISOString()
      });

      await loadDatabaseData();
      console.log('✅ Product deleted successfully!');
    } catch (err) {
      console.error('❌ Delete error:', err);
      throw err;
    }
  };

  // =============================================
  // ADD BATCH
  // =============================================
  const handleAddBatch = async (batchData: Partial<ProductBatch>) => {
    if (!currentProfile || !batchData.product_id) return;

    const pharmacyName = normalizePharmacyName(batchData.pharmacy_name || currentProfile.pharmacy_name);
    if (!pharmacyName) {
      console.error('❌ No pharmacy_name found');
      return;
    }

    const id = genUUID();
    const newBatch: ProductBatch = {
      id,
      pharmacy_name: pharmacyName,
      product_id: batchData.product_id,
      supplier_id: batchData.supplier_id || null,
      batch_number: batchData.batch_number || 'B1',
      expiry_date: batchData.expiry_date || new Date().toISOString().split('T')[0],
      quantity_base: batchData.quantity_base || 0,
      cost_price: batchData.cost_price || 0,
      selling_price: batchData.selling_price || 0,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Saving batch:', newBatch);
    await db.product_batches.put(newBatch);

    const product = await db.products.get(batchData.product_id);
    if (product) {
      const newQuantity = (product.quantity || 0) + (batchData.quantity_base || 0);
      await db.products.update(batchData.product_id, {
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      });
    }

    const supabaseBatch = {
      id: id,
      pharmacy_name: pharmacyName,
      product_id: batchData.product_id,
      supplier_id: batchData.supplier_id || null,
      batch_number: batchData.batch_number || 'B1',
      expiry_date: batchData.expiry_date || new Date().toISOString().split('T')[0],
      quantity_base: Number(batchData.quantity_base) || 0,
      cost_price: Number(batchData.cost_price) || 0,
      selling_price: Number(batchData.selling_price) || 0,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('☁️ Sending batch to Supabase:', supabaseBatch);

    const movId = genUUID();
    const movement: StockMovement = {
      id: movId,
      pharmacy_name: pharmacyName,
      product_id: batchData.product_id,
      batch_id: id,
      batch_number: newBatch.batch_number,
      movement_type: 'purchase',
      quantity_base: newBatch.quantity_base,
      performed_by: currentProfile?.id,
      performed_by_name: currentProfile?.full_name,
      reason: `Stock received - Batch ${newBatch.batch_number}`,
      created_at: new Date().toISOString()
    };
    await db.stock_movements.put(movement);

    try {
      const client = getSupabaseClient();
      if (!client) {
        console.warn('⚠️ No Supabase client, queuing for sync');
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'INSERT', supabaseBatch);
        await loadDatabaseData();
        return;
      }

      const { error } = await client
        .from('product_batches')
        .upsert(supabaseBatch, { onConflict: 'id' });

      if (error) {
        console.error('❌ Supabase batch error:', error);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'INSERT', supabaseBatch);
      } else {
        console.log('✅ Batch synced to Supabase!');
      }
    } catch (err) {
      console.error('❌ Supabase batch request failed:', err);
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'batch', 'INSERT', supabaseBatch);
    }

    await loadDatabaseData();
    console.log('✅ Batch saved successfully!');
  };

  // =============================================
  // ADD SUPPLIER
  // =============================================
  const handleAddSupplier = async (suppData: Partial<Supplier>) => {
    if (!currentProfile) return;
    const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
    if (!pharmacyName) return;

    const id = genUUID();
    const newSupp: Supplier = {
      id,
      pharmacy_name: pharmacyName,
      name: suppData.name || '',
      phone: suppData.phone || '',
      contact_person: suppData.contact_person || '',
      email: suppData.email || '',
      address: suppData.address || '',
      notes: suppData.notes || '',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.suppliers.put(newSupp);

    const supabaseSupp = {
      id,
      pharmacy_name: pharmacyName,
      name: suppData.name || '',
      phone: suppData.phone || '',
      contact_person: suppData.contact_person || null,
      email: suppData.email || null,
      address: suppData.address || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'supplier', 'INSERT', supabaseSupp);
    await loadDatabaseData();
  };

  // =============================================
  // ADD STAFF
  // =============================================
  const handleAddStaff = async (staffData: Partial<Profile>) => {
    if (!currentProfile) return;
    const pharmacyName = normalizePharmacyName(currentProfile.pharmacy_name);
    if (!pharmacyName) return;

    const existing = await db.profiles.where('pin_code').equals(staffData.pin_code || '').first();
    if (existing) {
      throw new Error('PIN already in use. Please use a different PIN.');
    }

    const profileId = genUUID();
    const newProfile: Profile = {
      id: profileId,
      auth_user_id: null,
      pharmacy_name: pharmacyName,
      pharmacy_trading_name: currentProfile.pharmacy_trading_name || '',
      pharmacy_phone: currentProfile.pharmacy_phone || '',
      pharmacy_email: currentProfile.pharmacy_email || '',
      pharmacy_address: currentProfile.pharmacy_address || '',
      pharmacy_county: currentProfile.pharmacy_county || '',
      pharmacy_town: currentProfile.pharmacy_town || '',
      pharmacy_receipt_header: currentProfile.pharmacy_receipt_header || '',
      pharmacy_receipt_footer: currentProfile.pharmacy_receipt_footer || '',
      pharmacy_currency: currentProfile.pharmacy_currency || 'KSh',
      pharmacy_settings: currentProfile.pharmacy_settings || {
        allow_negative_stock: false,
        low_stock_threshold: 10,
        expiry_warning_days: 90
      },
      pharmacy_is_active: true,
      full_name: staffData.full_name || '',
      email: staffData.email || '',
      phone: staffData.phone || '',
      pin_code: staffData.pin_code || '',
      role: staffData.role || 'cashier',
      is_owner: false,
      is_active: true,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.profiles.put(newProfile);

    const client = getSupabaseClient();
    if (client && navigator.onLine) {
      const { error } = await client
        .from('profiles')
        .insert(newProfile);

      if (error) {
        console.error('Supabase insert error:', error);
        await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'profile', 'INSERT', newProfile);
      }
    } else {
      await queueOfflineMutation(pharmacyName, currentProfile?.id || '', 'profile', 'INSERT', newProfile);
    }

    await loadDatabaseData();

    await db.audit_logs.put({
      id: genUUID(),
      pharmacy_name: pharmacyName,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      action: 'ADD_STAFF',
      entity_type: 'PROFILE',
      entity_id: profileId,
      details: `Added staff member: ${newProfile.full_name} (${newProfile.role})`,
      created_at: new Date().toISOString()
    });
  };

  // =============================================
  // UPDATE PROFILE
  // =============================================
  const handleUpdateProfile = async (profileId: string, updates: Partial<Profile>) => {
    if (!currentProfile) return;
    const existing = await db.profiles.get(profileId);
    if (!existing) return;

    let normalizedUpdates = { ...updates };
    if (normalizedUpdates.pharmacy_name) {
      normalizedUpdates.pharmacy_name = normalizePharmacyName(normalizedUpdates.pharmacy_name);
    }

    const updated: Profile = {
      ...existing,
      ...normalizedUpdates,
      updated_at: new Date().toISOString()
    };

    console.log('📝 Updating profile with:', updated);
    await db.profiles.put(updated);

    if (normalizedUpdates.pharmacy_name && normalizedUpdates.pharmacy_name !== existing.pharmacy_name) {
      const oldName = existing.pharmacy_name;
      const newName = normalizedUpdates.pharmacy_name;

      console.log(`🔄 Normalizing pharmacy name from "${oldName}" to "${newName}"`);

      await db.products.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.product_batches.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.sales.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.sale_items.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.stock_movements.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.customers.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.suppliers.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.categories.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
      await db.audit_logs.where('pharmacy_name').equals(oldName).modify({ pharmacy_name: newName });
    }

    const client = getSupabaseClient();
    if (client && navigator.onLine) {
      try {
        const supabaseUpdate = {
          pharmacy_name: updated.pharmacy_name,
          pharmacy_trading_name: updated.pharmacy_trading_name || null,
          pharmacy_phone: updated.pharmacy_phone || null,
          pharmacy_email: updated.pharmacy_email || null,
          pharmacy_address: updated.pharmacy_address || null,
          pharmacy_county: updated.pharmacy_county || null,
          pharmacy_town: updated.pharmacy_town || null,
          pharmacy_receipt_header: updated.pharmacy_receipt_header || null,
          pharmacy_receipt_footer: updated.pharmacy_receipt_footer || null,
          pharmacy_currency: updated.pharmacy_currency || 'KSh',
          pharmacy_settings: updated.pharmacy_settings || null,
          pharmacy_is_active: updated.pharmacy_is_active !== undefined ? updated.pharmacy_is_active : true,
          full_name: updated.full_name,
          email: updated.email,
          phone: updated.phone || null,
          pin_code: updated.pin_code || null,
          role: updated.role || 'owner',
          is_owner: updated.is_owner || false,
          is_active: updated.is_active !== undefined ? updated.is_active : true,
          avatar_url: updated.avatar_url || null,
          last_login_at: updated.last_login_at || null,
          updated_at: new Date().toISOString()
        };

        console.log('☁️ Sending to Supabase:', supabaseUpdate);

        const { error } = await client
          .from('profiles')
          .update(supabaseUpdate)
          .eq('id', profileId);

        if (error) {
          console.error('❌ Supabase update error:', error);
          await queueOfflineMutation(normalizePharmacyName(currentProfile.pharmacy_name), currentProfile.id, 'profile', 'UPDATE', updated);
        } else {
          console.log('✅ Profile updated in Supabase with avatar:', updated.avatar_url);
        }
      } catch (err) {
        console.error('❌ Supabase update failed:', err);
        await queueOfflineMutation(normalizePharmacyName(currentProfile.pharmacy_name), currentProfile.id, 'profile', 'UPDATE', updated);
      }
    } else {
      await queueOfflineMutation(normalizePharmacyName(currentProfile.pharmacy_name), currentProfile.id, 'profile', 'UPDATE', updated);
    }

    if (currentProfile?.id === profileId) {
      setCurrentProfile(updated);
      setCurrentRole(updated.role || 'owner');
    }
    await loadDatabaseData();
  };

  // =============================================
  // UPDATE PHARMACY NAME
  // =============================================
  const handleUpdatePharmacyName = async (newName: string) => {
    if (!currentProfile) return;
    await handleUpdateProfile(currentProfile.id, {
      pharmacy_name: newName
    });
    console.log(`✅ Pharmacy name updated to: ${newName}`);
  };

  // Filter today's sales for dashboard
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_at.startsWith(todayStr));

  // Low stock & expiring calculation
  const lowStockProducts = products.filter(p => (p.quantity || 0) <= p.reorder_level);
  const expiryCutoff = new Date();
  expiryCutoff.setDate(expiryCutoff.getDate() + 90);
  const expiryCutoffStr = expiryCutoff.toISOString().split('T')[0];
  const expiringBatches = batches.filter(b => b.expiry_date <= expiryCutoffStr && b.quantity_base > 0);


  return (
    <div className={`h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]'
      }`}>
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
            loadDatabaseData();
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
              onCompleteSale={handleCompleteSale}
              onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
              scannedBarcode={scannedBarcode}
              theme={theme}
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
              onAddProduct={handleAddProduct}
              onAddBatch={handleAddBatch}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onForceSync={handleForceSync} // ✅ Pass force sync
              theme={theme}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              pharmacy={getPharmacyFromProfile(currentProfile)}
              role={currentRole}
              sales={sales}
              saleItems={saleItems}
              products={products}
              batches={batches}
              movements={movements}
              theme={theme}
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
              onUpdateProfile={handleUpdateProfile}
              onUpdatePharmacyName={handleUpdatePharmacyName}
              onAddSupplier={handleAddSupplier}
              onAddStaff={handleAddStaff}
              onTriggerSync={triggerSyncQueue}
              theme={theme}
              onResetLocalCache={async () => {
                if (!currentProfile) return;
                try {
                  await db.products.clear();
                  await db.product_batches.clear();
                  await db.sales.clear();
                  await db.sale_items.clear();
                  await db.stock_movements.clear();
                  await db.customers.clear();
                  await db.categories.clear();
                  await db.units.clear();

                  if (isSupabaseConfigured) {
                    await pullFromSupabaseToLocal(normalizePharmacyName(currentProfile.pharmacy_name));
                  }
                  await loadDatabaseData();
                  alert('Local cache reset! Data re-synced from Supabase.');
                } catch (err: any) {
                  alert('Error resetting cache: ' + (err.message || err));
                }
              }}
            />
          )}
        </main>
      </div>
      {/* =============================================
          APP UPDATE NOTIFICATION
          ============================================ */}
      {showUpdateNotification && isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Update Available!</h4>
              <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
                Version {APP_VERSION} is ready. Refresh to get the latest features.
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
        saleItems={receiptSaleItems}
      />

      {!isAuthenticated && (
        <AuthModal
          onAuthSuccess={(profile) => {
            setCurrentProfile(profile);
            setCurrentRole(profile.role || 'owner');
            setIsAuthenticated(true);
            localStorage.setItem('medp_current_user_id', profile.id);
            loadDatabaseData();
          }}
        />
      )}

      {activeTab === 'about' && (
        <AboutView theme={theme} />
      )}

      {activeTab === 'privacy' && (
        <PrivacyPolicyView theme={theme} />
      )}

      {activeTab === 'terms' && (
        <TermsConditionsView theme={theme} />
      )}
    </div>
  );
}