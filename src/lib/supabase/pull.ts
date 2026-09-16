// lib/supabase/pull.ts
import { db } from '../db';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { normalizePharmacyName, TABLE_CONFIGS } from './utils';
import { genUUID } from '../../utils/helpers';

const PAGE_SIZE = 1000;

// =============================================
// CONCURRENCY GUARD
// Prevent parallel pulls from racing (delete + bulkPut)
// =============================================
let pullInFlight: Promise<boolean> | null = null;

// =============================================
// HELPER: Build sale_id from row
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
// PULL SINGLE TABLE (PAGINATED, ORDERED)
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

    let from = 0;
    let total = 0;

    try {
        while (total < maxRows) {
            const to = Math.min(from + PAGE_SIZE - 1, from + (maxRows - total) - 1);

            let query = client
                .from(tableName)
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (since) {
                query = query.gte('updated_at', since.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                console.warn(`Pull failed for ${tableName}:`, error.message);
                break;
            }

            if (!data || data.length === 0) break;

            const itemsWithPharmacy = data.map(item =>
                transformRow(tableName, item, normalizedName)
            );

            await dbTable.bulkPut(itemsWithPharmacy);
            total += itemsWithPharmacy.length;

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        return total;
    } catch (err) {
        console.warn(`pullTable(${tableName}) error:`, err);
        return total;
    }
}

// =============================================
// PULL ENTIRE TABLE (with safe stale cleanup)
// Use this when you want a FULL resync + prune orphans
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
    let from = 0;
    let total = 0;

    try {
        while (true) {
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data || data.length === 0) break;

            const items = data.map(item =>
                transformRow(tableName, item, normalizedName)
            );

            for (const it of items) remoteIds.add(it.id);

            await dbTable.bulkPut(items);
            total += items.length;

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        // Only prune AFTER full fetch succeeded
        if (remoteIds.size > 0) {
            const localKeys = await dbTable
                .where('pharmacy_name')
                .equals(normalizedName)
                .primaryKeys();

            const toDelete = localKeys.filter((id: string) => !remoteIds.has(id));
            if (toDelete.length > 0) {
                await dbTable.bulkDelete(toDelete);
            }
        }

        return total;
    } catch (err) {
        console.warn(`pullTableFullResync(${tableName}) error:`, err);
        return total;
    }
}

// =============================================
// PROCESS CONFIRMED ORDER - Auto-add stock
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
        console.error('Failed to process confirmed order:', error);
    }
}

// =============================================
// PULL SUPPLIER PARTNERSHIPS (PAGINATED)
// =============================================
async function pullSupplierPartnerships(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    let from = 0;
    let total = 0;

    try {
        while (true) {
            const { data, error } = await client
                .from('suppliers_partnership_requests')
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data || data.length === 0) break;

            const items = data.map(item => ({
                ...item,
                pharmacy_name: normalizedName,
            }));

            await db.suppliers_partnership_requests.bulkPut(items);
            total += items.length;

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        return total;
    } catch (err) {
        console.warn('Failed to pull supplier partnerships:', err);
        return total;
    }
}

// =============================================
// PULL SUPPLIER ORDERS (PAGINATED)
// =============================================
async function pullSupplierOrders(pharmacyName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    let from = 0;
    let total = 0;
    const confirmedOrders: string[] = [];

    try {
        while (true) {
            const { data, error } = await client
                .from('suppliers_orders')
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data || data.length === 0) break;

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

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        for (const orderId of confirmedOrders) {
            await processConfirmedOrder(orderId);
        }

        return total;
    } catch (err) {
        console.warn('Failed to pull supplier orders:', err);
        return total;
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

            let from = 0;
            while (true) {
                const { data, error } = await client
                    .from('suppliers_order_items')
                    .select('*')
                    .in('order_id', chunk)
                    .order('created_at', { ascending: false })
                    .range(from, from + PAGE_SIZE - 1);

                if (error || !data || data.length === 0) break;

                // Preserve local product_id (pharmacy-side product mapping)
                for (const item of data) {
                    const localItem = await db.suppliers_order_items.get(item.id);
                    if (localItem && localItem.product_id) {
                        item.product_id = localItem.product_id;
                    }
                }

                await db.suppliers_order_items.bulkPut(data);
                total += data.length;

                if (data.length < PAGE_SIZE) break;
                from += PAGE_SIZE;
            }
        }

        return total;
    } catch (err) {
        console.warn('Failed to pull supplier order items:', err);
        return total;
    }
}

