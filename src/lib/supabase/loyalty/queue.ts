// lib/supabase/loyalty/queue.ts — v3 (dedicated table)
import { db } from '../../db';
import { getLoyaltyClient } from './client';
import {
    mapLoyaltyEntityToTable,
    normalizePharmacyName,
    loyaltyLog,
    loyaltyWarn,
} from './utils';

const BATCH_SIZE = 20;
const MAX_RETRY_COUNT = 3;

// =============================================
// Entity types owned by this queue
// =============================================
export const LOYALTY_ENTITY_TYPES = [
    'customers_loyalty_transactions',
    'customers_rewards_catalog',
    'customers_loyalty_card_orders',
    'loyalty_transaction',
    'reward_catalog',
    'loyalty_card_order',
];

// =============================================
// QUEUE A LOYALTY MUTATION
// =============================================
export async function queueLoyaltyMutation(
    pharmacyName: string,
    userId: string,
    entityType: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
) {
    const normalizedName = normalizePharmacyName(pharmacyName);

    // Dedup: same entity_type + payload.id already pending → merge
    if (payload?.id) {
        const existing = await db.loyalty_sync_queue
            .where('[entity_type+payload.id]')
            .equals([entityType, payload.id])
            .filter(item => item.status === 'pending' || item.status === 'syncing')
            .first();

        if (existing?.id) {
            await db.loyalty_sync_queue.update(existing.id, {
                payload: {
                    ...existing.payload,
                    ...payload,
                    pharmacy_name: normalizedName,
                },
                status: 'pending',
                error: null,
                retry_count: 0,
                updated_at: new Date().toISOString(),
            });
            loyaltyLog(`Merged into existing loyalty item ${existing.id} (${entityType})`);

            if (navigator.onLine) {
                setTimeout(() => {
                    processLoyaltyQueue().catch(err =>
                        loyaltyWarn('Background loyalty sync:', err)
                    );
                }, 0);
            }
            return;
        }
    }

    const item = {
        sync_id:
            'loyalty-' +
            Date.now() +
            '-' +
            Math.random().toString(36).substring(2, 7),
        pharmacy_name: normalizedName,
        user_id: userId || 'system',
        entity_type: entityType,
        operation,
        payload: { ...payload, pharmacy_name: normalizedName },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'pending' as const,
        retry_count: 0,
    };

    await db.loyalty_sync_queue.add(item);
    loyaltyLog(`Queued loyalty: ${entityType} ${operation} id=${payload?.id}`);
    if (navigator.onLine) {
        // Deferred + single-scheduled — avoid parallel triggers
        if (!(globalThis as any).__medpLoyaltySyncScheduled) {
            (globalThis as any).__medpLoyaltySyncScheduled = true;
            setTimeout(() => {
                (globalThis as any).__medpLoyaltySyncScheduled = false;
                processLoyaltyQueue().catch(err =>
                    loyaltyWarn('Background loyalty sync:', err)
                );
            }, 0);
        }
    }
}
// =============================================
// PROCESSOR LOCK — only one run of processLoyaltyQueue
// =============================================
let loyaltyQueueInFlight: Promise<{ synced: number; failed: number }> | null = null;
// =============================================
// PROCESS LOYALTY QUEUE
// =============================================
export async function processLoyaltyQueue(): Promise<{
    synced: number;
    failed: number;
}> {
    // Already running? Return the same promise to all callers.
    if (loyaltyQueueInFlight) {
        loyaltyLog('processLoyaltyQueue: already running, awaiting existing run');
        return loyaltyQueueInFlight;
    }

    loyaltyQueueInFlight = doProcessLoyaltyQueue().finally(() => {
        loyaltyQueueInFlight = null;
    });

    return loyaltyQueueInFlight;
}

