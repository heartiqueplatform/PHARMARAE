// lib/supabase/pull.ts — v2 (cursor-based, safeBulkPut, server_updated_at)
import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';
import { genUUID } from '../../utils/helpers';

const PAGE_SIZE = 1000;
const TABLE_CONCURRENCY = 3;
const BREATHE_MS = 50;

let pullInFlight: Promise<boolean> | null = null;

// =============================================
// DEBUG LOGGING (toggle via localStorage)
//   localStorage.setItem('medp_pull_debug', 'true')
// =============================================
function debugEnabled(): boolean {
    try { return localStorage.getItem('medp_pull_debug') === 'true'; }
    catch { return false; }
}
function log(...args: any[]) { if (debugEnabled()) console.log('[PULL]', ...args); }
function warn(...args: any[]) { console.warn('[PULL]', ...args); }

// =============================================
// SALE ROW NORMALIZER
// =============================================
function normalizeSaleRow(item: any, normalizedName: string) {
    return {
        ...item,
        pharmacy_name: normalizedName,
        sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
    };
}

function transformRow(tableName: string, item: any, normalizedName: string) {
    if (tableName === 'sales') return normalizeSaleRow(item, normalizedName);
    return { ...item, pharmacy_name: normalizedName };
}

// =============================================
// SAFE BULK PUT — only write if remote is newer
// =============================================
async function safeBulkPut(
    tableName: string,
    dbTable: any,
    rows: any[]
): Promise<{ written: number; skipped: number }> {
    if (rows.length === 0) return { written: 0, skipped: 0 };

    let written = 0, skipped = 0;

    try {
        await db.transaction('rw', dbTable, async () => {
            const ids = rows.map(r => r.id).filter(Boolean);
            if (ids.length === 0) {
                await dbTable.bulkPut(rows);
                written = rows.length;
                return;
            }

            const existing: any[] = await dbTable.bulkGet(ids);
            const existingMap = new Map<string, any>();
            for (const row of existing) if (row && row.id) existingMap.set(row.id, row);

            const toWrite: any[] = [];
            for (const remote of rows) {
                const local = existingMap.get(remote.id);
                if (!local) { toWrite.push(remote); continue; }

                const localTs = local.server_updated_at || local.updated_at || local.created_at || '1970-01-01T00:00:00.000Z';
                const remoteTs = remote.server_updated_at || remote.updated_at || remote.created_at || '1970-01-01T00:00:00.000Z';

                if (remoteTs > localTs) toWrite.push(remote);
                else { skipped++; log(`${tableName}: skip id=${remote.id} (local >= remote)`); }
            }

            if (toWrite.length > 0) {
                await dbTable.bulkPut(toWrite);
                written = toWrite.length;
            }
        });
    } catch (err) {
        warn(`${tableName}: safeBulkPut failed, fallback to plain bulkPut`, err);
        await dbTable.bulkPut(rows);
        written = rows.length;
    }

    return { written, skipped };
}

// =============================================
// PULL SINGLE TABLE — CURSOR ON server_updated_at
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

    log(`pullTable(${tableName}) start — pharmacy=${normalizedName} since=${since?.toISOString() || 'none'}`);

    while (total < maxRows) {
        const remaining = maxRows === Infinity ? PAGE_SIZE : Math.min(PAGE_SIZE, maxRows - total);

        let query = client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .order('server_updated_at', { ascending: true })
            .limit(remaining);

        if (cursor) {
            query = query.gt('server_updated_at', cursor);
        } else if (since) {
            query = query.gte('server_updated_at', since.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            warn(`pullTable(${tableName}) page ${pageIndex} FAILED:`, error.message);
            throw new Error(`pullTable(${tableName}): ${error.message}`);
        }

        if (!data || data.length === 0) break;

        const transformed = data.map(item => transformRow(tableName, item, normalizedName));
        const { written, skipped } = await safeBulkPut(tableName, dbTable, transformed);

        total += written;

        const lastRow = data[data.length - 1];
        cursor = lastRow.server_updated_at || cursor;

        log(`pullTable(${tableName}) page ${pageIndex}: fetched=${data.length} written=${written} skipped=${skipped} cursor=${cursor}`);
        pageIndex++;

        if (data.length < remaining) break;
        if (!cursor) { warn(`pullTable(${tableName}) cursor did not advance — abort`); break; }
    }

    log(`pullTable(${tableName}) complete — ${total} rows in ${Date.now() - startTime}ms`);
    return total;
}