// =============================================
// PULL AVAILABLE SUPPLIERS
// =============================================
async function pullAvailableSuppliers(): Promise<number> {
    const client = getSupabaseClient();
    if (!client) return 0;

    try {
        let from = 0;
        const all: any[] = [];

        while (true) {
            const { data, error } = await client
                .from('suppliers_accounts')
                .select('*')
                .eq('status', 'active')
                .order('business_name', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data || data.length === 0) break;

            all.push(...data);

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        if (all.length === 0) return 0;

        localStorage.setItem('medp_available_suppliers', JSON.stringify(all));
        localStorage.setItem(
            'medp_available_suppliers_updated',
            new Date().toISOString()
        );

        return all.length;
    } catch (err) {
        console.warn('Failed to pull available suppliers:', err);
        return 0;
    }
}

// =============================================
// FULL PULL
// =============================================
async function doPullFromSupabaseToLocal(
    pharmacyName: string
): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine) return false;
    if (!client || !isSupabaseConfigured()) return false;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        await Promise.allSettled([
            pullTable('products', normalizedName, db.products),
            pullTable('product_batches', normalizedName, db.product_batches),
            pullTable('categories', normalizedName, db.categories),
            pullTable('units', normalizedName, db.units),
            pullTable('suppliers', normalizedName, db.suppliers),
            pullTable('customers', normalizedName, db.customers),
            pullTable('sales', normalizedName, db.sales),
            pullTable('stock_movements', normalizedName, db.stock_movements),
            pullTable('audit_logs', normalizedName, db.audit_logs, {
                limit: 5000,
            }),
            pullTable('profiles', normalizedName, db.profiles),
            pullTable('requested_items', normalizedName, db.requested_items),
            pullTable('sales_returns', normalizedName, db.sales_returns),
            // Supplier tables
            pullSupplierPartnerships(normalizedName),
            pullSupplierOrders(normalizedName),
            pullSupplierOrderItems(normalizedName),
            pullAvailableSuppliers(),
        ]);

        return true;
    } catch (err) {
        console.warn('Full pull failed:', err);
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
// SMART PULL (incremental-aware, ordered)
// =============================================
async function doSmartPullFromSupabase(
    pharmacyName: string,
    lastSyncTime?: Date
): Promise<boolean> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) return false;

    const normalizedName = normalizePharmacyName(pharmacyName);

    try {
        // Exclude tables that don't have pharmacy_name
        const filteredConfigs = TABLE_CONFIGS.filter(config => {
            if (config.table === 'suppliers_order_items') return false;
            return true;
        });

        const pullPromises = filteredConfigs.map(async config => {
            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

            return pullTable(config.table, normalizedName, dbTable, {
                limit: config.limit || Infinity,
                since: lastSyncTime,
            });
        });

        await Promise.allSettled(pullPromises);

        await pullSupplierPartnerships(normalizedName);
        await pullSupplierOrders(normalizedName);
        await pullSupplierOrderItems(normalizedName);
        await pullAvailableSuppliers();

        return true;
    } catch (err) {
        console.warn('Smart pull failed:', err);
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

    try {
        const tablesToPull =
            options?.tables || TABLE_CONFIGS.map(c => c.table);

        const configs = TABLE_CONFIGS.filter(
            c =>
                tablesToPull.includes(c.table) &&
                c.table !== 'suppliers_order_items'
        );

        const results = await Promise.allSettled(
            configs.map(async config => {
                const dbTable = db[config.dbKey as keyof typeof db] as any;
                if (!dbTable || typeof dbTable.bulkPut !== 'function') return 0;

                return pullTable(config.table, normalizedName, dbTable, {
                    limit: config.limit || Infinity,
                    since: lastSyncTime,
                });
            })
        );

        totalUpdated = results.reduce((sum, r) => {
            if (r.status === 'fulfilled') return sum + r.value;
            return sum;
        }, 0);

        totalUpdated += await pullSupplierPartnerships(normalizedName);
        totalUpdated += await pullSupplierOrders(normalizedName);
        totalUpdated += await pullSupplierOrderItems(normalizedName);

        return { success: true, updated: totalUpdated };
    } catch (err) {
        console.warn('Incremental pull failed:', err);
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
// Use this if you intentionally want to drop stale rows
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
                    .gte('updated_at', lastSyncTime.toISOString());

                if (!error && count && count > 0) {
                    changedTables.push(config.table);
                }
            })
        );

        return { changed: changedTables.length > 0, tables: changedTables };
    } catch (err) {
        console.warn('hasDataChanged failed:', err);
        return { changed: false, tables: [] };
    }
}