// lib/supabase/pull.ts
import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';
import { genUUID } from '../../utils/helpers';

// =============================================
// PULL SINGLE TABLE - Existing function
// =============================================
async function pullTable<T>(
    tableName: string,
    pharmacyName: string,
    dbTable: any,
    options?: { limit?: number }
): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    const pageSize = options?.limit || 1000; // rows per page
    const maxRows = options?.limit ? options.limit : Infinity; // total cap only if caller asked

    try {
        // Paginate through ALL rows for this pharmacy. Without this, PostgREST
        // silently caps the result set (usually at 1,000 rows), which caused
        // older historical data (days 11, 12, 13, ...) to never be pulled.
        const allRows: any[] = [];
        let offset = 0;

        while (allRows.length < maxRows) {
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .ilike('pharmacy_name', normalizedName)
                .order('id', { ascending: true })
                .range(offset, offset + pageSize - 1);

            if (error) {
                console.error(`[pullTable] Query error on ${tableName} (offset ${offset}):`, error);
                throw error;
            }

            if (!data || data.length === 0) break;

            allRows.push(...data);
            if (data.length < pageSize) break;

            offset += pageSize;
        }

        if (allRows.length === 0) {
            return 0;
        }

        let itemsWithPharmacy = allRows.map(item => ({
            ...item,
            pharmacy_name: normalizedName
        }));

        if (tableName === 'sales') {
            itemsWithPharmacy = itemsWithPharmacy.map(item => ({
                ...item,
                sale_id: item.sale_id || item.sale_number?.replace('INV-', '').split('-')[0] || item.id,
            }));
        }

        // Replace local rows for this pharmacy only after ALL pages succeeded.
        await dbTable.where('pharmacy_name').equals(normalizedName).delete();
        if (itemsWithPharmacy.length > 0) {
            await dbTable.bulkPut(itemsWithPharmacy);
        }

        console.log(`[pullTable] ${tableName}: pulled ${itemsWithPharmacy.length} rows in ${Math.ceil(allRows.length / pageSize)} page(s)`);
        return itemsWithPharmacy.length;
    } catch (err) {
        console.error(`Failed to pull ${tableName}:`, err);
        throw err;
    }
}
// =============================================
// PROCESS CONFIRMED ORDER - Auto-add stock
// =============================================
async function processConfirmedOrder(orderId: string) {
    try {
        const order = await db.suppliers_orders.get(orderId);
        if (!order) return;

        // Check if already processed
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

            // Add to stock
            const currentStock = product.quantity || 0;
            const newStock = currentStock + item.accepted_quantity;

            await db.products.update(item.product_id, {
                quantity: newStock,
                updated_at: new Date().toISOString()
            });

            // Create stock movement
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
                created_at: new Date().toISOString()
            };
            await db.stock_movements.put(movement);
        }

        // Mark order as processed
        await db.suppliers_orders.update(orderId, {
            'delivery_info.stock_added': true,
            'delivery_info.stock_added_at': new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to process confirmed order:', error);
    }
}

// =============================================
// PULL SUPPLIER PARTNERSHIPS
// =============================================
async function pullSupplierPartnerships(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        const { data, error } = await client
            .from('suppliers_partnership_requests')
            .select('*')
            .ilike('pharmacy_name', normalizedName)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to pull supplier partnerships (query error):', error);
            throw error;
        }
        if (!data || data.length === 0) {
            return 0;
        }

        // Update local DB
        await db.suppliers_partnership_requests.bulkPut(data);
        return data.length;
    } catch (err) {
        console.error('Failed to pull supplier partnerships:', err);
        throw err;
    }
}

// =============================================
// PULL SUPPLIER ORDERS
// =============================================
async function pullSupplierOrders(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        const { data, error } = await client
            .from('suppliers_orders')
            .select('*')
            .ilike('pharmacy_name', normalizedName)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to pull supplier orders (query error):', error);
            throw error;
        }
        if (!data || data.length === 0) {
            return 0;
        }

        // Update local DB
        await db.suppliers_orders.bulkPut(data);

        // Check for confirmed orders to auto-add stock
        for (const order of data) {
            if (order.status === 'confirmed') {
                await processConfirmedOrder(order.id);
            }
        }

        return data.length;
    } catch (err) {
        console.error('Failed to pull supplier orders:', err);
        throw err;
    }
}

// =============================================
// PULL SUPPLIER ORDER ITEMS
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

        if (orderIds.length === 0) {
            return 0;
        }

        const { data, error } = await client
            .from('suppliers_order_items')
            .select('*')
            .in('order_id', orderIds);

        if (error) {
            console.error('Failed to pull supplier order items (query error):', error);
            throw error;
        }
        if (!data || data.length === 0) {
            return 0;
        }

        //  CRITICAL: Preserve local product_id when pulling from Supabase
        for (const item of data) {
            // Check if we already have this item locally
            const localItem = await db.suppliers_order_items.get(item.id);
            if (localItem && localItem.product_id) {
                //  Keep the pharmacy's product_id
                item.product_id = localItem.product_id;
            }
        }

        await db.suppliers_order_items.bulkPut(data);
        return data.length;
    } catch (err) {
        console.error('Failed to pull supplier order items:', err);
        throw err;
    }
}

