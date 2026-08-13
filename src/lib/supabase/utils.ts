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
        'sales_return': 'sales_returns', // NEW - Sales Returns
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
    { table: 'sales_returns', dbKey: 'sales_returns', limit: 500 }, // NEW - Sales Returns
];

export async function clearPharmacyData(pharmacyName: string): Promise<void> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`🧹 Clearing all data for pharmacy: ${normalizedName}`);

    const tables = [
        'products', 'product_batches', 'categories', 'units',
        'suppliers', 'customers', 'sales',
        'stock_movements', 'audit_logs', 'profiles',
        'requested_items',
        'sales_returns', // NEW - Sales Returns
    ];

    for (const tableName of tables) {
        const table = db[tableName as keyof typeof db] as any;
        if (table && typeof table.where === 'function') {
            const items = await table.where('pharmacy_name').equals(normalizedName).toArray();
            for (const item of items) {
                await table.delete(item.id);
            }
            console.log(`   Cleared ${items.length} records from ${tableName}`);
        }
    }
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
            console.warn('⚠️ Check data exists error:', error);
            return { exists: false, count: 0 };
        }

        return { exists: (count || 0) > 0, count: count || 0 };
    } catch (err) {
        console.error('❌ Check data exists failed:', err);
        return { exists: false, count: 0 };
    }
}