// =============================================
// FULL RESYNC (prune orphans)
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

    try {
        while (true) {
            let query = client
                .from(tableName)
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .order('server_updated_at', { ascending: true })
                .limit(PAGE_SIZE);

            if (cursor) query = query.gt('server_updated_at', cursor);

            const { data, error } = await query;
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) break;

            const transformed = data.map(item => transformRow(tableName, item, normalizedName));
            for (const it of transformed) if (it.id) remoteIds.add(it.id);

            const { written } = await safeBulkPut(tableName, dbTable, transformed);
            total += written;

            cursor = data[data.length - 1].server_updated_at || cursor;
            if (data.length < PAGE_SIZE) break;
            if (!cursor) break;
        }

        if (remoteIds.size > 0) {
            const localKeys: string[] = await dbTable.where('pharmacy_name').equals(normalizedName).primaryKeys();
            const toDelete = localKeys.filter((id: string) => !remoteIds.has(id));
            if (toDelete.length > 0) await dbTable.bulkDelete(toDelete);
        }
    } catch (err) {
        warn(`pullTableFullResync(${tableName}) error:`, err);
    }

    return total;
}

// =============================================
// SUPPLIER-SPECIFIC PULLERS
// =============================================
async function processConfirmedOrder(orderId: string) {
    try {
        const order = await db.suppliers_orders.get(orderId);
        if (!order || order.delivery_info?.stock_added) return;

        const items = await db.suppliers_order_items.where('order_id').equals(orderId).toArray();
        const pharmacyName = order.pharmacy_name;

        for (const item of items) {
            if (!item.product_id || item.accepted_quantity <= 0) continue;
            const product = await db.products.get(item.product_id);
            if (!product) continue;

            await db.products.update(item.product_id, {
                quantity: (product.quantity || 0) + item.accepted_quantity,
                updated_at: new Date().toISOString(),
            });

            await db.stock_movements.put({
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
                reason: `Order #${order.order_number} confirmed`,
                created_at: new Date().toISOString(),
            });
        }

        await db.suppliers_orders.update(orderId, {
            'delivery_info.stock_added': true,
            'delivery_info.stock_added_at': new Date().toISOString(),
        });
    } catch (err) { warn('processConfirmedOrder failed:', err); }
}

async function pullSupplierPartnerships(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;
    const normalizedName = normalizePharmacyName(pharmacyName);
    let cursor: string | null = null, total = 0;

    while (true) {
        let q = client.from('suppliers_partnership_requests').select('*')
            .eq('pharmacy_name', normalizedName)
            .order('server_updated_at', { ascending: true })
            .limit(PAGE_SIZE);
        if (cursor) q = q.gt('server_updated_at', cursor);

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        const items = data.map(i => ({ ...i, pharmacy_name: normalizedName }));
        await db.suppliers_partnership_requests.bulkPut(items);
        total += items.length;
        cursor = data[data.length - 1].server_updated_at || cursor;
        if (data.length < PAGE_SIZE || !cursor) break;
    }
    return total;
}

async function pullSupplierOrders(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;
    const normalizedName = normalizePharmacyName(pharmacyName);
    let cursor: string | null = null, total = 0;
    const confirmed: string[] = [];

    while (true) {
        let q = client.from('suppliers_orders').select('*')
            .eq('pharmacy_name', normalizedName)
            .order('server_updated_at', { ascending: true })
            .limit(PAGE_SIZE);
        if (cursor) q = q.gt('server_updated_at', cursor);

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        const items = data.map(i => ({ ...i, pharmacy_name: normalizedName }));
        await db.suppliers_orders.bulkPut(items);
        total += items.length;
        for (const o of items) if (o.status === 'confirmed') confirmed.push(o.id);
        cursor = data[data.length - 1].server_updated_at || cursor;
        if (data.length < PAGE_SIZE || !cursor) break;
    }

    for (const id of confirmed) await processConfirmedOrder(id);
    return total;
}

