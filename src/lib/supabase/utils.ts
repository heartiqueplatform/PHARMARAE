// lib/supabase/utils.ts
import { db } from '../db';
import { getSupabaseClient } from './client';

export function normalizePharmacyName(name: string): string {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function mapEntityTypeToTable(entityType: string): string {
    const mapping: Record<string, string> = {
        'sale': 'sales',
        'sale_item': 'sale_items',
        'product': 'products',
        'batch': 'product_batches',
        'purchase': 'purchases',
        'purchase_item': 'purchase_items',
        'stock_movement': 'stock_movements',
        'customer': 'customers',
        'supplier': 'suppliers',
        'category': 'categories',
        'unit': 'units',
        'pharmacy': 'pharmacies',
        'profile': 'profiles',
        'pharmacy_user': 'pharmacy_users',
        'payment': 'payments',
        'return': 'returns',
        'return_item': 'return_items',
        'discount': 'discounts',
        'audit_log': 'audit_logs',
        'requested_item': 'requested_items',
        'sales_return': 'sales_returns',
        'supplier_order': 'suppliers_orders',
        'supplier_order_item': 'suppliers_order_items',
        'supplier_partnership': 'suppliers_partnership_requests',
    };
    return mapping[entityType] || entityType;
}

// =============================================
// TABLE CONFIG
// limit: Infinity means "pull everything, paginated"
// Remove caps unless you explicitly need them (e.g. audit logs)
// =============================================
export const TABLE_CONFIGS: Array<{
    table: string;
    dbKey: string;
    limit: number;
}> = [
        { table: 'products', dbKey: 'products', limit: Infinity },
        { table: 'product_batches', dbKey: 'product_batches', limit: Infinity },
        { table: 'categories', dbKey: 'categories', limit: Infinity },
        { table: 'units', dbKey: 'units', limit: Infinity },
        { table: 'suppliers', dbKey: 'suppliers', limit: Infinity },
        { table: 'customers', dbKey: 'customers', limit: Infinity },

        // 🔥 CRITICAL: sales used to be capped at 500 → this is why rows went missing.
        { table: 'sales', dbKey: 'sales', limit: Infinity },

        { table: 'stock_movements', dbKey: 'stock_movements', limit: Infinity },

        // Audit logs can grow huge — keep a sane cap, but high enough for a month of work.
        { table: 'audit_logs', dbKey: 'audit_logs', limit: 10000 },

        { table: 'profiles', dbKey: 'profiles', limit: Infinity },
        { table: 'requested_items', dbKey: 'requested_items', limit: Infinity },
        { table: 'sales_returns', dbKey: 'sales_returns', limit: Infinity },

        // Supplier tables (partnerships + orders have pharmacy_name;
        // items are pulled via order_id — see pull.ts, not through this config)
        {
            table: 'suppliers_partnership_requests',
            dbKey: 'suppliers_partnership_requests',
            limit: Infinity,
        },
        {
            table: 'suppliers_orders',
            dbKey: 'suppliers_orders',
            limit: Infinity,
        },
    ];

// Tables that don't have a `pharmacy_name` column
export const TABLES_WITHOUT_PHARMACY_NAME = new Set<string>([
    'suppliers_order_items',
    'suppliers_accounts',
]);

// =============================================
// Cache for table existence checks
// =============================================
const tableExistsCache: Record<string, boolean> = {};
const TABLE_CACHE_TTL = 60000; // 1 minute
const tableExistsCacheTime: Record<string, number> = {};

// =============================================
// Clear all local pharmacy data (multi-table)
// =============================================
export async function clearPharmacyData(pharmacyName: string): Promise<void> {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const tables = [
        'products', 'product_batches', 'categories', 'units',
        'suppliers', 'customers', 'sales',
        'stock_movements', 'audit_logs', 'profiles',
        'requested_items', 'sales_returns',
        'suppliers_partnership_requests',
        'suppliers_orders',
        'suppliers_order_items',
        'customers_loyalty_transactions',
        'customers_rewards_catalog',
        'customers_loyalty_card_orders',
    ];

    const deletePromises = tables.map(async (tableName) => {
        const table = db[tableName as keyof typeof db] as any;
        if (!table || typeof table.where !== 'function') {
            return { table: tableName, deleted: false };
        }

        try {
            if (TABLES_WITHOUT_PHARMACY_NAME.has(tableName)) {
                // No pharmacy_name — cannot filter, so skip.
                return { table: tableName, deleted: false };
            }
            await table.where('pharmacy_name').equals(normalizedName).delete();
            return { table: tableName, deleted: true };
        } catch {
            return { table: tableName, deleted: false };
        }
    });

    await Promise.all(deletePromises);
}

// =============================================
// Check if a pharmacy has any products in Supabase
// =============================================
export async function checkDataExistsInSupabase(
    pharmacyName: string
): Promise<{ exists: boolean; count: number }> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) {
        return { exists: false, count: 0 };
    }

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        const { count, error } = await client
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_name', normalizedName);

        if (error) return { exists: false, count: 0 };

        return { exists: (count || 0) > 0, count: count || 0 };
    } catch {
        return { exists: false, count: 0 };
    }
}

