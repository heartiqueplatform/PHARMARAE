// types/subscription.ts

export type PlanCode = 'free' | 'premium';

export type SubscriptionStatus =
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'expired';

export interface PlanFeatures {
    // Core pharmacy operations (always true on both plans)
    pos: boolean;
    inventory: boolean;
    customers: boolean;
    suppliers: boolean;
    loyalty: boolean;
    stockTracking: boolean;
    basicSalesOverview: boolean;
    basicStockOverview: boolean;
    activityTracking: boolean;

    // Premium-only
    businessIntelligence: boolean;
    dailyReport: boolean;
    advancedReporting: boolean;
}

export interface PlanLimits {
    maxProducts: number | null;   // null = unlimited
}

export interface SubscriptionPlan {
    id: string;
    code: PlanCode;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    features: PlanFeatures;
    limits: PlanLimits;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface LocalSubscription {
    id: string;
    pharmacy_name: string;
    plan_code: PlanCode;
    status: SubscriptionStatus;
    current_period_start: string | null;
    current_period_end: string | null;
    canceled_at: string | null;
    auto_renew: boolean;
    provider: string | null;
    provider_customer_id: string | null;
    provider_subscription_id: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    // Local-only — set by the app when we last pulled from Supabase
    last_synced_at?: string;
}

export interface SubscriptionPayment {
    id: string;
    pharmacy_name: string;
    subscription_id: string | null;
    amount: number;
    currency: string;
    provider: string;
    provider_payment_id: string | null;
    provider_reference: string | null;
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    period_start: string | null;
    period_end: string | null;
    paid_at: string | null;
    failure_reason: string | null;
    metadata: Record<string, any>;
    created_at: string;
}