// lib/supabase/loyalty/index.ts

// =============================================
// QUEUE EXPORTS
// =============================================
export {
    queueLoyaltyMutation,
    processLoyaltyQueue,
    getLoyaltyPendingCount,
    getLoyaltyQueueStats,
    retryFailedLoyaltyItems,
    cleanupLoyaltyQueue,
    LOYALTY_ENTITY_TYPES,
} from './queue';

// =============================================
// PULL EXPORTS
// =============================================
export {
    pullLoyaltyData,
    fullResyncLoyaltyData,
    getLocalLoyaltyCounts,
    getRemoteLoyaltyCounts,
} from './pull';

// =============================================
// CLIENT EXPORTS
// =============================================
export {
    getLoyaltyClient,
} from './client';

// =============================================
// UTILS EXPORTS
// =============================================
export {
    mapLoyaltyEntityToTable,
    normalizePharmacyName,
    LOYALTY_TABLE_CONFIGS,
    loyaltyLog,
    loyaltyWarn,
    loyaltyDebugEnabled,
} from './utils';