async function pullSupplierOrderItems(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;
    const normalizedName = normalizePharmacyName(pharmacyName);
    const orders = await db.suppliers_orders.where('pharmacy_name').equals(normalizedName).toArray();
    const orderIds = orders.map(o => o.id);
    if (orderIds.length === 0) return 0;

    let total = 0;
    const CHUNK = 200;

    for (let i = 0; i < orderIds.length; i += CHUNK) {
        const chunk = orderIds.slice(i, i + CHUNK);
        let cursor: string | null = null;
        while (true) {
            let q = client.from('suppliers_order_items').select('*')
                .in('order_id', chunk)
                .order('server_updated_at', { ascending: true })
                .limit(PAGE_SIZE);
            if (cursor) q = q.gt('server_updated_at', cursor);

            const { data, error } = await q;
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) break;

            for (const item of data) {
                const local = await db.suppliers_order_items.get(item.id);
                if (local?.product_id) item.product_id = local.product_id;
            }
            await db.suppliers_order_items.bulkPut(data);
            total += data.length;
            cursor = data[data.length - 1].server_updated_at || cursor;
            if (data.length < PAGE_SIZE || !cursor) break;
        }
    }
    return total;
}

async function pullAvailableSuppliers(): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;
    let cursor: string | null = null;
    const all: any[] = [];

    while (true) {
        let q = client.from('suppliers_accounts').select('*')
            .eq('status', 'active')
            .order('server_updated_at', { ascending: true })
            .limit(PAGE_SIZE);
        if (cursor) q = q.gt('server_updated_at', cursor);

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        all.push(...data);
        cursor = data[data.length - 1].server_updated_at || cursor;
        if (data.length < PAGE_SIZE || !cursor) break;
    }

    if (all.length === 0) return 0;
    localStorage.setItem('medp_available_suppliers', JSON.stringify(all));
    localStorage.setItem('medp_available_suppliers_updated', new Date().toISOString());
    return all.length;
}

// =============================================
// FULL PULL
// =============================================
async function doPullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!navigator.onLine) return false;
    if (!client || !isSupabaseConfigured()) return false;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
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
            await Promise.allSettled(batch.map(([t, dt]) => {
                const opts = t === 'audit_logs' ? { limit: 5000 } : undefined;
                return pullTable(t, normalizedName, dt, opts);
            }));
            if (i + TABLE_CONCURRENCY < mainTables.length) {
                await new Promise(r => setTimeout(r, BREATHE_MS));
            }
        }

        try {
            await pullSupplierPartnerships(normalizedName);
            await pullSupplierOrders(normalizedName);
            await pullSupplierOrderItems(normalizedName);
        } catch (e) { warn('supplier tables pull failed (non-fatal):', e); }

        await pullAvailableSuppliers();
        return true;
    } catch (err) {
        warn('Full pull failed:', err);
        return false;
    }
}

export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
    if (pullInFlight) return pullInFlight;
    pullInFlight = doPullFromSupabaseToLocal(pharmacyName).finally(() => { pullInFlight = null; });
    return pullInFlight;
}

// =============================================
// SMART PULL
// =============================================
async function doSmartPullFromSupabase(pharmacyName: string, lastSyncTime?: Date): Promise<boolean> {
    const client = getSupabaseClient();
    if (!navigator.onLine || !client || !isSupabaseConfigured()) return false;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        const filteredConfigs = TABLE_CONFIGS.filter(c => c.table !== 'suppliers_order_items');

        for (let i = 0; i < filteredConfigs.length; i += TABLE_CONCURRENCY) {
            const batch = filteredConfigs.slice(i, i + TABLE_CONCURRENCY);
            await Promise.allSettled(batch.map(async config => {
                const dbTable = db[config.dbKey as keyof typeof db] as any;
                if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;
                try {
                    return await pullTable(config.table, normalizedName, dbTable, {
                        limit: config.limit || Infinity,
                        since: lastSyncTime,
                    });
                } catch (e) { warn(`smart pull ${config.table} failed:`, e); return 0; }
            }));
            if (i + TABLE_CONCURRENCY < filteredConfigs.length) {
                await new Promise(r => setTimeout(r, BREATHE_MS));
            }
        }

        try {
            await pullSupplierPartnerships(normalizedName);
            await pullSupplierOrders(normalizedName);
            await pullSupplierOrderItems(normalizedName);
        } catch (e) { warn('smart pull supplier tables failed:', e); }

        await pullAvailableSuppliers();
        return true;
    } catch (err) {
        warn('Smart pull failed:', err);
        return false;
    }
}

