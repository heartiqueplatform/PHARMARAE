// lib/supabase/pull.ts
import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';

// Pull a single table with filtering - OPTIMIZED with bulk operations
async function pullTable<T>(
    tableName: string,
    pharmacyName: string,
    dbTable: any,
    options?: { limit?: number }
): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const limit = options?.limit || 1000;
    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        // Try filtered query first
        let { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .limit(limit);

        // If filtered fails, pull all and filter locally
        if (error) {
            const { data: allData } = await client
                .from(tableName)
                .select('*')
                .limit(limit);

            if (allData && allData.length > 0) {
                data = allData.filter((item: any) =>
                    normalizePharmacyName(item.pharmacy_name) === normalizedName
                );
            } else {
                data = [];
            }
        }

        if (!data || data.length === 0) {
            return 0;
        }

        // ✅ FIXED: For sales table, ensure sale_id is preserved
        let itemsWithPharmacy = data.map(item => ({
            ...item,
            pharmacy_name: normalizedName
        }));

        // ✅ If this is the sales table, ensure sale_id exists
        if (tableName === 'sales') {
            itemsWithPharmacy = itemsWithPharmacy.map(item => ({
                ...item,
                sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
            }));
        }

        // OPTIMIZATION: Use bulk delete instead of individual deletes
        await dbTable.where('pharmacy_name').equals(normalizedName).delete();

        // OPTIMIZATION: Use bulkPut for batch insert (much faster)
        if (itemsWithPharmacy.length > 0) {
            await dbTable.bulkPut(itemsWithPharmacy);
        }

        return data.length;
    } catch (err) {
        return 0;
    }
}

// Main pull function - pulls all tables in parallel
export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine) {
        return false;
    }

    if (!client || !isSupabaseConfigured()) {
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        // Pull all tables in parallel for speed
        const results = await Promise.allSettled([
            pullTable('products', normalizedName, db.products),
            pullTable('product_batches', normalizedName, db.product_batches),
            pullTable('categories', normalizedName, db.categories),
            pullTable('units', normalizedName, db.units),
            pullTable('suppliers', normalizedName, db.suppliers),
            pullTable('customers', normalizedName, db.customers),
            pullTable('sales', normalizedName, db.sales, { limit: 500 }),
            pullTable('stock_movements', normalizedName, db.stock_movements, { limit: 500 }),
            pullTable('audit_logs', normalizedName, db.audit_logs, { limit: 500 }),
            pullTable('profiles', normalizedName, db.profiles),
            pullTable('requested_items', normalizedName, db.requested_items, { limit: 500 }),
            pullTable('sales_returns', normalizedName, db.sales_returns, { limit: 500 }),
        ]);

        return true;
    } catch (err) {
        return false;
    }
}

// Smart pull - only pull what's needed based on last sync
export async function smartPullFromSupabase(pharmacyName: string, lastSyncTime?: Date): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        const pullPromises = TABLE_CONFIGS.map(async (config) => {
            let query = client
                .from(config.table)
                .select('*')
                .eq('pharmacy_name', normalizedName);

            // Only pull updated records if we have a last sync time
            if (lastSyncTime) {
                query = query.gte('updated_at', lastSyncTime.toISOString());
            }

            const { data, error } = await query.limit(config.limit || 1000);

            if (error || !data || data.length === 0) {
                return 0;
            }

            // ✅ FIXED: For sales table, ensure sale_id is preserved
            let itemsWithPharmacy = data.map(item => ({
                ...item,
                pharmacy_name: normalizedName
            }));

            if (config.table === 'sales') {
                itemsWithPharmacy = itemsWithPharmacy.map(item => ({
                    ...item,
                    sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
                }));
            }

            // OPTIMIZATION: Use bulkPut for batch upsert
            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (dbTable && typeof dbTable.bulkPut === 'function') {
                await dbTable.bulkPut(itemsWithPharmacy);
                return data.length;
            }

            return 0;
        });

        const results = await Promise.allSettled(pullPromises);

        return true;
    } catch (err) {
        return false;
    }
}

// =============================================
// INCREMENTAL PULL - Only pull changed records
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

    try {
        const tablesToPull = options?.tables || TABLE_CONFIGS.map(c => c.table);
        const configs = TABLE_CONFIGS.filter(c => tablesToPull.includes(c.table));

        const pullPromises = configs.map(async (config) => {
            const { data, error } = await client
                .from(config.table)
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .gte('updated_at', lastSyncTime.toISOString())
                .limit(config.limit || 1000);

            if (error || !data || data.length === 0) {
                return 0;
            }

            // ✅ FIXED: For sales table, ensure sale_id is preserved
            let itemsWithPharmacy = data.map(item => ({
                ...item,
                pharmacy_name: normalizedName
            }));

            if (config.table === 'sales') {
                itemsWithPharmacy = itemsWithPharmacy.map(item => ({
                    ...item,
                    sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
                }));
            }

            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (dbTable && typeof dbTable.bulkPut === 'function') {
                await dbTable.bulkPut(itemsWithPharmacy);
                return data.length;
            }

            return 0;
        });

        const results = await Promise.allSettled(pullPromises);
        totalUpdated = results.reduce((sum, r) => {
            if (r.status === 'fulfilled') return sum + r.value;
            return sum;
        }, 0);

        return { success: true, updated: totalUpdated };
    } catch (err) {
        return { success: false, updated: totalUpdated };
    }
}

// =============================================
// PULL SINGLE TABLE - For targeted updates
// =============================================
export async function pullSingleTable(
    pharmacyName: string,
    tableName: string,
    options?: { limit?: number; since?: Date }
): Promise<number> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        return 0;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    const limit = options?.limit || 1000;

    try {
        let query = client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName);

        if (options?.since) {
            query = query.gte('updated_at', options.since.toISOString());
        }

        const { data, error } = await query.limit(limit);

        if (error || !data || data.length === 0) {
            return 0;
        }

        // ✅ FIXED: For sales table, ensure sale_id is preserved
        let itemsWithPharmacy = data.map(item => ({
            ...item,
            pharmacy_name: normalizedName
        }));

        if (tableName === 'sales') {
            itemsWithPharmacy = itemsWithPharmacy.map(item => ({
                ...item,
                sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
            }));
        }

        const config = TABLE_CONFIGS.find(c => c.table === tableName);
        if (!config) {
            const dbTable = db[tableName as keyof typeof db] as any;
            if (dbTable && typeof dbTable.bulkPut === 'function') {
                await dbTable.bulkPut(itemsWithPharmacy);
                return data.length;
            }
            return 0;
        }

        const dbTable = db[config.dbKey as keyof typeof db] as any;
        if (dbTable && typeof dbTable.bulkPut === 'function') {
            await dbTable.bulkPut(itemsWithPharmacy);
            return data.length;
        }

        return 0;
    } catch (err) {
        return 0;
    }
}

// =============================================
// CHECK FOR CHANGES - Quick check if data changed
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
        return { changed: changedTables.length > 0, tables: changedTables };
    } catch (err) {
        return { changed: false, tables: [] };
    }
}