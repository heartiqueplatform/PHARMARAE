// lib/supabase/loyalty/utils.ts
import { db } from '../../db';

export function normalizePharmacyName(name: string): string {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function mapLoyaltyEntityToTable(entityType: string): string {
    const mapping: Record<string, string> = {
        'customers_loyalty_transactions': 'customers_loyalty_transactions',
        'customers_rewards_catalog': 'customers_rewards_catalog',
        'customers_loyalty_card_orders': 'customers_loyalty_card_orders',
        'loyalty_transaction': 'customers_loyalty_transactions',
        'reward_catalog': 'customers_rewards_catalog',
        'loyalty_card_order': 'customers_loyalty_card_orders',
    };
    return mapping[entityType] || entityType;
}

export const LOYALTY_TABLE_CONFIGS: Array<{
    table: string;
    dbKey: string;
}> = [
        { table: 'customers_loyalty_transactions', dbKey: 'customers_loyalty_transactions' },
        { table: 'customers_rewards_catalog', dbKey: 'customers_rewards_catalog' },
        { table: 'customers_loyalty_card_orders', dbKey: 'customers_loyalty_card_orders' },
    ];

// =============================================
// DEBUG LOGGING — same pattern as main pull
//   localStorage.setItem('medp_loyalty_debug', 'true')
// =============================================
export function loyaltyDebugEnabled(): boolean {
    try { return localStorage.getItem('medp_loyalty_debug') === 'true'; }
    catch { return false; }
}

export function loyaltyLog(...args: any[]) {
    if (loyaltyDebugEnabled()) console.log('[LOYALTY]', ...args);
}

export function loyaltyWarn(...args: any[]) {
    console.warn('[LOYALTY]', ...args);
}
