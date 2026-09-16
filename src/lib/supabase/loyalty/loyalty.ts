// services/supabase/loyalty.ts
import { supabase } from '../client';
import {
    Customer,
    LoyaltyTransaction,
    RewardCatalog,
    LoyaltyCardOrder,
    LoyaltyTransactionType
} from '../../types';

// =============================================
// CUSTOMER LOYALTY OPERATIONS
// =============================================

export async function getCustomerLoyaltySummary(customerId: string) {
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

    if (customerError) throw customerError;

    const { data: transactions, error: txError } = await supabase
        .from('customers_loyalty_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (txError) throw txError;

    return {
        customer,
        transactions: transactions || [],
        pointsBalance: customer?.loyalty_points || 0,
        totalEarned: (transactions || [])
            .filter(t => t.points > 0)
            .reduce((sum, t) => sum + t.points, 0),
        totalRedeemed: (transactions || [])
            .filter(t => t.points < 0)
            .reduce((sum, t) => sum + Math.abs(t.points), 0),
    };
}

export async function getCustomerByPhone(pharmacyName: string, phone: string) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_name', pharmacyName)
        .eq('phone', phone)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getCustomerByLoyaltyCard(pharmacyName: string, cardNumber: string) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_name', pharmacyName)
        .eq('loyalty_card_number', cardNumber)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function searchCustomers(
    pharmacyName: string,
    query: string,
    limit: number = 20
) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_name', pharmacyName)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,loyalty_card_number.ilike.%${query}%`)
        .limit(limit)
        .order('name');

    if (error) throw error;
    return data;
}

