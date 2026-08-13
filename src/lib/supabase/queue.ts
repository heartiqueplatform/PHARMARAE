// lib/supabase/queue.ts
import { db } from '../db';
import { OfflineSyncItem } from '../../types';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { mapEntityTypeToTable, normalizePharmacyName } from './utils';

export async function queueOfflineMutation(
    pharmacyName: string,
    userId: string,
    entityType: OfflineSyncItem['entity_type'],
    operation: OfflineSyncItem['operation'],
    payload: any
) {
    const normalizedName = normalizePharmacyName(pharmacyName);

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

    if (navigator.onLine && isSupabaseConfigured()) {
        processOfflineSyncQueue().catch(console.error);
    }
}

export async function processOfflineSyncQueue(): Promise<{ synced: number; failed: number }> {
    const client = getSupabaseClient();

    if (!navigator.onLine) {
        console.log('📴 Offline - cannot process sync queue');
        return { synced: 0, failed: 0 };
    }

    if (!client || !isSupabaseConfigured()) {
        console.log('⚠️ No Supabase client or not configured');
        return { synced: 0, failed: 0 };
    }

    const pendingItems = await db.sync_queue
        .where('status')
        .equals('pending')
        .toArray();

    if (pendingItems.length === 0) {
        return { synced: 0, failed: 0 };
    }

    console.log(`📤 Processing ${pendingItems.length} pending sync items...`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
        try {
            if (!item.id) continue;

            await db.sync_queue.update(item.id, { status: 'syncing' });

            const tableName = mapEntityTypeToTable(item.entity_type);
            let error: any = null;

            if (item.operation === 'INSERT') {
                const { error: insertErr } = await client
                    .from(tableName)
                    .upsert(item.payload, { onConflict: 'id' });
                error = insertErr;
            } else if (item.operation === 'UPDATE') {
                const { error: updateErr } = await client
                    .from(tableName)
                    .update(item.payload)
                    .eq('id', item.payload.id);
                error = updateErr;
            } else if (item.operation === 'DELETE') {
                const { error: delErr } = await client
                    .from(tableName)
                    .delete()
                    .eq('id', item.payload.id);
                error = delErr;
            }

            if (error) throw error;

            await db.sync_queue.update(item.id, { status: 'synced' });
            await db.sync_queue.delete(item.id);
            syncedCount++;
        } catch (err: any) {
            failedCount++;
            console.error(`❌ Sync failed for item ${item.id}:`, err.message);
            if (item.id) {
                await db.sync_queue.update(item.id, {
                    status: 'failed',
                    retry_count: (item.retry_count || 0) + 1,
                    error: err.message || 'Network sync error'
                });
            }
        }
    }

    console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);
    return { synced: syncedCount, failed: failedCount };
}