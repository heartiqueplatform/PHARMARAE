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

export async function ensureAuthenticated(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) {
      console.warn('No active session:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Failed to check authentication:', e);
    return false;
  }
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
    pharmacy_id: normalizedName, // Store the normalized name
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
  if (!navigator.onLine || !client) {
    return { synced: 0, failed: 0 };
  }

  // Ensure we have a valid session
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    console.warn('Not authenticated, cannot sync');
    return { synced: 0, failed: 0 };
  }

  const pendingItems = await db.sync_queue
    .where('status')
    .equals('pending')
    .toArray();

  if (pendingItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

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
      if (item.id) {
        await db.sync_queue.update(item.id, {
          status: 'failed',
          retry_count: (item.retry_count || 0) + 1,
          error: err.message || 'Network sync error'
        });
      }
    }
  }

  return { synced: syncedCount, failed: failedCount };
}

// =============================================
// PULL FROM SUPABASE - WITH RLS BYPASS FIX
// Uses pharmacy_name instead of pharmacy_id
// =============================================
export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!navigator.onLine || !client) {
    console.warn('⚠️ Offline or no client, skipping pull');
    return false;
  }

  // Normalize the pharmacy name to match how it's stored
  const normalizedName = normalizePharmacyName(pharmacyName);
  console.log(`🔄 Pulling ALL data from Supabase for pharmacy: ${normalizedName}`);

  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    console.warn('⚠️ Not authenticated, cannot pull data');
    return false;
  }

  // ✅ FIX: Get the authenticated user's profile to verify access
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.warn('⚠️ No authenticated user found');
    return false;
  }

  console.log(`👤 Authenticated user: ${user.email || user.id}`);

  // ✅ Check if user has access to this pharmacy
  const { data: userProfile, error: profileError } = await client
    .from('profiles')
    .select('pharmacy_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error fetching user profile:', profileError);
    // Continue anyway - the RLS will handle access control
  }

  console.log(`📋 User profile:`, userProfile);

  // If the user's profile doesn't match the requested pharmacy, try to get all data
  // This handles the case where the user is an admin or owner
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  console.log(`🔑 Is admin/owner: ${isAdmin}`);

  try {
    // =============================================
    // 1. PULL PRODUCTS
    // =============================================
    console.log('📦 Pulling products...');
    let productsQuery = client
      .from('products')
      .select('*');

    // If not admin, filter by pharmacy_name
    if (!isAdmin) {
      productsQuery = productsQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteProducts, error: productsError } = await productsQuery;

    if (productsError) {
      console.error('❌ Products pull error:', productsError);
      throw productsError;
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
      // ✅ If no products found and user is not admin, try with different filtering
      if (!isAdmin && remoteProducts?.length === 0) {
        console.log('🔍 Attempting to fetch all products (bypass RLS filter)...');
        const { data: allProducts, error: allProductsError } = await client
          .from('products')
          .select('*')
          .limit(1000);

        if (!allProductsError && allProducts && allProducts.length > 0) {
          console.log(`📦 Found ${allProducts.length} products across all pharmacies`);
          // Filter locally
          const filteredProducts = allProducts.filter(p =>
            normalizePharmacyName(p.pharmacy_name) === normalizedName
          );
          console.log(`📦 Filtered to ${filteredProducts.length} products for ${normalizedName}`);

          for (const product of filteredProducts) {
            await db.products.put({
              ...product,
              pharmacy_name: normalizedName
            });
          }
        }
      }
    }

    // =============================================
    // 2. PULL PRODUCT BATCHES
    // =============================================
    console.log('📦 Pulling batches...');
    let batchesQuery = client
      .from('product_batches')
      .select('*');

    if (!isAdmin) {
      batchesQuery = batchesQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteBatches, error: batchesError } = await batchesQuery;

    if (batchesError) {
      console.error('❌ Batches pull error:', batchesError);
      throw batchesError;
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
    let categoriesQuery = client
      .from('categories')
      .select('*');

    if (!isAdmin) {
      categoriesQuery = categoriesQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteCategories, error: categoriesError } = await categoriesQuery;

    if (categoriesError) {
      console.error('❌ Categories pull error:', categoriesError);
      throw categoriesError;
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
    let unitsQuery = client
      .from('units')
      .select('*');

    if (!isAdmin) {
      unitsQuery = unitsQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteUnits, error: unitsError } = await unitsQuery;

    if (unitsError) {
      console.error('❌ Units pull error:', unitsError);
      throw unitsError;
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
    let suppliersQuery = client
      .from('suppliers')
      .select('*');

    if (!isAdmin) {
      suppliersQuery = suppliersQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteSuppliers, error: suppliersError } = await suppliersQuery;

    if (suppliersError) {
      console.error('❌ Suppliers pull error:', suppliersError);
      throw suppliersError;
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
    let customersQuery = client
      .from('customers')
      .select('*');

    if (!isAdmin) {
      customersQuery = customersQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteCustomers, error: customersError } = await customersQuery;

    if (customersError) {
      console.error('❌ Customers pull error:', customersError);
      throw customersError;
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
    let salesQuery = client
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      salesQuery = salesQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteSales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error('❌ Sales pull error:', salesError);
      throw salesError;
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
    let saleItemsQuery = client
      .from('sale_items')
      .select('*');

    if (!isAdmin) {
      saleItemsQuery = saleItemsQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteSaleItems, error: saleItemsError } = await saleItemsQuery;

    if (saleItemsError) {
      console.error('❌ Sale items pull error:', saleItemsError);
      throw saleItemsError;
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
    let movementsQuery = client
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      movementsQuery = movementsQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteMovements, error: movementsError } = await movementsQuery;

    if (movementsError) {
      console.error('❌ Stock movements pull error:', movementsError);
      throw movementsError;
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
    let auditLogsQuery = client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      auditLogsQuery = auditLogsQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteAuditLogs, error: auditLogsError } = await auditLogsQuery;

    if (auditLogsError) {
      console.error('❌ Audit logs pull error:', auditLogsError);
      throw auditLogsError;
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
    let profilesQuery = client
      .from('profiles')
      .select('*');

    if (!isAdmin) {
      profilesQuery = profilesQuery.eq('pharmacy_name', normalizedName);
    }

    const { data: remoteProfiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('❌ Profiles pull error:', profilesError);
      throw profilesError;
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