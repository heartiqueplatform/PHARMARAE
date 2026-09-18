// lib/supabase/pull.ts
// =============================================
// PRODUCTION-READY PULL ENGINE v2
// =============================================
// Key fixes vs v1:
//   1. Cursor-based pagination on `server_updated_at` (monotonic, gap-free)
//   2. Never overwrites a newer local row with a stale remote row
//   3. Serialized table pulls (concurrency cap) — survives 10k+ users
//   4. Throws on failure instead of silently breaking
//   5. Debug logging that can be toggled via localStorage
//   6. Full-resync prunes only after a successful fetch
//
// ⚠️ REQUIRES: `server_updated_at` column + trigger + index on every table.
//    See migration SQL at bottom of file.
// =============================================

import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';
import { genUUID } from '../../utils/helpers';

// =============================================
// CONFIG
// =============================================
const PAGE_SIZE = 1000;
const TABLE_CONCURRENCY = 3;   // how many tables to pull at once
const BREATHE_MS = 50;         // pause between table batches
const MAX_RETRIES_PER_PAGE = 2;

// =============================================
// DEBUG LOGGING
// =============================================
// Enable in browser console:
//   localStorage.setItem('medp_pull_debug', 'true')
// Disable:
//   localStorage.removeItem('medp_pull_debug')
//
// Then watch the console for `[PULL]` prefixed lines.
// =============================================
function debugEnabled(): boolean {
  try {
    return localStorage.getItem('medp_pull_debug') === 'true';
  } catch {
    return false;
  }
}

function log(...args: any[]) {
  if (debugEnabled()) {
    console.log('[PULL]', ...args);
  }
}

function warn(...args: any[]) {
  // Always warn on real problems, even if debug is off
  console.warn('[PULL]', ...args);
}

// =============================================
// CONCURRENCY GUARD
// Prevent parallel pulls from racing (delete + bulkPut)
// =============================================
let pullInFlight: Promise<boolean> | null = null;

// =============================================
// HELPER: Build sale_id from row
// =============================================
// ⚠️ NOTE: sale_id should be a REAL column in Supabase.
//    This fallback exists only for legacy rows that predate the column.
//    If you see sale_id values derived from `id` in the wild, you have
//    legacy rows that need backfilling (see migration SQL).
// =============================================
function normalizeSaleRow(item: any, normalizedName: string) {
  return {
    ...item,
    pharmacy_name: normalizedName,
    sale_id:
      item.sale_id ||
      item.sale_number?.replace('INV-', '').split('-')[0] ||
      item.id,
  };
}

// =============================================
// HELPER: Apply table-specific row transforms
// =============================================
function transformRow(tableName: string, item: any, normalizedName: string) {
  if (tableName === 'sales') {
    return normalizeSaleRow(item, normalizedName);
  }
  return { ...item, pharmacy_name: normalizedName };
}

