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

export const TABLE_CONFIGS = [
    { table: 'products', dbKey: 'products', limit: 1000 },
    { table: 'product_batches', dbKey: 'product_batches', limit: 1000 },
    { table: 'categories', dbKey: 'categories', limit: 500 },
    { table: 'units', dbKey: 'units', limit: 500 },
    { table: 'suppliers', dbKey: 'suppliers', limit: 500 },
    { table: 'customers', dbKey: 'customers', limit: 500 },
    { table: 'sales', dbKey: 'sales', limit: 500 },
    { table: 'stock_movements', dbKey: 'stock_movements', limit: 500 },
    { table: 'audit_logs', dbKey: 'audit_logs', limit: 500 },
    { table: 'profiles', dbKey: 'profiles', limit: 500 },
    { table: 'requested_items', dbKey: 'requested_items', limit: 500 },
    { table: 'sales_returns', dbKey: 'sales_returns', limit: 500 },
    {
        table: 'suppliers_partnership_requests',
        dbKey: 'suppliers_partnership_requests',
        limit: 500,
    },
    {
        table: 'suppliers_orders',
        dbKey: 'suppliers_orders',
        limit: 500,
    },

];

// Cache for table existence checks
const tableExistsCache: Record<string, boolean> = {};
const TABLE_CACHE_TTL = 60000; // 1 minute

export async function clearPharmacyData(pharmacyName: string): Promise<void> {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const tables = [
        'products', 'product_batches', 'categories', 'units',
        'suppliers', 'customers', 'sales',
        'stock_movements', 'audit_logs', 'profiles',
        'requested_items', 'sales_returns',
    ];

    // Use parallel deletion for speed
    const deletePromises = tables.map(async (tableName) => {
        const table = db[tableName as keyof typeof db] as any;
        if (table && typeof table.where === 'function') {
            try {
                await table.where('pharmacy_name').equals(normalizedName).delete();
                return { table: tableName, deleted: true };
            } catch (err) {
                return { table: tableName, deleted: false };
            }
        }
        return { table: tableName, deleted: false };
    });

    await Promise.all(deletePromises);
}

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
            return { exists: false, count: 0 };
        }

        return { exists: (count || 0) > 0, count: count || 0 };
    } catch (err) {
        return { exists: false, count: 0 };
    }
}

// =============================================
// OPTIMIZED: Check if table exists in Supabase
// =============================================
export async function tableExistsInSupabase(tableName: string): Promise<boolean> {
    // Check cache first
    const cacheKey = tableName;
    if (tableExistsCache[cacheKey]) {
        return true;
    }

    const client = getSupabaseClient();
    if (!client) return false;

    try {
        const { error } = await client
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .limit(1);

        if (error) {
            // If error is about relation not existing, return false
            if (error.message && error.message.includes('does not exist')) {
                return false;
            }
            // Other errors might mean table exists but query failed
            return true;
        }

        // Cache the result
        tableExistsCache[cacheKey] = true;
        return true;
    } catch (err) {
        return false;
    }
}

// =============================================
// OPTIMIZED: Get table row count with caching
// =============================================
let rowCountCache: Record<string, { count: number; timestamp: number }> = {};
const ROW_COUNT_CACHE_TTL = 30000; // 30 seconds

export async function getTableRowCount(
    pharmacyName: string,
    tableName: string
): Promise<number> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const cacheKey = `${normalizedName}_${tableName}`;

    // Check cache
    const cached = rowCountCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < ROW_COUNT_CACHE_TTL) {
        return cached.count;
    }

    const client = getSupabaseClient();
    if (!client || !navigator.onLine) {
        return 0;
    }

    try {
        const { count, error } = await client
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_name', normalizedName);

        if (error) {
            return 0;
        }

        const result = count || 0;

        // Update cache
        rowCountCache[cacheKey] = {
            count: result,
            timestamp: Date.now()
        };

        return result;
    } catch (err) {
        return 0;
    }
}

// =============================================
// OPTIMIZED: Get all table counts in parallel
// =============================================
export async function getAllTableCounts(
    pharmacyName: string
): Promise<Record<string, number>> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const client = getSupabaseClient();

    if (!client || !navigator.onLine) {
        return {};
    }

    try {
        const results = await Promise.allSettled(
            TABLE_CONFIGS.map(async (config) => {
                const { count, error } = await client
                    .from(config.table)
                    .select('*', { count: 'exact', head: true })
                    .eq('pharmacy_name', normalizedName);

                if (error) {
                    return { table: config.table, count: 0 };
                }

                return { table: config.table, count: count || 0 };
            })
        );

        const counts: Record<string, number> = {};
        for (const result of results) {
            if (result.status === 'fulfilled') {
                counts[result.value.table] = result.value.count;
            }
        }

        return counts;
    } catch (err) {
        return {};
    }
}

// =============================================
// OPTIMIZED: Check for data changes in any table
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

    const changedTables: string[] = [];

    try {
        const checks = TABLE_CONFIGS.map(async (config) => {
            const { count, error } = await client
                .from(config.table)
                .select('*', { count: 'exact', head: true })
                .eq('pharmacy_name', normalizedName)
                .gte('updated_at', lastSyncTime.toISOString());

            if (!error && count && count > 0) {
                changedTables.push(config.table);
            }
            return { table: config.table, count: count || 0 };
        });

        await Promise.allSettled(checks);
        return { hasChanges: changedTables.length > 0, tables: changedTables };
    } catch (err) {
        return { hasChanges: false, tables: [] };
    }
}

// =============================================
// OPTIMIZED: Get data size estimates
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
    } catch (err) {
        return { totalRecords: 0, tableSizes: {} };
    }
}

// =============================================
// OPTIMIZED: Clear cache
// =============================================
export function clearUtilsCache(): void {
    Object.keys(tableExistsCache).forEach(key => delete tableExistsCache[key]);
    rowCountCache = {};
}

// =============================================
// OPTIMIZED: Batch get records with limit
// =============================================
export async function getTableRecordsBatch(
    pharmacyName: string,
    tableName: string,
    options?: { limit?: number; offset?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }
): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) {
        return [];
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    const limit = options?.limit || 500;
    const offset = options?.offset || 0;

    try {
        let query = client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .range(offset, offset + limit - 1);

        if (options?.orderBy) {
            query = query.order(options.orderBy, {
                ascending: options.orderDir === 'asc'
            });
        }

        const { data, error } = await query;

        if (error || !data) {
            return [];
        }

        return data;
    } catch (err) {
        return [];
    }
}

// =============================================
// OPTIMIZED: Get last sync time from multiple sources
// =============================================
export function getLastSyncTime(pharmacyName: string): Date | null {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const stored = localStorage.getItem(`medp_last_sync_${normalizedName}`);
    if (stored) {
        return new Date(stored);
    }
    return null;
}

// =============================================
// OPTIMIZED: Set last sync time
// =============================================
export function setLastSyncTime(pharmacyName: string, time: Date): void {
    const normalizedName = normalizePharmacyName(pharmacyName);
    localStorage.setItem(`medp_last_sync_${normalizedName}`, time.toISOString());
}