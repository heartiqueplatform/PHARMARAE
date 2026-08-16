// lib/supabase/queue.ts - COMPLETE FIXED VERSION

import { db } from '../db';
import { OfflineSyncItem } from '../../types';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { mapEntityTypeToTable, normalizePharmacyName } from './utils';

// =============================================
// QUEUE MUTATION - WITH DEDUPLICATION
// =============================================
export async function queueOfflineMutation(
    pharmacyName: string,
    userId: string,
    entityType: OfflineSyncItem['entity_type'],
    operation: OfflineSyncItem['operation'],
    payload: any
) {
    const normalizedName = normalizePharmacyName(pharmacyName);

    // ✅ PREVENT DUPLICATES: Check for existing pending/syncing item
    if (payload.id) {
        const existing = await db.sync_queue
            .filter(item =>
                item.entity_type === entityType &&
                item.payload.id === payload.id &&
                (item.status === 'pending' || item.status === 'syncing')
            )
            .first();

        if (existing && existing.id) {
            const mergedPayload = {
                ...existing.payload,
                ...payload,
                updated_at: new Date().toISOString()
            };

            await db.sync_queue.update(existing.id, {
                payload: mergedPayload,
                retry_count: 0,
                error: null,
                status: 'pending'
            });

            console.log(`🔄 Updated existing queue item ${existing.id}`);
            return;
        }
    }

    const syncId = 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const item: OfflineSyncItem = {
        sync_id: syncId,
        pharmacy_name: normalizedName,
        user_id: userId,
        entity_type: entityType,
        operation,
        payload: {
            ...payload,
            pharmacy_name: normalizedName
        },
        created_at: new Date().toISOString(),
        status: 'pending',
        retry_count: 0
    };

    await db.sync_queue.add(item);
    console.log(`✅ Queued new item: ${syncId}`);

    if (navigator.onLine && isSupabaseConfigured()) {
        processOfflineSyncQueue().catch(() => { });
    }
}

export async function processOfflineSyncQueue(): Promise<{ synced: number; failed: number }> {
    const client = getSupabaseClient();

    if (!navigator.onLine || !client || !isSupabaseConfigured()) {
        return { synced: 0, failed: 0 };
    }

    // Reset ALL stuck items
    const allItems = await db.sync_queue.toArray();
    const stuckItems = allItems.filter(item => item.status === 'syncing' || item.status === 'failed');

    for (const item of stuckItems) {
        if (item.id) {
            await db.sync_queue.update(item.id, {
                status: 'pending',
                error: null,
                retry_count: 0
            });
        }
    }

    const pendingItems = await db.sync_queue
        .where('status')
        .equals('pending')
        .toArray();

    if (pendingItems.length === 0) {
        return { synced: 0, failed: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
        const tableName = mapEntityTypeToTable(item.entity_type);
        const operation = item.operation || 'INSERT';

        try {
            let error: any = null;

            if (operation === 'DELETE') {
                // ✅ DELETE: Remove the entire row
                const { error: delErr } = await client
                    .from(tableName)
                    .delete()
                    .eq('id', item.payload.id)
                    .eq('pharmacy_name', item.pharmacy_name);
                error = delErr;
            } else if (operation === 'UPDATE') {
                // ✅ UPDATE: Update the row
                const payload = {
                    ...item.payload,
                    pharmacy_name: item.pharmacy_name,
                    updated_at: new Date().toISOString()
                };

                const { error: updateErr } = await client
                    .from(tableName)
                    .update(payload)
                    .eq('id', item.payload.id)
                    .eq('pharmacy_name', item.pharmacy_name);
                error = updateErr;
            } else {
                // ✅ INSERT: Insert new row
                const payload = {
                    ...item.payload,
                    pharmacy_name: item.pharmacy_name,
                    updated_at: new Date().toISOString()
                };

                // Ensure 'name' is included for products
                if (tableName === 'products' && !payload.name) {
                    const localProduct = await db.products.get(payload.id);
                    if (localProduct) {
                        payload.name = localProduct.name;
                    } else {
                        payload.name = 'Unknown Product';
                    }
                }

                const { error: insertErr } = await client
                    .from(tableName)
                    .upsert(payload, { onConflict: 'id' });
                error = insertErr;
            }

            if (error) throw error;

            if (item.id) {
                await db.sync_queue.delete(item.id);
                syncedCount++;
            }

        } catch (err: any) {
            failedCount++;
            console.error(`Failed to sync item ${item.id}:`, err);

            if (item.id) {
                const retryCount = (item.retry_count || 0) + 1;
                if (retryCount > 5) {
                    await db.sync_queue.update(item.id, {
                        status: 'failed',
                        retry_count: retryCount,
                        error: `Failed ${retryCount} times: ${err.message}`
                    });
                } else {
                    await db.sync_queue.update(item.id, {
                        status: 'pending',
                        retry_count: retryCount,
                        error: err.message || 'Network sync error'
                    });
                }
            }
        }
    }

    return { synced: syncedCount, failed: failedCount };
}

// lib/supabase/queue.ts - Updated processSingleSyncItem

export async function processSingleSyncItem(item: OfflineSyncItem): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
        return { success: false, error: 'No Supabase client available' };
    }

    try {
        const tableName = mapEntityTypeToTable(item.entity_type);
        const operation = item.operation || 'INSERT';

        let error: any = null;

        if (operation === 'DELETE') {
            // ✅ DELETE: Remove the entire row
            const { error: delErr } = await client
                .from(tableName)
                .delete()
                .eq('id', item.payload.id);

            // If the row doesn't exist, that's fine - consider it synced
            if (delErr && delErr.code === 'PGRST116') {
                // Row not found - consider it already deleted
                error = null;
            } else {
                error = delErr;
            }
        } else if (operation === 'UPDATE') {
            const payload = {
                ...item.payload,
                pharmacy_name: item.pharmacy_name,
                updated_at: new Date().toISOString()
            };

            const { error: updateErr } = await client
                .from(tableName)
                .update(payload)
                .eq('id', item.payload.id)
                .eq('pharmacy_name', item.pharmacy_name);
            error = updateErr;
        } else {
            // INSERT
            const payload = {
                ...item.payload,
                pharmacy_name: item.pharmacy_name,
                updated_at: new Date().toISOString()
            };

            const { error: insertErr } = await client
                .from(tableName)
                .upsert(payload, { onConflict: 'id' });
            error = insertErr;
        }

        if (error) {
            throw error;
        }

        if (item.id) {
            await db.sync_queue.update(item.id, {
                status: 'synced',
                synced_at: new Date().toISOString()
            });
            await db.sync_queue.delete(item.id);
        }

        return { success: true };
    } catch (err: any) {
        if (item.id) {
            const retryCount = (item.retry_count || 0) + 1;
            if (retryCount > 5) {
                await db.sync_queue.update(item.id, {
                    status: 'failed',
                    retry_count: retryCount,
                    error: `Failed ${retryCount} times: ${err.message}`
                });
            } else {
                await db.sync_queue.update(item.id, {
                    status: 'pending',
                    retry_count: retryCount,
                    error: err.message || 'Network sync error'
                });
            }
        }
        return { success: false, error: err.message };
    }
}
// =============================================
// RESET STUCK ITEMS
// =============================================
export async function resetStuckItems(): Promise<number> {
    let count = 0;
    const stuckItems = await db.sync_queue
        .where('status')
        .anyOf(['syncing', 'failed'])
        .toArray();

    for (const item of stuckItems) {
        if (item.id) {
            await db.sync_queue.update(item.id, {
                status: 'pending',
                error: null,
                retry_count: 0
            });
            count++;
        }
    }

    return count;
}