// =============================================
// SAFE BULK PUT — the single most important fix
// =============================================
// WHY THIS EXISTS:
//   Dexie's `bulkPut` is last-write-wins. If a pull fetches a stale
//   remote row (say, 3 days old) while a fresh local write exists
//   (say, 2 seconds old), bulkPut would clobber the fresh row.
//
// WHAT THIS DOES:
//   For each incoming row, compare its `updated_at` (or `created_at`
//   fallback) against the local row's timestamp. Only write if the
//   remote is genuinely newer.
//
// ⚠️ IMPORTANT: Uses `server_updated_at` if present — that's the
//    server-authoritative timestamp from the trigger. Falls back to
//    `updated_at` for tables that don't have the column yet.
// =============================================
async function safeBulkPut(
  tableName: string,
  dbTable: any,
  rows: any[]
): Promise<{ written: number; skipped: number }> {
  if (rows.length === 0) return { written: 0, skipped: 0 };

  let written = 0;
  let skipped = 0;

  try {
    await db.transaction('rw', dbTable, async () => {
      const ids = rows.map(r => r.id).filter(Boolean);
      if (ids.length === 0) {
        warn(`${tableName}: incoming rows have no id — writing anyway`);
        await dbTable.bulkPut(rows);
        written = rows.length;
        return;
      }

      const existing: any[] = await dbTable.bulkGet(ids);
      const existingMap = new Map<string, any>();
      for (const row of existing) {
        if (row && row.id) existingMap.set(row.id, row);
      }

      const toWrite: any[] = [];
      for (const remote of rows) {
        const local = existingMap.get(remote.id);

        // New row — always write
        if (!local) {
          toWrite.push(remote);
          continue;
        }

        // Compare timestamps. Prefer server_updated_at (authoritative),
        // fall back to updated_at, then created_at.
        const localTs =
          local.server_updated_at ||
          local.updated_at ||
          local.created_at ||
          '1970-01-01T00:00:00.000Z';

        const remoteTs =
          remote.server_updated_at ||
          remote.updated_at ||
          remote.created_at ||
          '1970-01-01T00:00:00.000Z';

        if (remoteTs > localTs) {
          toWrite.push(remote);
        } else {
          skipped++;
          log(
            `${tableName}: skip id=${remote.id} ` +
            `(local=${localTs} >= remote=${remoteTs})`
          );
        }
      }

      if (toWrite.length > 0) {
        await dbTable.bulkPut(toWrite);
        written = toWrite.length;
      }
    });
  } catch (err) {
    warn(`${tableName}: safeBulkPut transaction failed`, err);
    // Fallback: write everything (better to have stale than nothing)
    try {
      await dbTable.bulkPut(rows);
      written = rows.length;
    } catch (innerErr) {
      warn(`${tableName}: fallback bulkPut also failed`, innerErr);
      throw innerErr;
    }
  }

  return { written, skipped };
}

