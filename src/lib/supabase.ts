// lib/supabase.ts - Main entry point
// All exports from the split files - NO OTHER FILES NEED TO CHANGE

// Client
export {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isSupabaseConfigured,
  getSupabaseClient,
  getCurrentUser,
  ensureAuthenticated,
  supabase,
  changeUserPin,
  changeUserPassword,
  deleteAccount,
  canDeleteProfile
} from './supabase/client';

// Queue
export {
  queueOfflineMutation,
  processOfflineSyncQueue,
  processSingleSyncItem,
  getPendingSyncCount,
  clearOldSyncRecords,
  getQueueStats,
  retryFailedSyncItems,
  cancelPendingSyncItems
} from './supabase/queue';

// =============================================
// LOYALTY MODULE - Separate sync system
// =============================================
export {
  queueLoyaltyMutation,
  processLoyaltyQueue,
  getLoyaltyPendingCount,
  pullLoyaltyData,
  getLoyaltyClient,
  mapLoyaltyEntityToTable,
  normalizePharmacyName as normalizeLoyaltyName,
  LOYALTY_TABLE_CONFIGS
} from './supabase/loyalty';

// Pull
export {
  pullFromSupabaseToLocal,
  smartPullFromSupabase,
  incrementalPullFromSupabase,
  pullSingleTable,
  hasDataChanged
} from './supabase/pull';

// Utils
export {
  normalizePharmacyName,
  mapEntityTypeToTable,
  TABLE_CONFIGS,
  clearPharmacyData,
  checkDataExistsInSupabase,
  tableExistsInSupabase,
  getTableRowCount,
  getAllTableCounts,
  checkForChanges,
  getDataSizeEstimate,
  clearUtilsCache,
  getTableRecordsBatch,
  getLastSyncTime,
  setLastSyncTime
} from './supabase/utils';

// =============================================
// OPTIMIZED: Force sync all data
// =============================================
let forceSyncInProgress = false;

export async function forceSyncAllData(pharmacyName: string): Promise<boolean> {
  // Prevent concurrent force syncs
  if (forceSyncInProgress) {
    console.warn('[forceSyncAllData] Aborted: another force sync is in progress');
    return false;
  }

  forceSyncInProgress = true;

  try {
    const { processOfflineSyncQueue } = await import('./supabase/queue');
    const { pullFromSupabaseToLocal } = await import('./supabase/pull');
    const { normalizePharmacyName, setLastSyncTime } = await import('./supabase/utils');

    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`[forceSyncAllData] Starting for: ${normalizedName}`);

    // Process pending mutations first
    const { synced, failed } = await processOfflineSyncQueue();
    console.log(`[forceSyncAllData] Queue processed — synced: ${synced}, failed: ${failed}`);

    // Pull latest data from Supabase
    const pulled = await pullFromSupabaseToLocal(normalizedName);

    // Update last sync time on success
    if (pulled) {
      setLastSyncTime(normalizedName, new Date());
      console.log(`[forceSyncAllData] SUCCESS — last sync time updated`);
    } else {
      console.warn(`[forceSyncAllData] FAILED — last sync time NOT updated (will retry next cycle)`);
    }

    return pulled;
  } catch (error) {
    console.error('[forceSyncAllData] Unexpected error:', error);
    return false;
  } finally {
    forceSyncInProgress = false;
  }
}

// =============================================
// OPTIMIZED: Quick sync - only if needed
// =============================================
export async function quickSyncIfNeeded(pharmacyName: string): Promise<boolean> {
  const { getLastSyncTime, checkForChanges } = await import('./supabase/utils');

  const lastSync = getLastSyncTime(pharmacyName);

  // If no last sync or older than 5 minutes, do a full sync
  if (!lastSync || (Date.now() - lastSync.getTime() > 300000)) {
    console.log('[quickSyncIfNeeded] No recent sync — triggering full sync');
    return forceSyncAllData(pharmacyName);
  }

  // Check for changes
  const { hasChanges, tables, checkFailed } = await checkForChanges(pharmacyName, lastSync);

  if (checkFailed) {
    // Could not determine what changed — do NOT report success
    console.warn('[quickSyncIfNeeded] Change check failed — reporting failure so sync retries');
    return false;
  }

  if (!hasChanges) {
    console.log('[quickSyncIfNeeded] No changes detected — nothing to pull');
    return true;
  }

  console.log(`[quickSyncIfNeeded] Changes detected in: ${tables.join(', ')} — running incremental pull`);

  // Only pull changed tables
  const { incrementalPullFromSupabase } = await import('./supabase/pull');
  const { setLastSyncTime } = await import('./supabase/utils');

  const result = await incrementalPullFromSupabase(pharmacyName, lastSync, { tables });

  if (result.success) {
    setLastSyncTime(pharmacyName, new Date());
    console.log(`[quickSyncIfNeeded] SUCCESS — ${result.updated} rows updated, watermark advanced`);
  } else {
    console.warn(`[quickSyncIfNeeded] FAILED — watermark NOT advanced (will retry next cycle)`);
  }

  return result.success;
}

