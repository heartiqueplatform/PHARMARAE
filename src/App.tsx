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
// Add these imports at the top of your App.tsx
import { AboutView } from '@/components/views/AboutView';
import { PrivacyPolicyView } from '@/components/views/PrivacyPolicyView';
import { TermsConditionsView } from '@/components/views/TermsConditionsView';
export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncPendingCount, setSyncPendingCount] = useState<number>(0);

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
    return (localStorage.getItem('medp_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('medp_theme', next);
  };

  // =============================================
  // NORMALIZE PHARMACY NAME HELPER
  // =============================================
  const normalizePharmacyName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()                          // Remove leading/trailing spaces
      .replace(/\s+/g, ' ')            // Replace multiple spaces with single
      .toUpperCase();                  // Convert to lowercase for consistency
  };

  const displayPharmacyName = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
  };

  // Network Online / Offline Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
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

  // Load Data from Dexie IndexedDB
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
        // Normalize the pharmacy name for consistency
        const pharmacyName = normalizePharmacyName(current.pharmacy_name);

        setCurrentProfile(current);
        setCurrentRole(current.role || 'owner');

        if (pharmacyName) {
          // Use normalized name for queries
          const cats = await db.categories.where('pharmacy_name').equals(pharmacyName).toArray();
          setCategories(cats);

          const un = await db.units.where('pharmacy_name').equals(pharmacyName).toArray();
          setUnits(un);

          const supps = await db.suppliers.where('pharmacy_name').equals(pharmacyName).toArray();
          setSuppliers(supps);

          const custs = await db.customers.where('pharmacy_name').equals(pharmacyName).toArray();
          setCustomers(custs);

          const bList = await db.product_batches.where('pharmacy_name').equals(pharmacyName).toArray();
          setBatches(bList);

          const prodList = await db.products.where('pharmacy_name').equals(pharmacyName).toArray();
          const pUnits = await db.product_units.toArray();

          const enrichedProducts = prodList.map(prod => {
            const prodBatches = bList.filter(b => b.product_id === prod.id);
            const totalStock = prodBatches.reduce((sum, b) => sum + (b.quantity_base || 0), 0);
            const pkgUnits = pUnits.filter(pu => pu.product_id === prod.id);

            return {
              ...prod,
              total_stock_base: totalStock,
              packaging_units: pkgUnits
            };
          });

          setProducts(enrichedProducts);

          const salesList = await db.sales.where('pharmacy_name').equals(pharmacyName).reverse().sortBy('created_at');
          const sItemsList = await db.sale_items.toArray();

          const enrichedSales = salesList.map(s => {
            const items = sItemsList.filter(si => si.sale_id === s.id);
            return { ...s, items };
          });

          setSales(enrichedSales);
          setSaleItems(sItemsList);

          const movs = await db.stock_movements.where('pharmacy_name').equals(pharmacyName).reverse().sortBy('created_at');
          setMovements(movs);

          const logs = await db.audit_logs.where('pharmacy_name').equals(pharmacyName).reverse().sortBy('created_at');
          setAuditLogs(logs);

          const pendingCount = await db.sync_queue.where('status').equals('pending').count();
          setSyncPendingCount(pendingCount);
        }
      }
    } catch (err) {
      console.error('Error loading database data:', err);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Sync Queue Runner
  const triggerSyncQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await processOfflineSyncQueue();
      if (currentProfile && isSupabaseConfigured) {
        await pullFromSupabaseToLocal(normalizePharmacyName(currentProfile.pharmacy_name));
      }
      const count = await db.sync_queue.where('status').equals('pending').count();
      setSyncPendingCount(count);
      await loadDatabaseData();
    } catch (err) {
      console.error('Sync queue error:', err);
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
  // ADD PRODUCT - MATCHES YOUR EXACT SCHEMA
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

    console.log('📦 Saving product:', newProd);
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
  // UPDATE PROFILE - WITH NORMALIZATION AND AVATAR SUPPORT
  // =============================================
  const handleUpdateProfile = async (profileId: string, updates: Partial<Profile>) => {
    if (!currentProfile) return;
    const existing = await db.profiles.get(profileId);
    if (!existing) return;

    // If pharmacy_name is being updated, normalize it
    let normalizedUpdates = { ...updates };
    if (normalizedUpdates.pharmacy_name) {
      normalizedUpdates.pharmacy_name = normalizePharmacyName(normalizedUpdates.pharmacy_name);
    }

    const updated: Profile = {
      ...existing,
      ...normalizedUpdates,
      updated_at: new Date().toISOString()
    };

    console.log('📝 Updating profile with:', updated); // ✅ Debug log

    // Save to local Dexie
    await db.profiles.put(updated);

    // If pharmacy name changed, update ALL related tables
    if (normalizedUpdates.pharmacy_name && normalizedUpdates.pharmacy_name !== existing.pharmacy_name) {
      const oldName = existing.pharmacy_name;
      const newName = normalizedUpdates.pharmacy_name;

      console.log(`🔄 Normalizing pharmacy name from "${oldName}" to "${newName}"`);

      await db.products
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.product_batches
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.sales
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.sale_items
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.stock_movements
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.customers
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.suppliers
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.categories
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });

      await db.audit_logs
        .where('pharmacy_name')
        .equals(oldName)
        .modify({ pharmacy_name: newName });
    }

    // ✅ UPDATE SUPABASE WITH ALL FIELDS INCLUDING AVATAR
    const client = getSupabaseClient();
    if (client && navigator.onLine) {
      try {
        // ✅ Explicitly include avatar_url in the update
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
          avatar_url: updated.avatar_url || null, // ✅ THIS IS THE KEY FIX
          last_login_at: updated.last_login_at || null,
          updated_at: new Date().toISOString()
        };

        console.log('☁️ Sending to Supabase:', supabaseUpdate); // ✅ Debug

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
  // UPDATE PHARMACY NAME - For MoreView
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

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 overflow-x-hidden ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]'
      }`}>

      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={toggleTheme}
        pharmacyName={currentProfile?.pharmacy_name || null}
        currentProfile={currentProfile}
      />

      <div className="flex-1 flex flex-col md:pl-16 w-full min-w-0 transition-all duration-300">
        <Header
          pharmacyName={currentProfile?.pharmacy_name || null}
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
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-1 sm:px-3 md:px-6 py-2 sm:py-4 min-w-0">
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