// =============================================
// CLEANUP OLD STUCK ITEMS
// =============================================
export async function cleanupStuckItems(): Promise<number> {
    let count = 0;
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const cutoffStr = oneHourAgo.toISOString();

    const oldItems = await db.sync_queue
        .where('created_at')
        .below(cutoffStr)
        .filter(item => item.status === 'syncing' || item.status === 'failed')
        .toArray();

    for (const item of oldItems) {
        if (item.id) {
            await db.sync_queue.delete(item.id);
            count++;
        }
    }

    return count;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

let cachedPendingCount = 0;
let cachedPendingCountTime = 0;
const PENDING_COUNT_CACHE_TTL = 5000;

export async function getPendingSyncCount(pharmacyName: string): Promise<number> {
    const now = Date.now();

    if (cachedPendingCountTime > 0 && (now - cachedPendingCountTime) < PENDING_COUNT_CACHE_TTL) {
        return cachedPendingCount;
    }

    const normalizedName = normalizePharmacyName(pharmacyName);
    const count = await db.sync_queue
        .where('[pharmacy_name+status]')
        .equals([normalizedName, 'pending'])
        .count();

    cachedPendingCount = count;
    cachedPendingCountTime = now;

    return count;
}

export async function clearOldSyncRecords(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffStr = cutoffDate.toISOString();

    const oldSynced = await db.sync_queue
        .where('status')
        .equals('synced')
        .and(item => item.synced_at !== undefined && item.synced_at < cutoffStr)
        .toArray();

    let deleted = 0;
    const idsToDelete: number[] = [];

    for (const item of oldSynced) {
        if (item.id) {
            idsToDelete.push(item.id);
            deleted++;
        }
    }

    if (idsToDelete.length > 0) {
        await db.sync_queue.bulkDelete(idsToDelete);
    }

    return deleted;
}

export async function getQueueStats(pharmacyName: string): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    permanent_failure: number;
    total: number;
}> {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const [pending, syncing, failed, permanent_failure, total] = await Promise.all([
        db.sync_queue.where('[pharmacy_name+status]').equals([normalizedName, 'pending']).count(),
        db.sync_queue.where('[pharmacy_name+status]').equals([normalizedName, 'syncing']).count(),
        db.sync_queue.where('[pharmacy_name+status]').equals([normalizedName, 'failed']).count(),
        db.sync_queue.where('[pharmacy_name+status]').equals([normalizedName, 'permanent_failure']).count(),
        db.sync_queue.where('pharmacy_name').equals(normalizedName).count()
    ]);

    return {
        pending,
        syncing,
        failed,
        permanent_failure,
        total
    };
}

export async function retryFailedSyncItems(pharmacyName: string): Promise<number> {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const failedItems = await db.sync_queue
        .where('[pharmacy_name+status]')
        .equals([normalizedName, 'failed'])
        .toArray();

    let retried = 0;

    for (const item of failedItems) {
        if (item.id) {
            await db.sync_queue.update(item.id, {
                status: 'pending',
                error: null
            });
            retried++;
        }
    }

    return retried;
}

export async function cancelPendingSyncItems(pharmacyName: string): Promise<number> {
    const normalizedName = normalizePharmacyName(pharmacyName);

    const pendingItems = await db.sync_queue
        .where('[pharmacy_name+status]')
        .equals([normalizedName, 'pending'])
        .toArray();

    const idsToDelete = pendingItems
        .map(item => item.id)
        .filter((id): id is number => id !== undefined && id !== null);

    if (idsToDelete.length > 0) {
        await db.sync_queue.bulkDelete(idsToDelete);
    }

    return idsToDelete.length;
}