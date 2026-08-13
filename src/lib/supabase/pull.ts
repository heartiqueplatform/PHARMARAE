// lib/supabase/pull.ts
import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';

// Pull a single table with filtering
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

    console.log(`📦 Pulling ${tableName}...`);

    try {
        // Try filtered query first
        let { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .limit(limit);

        // If filtered fails, pull all and filter locally
        if (error) {
            console.warn(`⚠️ ${tableName} filtered query failed, pulling all...`);
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
            console.log(`📦 No ${tableName} found`);
            return 0;
        }

        console.log(`📦 Pulled ${data.length} ${tableName}`);

        // Clear existing data
        const existing = await dbTable.where('pharmacy_name').equals(normalizedName).toArray();
        for (const item of existing) {
            await dbTable.delete(item.id);
        }

        // Insert new data in batch
        for (const item of data) {
            await dbTable.put({ ...item, pharmacy_name: normalizedName });
        }

        return data.length;
    } catch (err) {
        console.error(`❌ Error pulling ${tableName}:`, err);
        return 0;
    }
}

// Main pull function - pulls all tables in parallel
export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine) {
        console.log('📴 Offline - cannot pull from Supabase');
        return false;
    }

    if (!client || !isSupabaseConfigured()) {
        console.log('⚠️ No Supabase client or not configured');
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`🔄 Pulling data from Supabase for: ${normalizedName}`);

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
            pullTable('sales_returns', normalizedName, db.sales_returns, { limit: 500 }), // NEW - Sales Returns
        ]);

        const totalPulled = results.reduce((sum, r) => {
            if (r.status === 'fulfilled') return sum + r.value;
            return sum;
        }, 0);

        console.log(`✅ Pulled ${totalPulled} total records from Supabase`);
        return true;
    } catch (err) {
        console.error('❌ Pull from Supabase failed:', err);
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
    console.log(`🔄 Smart pulling data since: ${lastSyncTime?.toISOString() || 'beginning'}`);

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

            if (error) {
                console.warn(`⚠️ Smart pull failed for ${config.table}:`, error.message);
                return 0;
            }

            if (!data || data.length === 0) return 0;

            // Merge data (upsert)
            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (dbTable && typeof dbTable.put === 'function') {
                for (const item of data) {
                    await dbTable.put({ ...item, pharmacy_name: normalizedName });
                }
            }

            return data.length;
        });

        const results = await Promise.allSettled(pullPromises);
        const totalPulled = results.reduce((sum, r) => {
            if (r.status === 'fulfilled') return sum + r.value;
            return sum;
        }, 0);

        console.log(`✅ Smart pull: ${totalPulled} updated records`);
        return true;
    } catch (err) {
        console.error('❌ Smart pull failed:', err);
        return false;
    }
}