export async function createCustomer(customerData: Partial<Customer>) {
    const { data, error } = await supabase
        .from('customers')
        .insert([{
            ...customerData,
            loyalty_points: customerData.loyalty_points || 0,
            total_points_earned: 0,
            total_points_redeemed: 0,
            visit_count: 0,
            is_loyalty_member: customerData.is_loyalty_member || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
        .from('customers')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// LOYALTY TRANSACTIONS
// =============================================

export async function addLoyaltyPoints(
    pharmacyName: string,
    customerId: string,
    points: number,
    type: LoyaltyTransactionType,
    triggerRule: string | null,
    description: string,
    saleId?: string,
    createdBy?: string
) {
    // Get current customer balance
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('loyalty_points, total_points_earned, total_points_redeemed, visit_count, total_spent')
        .eq('id', customerId)
        .single();

    if (customerError) throw customerError;

    const newBalance = (customer.loyalty_points || 0) + points;

    // Create transaction
    const { data: transaction, error: txError } = await supabase
        .from('customers_loyalty_transactions')
        .insert([{
            pharmacy_name: pharmacyName,
            customer_id: customerId,
            sale_id: saleId || null,
            points: points,
            balance_after: newBalance,
            transaction_type: type,
            trigger_rule: triggerRule,
            reward_id: null,
            reward_name: null,
            description: description,
            metadata: { points_added: points, trigger_rule: triggerRule },
            created_at: new Date().toISOString(),
            created_by: createdBy || 'system'
        }])
        .select()
        .single();

    if (txError) throw txError;

    // Update customer
    const updates: any = {
        loyalty_points: newBalance,
        updated_at: new Date().toISOString()
    };

    if (points > 0) {
        updates.total_points_earned = (customer.total_points_earned || 0) + points;
        updates.visit_count = (customer.visit_count || 0) + 1;
        updates.last_visit_date = new Date().toISOString();
        if (!customer.first_visit_date) {
            updates.first_visit_date = new Date().toISOString();
        }
    } else {
        updates.total_points_redeemed = (customer.total_points_redeemed || 0) + Math.abs(points);
    }

    const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction;
}

export async function redeemReward(
    pharmacyName: string,
    customerId: string,
    rewardId: string,
    createdBy: string
): Promise<{ success: boolean; message: string; transaction?: LoyaltyTransaction }> {
    // Get customer and reward
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

    if (customerError) return { success: false, message: 'Customer not found' };

    const { data: reward, error: rewardError } = await supabase
        .from('customers_rewards_catalog')
        .select('*')
        .eq('id', rewardId)
        .single();

    if (rewardError || !reward) return { success: false, message: 'Reward not available' };
    if (!reward.is_active) return { success: false, message: 'Reward is not active' };

    if ((customer.loyalty_points || 0) < reward.points_required) {
        return {
            success: false,
            message: `Insufficient points. Need ${reward.points_required}, have ${customer.loyalty_points}`
        };
    }

    // Check max redemptions
    if (reward.max_redemptions_per_customer) {
        const { count, error: countError } = await supabase
            .from('customers_loyalty_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId)
            .eq('transaction_type', 'redeem_reward')
            .eq('reward_id', rewardId);

        if (!countError && count && count >= reward.max_redemptions_per_customer) {
            return {
                success: false,
                message: `Maximum redemptions (${reward.max_redemptions_per_customer}) reached for this reward`
            };
        }
    }

    const newPoints = (customer.loyalty_points || 0) - reward.points_required;

    // Create redemption transaction
    const { data: transaction, error: txError } = await supabase
        .from('customers_loyalty_transactions')
        .insert([{
            pharmacy_name: pharmacyName,
            customer_id: customerId,
            sale_id: null,
            points: -reward.points_required,
            balance_after: newPoints,
            transaction_type: 'redeem_reward',
            trigger_rule: null,
            reward_id: reward.id,
            reward_name: reward.name,
            description: `Redeemed: ${reward.name}`,
            metadata: { reward_id: reward.id, reward_name: reward.name },
            created_at: new Date().toISOString(),
            created_by: createdBy
        }])
        .select()
        .single();

    if (txError) return { success: false, message: txError.message };

    // Update customer
    const { error: updateError } = await supabase
        .from('customers')
        .update({
            loyalty_points: newPoints,
            total_points_redeemed: (customer.total_points_redeemed || 0) + reward.points_required,
            updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

    if (updateError) return { success: false, message: updateError.message };

    return {
        success: true,
        message: `Redeemed ${reward.name} for ${reward.points_required} points`,
        transaction
    };
}

export async function getCustomerTransactions(
    customerId: string,
    limit: number = 50
) {
    const { data, error } = await supabase
        .from('customers_loyalty_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

// =============================================
// REWARDS CATALOG
// =============================================

export async function getRewardsCatalog(pharmacyName: string, onlyActive: boolean = true) {
    let query = supabase
        .from('customers_rewards_catalog')
        .select('*')
        .or(`pharmacy_name.eq.SYSTEM,pharmacy_name.eq.${pharmacyName}`);

    if (onlyActive) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Remove duplicates (pharmacy-specific overrides SYSTEM)
    const seen = new Set();
    const unique = (data || []).filter(reward => {
        const key = reward.category;
        if (seen.has(key) && reward.pharmacy_name !== 'SYSTEM') {
            return false;
        }
        seen.add(key);
        return true;
    });

    return unique;
}

export async function getRewardById(rewardId: string) {
    const { data, error } = await supabase
        .from('customers_rewards_catalog')
        .select('*')
        .eq('id', rewardId)
        .single();

    if (error) throw error;
    return data;
}

export async function updateReward(rewardId: string, updates: Partial<RewardCatalog>) {
    const { data, error } = await supabase
        .from('customers_rewards_catalog')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', rewardId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function createCustomReward(rewardData: Omit<RewardCatalog, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('customers_rewards_catalog')
        .insert([{
            ...rewardData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// LOYALTY CARD ORDERS
// =============================================

export async function createCardOrder(orderData: Omit<LoyaltyCardOrder, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('customers_loyalty_card_orders')
        .insert([{
            ...orderData,
            status: orderData.status || 'pending',
            payment_status: orderData.payment_status || 'pending',
            ordered_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getCardOrders(pharmacyName: string, limit: number = 50) {
    const { data, error } = await supabase
        .from('customers_loyalty_card_orders')
        .select('*')
        .eq('pharmacy_name', pharmacyName)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getCardOrderById(orderId: string) {
    const { data, error } = await supabase
        .from('customers_loyalty_card_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error) throw error;
    return data;
}

export async function updateCardOrder(orderId: string, updates: Partial<LoyaltyCardOrder>) {
    const { data, error } = await supabase
        .from('customers_loyalty_card_orders')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// LOYALTY REPORTS & ANALYTICS
// =============================================

export async function getTopCustomers(pharmacyName: string, limit: number = 10) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_name', pharmacyName)
        .eq('is_loyalty_member', true)
        .order('loyalty_points', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getLoyaltySummary(pharmacyName: string) {
    const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('loyalty_points, total_points_earned, total_points_redeemed, is_loyalty_member')
        .eq('pharmacy_name', pharmacyName);

    if (customerError) throw customerError;

    const { data: transactions, error: txError } = await supabase
        .from('customers_loyalty_transactions')
        .select('points, transaction_type, created_at')
        .eq('pharmacy_name', pharmacyName)
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

    if (txError) throw txError;

    const totalCustomers = customers?.length || 0;
    const loyaltyMembers = customers?.filter(c => c.is_loyalty_member).length || 0;
    const totalPointsEarned = customers?.reduce((sum, c) => sum + (c.total_points_earned || 0), 0) || 0;
    const totalPointsRedeemed = customers?.reduce((sum, c) => sum + (c.total_points_redeemed || 0), 0) || 0;
    const currentPointsBalance = customers?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) || 0;

    const recentTransactions = transactions?.slice(0, 50) || [];

    return {
        totalCustomers,
        loyaltyMembers,
        totalPointsEarned,
        totalPointsRedeemed,
        currentPointsBalance,
        recentTransactions,
        conversionRate: totalCustomers > 0 ? (loyaltyMembers / totalCustomers) * 100 : 0
    };
}

export async function getPointsHistory(pharmacyName: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('customers_loyalty_transactions')
        .select('points, transaction_type, created_at')
        .eq('pharmacy_name', pharmacyName)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by day
    const grouped: { [key: string]: { earned: number; redeemed: number } } = {};
    (data || []).forEach(t => {
        const day = t.created_at.split('T')[0];
        if (!grouped[day]) {
            grouped[day] = { earned: 0, redeemed: 0 };
        }
        if (t.points > 0) {
            grouped[day].earned += t.points;
        } else {
            grouped[day].redeemed += Math.abs(t.points);
        }
    });

    return Object.entries(grouped).map(([date, values]) => ({
        date,
        ...values
    }));
}