// =============================================
// Table existence check (with TTL cache)
// =============================================
export async function tableExistsInSupabase(tableName: string): Promise<boolean> {
    const cacheKey = tableName;
    const cachedAt = tableExistsCacheTime[cacheKey];

    if (
        tableExistsCache[cacheKey] !== undefined &&
        cachedAt &&
        Date.now() - cachedAt < TABLE_CACHE_TTL
    ) {
        return tableExistsCache[cacheKey];
    }

    const client = getSupabaseClient();
    if (!client) return false;

    try {
        const { error } = await client
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .limit(1);

        if (error) {
            if (error.message && error.message.includes('does not exist')) {
                tableExistsCache[cacheKey] = false;
                tableExistsCacheTime[cacheKey] = Date.now();
                return false;
            }
            return true;
        }

        tableExistsCache[cacheKey] = true;
        tableExistsCacheTime[cacheKey] = Date.now();
        return true;
    } catch {
        return false;
    }
}

// =============================================
// Row count with caching
// =============================================
let rowCountCache: Record<string, { count: number; timestamp: number }> = {};
const ROW_COUNT_CACHE_TTL = 30000; // 30 seconds

export async function getTableRowCount(
    pharmacyName: string,
    tableName: string
): Promise<number> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const cacheKey = `${normalizedName}_${tableName}`;

    const cached = rowCountCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < ROW_COUNT_CACHE_TTL) {
        return cached.count;
    }

    const client = getSupabaseClient();
    if (!client || !navigator.onLine) return 0;

    try {
        let query = client
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (!TABLES_WITHOUT_PHARMACY_NAME.has(tableName)) {
            query = query.eq('pharmacy_name', normalizedName);
        }

        const { count, error } = await query;
        if (error) return 0;

        const result = count || 0;
        rowCountCache[cacheKey] = { count: result, timestamp: Date.now() };
        return result;
    } catch {
        return 0;
    }
}

// =============================================
// All table counts in parallel (incl. suppliers)
// =============================================
export async function getAllTableCounts(
    pharmacyName: string
): Promise<Record<string, number>> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const client = getSupabaseClient();

    if (!client || !navigator.onLine) return {};

    const allTables = [
        ...TABLE_CONFIGS.map(c => c.table),
        'suppliers_order_items',
    ];

    try {
        const results = await Promise.allSettled(
            allTables.map(async (table) => {
                let query = client
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (!TABLES_WITHOUT_PHARMACY_NAME.has(table)) {
                    query = query.eq('pharmacy_name', normalizedName);
                }

                const { count, error } = await query;
                if (error) return { table, count: 0 };
                return { table, count: count || 0 };
            })
        );

        const counts: Record<string, number> = {};
        for (const result of results) {
            if (result.status === 'fulfilled') {
                counts[result.value.table] = result.value.count;
            }
        }
        return counts;
    } catch {
        return {};
    }
}

// =============================================
// Check for changes since lastSyncTime
// NOTE: fixed race — use local array per call
// =============================================
export async function checkForChanges(
    pharmacyName: string,
    lastSyncTime: Date
): Promise<{ hasChanges: boolean; tables: string[] }> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const client = getSupabaseClient();

    if (!client || !navigator.onLine) {
        return { hasChanges: false, tables: [] };
    }

    try {
        const tablesToCheck = TABLE_CONFIGS.filter(
            c => !TABLES_WITHOUT_PHARMACY_NAME.has(c.table)
        );

        const results = await Promise.allSettled(
            tablesToCheck.map(async (config) => {
                const { count, error } = await client
                    .from(config.table)
                    .select('*', { count: 'exact', head: true })
                    .eq('pharmacy_name', normalizedName)
                    .gte('updated_at', lastSyncTime.toISOString());

                if (!error && count && count > 0) {
                    return config.table;
                }
                return null;
            })
        );

        const changedTables: string[] = [];
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                changedTables.push(r.value);
            }
        }

        return { hasChanges: changedTables.length > 0, tables: changedTables };
    } catch {
        return { hasChanges: false, tables: [] };
    }
}