async function doProcessLoyaltyQueue(): Promise<{
    synced: number;
    failed: number;
}> {
    const client = getLoyaltyClient();
    if (!client || !navigator.onLine) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    // Reset any items stuck in 'syncing' for more than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stuck = await db.loyalty_sync_queue
        .where('status')
        .equals('syncing')
        .filter(item => (item.syncing_at || '') < fiveMinAgo)
        .toArray();

    for (const item of stuck) {
        if (item.id) {
            await db.loyalty_sync_queue.update(item.id, {
                status: 'pending',
                error: null,
            });
        }
    }

    const items = await db.loyalty_sync_queue
        .where('status')
        .equals('pending')
        .limit(BATCH_SIZE)
        .toArray();

    if (items.length === 0) return { synced: 0, failed: 0 };

    loyaltyLog(`Processing ${items.length} loyalty items`);

    for (const item of items) {
        const tableName = mapLoyaltyEntityToTable(item.entity_type);

        try {
            if (item.id) {
                await db.loyalty_sync_queue.update(item.id, {
                    status: 'syncing',
                    syncing_at: new Date().toISOString(),
                });
            }

            const payload = { ...item.payload };
            // Remove fields that don't exist in Supabase
            delete payload.updated_at;
            delete payload.syncing_at;
            delete payload.sync_id;

            if (!payload.pharmacy_name) {
                payload.pharmacy_name = item.pharmacy_name || 'SYSTEM';
            }

            let error: any = null;

            if (item.operation === 'DELETE') {
                const { error: delErr } = await client
                    .from(tableName)
                    .delete()
                    .eq('id', payload.id);
                error = delErr;
            } else {
                // =============================================
                // UPSERT with explicit conflict target and update mode
                // =============================================
                // `ignoreDuplicates: false` forces a real ON CONFLICT
                // DO UPDATE. Without it, PostgREST may return 409 when
                // the row exists (older behavior on some Supabase versions).
                // =============================================
                const { error: upsertErr } = await client
                    .from(tableName)
                    .upsert(payload, {
                        onConflict: 'id',
                        ignoreDuplicates: false,
                    });
                error = upsertErr;
            }
            if (error) {
                // =============================================
                // Parse the real PostgREST error shape
                // =============================================
                const errCode = error.code || '';
                const errDetails = ((error as any).details || '');
                const errMessage = (error.message || '');

                // =============================================
                // FOREIGN KEY VIOLATION (23503) — parent row missing
                // =============================================
                // The sale/customer/profile this transaction points
                // to hasn't reached Supabase yet. The main queue is
                // still pushing it.
                //
                // KEEP the item in the queue. Do NOT count it as
                // a real failure. Retry next cycle.
                //
                // Critically: we do NOT increment retry_count,
                // because retry_count is only for real failures.
                // =============================================
                const isForeignKeyViolation =
                    errCode === '23503' ||
                    errDetails.includes('foreign key') ||
                    errDetails.includes('is not present in table') ||
                    errMessage.includes('foreign key');

                if (isForeignKeyViolation) {
                    loyaltyLog(
                        `⏳ FK violation on ${tableName} — ` +
                        `waiting for parents. Details: ${errDetails || errMessage}`
                    );
                    if (item.id) {
                        await db.loyalty_sync_queue.update(item.id, {
                            status: 'pending',
                            error: `Waiting for parents: ${errDetails || errMessage}`,
                            retry_count: 0,   // never burn retries on FK
                        });
                    }
                    failed++;
                    continue;
                }

                // =============================================
                // TRUE CONFLICT (23505) — the row already exists.
                // =============================================
                const isTrueConflict =
                    errCode === '23505' ||
                    errMessage.toLowerCase().includes('duplicate key') ||
                    errMessage.toLowerCase().includes('already exists');

                if (isTrueConflict) {
                    loyaltyLog(
                        `✅ Row already on server for ${tableName} id=${payload.id} — dropping`
                    );
                    if (item.id) {
                        await db.loyalty_sync_queue.delete(item.id);
                    }
                    synced++;
                    continue;
                }

                // =============================================
                // ANY OTHER ERROR — retry with backoff
                // =============================================
                throw error;
            }

            // ✅ Success
            if (item.id) {
                await db.loyalty_sync_queue.delete(item.id);
            }
            synced++;
            loyaltyLog(`✅ Synced ${tableName} id=${payload.id}`);
        } catch (err: any) {
            loyaltyWarn(
                `Failed ${item.entity_type} id=${item.payload?.id}:`,
                err.message || err
            );
            failed++;

            if (item.id) {
                const retryCount = (item.retry_count || 0) + 1;
                const isPermanent = retryCount > MAX_RETRY_COUNT;

                await db.loyalty_sync_queue.update(item.id, {
                    status: isPermanent ? 'failed' : 'pending',
                    error: err.message || 'Sync failed',
                    retry_count: retryCount,
                    failed_at: isPermanent
                        ? new Date().toISOString()
                        : undefined,
                });
            }
        }
    }

    loyaltyLog(`Batch complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
}

// =============================================
// PENDING COUNT (for UI badge)
// =============================================
export async function getLoyaltyPendingCount(): Promise<number> {
    return db.loyalty_sync_queue.where('status').equals('pending').count();
}

// =============================================
// STATS (for monitoring)
// =============================================
export async function getLoyaltyQueueStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    total: number;
}> {
    const [pending, syncing, failed, total] = await Promise.all([
        db.loyalty_sync_queue.where('status').equals('pending').count(),
        db.loyalty_sync_queue.where('status').equals('syncing').count(),
        db.loyalty_sync_queue.where('status').equals('failed').count(),
        db.loyalty_sync_queue.count(),
    ]);
    return { pending, syncing, failed, total };
}

// =============================================
// MANUAL RECOVERY: Retry failed items
// =============================================
export async function retryFailedLoyaltyItems(): Promise<number> {
    const failed = await db.loyalty_sync_queue
        .where('status')
        .equals('failed')
        .toArray();

    for (const item of failed) {
        if (item.id) {
            await db.loyalty_sync_queue.update(item.id, {
                status: 'pending',
                error: null,
                retry_count: 0,
            });
        }
    }
    return failed.length;
}

// =============================================
// CLEANUP: Purge old synced/failed items
// =============================================
export async function cleanupLoyaltyQueue(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffStr = cutoff.toISOString();

    const old = await db.loyalty_sync_queue
        .where('created_at')
        .below(cutoffStr)
        .filter(item => item.status === 'synced' || item.status === 'failed')
        .toArray();

    const ids = old.map(i => i.id).filter((id): id is number => id !== undefined);
    if (ids.length > 0) {
        await db.loyalty_sync_queue.bulkDelete(ids);
    }
    return ids.length;
}