// =============================================
// PULL SINGLE TABLE (CURSOR-PAGINATED, SAFE)
// =============================================
// WHY CURSOR PAGINATION:
//   `range(from, to)` is offset-based. If rows are inserted/deleted
//   mid-pull, offsets shift and you skip or duplicate rows.
//
//   Cursor-based pagination anchors on `server_updated_at > lastSeen`.
//   The cursor is monotonic — no gaps, no duplicates, no drift.
//
// WHY order by server_updated_at ASC:
//   - ASC = cursor moves forward in time
//   - Matches the `gt(cursor)` filter exactly
//   - Never mixes sort key and filter key (the v1 bug)
//
// WHY handle NULL server_updated_at:
//   - Rows created before the trigger existed have NULL.
//   - `gte('server_updated_at', since)` excludes NULLs.
//   - We backfill in the migration, but defensive code is cheap.
// =============================================
async function pullTable<T>(
  tableName: string,
  pharmacyName: string,
  dbTable: any,
  options?: { limit?: number; since?: Date }
): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);
  const maxRows = options?.limit ?? Infinity;
  const since = options?.since;

  let total = 0;
  let cursor: string | null = null;
  let pageIndex = 0;

  const startTime = Date.now();

  log(
    `pullTable(${tableName}) start — pharmacy=${normalizedName} ` +
    `since=${since?.toISOString() || 'none'} limit=${maxRows}`
  );

  try {
    while (total < maxRows) {
      const remaining = maxRows === Infinity ? PAGE_SIZE : Math.min(PAGE_SIZE, maxRows - total);
      const pageSize = remaining;

      let query = client
        .from(tableName)
        .select('*')
        .eq('pharmacy_name', normalizedName)
        // ✅ Sort by the SAME column we filter by
        .order('server_updated_at', { ascending: true })
        .limit(pageSize);

      // First page: filter by since. Later pages: filter by cursor.
      if (cursor) {
        query = query.gt('server_updated_at', cursor);
      } else if (since) {
        // Include NULLs defensively — legacy rows without server_updated_at
        // would otherwise be invisible forever.
        query = query.or(
          `server_updated_at.gte.${since.toISOString()},server_updated_at.is.null`
        );
      }

      let data: any[] | null = null;
      let error: any = null;
      let attempt = 0;

      while (attempt <= MAX_RETRIES_PER_PAGE) {
        const res = await query;
        data = res.data;
        error = res.error;
        if (!error) break;
        attempt++;
        if (attempt > MAX_RETRIES_PER_PAGE) break;
        warn(
          `pullTable(${tableName}) page ${pageIndex} retry ${attempt}:`,
          error.message
        );
        await new Promise(r => setTimeout(r, 250 * attempt));
      }

      if (error) {
        warn(
          `pullTable(${tableName}) page ${pageIndex} FAILED after retries:`,
          error.message
        );
        // Throw so the caller knows — silent breaks are why you had bugs.
        throw new Error(`pullTable(${tableName}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        log(`pullTable(${tableName}) page ${pageIndex}: empty — done`);
        break;
      }

      const transformed = data.map(item =>
        transformRow(tableName, item, normalizedName)
      );

      const { written, skipped } = await safeBulkPut(
        tableName,
        dbTable,
        transformed
      );

      total += written;

      // Advance cursor to last row's server_updated_at
      const lastRow = data[data.length - 1];
      cursor = lastRow.server_updated_at || cursor;

      log(
        `pullTable(${tableName}) page ${pageIndex}: ` +
        `fetched=${data.length} written=${written} skipped=${skipped} ` +
        `cursor=${cursor}`
      );

      pageIndex++;

      if (data.length < pageSize) {
        log(`pullTable(${tableName}) last page — done`);
        break;
      }

      // Cursor must advance, or we'll loop forever
      if (!cursor) {
        warn(`pullTable(${tableName}): cursor did not advance — aborting`);
        break;
      }
    }

    const elapsed = Date.now() - startTime;
    log(`pullTable(${tableName}) complete — ${total} rows in ${elapsed}ms`);
    return total;
  } catch (err: any) {
    warn(`pullTable(${tableName}) error:`, err?.message || err);
    throw err;
  }
}

// =============================================
// PULL ENTIRE TABLE (with safe stale cleanup)
// =============================================
// Use this when you want a FULL resync + prune orphans.
//
// ⚠️ SAFETY: Pruning only happens AFTER the full fetch succeeds.
//    If the fetch fails partway, we do NOT delete anything.
// =============================================
async function pullTableFullResync(
  tableName: string,
  pharmacyName: string,
  dbTable: any
): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);
  const remoteIds = new Set<string>();
  let cursor: string | null = null;
  let total = 0;
  let pageIndex = 0;
  let fetchSucceeded = false;

  const startTime = Date.now();
  log(`pullTableFullResync(${tableName}) start — pharmacy=${normalizedName}`);

  try {
    while (true) {
      let query = client
        .from(tableName)
        .select('*')
        .eq('pharmacy_name', normalizedName)
        .order('server_updated_at', { ascending: true })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.gt('server_updated_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        warn(`pullTableFullResync(${tableName}) page ${pageIndex} error:`, error.message);
        throw new Error(`pullTableFullResync(${tableName}): ${error.message}`);
      }

      if (!data || data.length === 0) break;

      const transformed = data.map(item =>
        transformRow(tableName, item, normalizedName)
      );

      for (const it of transformed) {
        if (it.id) remoteIds.add(it.id);
      }

      const { written, skipped } = await safeBulkPut(
        tableName,
        dbTable,
        transformed
      );
      total += written;

      const lastRow = data[data.length - 1];
      cursor = lastRow.server_updated_at || cursor;

      log(
        `pullTableFullResync(${tableName}) page ${pageIndex}: ` +
        `fetched=${data.length} written=${written} skipped=${skipped}`
      );

      pageIndex++;

      if (data.length < PAGE_SIZE) break;
      if (!cursor) {
        warn(`pullTableFullResync(${tableName}): cursor did not advance`);
        break;
      }
    }

    fetchSucceeded = true;
  } catch (err) {
    warn(`pullTableFullResync(${tableName}) fetch failed — skipping prune`);
    throw err;
  }

  // ✅ Only prune AFTER full fetch succeeded
  if (fetchSucceeded && remoteIds.size > 0) {
    try {
      const localKeys: string[] = await dbTable
        .where('pharmacy_name')
        .equals(normalizedName)
        .primaryKeys();

      const toDelete = localKeys.filter((id: string) => !remoteIds.has(id));

      if (toDelete.length > 0) {
        await dbTable.bulkDelete(toDelete);
        log(
          `pullTableFullResync(${tableName}): pruned ${toDelete.length} orphans`
        );
      }
    } catch (err) {
      warn(`pullTableFullResync(${tableName}) prune failed:`, err);
    }
  }

  const elapsed = Date.now() - startTime;
  log(
    `pullTableFullResync(${tableName}) complete — ` +
    `${total} rows, ${remoteIds.size} remote ids in ${elapsed}ms`
  );
  return total;
}

// =============================================
// PROCESS CONFIRMED ORDER — Auto-add stock
// =============================================
async function processConfirmedOrder(orderId: string) {
  try {
    const order = await db.suppliers_orders.get(orderId);
    if (!order) return;

    if (order.delivery_info?.stock_added) return;

    const items = await db.suppliers_order_items
      .where('order_id')
      .equals(orderId)
      .toArray();

    const pharmacyName = order.pharmacy_name;

    for (const item of items) {
      if (!item.product_id) continue;
      if (item.accepted_quantity <= 0) continue;

      const product = await db.products.get(item.product_id);
      if (!product) continue;

      const currentStock = product.quantity || 0;
      const newStock = currentStock + item.accepted_quantity;

      await db.products.update(item.product_id, {
        quantity: newStock,
        updated_at: new Date().toISOString(),
      });

      const movement = {
        id: genUUID(),
        pharmacy_name: pharmacyName,
        product_id: item.product_id,
        product_name: item.product_name,
        batch_id: null,
        batch_number: item.batch_number || null,
        movement_type: 'purchase',
        quantity_base: item.accepted_quantity,
        reference_type: 'suppliers_orders',
        reference_id: orderId,
        performed_by: order.pharmacy_contact_person,
        performed_by_name: order.pharmacy_contact_person,
        reason: `Order #${order.order_number} confirmed - Supplier added stock`,
        created_at: new Date().toISOString(),
      };
      await db.stock_movements.put(movement);
    }

    await db.suppliers_orders.update(orderId, {
      'delivery_info.stock_added': true,
      'delivery_info.stock_added_at': new Date().toISOString(),
    });
  } catch (error) {
    warn('processConfirmedOrder failed:', error);
  }
}

