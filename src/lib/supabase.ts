import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { db } from './db';
import { OfflineSyncItem } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentUser: User | null = null;

// =============================================
// HELPER: Normalize pharmacy name
// =============================================
export function normalizePharmacyName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function getSupabaseCredentials(): { url: string; key: string } {
  const env = (import.meta as any).env || {};
  const localUrl = localStorage.getItem('medp_supabase_url') || '';
  const localKey = localStorage.getItem('medp_supabase_key') || '';

  const defaultUrl = 'https://byygilnxaleiocapybuz.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eWdpbG54YWxlaW9jYXB5YnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMzg0MDYsImV4cCI6MjEwMTgxNDQwNn0.S399WEWx0e8gTRPCCEUpzWyDEwbreldt4fJee70wlM8';

  const url = localUrl || env.VITE_SUPABASE_URL || defaultUrl;
  const key = localKey || env.VITE_SUPABASE_ANON_KEY || defaultKey;

  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (url) localStorage.setItem('medp_supabase_url', url.trim());
  else localStorage.removeItem('medp_supabase_url');

  if (key) localStorage.setItem('medp_supabase_key', key.trim());
  else localStorage.removeItem('medp_supabase_key');

  // Reset instance
  supabaseInstance = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(
    url &&
    key &&
    !url.includes('your-supabase-project')
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseCredentials();
  if (url && key && !url.includes('your-supabase-project')) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'medp_supabase_auth'
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  if (currentUser) return currentUser;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      console.warn('Failed to get current user:', error);
      return null;
    }
    currentUser = user;
    return user;
  } catch (e) {
    console.warn('Failed to get current user:', e);
    return null;
  }
}

// =============================================
// ✅ NO AUTHENTICATION CHECKS - User is already on dashboard
// =============================================
export function ensureAuthenticated(): boolean {
  // ✅ Simply check if user is locally authenticated
  return localStorage.getItem('medp_authenticated') === 'true';
}

export const supabase = getSupabaseClient();

// =============================================
// SYNC QUEUE - UPDATED with pharmacy_name
// =============================================
export async function queueOfflineMutation(
  pharmacyName: string,
  userId: string,
  entityType: OfflineSyncItem['entity_type'],
  operation: OfflineSyncItem['operation'],
  payload: any
) {
  // Normalize the pharmacy name
  const normalizedName = normalizePharmacyName(pharmacyName);

  const syncId = 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  const item: OfflineSyncItem = {
    sync_id: syncId,
    pharmacy_name: normalizedName, // ✅ Use pharmacy_name, not pharmacy_id
    user_id: userId,
    entity_type: entityType,
    operation,
    payload: {
      ...payload,
      pharmacy_name: normalizedName // Ensure payload has normalized name
    },
    created_at: new Date().toISOString(),
    status: 'pending',
    retry_count: 0
  };

  await db.sync_queue.add(item);

  // If online, trigger sync immediately in background
  if (navigator.onLine && isSupabaseConfigured()) {
    processOfflineSyncQueue().catch(console.error);
  }
}

export async function processOfflineSyncQueue(): Promise<{ synced: number; failed: number }> {
  const client = getSupabaseClient();

  // ✅ Check if online and client exists
  if (!navigator.onLine) {
    console.log('📴 Offline - cannot process sync queue');
    return { synced: 0, failed: 0 };
  }

  if (!client) {
    console.log('⚠️ No Supabase client available');
    return { synced: 0, failed: 0 };
  }

  // ✅ NO AUTH CHECK - just check if configured
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured');
    return { synced: 0, failed: 0 };
  }

  const pendingItems = await db.sync_queue
    .where('status')
    .equals('pending')
    .toArray();

  if (pendingItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`📤 Processing ${pendingItems.length} pending sync items...`);

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pendingItems) {
    try {
      if (!item.id) continue;

      await db.sync_queue.update(item.id, { status: 'syncing' });

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
        throw error;
      }

      await db.sync_queue.update(item.id, { status: 'synced' });
      await db.sync_queue.delete(item.id);
      syncedCount++;
    } catch (err: any) {
      failedCount++;
      console.error(`❌ Sync failed for item ${item.id}:`, err.message);
      if (item.id) {
        await db.sync_queue.update(item.id, {
          status: 'failed',
          retry_count: (item.retry_count || 0) + 1,
          error: err.message || 'Network sync error'
        });
      }
    }
  }

  console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);
  return { synced: syncedCount, failed: failedCount };
}

