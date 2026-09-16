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

export const LOYALTY_TABLE_CONFIGS = [
    { table: 'customers_loyalty_transactions', dbKey: 'customers_loyalty_transactions' },
    { table: 'customers_rewards_catalog', dbKey: 'customers_rewards_catalog' },
    { table: 'customers_loyalty_card_orders', dbKey: 'customers_loyalty_card_orders' },
];