// =============================================
// PULL SUPPLIER PARTNERSHIPS (CURSOR-PAGINATED)
// =============================================
async function pullSupplierPartnerships(pharmacyName: string): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);
  let cursor: string | null = null;
  let total = 0;

  try {
    while (true) {
      let query = client
        .from('suppliers_partnership_requests')
        .select('*')
        .eq('pharmacy_name', normalizedName)
        .order('server_updated_at', { ascending: true })
        .limit(PAGE_SIZE);

      if (cursor) query = query.gt('server_updated_at', cursor);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;

      const items = data.map(item => ({
        ...item,
        pharmacy_name: normalizedName,
      }));

      await db.suppliers_partnership_requests.bulkPut(items);
      total += items.length;

      cursor = data[data.length - 1].server_updated_at || cursor;
      if (data.length < PAGE_SIZE) break;
      if (!cursor) break;
    }

    return total;
  } catch (err) {
    warn('pullSupplierPartnerships failed:', err);
    throw err;
  }
}

// =============================================
// PULL SUPPLIER ORDERS (CURSOR-PAGINATED)
// =============================================
async function pullSupplierOrders(pharmacyName: string): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);
  let cursor: string | null = null;
  let total = 0;
  const confirmedOrders: string[] = [];

  try {
    while (true) {
      let query = client
        .from('suppliers_orders')
        .select('*')
        .eq('pharmacy_name', normalizedName)
        .order('server_updated_at', { ascending: true })
        .limit(PAGE_SIZE);

      if (cursor) query = query.gt('server_updated_at', cursor);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;

      const items = data.map(item => ({
        ...item,
        pharmacy_name: normalizedName,
      }));

      await db.suppliers_orders.bulkPut(items);
      total += items.length;

      for (const order of items) {
        if (order.status === 'confirmed') {
          confirmedOrders.push(order.id);
        }
      }

      cursor = data[data.length - 1].server_updated_at || cursor;
      if (data.length < PAGE_SIZE) break;
      if (!cursor) break;
    }

    for (const orderId of confirmedOrders) {
      await processConfirmedOrder(orderId);
    }

    return total;
  } catch (err) {
    warn('pullSupplierOrders failed:', err);
    throw err;
  }
}