// =============================================
// PULL AVAILABLE SUPPLIERS (From suppliers_accounts)
// =============================================
async function pullAvailableSuppliers(): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    try {
        //  Pull all active suppliers from supplier app
        const { data, error } = await client
            .from('suppliers_accounts')
            .select('*')
            .eq('status', 'active')
            .order('business_name', { ascending: true });

        if (error) {
            console.error('Failed to pull available suppliers (query error):', error);
            throw error;
        }
        if (!data || data.length === 0) {
            return 0;
        }

        //  Store in a local table or cache
        // Since we don't have a local table for suppliers_accounts,
        // we store them in localStorage as a cache
        localStorage.setItem('medp_available_suppliers', JSON.stringify(data));
        localStorage.setItem('medp_available_suppliers_updated', new Date().toISOString());

        return data.length;
    } catch (err) {
        console.error('Failed to pull available suppliers:', err);
        throw err;
    }
}

// =============================================
// MAIN PULL FUNCTIONS - UPDATED
// =============================================

// Full pull - all tables including supplier
export async function pullFromSupabaseToLocal(pharmacyName: string): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine) {
        console.warn('[pullFromSupabaseToLocal] Aborted: navigator.onLine is false');
        return false;
    }

    if (!client || !isSupabaseConfigured()) {
        console.warn('[pullFromSupabaseToLocal] Aborted: client is null or not configured');
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`[pullFromSupabaseToLocal] Starting full pull for: ${normalizedName}`);

    try {
        const results = await Promise.allSettled([
            pullTable('products', normalizedName, db.products),
            pullTable('product_batches', normalizedName, db.product_batches),
            pullTable('categories', normalizedName, db.categories),
            pullTable('units', normalizedName, db.units),
            pullTable('suppliers', normalizedName, db.suppliers),
            pullTable('customers', normalizedName, db.customers),
            //  NO LIMITS on historical tables — pull ALL rows for this pharmacy.
            //    A limit of 500 was truncating older sales/movements/audit logs,
            //    which is why historical days appeared empty.
            pullTable('sales', normalizedName, db.sales),
            pullTable('stock_movements', normalizedName, db.stock_movements),
            pullTable('audit_logs', normalizedName, db.audit_logs),
            pullTable('profiles', normalizedName, db.profiles),
            pullTable('requested_items', normalizedName, db.requested_items),
            pullTable('sales_returns', normalizedName, db.sales_returns),
            //  ADD SUPPLIER TABLES
            pullSupplierPartnerships(normalizedName),
            pullSupplierOrders(normalizedName),
            pullSupplierOrderItems(normalizedName),
            pullAvailableSuppliers(),
        ]);

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error(`[pullFromSupabaseToLocal] FAILED for ${failed.length} table(s):`);
            failed.forEach((f: any, i) => {
                console.error(`  ${i + 1}. ${f.reason?.message || f.reason}`);
            });
            return false;
        }

        const succeeded = results.filter(r => r.status === 'fulfilled');
        const totalRows = succeeded.reduce((sum, r: any) => sum + (r.value || 0), 0);
        console.log(`[pullFromSupabaseToLocal] SUCCESS — ${succeeded.length} tables pulled, ${totalRows} total rows`);
        return true;
    } catch (err) {
        console.error('[pullFromSupabaseToLocal] Unexpected error:', err);
        return false;
    }
}

// =============================================
// SMART PULL - Updated with supplier tables
// =============================================
export async function smartPullFromSupabase(pharmacyName: string, lastSyncTime?: Date): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        console.warn('[smartPullFromSupabase] Aborted: offline or not configured');
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`[smartPullFromSupabase] Starting smart pull for: ${normalizedName}`, lastSyncTime ? `since ${lastSyncTime.toISOString()}` : '(no since)');

    try {
        //  Filter TABLE_CONFIGS to exclude tables that don't have pharmacy_name
        const filteredConfigs = TABLE_CONFIGS.filter(config => {
            // suppliers_order_items doesn't have pharmacy_name - handled separately
            if (config.table === 'suppliers_order_items') return false;
            return true;
        });

        const pullPromises = filteredConfigs.map(async (config) => {
            let query = client
                .from(config.table)
                .select('*')
                .ilike('pharmacy_name', normalizedName);

            if (lastSyncTime) {
                query = query.gte('updated_at', lastSyncTime.toISOString());
            }

            const { data, error } = await query.limit(config.limit || 1000);

            if (error) {
                console.error(`[smartPullFromSupabase] Query error on ${config.table}:`, error);
                throw error;
            }
            if (!data || data.length === 0) {
                return 0;
            }

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

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error(`[smartPullFromSupabase] FAILED for ${failed.length} table(s):`);
            failed.forEach((f: any, i) => {
                console.error(`  ${i + 1}. ${f.reason?.message || f.reason}`);
            });
            return false;
        }

        //  Pull partnerships separately
        await pullSupplierPartnerships(normalizedName);

        //  Pull orders
        await pullSupplierOrders(normalizedName);

        //  Pull order items (uses order_id, not pharmacy_name)
        await pullSupplierOrderItems(normalizedName);
        await pullAvailableSuppliers();
        console.log('[smartPullFromSupabase] SUCCESS');
        return true;
    } catch (err) {
        console.error('[smartPullFromSupabase] Unexpected error:', err);
        return false;
    }
}

