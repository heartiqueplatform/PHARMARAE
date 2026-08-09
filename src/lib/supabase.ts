import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { db } from './db';
import { OfflineSyncItem } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentUser: User | null = null;

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

// Sync Queue & Synchronization Engine
export async function queueOfflineMutation(
  pharmacyId: string,
  userId: string,
  entityType: OfflineSyncItem['entity_type'],
  operation: OfflineSyncItem['operation'],
  payload: any
) {
  const syncId = 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  const item: OfflineSyncItem = {
    sync_id: syncId,
    pharmacy_id: pharmacyId,
    user_id: userId,
    entity_type: entityType,
    operation,
    payload,
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

export async function pullFromSupabaseToLocal(pharmacyId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!navigator.onLine || !client) {
    return false;
  }

  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    console.warn('Not authenticated, cannot pull data');
    return false;
  }

  try {
    // 0. Pull Pharmacy & Profiles
    const { data: remotePharmacy } = await client
      .from('pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .maybeSingle();
    if (remotePharmacy) {
      await db.pharmacies.put(remotePharmacy);
    }

    const { data: remotePharmacyUsers } = await client
      .from('pharmacy_users')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remotePharmacyUsers && remotePharmacyUsers.length > 0) {
      await db.pharmacy_users.bulkPut(remotePharmacyUsers);
      const userIds = remotePharmacyUsers.map(pu => pu.user_id);
      const { data: remoteProfiles } = await client
        .from('profiles')
        .select('*')
        .in('id', userIds);
      if (remoteProfiles && remoteProfiles.length > 0) {
        await db.profiles.bulkPut(remoteProfiles);
      }
    }

    // 1. Pull Products
    const { data: remoteProducts } = await client
      .from('products')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteProducts && remoteProducts.length > 0) {
      await db.products.bulkPut(remoteProducts);
    }

    // 2. Pull Product Batches
    const { data: remoteBatches } = await client
      .from('product_batches')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteBatches && remoteBatches.length > 0) {
      await db.product_batches.bulkPut(remoteBatches);
    }

    // 3. Pull Sales & Sale Items
    const { data: remoteSales } = await client
      .from('sales')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteSales && remoteSales.length > 0) {
      await db.sales.bulkPut(remoteSales);
      const saleIds = remoteSales.map(s => s.id);
      const { data: remoteSaleItems } = await client
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);
      if (remoteSaleItems && remoteSaleItems.length > 0) {
        await db.sale_items.bulkPut(remoteSaleItems);
      }
    }

    // 4. Pull Customers
    const { data: remoteCustomers } = await client
      .from('customers')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteCustomers && remoteCustomers.length > 0) {
      await db.customers.bulkPut(remoteCustomers);
    }

    // 5. Pull Categories & Units
    const { data: remoteCategories } = await client
      .from('categories')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteCategories && remoteCategories.length > 0) {
      await db.categories.bulkPut(remoteCategories);
    }

    const { data: remoteUnits } = await client
      .from('units')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteUnits && remoteUnits.length > 0) {
      await db.units.bulkPut(remoteUnits);
    }

    // 6. Pull Suppliers
    const { data: remoteSuppliers } = await client
      .from('suppliers')
      .select('*')
      .eq('pharmacy_id', pharmacyId);
    if (remoteSuppliers && remoteSuppliers.length > 0) {
      await db.suppliers.bulkPut(remoteSuppliers);
    }

    return true;
  } catch (err) {
    console.warn('Pull from Supabase failed or skipped:', err);
    return false;
  }
}

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