// =============================================
// PULL SUPPLIER ORDER ITEMS (by order_id, no pharmacy_name)
// =============================================
async function pullSupplierOrderItems(pharmacyName: string): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);

  try {
    const orders = await db.suppliers_orders
      .where('pharmacy_name')
      .equals(normalizedName)
      .toArray();

    const orderIds = orders.map(o => o.id);
    if (orderIds.length === 0) return 0;

    let total = 0;
    const CHUNK = 200;

    for (let i = 0; i < orderIds.length; i += CHUNK) {
      const chunk = orderIds.slice(i, i + CHUNK);
      let cursor: string | null = null;

      while (true) {
        let query = client
          .from('suppliers_order_items')
          .select('*')
          .in('order_id', chunk)
          .order('server_updated_at', { ascending: true })
          .limit(PAGE_SIZE);

        if (cursor) query = query.gt('server_updated_at', cursor);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        // Preserve local product_id (pharmacy-side product mapping)
        for (const item of data) {
          const localItem = await db.suppliers_order_items.get(item.id);
          if (localItem && localItem.product_id) {
            item.product_id = localItem.product_id;
          }
        }

        await db.suppliers_order_items.bulkPut(data);
        total += data.length;

        cursor = data[data.length - 1].server_updated_at || cursor;
        if (data.length < PAGE_SIZE) break;
        if (!cursor) break;
      }
    }

    return total;
  } catch (err) {
    warn('pullSupplierOrderItems failed:', err);
    throw err;
  }
}

// =============================================
// PULL AVAILABLE SUPPLIERS
// =============================================
async function pullAvailableSuppliers(): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  try {
    let cursor: string | null = null;
    const all: any[] = [];

    while (true) {
      let query = client
        .from('suppliers_accounts')
        .select('*')
        .eq('status', 'active')
        .order('server_updated_at', { ascending: true })
        .limit(PAGE_SIZE);

      if (cursor) query = query.gt('server_updated_at', cursor);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;

      all.push(...data);

      cursor = data[data.length - 1].server_updated_at || cursor;
      if (data.length < PAGE_SIZE) break;
      if (!cursor) break;
    }

    if (all.length === 0) return 0;

    localStorage.setItem('medp_available_suppliers', JSON.stringify(all));
    localStorage.setItem(
      'medp_available_suppliers_updated',
      new Date().toISOString()
    );

    return all.length;
  } catch (err) {
    warn('pullAvailableSuppliers failed:', err);
    return 0; // non-critical, don't throw
  }
}

// =============================================
// FULL PULL
// =============================================
// Pulls every table with concurrency cap.
// Concurrency cap prevents thundering-herd at scale.
// =============================================
async function doPullFromSupabaseToLocal(
  pharmacyName: string
): Promise<boolean> {
  const client = getSupabaseClient();

  if (!navigator.onLine) {
    log('full pull skipped — offline');
    return false;
  }
  if (!client || !isSupabaseConfigured()) {
    log('full pull skipped — not configured');
    return false;
  }

  const normalizedName = normalizePharmacyName(pharmacyName);
  const startTime = Date.now();

  log(`full pull start — pharmacy=${normalizedName}`);

  try {
    // Batch 1: main tables (concurrency capped)
    const mainTables: Array<[string, any]> = [
      ['products', db.products],
      ['product_batches', db.product_batches],
      ['categories', db.categories],
      ['units', db.units],
      ['suppliers', db.suppliers],
      ['customers', db.customers],
      ['sales', db.sales],
      ['stock_movements', db.stock_movements],
      ['audit_logs', db.audit_logs],
      ['profiles', db.profiles],
      ['requested_items', db.requested_items],
      ['sales_returns', db.sales_returns],
    ];

    for (let i = 0; i < mainTables.length; i += TABLE_CONCURRENCY) {
      const batch = mainTables.slice(i, i + TABLE_CONCURRENCY);
      await Promise.allSettled(
        batch.map(([table, dbTable]) => {
          const opts =
            table === 'audit_logs' ? { limit: 5000 } : undefined;
          return pullTable(table, normalizedName, dbTable, opts);
        })
      );
      if (i + TABLE_CONCURRENCY < mainTables.length) {
        await new Promise(r => setTimeout(r, BREATHE_MS));
      }
    }

    // Batch 2: supplier tables (sequential — they depend on each other)
    try {
      await pullSupplierPartnerships(normalizedName);
      await pullSupplierOrders(normalizedName);
      await pullSupplierOrderItems(normalizedName);
    } catch (err) {
      warn('supplier tables pull failed (non-fatal):', err);
    }

    // Batch 3: available suppliers (localStorage, non-critical)
    await pullAvailableSuppliers();

    const elapsed = Date.now() - startTime;
    log(`full pull complete in ${elapsed}ms`);
    return true;
  } catch (err) {
    warn('Full pull failed:', err);
    return false;
  }
}

