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
  // 🆕 SECURITY FUNCTIONS
  changeUserPin,
  changeUserPassword,
  deleteAccount,
  canDeleteProfile
} from './supabase/client';

// Queue
export {
  queueOfflineMutation,
  processOfflineSyncQueue
} from './supabase/queue';

// Pull
export {
  pullFromSupabaseToLocal,
  smartPullFromSupabase
} from './supabase/pull';

// Utils
export {
  normalizePharmacyName,
  mapEntityTypeToTable,
  TABLE_CONFIGS,
  clearPharmacyData,
  checkDataExistsInSupabase
} from './supabase/utils';

// Legacy function for backward compatibility
export async function forceSyncAllData(pharmacyName: string): Promise<boolean> {
  const { processOfflineSyncQueue } = await import('./supabase/queue');
  const { pullFromSupabaseToLocal } = await import('./supabase/pull');
  const { normalizePharmacyName } = await import('./supabase/utils');

  console.log(`🔄 Force syncing all data for: ${pharmacyName}`);

  const { synced, failed } = await processOfflineSyncQueue();
  console.log(`📤 Processed ${synced} mutations, ${failed} failed`);

  const pulled = await pullFromSupabaseToLocal(pharmacyName);
  console.log(`📥 Pulled data: ${pulled ? 'success' : 'failed'}`);

  return pulled;
}