// =============================================
// INCREMENTAL PULL - Updated
// =============================================
export async function incrementalPullFromSupabase(
    pharmacyName: string,
    lastSyncTime: Date,
    options?: { tables?: string[] }
): Promise<{ success: boolean; updated: number }> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        console.warn('[incrementalPullFromSupabase] Aborted: offline or not configured');
        return { success: false, updated: 0 };
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    let totalUpdated = 0;
    console.log(`[incrementalPullFromSupabase] Starting for: ${normalizedName} since ${lastSyncTime.toISOString()}`, options?.tables ? `tables: ${options.tables.join(', ')}` : '(all tables)');

    try {
        const tablesToPull = options?.tables || TABLE_CONFIGS.map(c => c.table);
        const configs = TABLE_CONFIGS.filter(c => tablesToPull.includes(c.table));

        const pullPromises = configs.map(async (config) => {
            const { data, error } = await client
                .from(config.table)
                .select('*')
                .ilike('pharmacy_name', normalizedName)
                .gte('updated_at', lastSyncTime.toISOString())
                .limit(config.limit || 1000);

            if (error) {
                console.error(`[incrementalPullFromSupabase] Query error on ${config.table}:`, error);
                throw error;
            }
            if (!data || data.length === 0) {
                return 0;
            }

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

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error(`[incrementalPullFromSupabase] FAILED for ${failed.length} table(s):`);
            failed.forEach((f: any, i) => {
                console.error(`  ${i + 1}. ${f.reason?.message || f.reason}`);
            });
            return { success: false, updated: totalUpdated };
        }

        //  Also pull partnerships
        const partnershipCount = await pullSupplierPartnerships(normalizedName);
        totalUpdated += partnershipCount;

        //  Pull orders
        const orderCount = await pullSupplierOrders(normalizedName);
        totalUpdated += orderCount;

        //  Pull order items
        const itemCount = await pullSupplierOrderItems(normalizedName);
        totalUpdated += itemCount;

        console.log(`[incrementalPullFromSupabase] SUCCESS — ${totalUpdated} rows updated`);
        return { success: true, updated: totalUpdated };
    } catch (err) {
        console.error('[incrementalPullFromSupabase] Unexpected error:', err);
        return { success: false, updated: totalUpdated };
    }
}

// =============================================
// PULL SINGLE TABLE - Updated
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
            .ilike('pharmacy_name', normalizedName);

        if (options?.since) {
            query = query.gte('updated_at', options.since.toISOString());
        }

        const { data, error } = await query.limit(limit);

        if (error) {
            console.error(`[pullSingleTable] Query error on ${tableName}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            return 0;
        }

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

        // Check if it's a supplier table
        if (tableName === 'suppliers_partnership_requests') {
            await db.suppliers_partnership_requests.bulkPut(itemsWithPharmacy);
            return data.length;
        }

        if (tableName === 'suppliers_orders') {
            await db.suppliers_orders.bulkPut(itemsWithPharmacy);

            // Check for confirmed orders
            for (const order of itemsWithPharmacy) {
                if (order.status === 'confirmed') {
                    await processConfirmedOrder(order.id);
                }
            }
            return data.length;
        }

        if (tableName === 'suppliers_order_items') {
            await db.suppliers_order_items.bulkPut(itemsWithPharmacy);
            return data.length;
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
        console.error(`[pullSingleTable] Failed to pull ${tableName}:`, err);
        throw err;
    }
}

// =============================================
// CHECK FOR CHANGES - Updated
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
        // Check all tables including supplier tables
        const allTableConfigs = [
            ...TABLE_CONFIGS,
            { table: 'suppliers_partnership_requests', dbKey: 'suppliers_partnership_requests' },
            { table: 'suppliers_orders', dbKey: 'suppliers_orders' },
            { table: 'suppliers_order_items', dbKey: 'suppliers_order_items' },
        ];

        const checks = allTableConfigs.map(async (config) => {
            const { count, error } = await client
                .from(config.table)
                .select('*', { count: 'exact', head: true })
                .ilike('pharmacy_name', normalizedName)
                .gte('updated_at', lastSyncTime.toISOString());

            if (error) {
                console.error(`[hasDataChanged] Check failed for ${config.table}:`, error);
                return { table: config.table, count: 0 };
            }

            if (count && count > 0) {
                changedTables.push(config.table);
            }
            return { table: config.table, count: count || 0 };
        });

        await Promise.allSettled(checks);
        return { changed: changedTables.length > 0, tables: changedTables };
    } catch (err) {
        console.error('[hasDataChanged] Unexpected error:', err);
        return { changed: false, tables: [] };
    }
}