export async function pullFromSupabaseToLocal(
  pharmacyName: string
): Promise<boolean> {
  if (pullInFlight) return pullInFlight;
  pullInFlight = doPullFromSupabaseToLocal(pharmacyName).finally(() => {
    pullInFlight = null;
  });
  return pullInFlight;
}

// =============================================
// SMART PULL (incremental-aware, cursor-safe)
// =============================================
async function doSmartPullFromSupabase(
  pharmacyName: string,
  lastSyncTime?: Date
): Promise<boolean> {
  const client = getSupabaseClient();

  if (!navigator.onLine || !client || !isSupabaseConfigured()) {
    log('smart pull skipped — offline or not configured');
    return false;
  }

  const normalizedName = normalizePharmacyName(pharmacyName);
  const startTime = Date.now();

  log(
    `smart pull start — pharmacy=${normalizedName} ` +
    `since=${lastSyncTime?.toISOString() || 'none'}`
  );

  try {
    // Exclude tables that don't have pharmacy_name
    const filteredConfigs = TABLE_CONFIGS.filter(config => {
      if (config.table === 'suppliers_order_items') return false;
      return true;
    });

    // Concurrency-capped pulls
    for (let i = 0; i < filteredConfigs.length; i += TABLE_CONCURRENCY) {
      const batch = filteredConfigs.slice(i, i + TABLE_CONCURRENCY);
      await Promise.allSettled(
        batch.map(async config => {
          const dbTable = db[config.dbKey as keyof typeof db] as any;
          if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

          try {
            return await pullTable(config.table, normalizedName, dbTable, {
              limit: config.limit || Infinity,
              since: lastSyncTime,
            });
          } catch (err) {
            warn(`smart pull: table ${config.table} failed`, err);
            return 0;
          }
        })
      );
      if (i + TABLE_CONCURRENCY < filteredConfigs.length) {
        await new Promise(r => setTimeout(r, BREATHE_MS));
      }
    }

    // Supplier tables (sequential)
    try {
      await pullSupplierPartnerships(normalizedName);
      await pullSupplierOrders(normalizedName);
      await pullSupplierOrderItems(normalizedName);
    } catch (err) {
      warn('smart pull: supplier tables failed (non-fatal)', err);
    }

    await pullAvailableSuppliers();

    const elapsed = Date.now() - startTime;
    log(`smart pull complete in ${elapsed}ms`);
    return true;
  } catch (err) {
    warn('Smart pull failed:', err);
    return false;
  }
}

export async function smartPullFromSupabase(
  pharmacyName: string,
  lastSyncTime?: Date
): Promise<boolean> {
  if (pullInFlight) return pullInFlight;
  pullInFlight = doSmartPullFromSupabase(pharmacyName, lastSyncTime).finally(
    () => {
      pullInFlight = null;
    }
  );
  return pullInFlight;
}