// =============================================
// Data size estimate
// =============================================
export async function getDataSizeEstimate(
    pharmacyName: string
): Promise<{ totalRecords: number; tableSizes: Record<string, number> }> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const tableSizes: Record<string, number> = {};
    let totalRecords = 0;

    try {
        const counts = await getAllTableCounts(normalizedName);
        for (const [table, count] of Object.entries(counts)) {
            tableSizes[table] = count;
            totalRecords += count;
        }
        return { totalRecords, tableSizes };
    } catch {
        return { totalRecords: 0, tableSizes: {} };
    }
}

// =============================================
// Clear caches
// =============================================
export function clearUtilsCache(): void {
    Object.keys(tableExistsCache).forEach(k => delete tableExistsCache[k]);
    Object.keys(tableExistsCacheTime).forEach(
        k => delete tableExistsCacheTime[k]
    );
    rowCountCache = {};
}

// =============================================
// Batched record fetch (paginated, ordered)
// ALWAYS orders by created_at DESC by default
// so results are stable across calls
// =============================================
export async function getTableRecordsBatch(
    pharmacyName: string,
    tableName: string,
    options?: {
        limit?: number;
        offset?: number;
        orderBy?: string;
        orderDir?: 'asc' | 'desc';
        since?: Date;
    }
): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) return [];

    const normalizedName = normalizePharmacyName(pharmacyName);
    const limit = options?.limit ?? 500;
    const offset = options?.offset ?? 0;
    const orderBy = options?.orderBy ?? 'created_at';
    const ascending = options?.orderDir === 'asc';

    try {
        let query = client
            .from(tableName)
            .select('*')
            .order(orderBy, { ascending })
            .range(offset, offset + limit - 1);

        if (!TABLES_WITHOUT_PHARMACY_NAME.has(tableName)) {
            query = query.eq('pharmacy_name', normalizedName);
        }

        if (options?.since) {
            query = query.gte('updated_at', options.since.toISOString());
        }

        const { data, error } = await query;
        if (error || !data) return [];
        return data;
    } catch {
        return [];
    }
}

// =============================================
// DEBUG: Sales-by-date summary
// Useful to confirm which dates have landed locally
// vs. what exists in Supabase
// =============================================
export async function getLocalSalesByDate(
    pharmacyName: string
): Promise<Record<string, number>> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const rows = await db.sales
        .where('pharmacy_name')
        .equals(normalizedName)
        .toArray();

    const byDate: Record<string, number> = {};
    for (const s of rows) {
        const d = (s.sale_date || s.created_at || '').slice(0, 10) || 'unknown';
        byDate[d] = (byDate[d] || 0) + 1;
    }
    return byDate;
}

export async function getRemoteSalesByDate(
    pharmacyName: string
): Promise<Record<string, number>> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) return {};

    const normalizedName = normalizePharmacyName(pharmacyName);
    const byDate: Record<string, number> = {};

    let from = 0;
    const PAGE = 1000;

    try {
        while (true) {
            const { data, error } = await client
                .from('sales')
                .select('sale_date, created_at')
                .eq('pharmacy_name', normalizedName)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE - 1);

            if (error || !data || data.length === 0) break;

            for (const s of data) {
                const d =
                    (s.sale_date || s.created_at || '').slice(0, 10) ||
                    'unknown';
                byDate[d] = (byDate[d] || 0) + 1;
            }

            if (data.length < PAGE) break;
            from += PAGE;
        }

        return byDate;
    } catch {
        return {};
    }
}

// =============================================
// Last sync time helpers
// =============================================
export function getLastSyncTime(pharmacyName: string): Date | null {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const stored = localStorage.getItem(`medp_last_sync_${normalizedName}`);
    if (!stored) return null;
    const d = new Date(stored);
    return isNaN(d.getTime()) ? null : d;
}

export function setLastSyncTime(pharmacyName: string, time: Date): void {
    const normalizedName = normalizePharmacyName(pharmacyName);
    localStorage.setItem(
        `medp_last_sync_${normalizedName}`,
        time.toISOString()
    );
}