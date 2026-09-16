// lib/supabase/loyalty/pull.ts
import { db } from '../../db';
import { getLoyaltyClient } from './client';
import { normalizePharmacyName, LOYALTY_TABLE_CONFIGS } from './utils';

export async function pullLoyaltyData(pharmacyName: string): Promise<number> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) return 0;

    const normalizedName = normalizePharmacyName(pharmacyName);
    let total = 0;

    for (const config of LOYALTY_TABLE_CONFIGS) {
        try {
            const { data, error } = await client
                .from(config.table)
                .select('*')
                .eq('pharmacy_name', normalizedName)
                .limit(500);

            if (error || !data) continue;

            const dbTable = db[config.dbKey as keyof typeof db] as any;
            if (dbTable && typeof dbTable.bulkPut === 'function') {
                // Remove updated_at from pulled data if it doesn't exist in local table
                const cleanedData = data.map(item => {
                    const { updated_at, ...rest } = item;
                    return {
                        ...rest,
                        pharmacy_name: normalizedName
                    };
                });

                await dbTable.where('pharmacy_name').equals(normalizedName).delete();
                await dbTable.bulkPut(cleanedData);
                total += data.length;
            }
        } catch (err) {
            console.warn(`[Loyalty] Failed to pull ${config.table}:`, err);
        }
    }

    return total;
}