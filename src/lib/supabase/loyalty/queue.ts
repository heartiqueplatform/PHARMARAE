// lib/supabase/loyalty/queue.ts
import { db } from '../../db';
import { getLoyaltyClient } from './client';
import { mapLoyaltyEntityToTable, normalizePharmacyName } from './utils';

const BATCH_SIZE = 20;
const MAX_RETRY_COUNT = 3;

export async function queueLoyaltyMutation(
    pharmacyName: string,
    userId: string,
    entityType: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
) {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const item = {
        sync_id: 'loyalty-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        pharmacy_name: normalizedName,
        user_id: userId || 'system',
        entity_type: entityType,
        operation: operation,
        payload: {
            ...payload,
            pharmacy_name: normalizedName
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'pending' as const,
        retry_count: 0
    };

    await db.sync_queue.add(item);
    console.log(`[Loyalty] Queued: ${entityType} ${operation}`);

    if (navigator.onLine) {
        processLoyaltyQueue().catch(err => console.log('Loyalty sync background:', err));
    }
}

export async function processLoyaltyQueue(): Promise<{ synced: number; failed: number }> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) {
        return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    const items = await db.sync_queue
        .where('entity_type')
        .anyOf([
            'customers_loyalty_transactions',
            'customers_rewards_catalog',
            'customers_loyalty_card_orders',
            'loyalty_transaction',
            'reward_catalog',
            'loyalty_card_order'
        ])
        .filter(item => item.status === 'pending' || item.status === 'failed')
        .limit(BATCH_SIZE)
        .toArray();

    for (const item of items) {
        try {
            const tableName = mapLoyaltyEntityToTable(item.entity_type);

            if (item.id) {
                await db.sync_queue.update(item.id, {
                    status: 'syncing',
                    syncing_at: new Date().toISOString()
                });
            }

            let payload = { ...item.payload };

            // Remove updated_at (doesn't exist in Supabase)
            delete payload.updated_at;

            // Ensure pharmacy_name exists
            if (!payload.pharmacy_name) {
                payload.pharmacy_name = item.pharmacy_name || 'SYSTEM';
            }

            // 🚀 JUST TRY THE INSERT - Let Supabase handle foreign key validation
            console.log('[Loyalty] Attempting to insert:', JSON.stringify(payload).substring(0, 200));

            const { error } = await client
                .from(tableName)
                .upsert(payload, { onConflict: 'id' });

            if (error) {
                // Foreign key error (customer not found) - keep in queue
                if (error.code === '23503') {
                    console.log('[Loyalty] Foreign key error - customer not found, will retry later');
                    if (item.id) {
                        await db.sync_queue.update(item.id, {
                            status: 'pending',
                            error: 'Customer not found - waiting for customer sync',
                            retry_count: 0
                        });
                    }
                    continue;
                }
                throw error;
            }

            // Success - delete from queue
            if (item.id) {
                await db.sync_queue.delete(item.id);
            }
            synced++;
            console.log(`[Loyalty] ✅ Synced: ${tableName}`);

        } catch (err: any) {
            console.error('[Loyalty] Sync failed:', err.message);
            failed++;

            if (item.id) {
                const retryCount = (item.retry_count || 0) + 1;
                const isPermanent = retryCount > MAX_RETRY_COUNT;

                await db.sync_queue.update(item.id, {
                    status: isPermanent ? 'failed' : 'pending',
                    error: err.message,
                    retry_count: retryCount
                });
            }
        }
    }

    console.log(`[Loyalty] Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
}

export async function getLoyaltyPendingCount(): Promise<number> {
    return db.sync_queue
        .where('entity_type')
        .anyOf([
            'customers_loyalty_transactions',
            'customers_rewards_catalog',
            'customers_loyalty_card_orders',
            'loyalty_transaction',
            'reward_catalog',
            'loyalty_card_order'
        ])
        .filter(item => item.status === 'pending')
        .count();
}