// =============================================
// PULL FROM SUPABASE - ✅ NO AUTH CHECKS
// =============================================
export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
  const client = getSupabaseClient();

  // ✅ Only check online status and client exists
  if (!navigator.onLine) {
    console.log('📴 Offline - cannot pull from Supabase');
    return false;
  }

  if (!client) {
    console.log('⚠️ No Supabase client available');
    return false;
  }

  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured');
    return false;
  }

  // Normalize the pharmacy name
  const normalizedName = normalizePharmacyName(pharmacyName);
  console.log(`🔄 Pulling ALL data from Supabase for pharmacy: ${normalizedName}`);

  // ✅ NO AUTH CHECKS - just try to pull data
  // ✅ NO USER PROFILE CHECK - just try to pull data

  try {
    // =============================================
    // 1. PULL PRODUCTS
    // =============================================
    console.log('📦 Pulling products...');

    // First try with pharmacy_name filter
    let { data: remoteProducts, error: productsError } = await client
      .from('products')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    // If error, try without filter (RLS bypass)
    if (productsError) {
      console.warn('⚠️ Products query with filter failed, trying without filter:', productsError.message);

      const { data: allProducts, error: allError } = await client
        .from('products')
        .select('*')
        .limit(1000);

      if (!allError && allProducts && allProducts.length > 0) {
        // Filter locally
        remoteProducts = allProducts.filter(p =>
          normalizePharmacyName(p.pharmacy_name) === normalizedName
        );
        console.log(`📦 Found ${remoteProducts.length} products (filtered locally from ${allProducts.length} total)`);
      } else {
        console.log('📦 No products found');
        remoteProducts = [];
      }
    }

    if (remoteProducts && remoteProducts.length > 0) {
      console.log(`📦 Pulled ${remoteProducts.length} products`);

      // Clear existing products for this pharmacy
      const existingProducts = await db.products
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const p of existingProducts) {
        await db.products.delete(p.id);
      }

      // Add new products
      for (const product of remoteProducts) {
        await db.products.put({
          ...product,
          pharmacy_name: normalizedName
        });
      }
    } else {
      console.log('📦 No products found in Supabase');
    }

    // =============================================
    // 2. PULL PRODUCT BATCHES
    // =============================================
    console.log('📦 Pulling batches...');
    let { data: remoteBatches, error: batchesError } = await client
      .from('product_batches')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (batchesError) {
      console.warn('⚠️ Batches query with filter failed, trying without filter');
      const { data: allBatches } = await client
        .from('product_batches')
        .select('*')
        .limit(1000);

      if (allBatches && allBatches.length > 0) {
        remoteBatches = allBatches.filter(b =>
          normalizePharmacyName(b.pharmacy_name) === normalizedName
        );
        console.log(`📦 Found ${remoteBatches.length} batches (filtered locally)`);
      } else {
        remoteBatches = [];
      }
    }

    if (remoteBatches && remoteBatches.length > 0) {
      console.log(`📦 Pulled ${remoteBatches.length} batches`);
      const existingBatches = await db.product_batches
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const b of existingBatches) {
        await db.product_batches.delete(b.id);
      }

      for (const batch of remoteBatches) {
        await db.product_batches.put({
          ...batch,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 3. PULL CATEGORIES
    // =============================================
    console.log('📦 Pulling categories...');
    let { data: remoteCategories, error: categoriesError } = await client
      .from('categories')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (categoriesError) {
      console.warn('⚠️ Categories query with filter failed, trying without filter');
      const { data: allCategories } = await client
        .from('categories')
        .select('*')
        .limit(1000);

      if (allCategories && allCategories.length > 0) {
        remoteCategories = allCategories.filter(c =>
          normalizePharmacyName(c.pharmacy_name) === normalizedName
        );
      } else {
        remoteCategories = [];
      }
    }

    if (remoteCategories && remoteCategories.length > 0) {
      console.log(`📦 Pulled ${remoteCategories.length} categories`);
      const existing = await db.categories
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const c of existing) {
        await db.categories.delete(c.id);
      }

      for (const category of remoteCategories) {
        await db.categories.put({
          ...category,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 4. PULL UNITS
    // =============================================
    console.log('📦 Pulling units...');
    let { data: remoteUnits, error: unitsError } = await client
      .from('units')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (unitsError) {
      console.warn('⚠️ Units query with filter failed, trying without filter');
      const { data: allUnits } = await client
        .from('units')
        .select('*')
        .limit(1000);

      if (allUnits && allUnits.length > 0) {
        remoteUnits = allUnits.filter(u =>
          normalizePharmacyName(u.pharmacy_name) === normalizedName
        );
      } else {
        remoteUnits = [];
      }
    }

    if (remoteUnits && remoteUnits.length > 0) {
      console.log(`📦 Pulled ${remoteUnits.length} units`);
      const existing = await db.units
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const u of existing) {
        await db.units.delete(u.id);
      }

      for (const unit of remoteUnits) {
        await db.units.put({
          ...unit,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 5. PULL SUPPLIERS
    // =============================================
    console.log('📦 Pulling suppliers...');
    let { data: remoteSuppliers, error: suppliersError } = await client
      .from('suppliers')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (suppliersError) {
      console.warn('⚠️ Suppliers query with filter failed, trying without filter');
      const { data: allSuppliers } = await client
        .from('suppliers')
        .select('*')
        .limit(1000);

      if (allSuppliers && allSuppliers.length > 0) {
        remoteSuppliers = allSuppliers.filter(s =>
          normalizePharmacyName(s.pharmacy_name) === normalizedName
        );
      } else {
        remoteSuppliers = [];
      }
    }

    if (remoteSuppliers && remoteSuppliers.length > 0) {
      console.log(`📦 Pulled ${remoteSuppliers.length} suppliers`);
      const existing = await db.suppliers
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const s of existing) {
        await db.suppliers.delete(s.id);
      }

      for (const supplier of remoteSuppliers) {
        await db.suppliers.put({
          ...supplier,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 6. PULL CUSTOMERS
    // =============================================
    console.log('📦 Pulling customers...');
    let { data: remoteCustomers, error: customersError } = await client
      .from('customers')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (customersError) {
      console.warn('⚠️ Customers query with filter failed, trying without filter');
      const { data: allCustomers } = await client
        .from('customers')
        .select('*')
        .limit(1000);

      if (allCustomers && allCustomers.length > 0) {
        remoteCustomers = allCustomers.filter(c =>
          normalizePharmacyName(c.pharmacy_name) === normalizedName
        );
      } else {
        remoteCustomers = [];
      }
    }

    if (remoteCustomers && remoteCustomers.length > 0) {
      console.log(`📦 Pulled ${remoteCustomers.length} customers`);
      const existing = await db.customers
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const c of existing) {
        await db.customers.delete(c.id);
      }

      for (const customer of remoteCustomers) {
        await db.customers.put({
          ...customer,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 7. PULL SALES
    // =============================================
    console.log('📦 Pulling sales...');
    let { data: remoteSales, error: salesError } = await client
      .from('sales')
      .select('*')
      .eq('pharmacy_name', normalizedName)
      .order('created_at', { ascending: false });

    if (salesError) {
      console.warn('⚠️ Sales query with filter failed, trying without filter');
      const { data: allSales } = await client
        .from('sales')
        .select('*')
        .limit(1000);

      if (allSales && allSales.length > 0) {
        remoteSales = allSales.filter(s =>
          normalizePharmacyName(s.pharmacy_name) === normalizedName
        );
      } else {
        remoteSales = [];
      }
    }

    if (remoteSales && remoteSales.length > 0) {
      console.log(`📦 Pulled ${remoteSales.length} sales`);
      const existing = await db.sales
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const s of existing) {
        await db.sales.delete(s.id);
      }

      for (const sale of remoteSales) {
        await db.sales.put({
          ...sale,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 8. PULL SALE ITEMS
    // =============================================
    console.log('📦 Pulling sale items...');
    let { data: remoteSaleItems, error: saleItemsError } = await client
      .from('sale_items')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (saleItemsError) {
      console.warn('⚠️ Sale items query with filter failed, trying without filter');
      const { data: allSaleItems } = await client
        .from('sale_items')
        .select('*')
        .limit(1000);

      if (allSaleItems && allSaleItems.length > 0) {
        remoteSaleItems = allSaleItems.filter(si =>
          normalizePharmacyName(si.pharmacy_name) === normalizedName
        );
      } else {
        remoteSaleItems = [];
      }
    }

    if (remoteSaleItems && remoteSaleItems.length > 0) {
      console.log(`📦 Pulled ${remoteSaleItems.length} sale items`);
      const existing = await db.sale_items
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const si of existing) {
        await db.sale_items.delete(si.id);
      }

      for (const saleItem of remoteSaleItems) {
        await db.sale_items.put({
          ...saleItem,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 9. PULL STOCK MOVEMENTS
    // =============================================
    console.log('📦 Pulling stock movements...');
    let { data: remoteMovements, error: movementsError } = await client
      .from('stock_movements')
      .select('*')
      .eq('pharmacy_name', normalizedName)
      .order('created_at', { ascending: false });

    if (movementsError) {
      console.warn('⚠️ Stock movements query with filter failed, trying without filter');
      const { data: allMovements } = await client
        .from('stock_movements')
        .select('*')
        .limit(1000);

      if (allMovements && allMovements.length > 0) {
        remoteMovements = allMovements.filter(m =>
          normalizePharmacyName(m.pharmacy_name) === normalizedName
        );
      } else {
        remoteMovements = [];
      }
    }

    if (remoteMovements && remoteMovements.length > 0) {
      console.log(`📦 Pulled ${remoteMovements.length} stock movements`);
      const existing = await db.stock_movements
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const m of existing) {
        await db.stock_movements.delete(m.id);
      }

      for (const movement of remoteMovements) {
        await db.stock_movements.put({
          ...movement,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 10. PULL AUDIT LOGS
    // =============================================
    console.log('📦 Pulling audit logs...');
    let { data: remoteAuditLogs, error: auditLogsError } = await client
      .from('audit_logs')
      .select('*')
      .eq('pharmacy_name', normalizedName)
      .order('created_at', { ascending: false });

    if (auditLogsError) {
      console.warn('⚠️ Audit logs query with filter failed, trying without filter');
      const { data: allAuditLogs } = await client
        .from('audit_logs')
        .select('*')
        .limit(1000);

      if (allAuditLogs && allAuditLogs.length > 0) {
        remoteAuditLogs = allAuditLogs.filter(a =>
          normalizePharmacyName(a.pharmacy_name) === normalizedName
        );
      } else {
        remoteAuditLogs = [];
      }
    }

    if (remoteAuditLogs && remoteAuditLogs.length > 0) {
      console.log(`📦 Pulled ${remoteAuditLogs.length} audit logs`);
      const existing = await db.audit_logs
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const a of existing) {
        await db.audit_logs.delete(a.id);
      }

      for (const auditLog of remoteAuditLogs) {
        await db.audit_logs.put({
          ...auditLog,
          pharmacy_name: normalizedName
        });
      }
    }

    // =============================================
    // 11. PULL PROFILES (users)
    // =============================================
    console.log('📦 Pulling profiles...');
    let { data: remoteProfiles, error: profilesError } = await client
      .from('profiles')
      .select('*')
      .eq('pharmacy_name', normalizedName);

    if (profilesError) {
      console.warn('⚠️ Profiles query with filter failed, trying without filter');
      const { data: allProfiles } = await client
        .from('profiles')
        .select('*')
        .limit(1000);

      if (allProfiles && allProfiles.length > 0) {
        remoteProfiles = allProfiles.filter(p =>
          normalizePharmacyName(p.pharmacy_name) === normalizedName
        );
      } else {
        remoteProfiles = [];
      }
    }

    if (remoteProfiles && remoteProfiles.length > 0) {
      console.log(`📦 Pulled ${remoteProfiles.length} profiles`);
      const existing = await db.profiles
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

      for (const p of existing) {
        await db.profiles.delete(p.id);
      }

      for (const profile of remoteProfiles) {
        await db.profiles.put({
          ...profile,
          pharmacy_name: normalizedName
        });
      }
    }

    console.log('✅ All data pulled from Supabase successfully!');
    return true;
  } catch (err) {
    console.error('❌ Pull from Supabase failed:', err);
    return false;
  }
}

// =============================================
// MAP ENTITY TYPE TO TABLE NAME
// =============================================
function mapEntityTypeToTable(entityType: string): string {
  switch (entityType) {
    case 'sale': return 'sales';
    case 'sale_item': return 'sale_items';
    case 'product': return 'products';
    case 'batch': return 'product_batches';
    case 'purchase': return 'purchases';
    case 'purchase_item': return 'purchase_items';
    case 'stock_movement': return 'stock_movements';
    case 'customer': return 'customers';
    case 'supplier': return 'suppliers';
    case 'category': return 'categories';
    case 'unit': return 'units';
    case 'pharmacy': return 'pharmacies';
    case 'profile': return 'profiles';
    case 'pharmacy_user': return 'pharmacy_users';
    case 'payment': return 'payments';
    case 'return': return 'returns';
    case 'return_item': return 'return_items';
    case 'discount': return 'discounts';
    default: return entityType;
  }
}

// =============================================
// HELPER: Clear all data for a pharmacy
// =============================================
export async function clearPharmacyData(pharmacyName: string): Promise<void> {
  const normalizedName = normalizePharmacyName(pharmacyName);
  console.log(`🧹 Clearing all data for pharmacy: ${normalizedName}`);

  const tables = [
    'products', 'product_batches', 'categories', 'units',
    'suppliers', 'customers', 'sales', 'sale_items',
    'stock_movements', 'audit_logs'
  ];

  for (const tableName of tables) {
    const table = db[tableName as keyof typeof db] as any;
    if (table && typeof table.where === 'function') {
      const items = await table.where('pharmacy_name').equals(normalizedName).toArray();
      for (const item of items) {
        await table.delete(item.id);
      }
      console.log(`  ✅ Cleared ${items.length} records from ${tableName}`);
    }
  }
}

// =============================================
// ✅ NEW: Force sync all data (no auth checks)
// =============================================
export async function forceSyncAllData(pharmacyName: string): Promise<boolean> {
  console.log(`🔄 Force syncing all data for: ${pharmacyName}`);

  // Process pending mutations first
  const { synced, failed } = await processOfflineSyncQueue();
  console.log(`📤 Processed ${synced} mutations, ${failed} failed`);

  // Then pull fresh data
  const pulled = await pullFromSupabaseToLocal(pharmacyName);
  console.log(`📥 Pulled data: ${pulled ? 'success' : 'failed'}`);

  return pulled;
}

// =============================================
// ✅ NEW: Check if data exists in Supabase (no auth)
// =============================================
export async function checkDataExistsInSupabase(pharmacyName: string): Promise<{ exists: boolean; count: number }> {
  const client = getSupabaseClient();
  if (!client || !navigator.onLine) {
    return { exists: false, count: 0 };
  }

  const normalizedName = normalizePharmacyName(pharmacyName);

  try {
    const { data, error, count } = await client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_name', normalizedName);

    if (error) {
      console.warn('⚠️ Check data exists error:', error);
      return { exists: false, count: 0 };
    }

    return { exists: (count || 0) > 0, count: count || 0 };
  } catch (err) {
    console.error('❌ Check data exists failed:', err);
    return { exists: false, count: 0 };
  }
}