// =============================================
// OPTIMIZED: Get sync status
// =============================================
export async function getSyncStatus(pharmacyName: string): Promise<{
  isOnline: boolean;
  isConfigured: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  queueStats: {
    pending: number;
    syncing: number;
    failed: number;
    permanent_failure: number;
    total: number;
  };
}> {
  const { isSupabaseConfigured } = await import('./supabase/client');
  const { getPendingSyncCount, getQueueStats } = await import('./supabase/queue');
  const { getLastSyncTime, normalizePharmacyName } = await import('./supabase/utils');

  const normalizedName = normalizePharmacyName(pharmacyName);
  const isOnline = navigator.onLine;
  const isConfigured = isSupabaseConfigured();
  const [pendingCount, queueStats, lastSyncTime] = await Promise.all([
    getPendingSyncCount(normalizedName),
    getQueueStats(normalizedName),
    Promise.resolve(getLastSyncTime(normalizedName))
  ]);

  return {
    isOnline,
    isConfigured,
    pendingCount,
    lastSyncTime: lastSyncTime || null,
    queueStats
  };
}

// =============================================
// OPTIMIZED: Clear all data for a pharmacy
// =============================================
export async function clearAllPharmacyData(pharmacyName: string): Promise<boolean> {
  try {
    const { clearPharmacyData, normalizePharmacyName } = await import('./supabase/utils');
    const { cancelPendingSyncItems } = await import('./supabase/queue');

    const normalizedName = normalizePharmacyName(pharmacyName);
    console.log(`[clearAllPharmacyData] Clearing data for: ${normalizedName}`);

    // Cancel any pending sync items first
    await cancelPendingSyncItems(normalizedName);

    // Clear all data
    await clearPharmacyData(normalizedName);

    // Clear last sync time
    localStorage.removeItem(`medp_last_sync_${normalizedName}`);

    console.log('[clearAllPharmacyData] SUCCESS');
    return true;
  } catch (error) {
    console.error('[clearAllPharmacyData] Unexpected error:', error);
    return false;
  }
}

// =============================================
// OPTIMIZED: Health check
// =============================================
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {};
  let issues = 0;

  try {
    // Check network
    details.network = navigator.onLine ? 'online' : 'offline';
    if (!navigator.onLine) issues++;

    // Check Supabase configuration
    const { isSupabaseConfigured } = await import('./supabase/client');
    details.supabaseConfigured = isSupabaseConfigured();
    if (!details.supabaseConfigured) issues++;

    // Check IndexedDB
    try {
      const { db } = await import('./db');
      const count = await db.profiles.count();
      details.indexedDB = 'accessible';
      details.profileCount = count;
    } catch (dbError) {
      details.indexedDB = 'error';
      issues++;
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues >= 2) {
      status = 'unhealthy';
    } else if (issues >= 1) {
      status = 'degraded';
    }

    return { status, details };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: String(error) }
    };
  }
}

// =============================================
// OPTIMIZED: Repair data inconsistencies
// =============================================
export async function repairData(pharmacyName: string): Promise<{
  fixed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const { normalizePharmacyName } = await import('./supabase/utils');
  const normalizedName = normalizePharmacyName(pharmacyName);

  try {
    const { db } = await import('./db');

    // Check for products without pharmacy_name
    const invalidProducts = await db.products.where('pharmacy_name').equals('').toArray();
    if (invalidProducts.length > 0) {
      issues.push(`${invalidProducts.length} products missing pharmacy_name`);
      for (const product of invalidProducts) {
        await db.products.update(product.id, { pharmacy_name: normalizedName });
      }
    }

    // Check for sales without pharmacy_name
    const invalidSales = await db.sales.where('pharmacy_name').equals('').toArray();
    if (invalidSales.length > 0) {
      issues.push(`${invalidSales.length} sales missing pharmacy_name`);
      for (const sale of invalidSales) {
        await db.sales.update(sale.id, { pharmacy_name: normalizedName });
      }
    }

    // Check for batches without pharmacy_name
    const invalidBatches = await db.product_batches.where('pharmacy_name').equals('').toArray();
    if (invalidBatches.length > 0) {
      issues.push(`${invalidBatches.length} batches missing pharmacy_name`);
      for (const batch of invalidBatches) {
        await db.product_batches.update(batch.id, { pharmacy_name: normalizedName });
      }
    }

    // Check for sync_queue items without pharmacy_name
    const invalidSync = await db.sync_queue.where('pharmacy_name').equals('').toArray();
    if (invalidSync.length > 0) {
      issues.push(`${invalidSync.length} sync items missing pharmacy_name`);
      for (const item of invalidSync) {
        await db.sync_queue.update(item.id, { pharmacy_name: normalizedName });
      }
    }

    return {
      fixed: issues.length > 0,
      issues
    };
  } catch (error) {
    issues.push(`Repair failed: ${String(error)}`);
    return {
      fixed: false,
      issues
    };
  }
}

// =============================================
// OPTIMIZED: Export version info
// =============================================
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  string: '1.0.0'
};

// =============================================
// OPTIMIZED: Export configuration
// =============================================
export const CONFIG = {
  maxRetries: 5,
  syncInterval: 30000,
  pendingCountCacheTTL: 5000,
  rowCountCacheTTL: 30000,
  tableCacheTTL: 60000,
  maxSyncBatchSize: 100,
  syncCooldown: 60000,
  loadCooldown: 3000
};