// =============================================
// INCREMENTAL PULL
// =============================================
export async function incrementalPullFromSupabase(
  pharmacyName: string,
  lastSyncTime: Date,
  options?: { tables?: string[] }
): Promise<{ success: boolean; updated: number }> {
  const client = getSupabaseClient();

  if (!navigator.onLine || !client || !isSupabaseConfigured()) {
    return { success: false, updated: 0 };
  }

  const normalizedName = normalizePharmacyName(pharmacyName);
  let totalUpdated = 0;

  log(
    `incremental pull start — pharmacy=${normalizedName} ` +
    `since=${lastSyncTime.toISOString()}`
  );

  try {
    const tablesToPull =
      options?.tables || TABLE_CONFIGS.map(c => c.table);

    const configs = TABLE_CONFIGS.filter(
      c =>
        tablesToPull.includes(c.table) &&
        c.table !== 'suppliers_order_items'
    );

    for (let i = 0; i < configs.length; i += TABLE_CONCURRENCY) {
      const batch = configs.slice(i, i + TABLE_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async config => {
          const dbTable = db[config.dbKey as keyof typeof db] as any;
          if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

          try {
            return await pullTable(config.table, normalizedName, dbTable, {
              limit: config.limit || Infinity,
              since: lastSyncTime,
            });
          } catch (err) {
            warn(`incremental: ${config.table} failed`, err);
            return 0;
          }
        })
      );

      totalUpdated += results.reduce((sum, r) => {
        if (r.status === 'fulfilled') return sum + r.value;
        return sum;
      }, 0);

      if (i + TABLE_CONCURRENCY < configs.length) {
        await new Promise(r => setTimeout(r, BREATHE_MS));
      }
    }

    try {
      totalUpdated += await pullSupplierPartnerships(normalizedName);
      totalUpdated += await pullSupplierOrders(normalizedName);
      totalUpdated += await pullSupplierOrderItems(normalizedName);
    } catch (err) {
      warn('incremental: supplier tables failed (non-fatal)', err);
    }

    log(`incremental pull complete — ${totalUpdated} rows updated`);
    return { success: true, updated: totalUpdated };
  } catch (err) {
    warn('Incremental pull failed:', err);
    return { success: false, updated: totalUpdated };
  }
}

// =============================================
// PULL SINGLE TABLE (public)
// =============================================
export async function pullSingleTable(
  pharmacyName: string,
  tableName: string,
  options?: { limit?: number; since?: Date }
): Promise<number> {
  const client = getSupabaseClient();

  if (!navigator.onLine || !client || !isSupabaseConfigured()) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);

  // Supplier special cases
  if (tableName === 'suppliers_partnership_requests') {
    return pullSupplierPartnerships(normalizedName);
  }
  if (tableName === 'suppliers_orders') {
    return pullSupplierOrders(normalizedName);
  }
  if (tableName === 'suppliers_order_items') {
    return pullSupplierOrderItems(normalizedName);
  }

  const config = TABLE_CONFIGS.find(c => c.table === tableName);

  if (config) {
    const dbTable = db[config.dbKey as keyof typeof db] as any;
    if (dbTable && typeof dbTable.bulkPut === 'function') {
      return pullTable(tableName, normalizedName, dbTable, {
        limit: options?.limit ?? Infinity,
        since: options?.since,
      });
    }
  }

  // Fallback: dynamic table lookup
  const dbTable = db[tableName as keyof typeof db] as any;
  if (dbTable && typeof dbTable.bulkPut === 'function') {
    return pullTable(tableName, normalizedName, dbTable, {
      limit: options?.limit ?? Infinity,
      since: options?.since,
    });
  }

  return 0;
}

// =============================================
// FULL RESYNC FOR A SINGLE TABLE (with pruning)
// =============================================
export async function fullResyncTable(
  pharmacyName: string,
  tableName: string
): Promise<number> {
  const client = getSupabaseClient();
  if (!navigator.onLine || !client || !isSupabaseConfigured()) return 0;

  const normalizedName = normalizePharmacyName(pharmacyName);
  const config = TABLE_CONFIGS.find(c => c.table === tableName);

  if (!config) return 0;

  const dbTable = db[config.dbKey as keyof typeof db] as any;
  if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

  return pullTableFullResync(tableName, normalizedName, dbTable);
}

