// lib/supabase/loyalty/pull.ts
import { db } from '../../db';
import { getLoyaltyClient } from './client';
import { normalizePharmacyName, LOYALTY_TABLE_CONFIGS } from './utils';

const PAGE_SIZE = 1000;

// =============================================
// Concurrency guard — one loyalty pull at a time
// =============================================
let loyaltyPullInFlight: Promise<number> | null = null;

// =============================================
// Transform remote row → local row
// =============================================
function transformLoyaltyRow(
    tableName: string,
    item: any,
    normalizedName: string
): any {
    // Tables in LOYALTY_TABLE_CONFIGS that do NOT have `updated_at` locally
    // Strip it so Dexie doesn't store an unindexed field.
    const { updated_at, ...rest } = item;

    return {
        ...rest,
        pharmacy_name: normalizedName,
    };
}

// =============================================
// Pull a single loyalty table (paginated + ordered)
// Does NOT delete — just upsert by primary key.
// =============================================
async function pullLoyaltyTable(
    tableName: string,
    dbKey: string,
    pharmacyName: string
): Promise<number> {
    const client = getLoyaltyClient();
    if (!client) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    const dbTable = db[dbKey as keyof typeof db] as any;

    if (!dbTable || typeof dbTable.bulkPut !== 'function') {
        return 0;
    }

    let from = 0;
    let total = 0;

    while (true) {
        const { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('pharmacy_name', normalizedName)
            .order('created_at', { ascending: false })   // 👈 stable order
            .range(from, from + PAGE_SIZE - 1);          // 👈 real pagination

        if (error) {
            console.warn(`[Loyalty] pull ${tableName} error:`, error.message);
            break;
        }

        if (!data || data.length === 0) break;

        const cleaned = data.map(item =>
            transformLoyaltyRow(tableName, item, normalizedName)
        );

        await dbTable.bulkPut(cleaned);
        total += cleaned.length;

        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return total;
}

// =============================================
// PUBLIC ENTRY POINT
// =============================================
async function doPullLoyaltyData(pharmacyName: string): Promise<number> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    let total = 0;

    for (const config of LOYALTY_TABLE_CONFIGS) {
        try {
            const count = await pullLoyaltyTable(
                config.table,
                config.dbKey,
                normalizedName
            );
            total += count;
        } catch (err) {
            console.warn(`[Loyalty] Failed to pull ${config.table}:`, err);
        }
    }

    return total;
}

export async function pullLoyaltyData(pharmacyName: string): Promise<number> {
    if (loyaltyPullInFlight) return loyaltyPullInFlight;

    loyaltyPullInFlight = doPullLoyaltyData(pharmacyName).finally(() => {
        loyaltyPullInFlight = null;
    });

    return loyaltyPullInFlight;
}

// =============================================
// OPTIONAL: Full resync with stale-row pruning
// Only use this if you intentionally want to drop
// rows that no longer exist in Supabase.
// =============================================
export async function fullResyncLoyaltyData(
    pharmacyName: string
): Promise<number> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    let total = 0;

    for (const config of LOYALTY_TABLE_CONFIGS) {
        try {
            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (!dbTable || typeof dbTable.bulkPut !== 'function') continue;

            const remoteIds = new Set<string>();
            let from = 0;

            while (true) {
                const { data, error } = await client
                    .from(config.table)
                    .select('*')
                    .eq('pharmacy_name', normalizedName)
                    .order('created_at', { ascending: false })
                    .range(from, from + PAGE_SIZE - 1);

                if (error || !data || data.length === 0) break;

                const cleaned = data.map(item =>
                    transformLoyaltyRow(config.table, item, normalizedName)
                );

                for (const it of cleaned) remoteIds.add(it.id);

                await dbTable.bulkPut(cleaned);
                total += cleaned.length;

                if (data.length < PAGE_SIZE) break;
                from += PAGE_SIZE;
            }

            // Prune local rows not in remote (only after successful full fetch)
            if (remoteIds.size > 0) {
                const localKeys = await dbTable
                    .where('pharmacy_name')
                    .equals(normalizedName)
                    .primaryKeys();

                const toDelete = localKeys.filter(
                    (id: string) => !remoteIds.has(id)
                );

                if (toDelete.length > 0) {
                    await dbTable.bulkDelete(toDelete);
                }
            }
        } catch (err) {
            console.warn(
                `[Loyalty] Full resync failed for ${config.table}:`,
                err
            );
        }
    }

    return total;
}

// =============================================
// DEBUG helpers (mirror utils.ts helpers)
// =============================================
export async function getLocalLoyaltyCounts(
    pharmacyName: string
): Promise<Record<string, number>> {
    const normalizedName = normalizePharmacyName(pharmacyName);
    const counts: Record<string, number> = {};

    for (const config of LOYALTY_TABLE_CONFIGS) {
        const table = db[config.dbKey as keyof typeof db] as any;
        if (table && typeof table.where === 'function') {
            try {
                counts[config.table] = await table
                    .where('pharmacy_name')
                    .equals(normalizedName)
                    .count();
            } catch {
                counts[config.table] = 0;
            }
        }
    }
    return counts;
}

export async function getRemoteLoyaltyCounts(
    pharmacyName: string
): Promise<Record<string, number>> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) return {};

    const normalizedName = normalizePharmacyName(pharmacyName);
    const counts: Record<string, number> = {};

    await Promise.allSettled(
        LOYALTY_TABLE_CONFIGS.map(async (config) => {
            const { count, error } = await client
                .from(config.table)
                .select('*', { count: 'exact', head: true })
                .eq('pharmacy_name', normalizedName);

            if (!error) counts[config.table] = count || 0;
        })
    );

    return counts;
}