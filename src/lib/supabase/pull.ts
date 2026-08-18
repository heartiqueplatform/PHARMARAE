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

    const limit = options?.limit || 1000;
    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        let { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .limit(limit);

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

        await dbTable.where('pharmacy_name').equals(normalizedName).delete();

        if (itemsWithPharmacy.length > 0) {
            await dbTable.bulkPut(itemsWithPharmacy);
        }

        return data.length;
    } catch (err) {
        return 0;
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
            .eq('pharmacy_name', normalizedName)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            return 0;
        }

        // Update local DB
        await db.suppliers_partnership_requests.bulkPut(data);
        return data.length;
    } catch (err) {
        return 0;
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
            .eq('pharmacy_name', normalizedName)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
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
        return 0;
    }
}

// =============================================
// PULL SUPPLIER ORDER ITEMS
// =============================================
// lib/supabase/pull.ts
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

        if (error || !data || data.length === 0) {
            return 0;
        }

        // ✅ CRITICAL: Preserve local product_id when pulling from Supabase
        for (const item of data) {
            // Check if we already have this item locally
            const localItem = await db.suppliers_order_items.get(item.id);
            if (localItem && localItem.product_id) {
                // ✅ Keep the pharmacy's product_id
                item.product_id = localItem.product_id;
            }
        }

        await db.suppliers_order_items.bulkPut(data);
        return data.length;
    } catch (err) {
        console.warn('Failed to pull supplier order items:', err);
        return 0;
    }
}

// =============================================
// PULL AVAILABLE SUPPLIERS (From suppliers_accounts)
// =============================================
async function pullAvailableSuppliers(): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    try {
        // ✅ Pull all active suppliers from supplier app
        const { data, error } = await client
            .from('suppliers_accounts')
            .select('*')
            .eq('status', 'active')
            .order('business_name', { ascending: true });

        if (error || !data || data.length === 0) {
            return 0;
        }

        // ✅ Store in a local table or cache
        // Since we don't have a local table for suppliers_accounts,
        // we store them in localStorage as a cache
        localStorage.setItem('medp_available_suppliers', JSON.stringify(data));
        localStorage.setItem('medp_available_suppliers_updated', new Date().toISOString());

        return data.length;
    } catch (err) {
        console.warn('Failed to pull available suppliers:', err);
        return 0;
    }
}
// =============================================
// MAIN PULL FUNCTIONS - UPDATED
// =============================================

// Full pull - all tables including supplier
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
            // ✅ ADD SUPPLIER TABLES
            pullSupplierPartnerships(normalizedName),
            pullSupplierOrders(normalizedName),
            pullSupplierOrderItems(normalizedName),
            pullAvailableSuppliers(),
        ]);

        return true;
    } catch (err) {
        return false;
    }
}

// =============================================
// SMART PULL - Updated with supplier tables
// =============================================
// lib/supabase/pull.ts

export async function smartPullFromSupabase(pharmacyName: string, lastSyncTime?: Date): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        return false;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        // ✅ Filter TABLE_CONFIGS to exclude tables that don't have pharmacy_name
        const filteredConfigs = TABLE_CONFIGS.filter(config => {
            // suppliers_order_items doesn't have pharmacy_name - handled separately
            if (config.table === 'suppliers_order_items') return false;
            return true;
        });

        const pullPromises = filteredConfigs.map(async (config) => {
            let query = client
                .from(config.table)
                .select('*')
                .eq('pharmacy_name', normalizedName);

            if (lastSyncTime) {
                query = query.gte('updated_at', lastSyncTime.toISOString());
            }

            const { data, error } = await query.limit(config.limit || 1000);

            if (error || !data || data.length === 0) {
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

        // ✅ Pull partnerships separately
        await pullSupplierPartnerships(normalizedName);

        // ✅ Pull orders
        await pullSupplierOrders(normalizedName);

        // ✅ Pull order items (uses order_id, not pharmacy_name)
        await pullSupplierOrderItems(normalizedName);
        await pullAvailableSuppliers();
        return true;
    } catch (err) {
        console.warn('Smart pull failed:', err);
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

        // ✅ Also pull partnerships
        const partnershipCount = await pullSupplierPartnerships(normalizedName);
        totalUpdated += partnershipCount;

        // ✅ Pull orders
        const orderCount = await pullSupplierOrders(normalizedName);
        totalUpdated += orderCount;

        // ✅ Pull order items
        const itemCount = await pullSupplierOrderItems(normalizedName);
        totalUpdated += itemCount;

        return { success: true, updated: totalUpdated };
    } catch (err) {
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
            .eq('pharmacy_name', normalizedName);

        if (options?.since) {
            query = query.gte('updated_at', options.since.toISOString());
        }

        const { data, error } = await query.limit(limit);

        if (error || !data || data.length === 0) {
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
        return 0;
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