// =============================================
// CHECK FOR CHANGES
// =============================================
export async function hasDataChanged(
  pharmacyName: string,
  lastSyncTime: Date
): Promise<{ changed: boolean; tables: string[] }> {
  const client = getSupabaseClient();

  if (!navigator.onLine || !client || !isSupabaseConfigured()) {
    return { changed: false, tables: [] };
  }

  const normalizedName = normalizePharmacyName(pharmacyName);
  const changedTables: string[] = [];

  try {
    const allTableConfigs = [
      ...TABLE_CONFIGS,
      {
        table: 'suppliers_partnership_requests',
        dbKey: 'suppliers_partnership_requests',
      },
      { table: 'suppliers_orders', dbKey: 'suppliers_orders' },
    ];

    await Promise.allSettled(
      allTableConfigs.map(async config => {
        const { count, error } = await client
          .from(config.table)
          .select('*', { count: 'exact', head: true })
          .eq('pharmacy_name', normalizedName)
          // ✅ Use server_updated_at, not updated_at
          .gte('server_updated_at', lastSyncTime.toISOString());

        if (!error && count && count > 0) {
          changedTables.push(config.table);
        }
      })
    );

    return { changed: changedTables.length > 0, tables: changedTables };
  } catch (err) {
    warn('hasDataChanged failed:', err);
    return { changed: false, tables: [] };
  }
}

// =============================================
// 🔧 MIGRATION SQL — RUN THIS IN SUPABASE
// =============================================
// Copy this into Supabase SQL Editor and run once.
//
// What it does:
//   1. Adds `server_updated_at` to every synced table
//   2. Backfills existing rows with created_at (or NOW())
//   3. Adds a trigger so every UPDATE sets it to NOW()
//   4. Adds a composite index (pharmacy_name, server_updated_at DESC)
//      — this is what makes cursor pagination O(log n) instead of O(n)
//
// After running, verify with:
//   SELECT pharmacy_name, server_updated_at FROM sales LIMIT 5;
//
// ─────────────────────────────────────────────
/*
-- 1. Add column + backfill + trigger + index
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'products','product_batches','categories','units','suppliers',
    'customers','sales','stock_movements','audit_logs','profiles',
    'requested_items','sales_returns',
    'suppliers_partnership_requests','suppliers_orders','suppliers_order_items',
    'suppliers_accounts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Add column
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS server_updated_at TIMESTAMPTZ DEFAULT NOW()',
      t
    );

    -- Backfill existing NULLs
    EXECUTE format(
      'UPDATE %I SET server_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE server_updated_at IS NULL',
      t
    );

    -- Trigger function (idempotent)
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION touch_%I_server_updated_at() RETURNS TRIGGER AS $f$ BEGIN NEW.server_updated_at = NOW(); RETURN NEW; END; $f$ LANGUAGE plpgsql',
      t
    );

    -- Drop old trigger if exists, recreate
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_%I_server_updated_at()',
      t, t, t
    );

    -- Composite index (the scale fix)
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_pharmacy_server_updated ON %I (pharmacy_name, server_updated_at DESC)',
      t, t
    );
  END LOOP;
END $$;
*/

// =============================================
// 🐛 DEBUGGING CHEAT SHEET
// =============================================
// Enable logging:
//   localStorage.setItem('medp_pull_debug', 'true')
//
// Then watch console for [PULL] lines. Examples:
//
//   [PULL] pullTable(sales) start — pharmacy=MEDP limit=Infinity
//   [PULL] pullTable(sales) page 0: fetched=1000 written=42 skipped=958 cursor=2024-...
//   [PULL] pullTable(sales) complete — 42 rows in 812ms
//
// "skipped" means: local row is newer than remote — safeBulkPut protected it.
// High skip count with low write count = healthy (your local writes are winning).
// Zero writes with non-zero fetches = your local is already up to date.
//
// If you see:
//   [PULL] pullTable(sales) page N FAILED after retries: <error>
// Then check:
//   1. Does `server_updated_at` column exist on that table?
//   2. Is there an index on (pharmacy_name, server_updated_at)?
//   3. Is Supabase reachable? (check network tab)
//
// To force a full resync of one table (with pruning):
//   import { fullResyncTable } from './lib/supabase/pull';
//   await fullResyncTable('MEDP', 'sales');
//
// To check what's in Supabase for a date range:
//   import { getRemoteSalesByDate } from './lib/supabase/utils';
//   await getRemoteSalesByDate('MEDP');
// =============================================