export async function smartPullFromSupabase(pharmacyName: string, lastSyncTime?: Date): Promise<boolean> {
    if (pullInFlight) return pullInFlight;
    pullInFlight = doSmartPullFromSupabase(pharmacyName, lastSyncTime).finally(() => { pullInFlight = null; });
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
    if (!navigator.onLine || !client || !isSupabaseConfigured()) return { success: false, updated: 0 };

    const normalizedName = normalizePharmacyName(pharmacyName);
    let totalUpdated = 0;

    try {
        const tablesToPull = options?.tables || TABLE_CONFIGS.map(c => c.table);
        const configs = TABLE_CONFIGS.filter(c => tablesToPull.includes(c.table) && c.table !== 'suppliers_order_items');

        for (let i = 0; i < configs.length; i += TABLE_CONCURRENCY) {
            const batch = configs.slice(i, i + TABLE_CONCURRENCY);
            const results = await Promise.allSettled(batch.map(async config => {
                const dbTable = db[config.dbKey as keyof typeof db] as any;
                if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;
                try {
                    return await pullTable(config.table, normalizedName, dbTable, {
                        limit: config.limit || Infinity,
                        since: lastSyncTime,
                    });
                } catch (e) { warn(`incremental ${config.table} failed:`, e); return 0; }
            }));
            totalUpdated += results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value : 0), 0);
            if (i + TABLE_CONCURRENCY < configs.length) await new Promise(r => setTimeout(r, BREATHE_MS));
        }

        try {
            totalUpdated += await pullSupplierPartnerships(normalizedName);
            totalUpdated += await pullSupplierOrders(normalizedName);
            totalUpdated += await pullSupplierOrderItems(normalizedName);
        } catch (e) { warn('incremental supplier tables failed:', e); }

        return { success: true, updated: totalUpdated };
    } catch (err) {
        warn('Incremental pull failed:', err);
        return { success: false, updated: totalUpdated };
    }
}

// =============================================
// PUBLIC SINGLE TABLE
// =============================================
export async function pullSingleTable(
    pharmacyName: string,
    tableName: string,
    options?: { limit?: number; since?: Date }
): Promise<number> {
    const client = getSupabaseClient();
    if (!navigator.onLine || !client || !isSupabaseConfigured()) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);

    if (tableName === 'suppliers_partnership_requests') return pullSupplierPartnerships(normalizedName);
    if (tableName === 'suppliers_orders') return pullSupplierOrders(normalizedName);
    if (tableName === 'suppliers_order_items') return pullSupplierOrderItems(normalizedName);

    const config = TABLE_CONFIGS.find(c => c.table === tableName);
    const dbTable = config
        ? (db[config.dbKey as keyof typeof db] as any)
        : (db[tableName as keyof typeof db] as any);

    if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

    return pullTable(tableName, normalizedName, dbTable, {
        limit: options?.limit ?? Infinity,
        since: options?.since,
    });
}

// =============================================
// FULL RESYNC ONE TABLE
// =============================================
export async function fullResyncTable(pharmacyName: string, tableName: string): Promise<number> {
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
    if (!navigator.onLine || !client || !isSupabaseConfigured()) return { changed: false, tables: [] };

    const normalizedName = normalizePharmacyName(pharmacyName);
    const changedTables: string[] = [];

    try {
        const allTableConfigs = [
            ...TABLE_CONFIGS,
            { table: 'suppliers_partnership_requests', dbKey: 'suppliers_partnership_requests' },
            { table: 'suppliers_orders', dbKey: 'suppliers_orders' },
        ];

        await Promise.allSettled(allTableConfigs.map(async config => {
            const { count, error } = await client
                .from(config.table)
                .select('*', { count: 'exact', head: true })
                .eq('pharmacy_name', normalizedName)
                .gte('server_updated_at', lastSyncTime.toISOString());
            if (!error && count && count > 0) changedTables.push(config.table);
        }));

        return { changed: changedTables.length > 0, tables: changedTables };
    } catch (err) {
        warn('hasDataChanged failed:', err);
        return { changed: false, tables: [] };
    }
}