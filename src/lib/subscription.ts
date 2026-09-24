// lib/subscription.ts
import type {
    LocalSubscription,
    PlanFeatures,
    PlanLimits,
    PlanCode,
} from '../types/subscription';

// =============================================
// FALLBACKS
// Used when we have no subscription loaded yet (first launch, offline, etc).
// Treat the user as FREE — never lock the app open, never lock it shut.
// =============================================
export const FREE_FEATURES: PlanFeatures = {
    pos: true,
    inventory: true,
    customers: true,
    suppliers: true,
    loyalty: true,
    stockTracking: true,
    basicSalesOverview: true,
    basicStockOverview: true,
    activityTracking: true,
    businessIntelligence: false,
    dailyReport: false,
    advancedReporting: false,
};

export const FREE_LIMITS: PlanLimits = {
    maxProducts: 120,
};

// =============================================
// STATUS CHECKS
// =============================================

/**
 * A subscription is "usable" if status is active AND we haven't blown past
 * the period end. If period_end is null, we trust the status alone.
 */
export function isSubscriptionActive(
    sub: LocalSubscription | null | undefined
): boolean {
    if (!sub) return false;
    if (sub.status !== 'active') return false;

    if (sub.current_period_end) {
        const end = new Date(sub.current_period_end).getTime();
        return Date.now() < end;
    }
    return true;
}

/**
 * True when status is active but period end has passed.
 * Soft lock — user should see a "renew" prompt but we don't nuke their data.
 */
export function isPastDue(
    sub: LocalSubscription | null | undefined
): boolean {
    if (!sub) return false;
    if (sub.status !== 'active' && sub.status !== 'past_due') return false;
    if (!sub.current_period_end) return false;
    return Date.now() > new Date(sub.current_period_end).getTime();
}

/**
 * Days until the current period ends. Returns 0 if already past.
 */
export function daysUntilRenewal(
    sub: LocalSubscription | null | undefined
): number {
    if (!sub?.current_period_end) return 0;
    const diff = new Date(sub.current_period_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

// =============================================
// PLAN CHECKS
// =============================================

export function isPremium(
    sub: LocalSubscription | null | undefined
): boolean {
    return sub?.plan_code === 'premium' && isSubscriptionActive(sub);
}

export function isFree(
    sub: LocalSubscription | null | undefined
): boolean {
    return !isPremium(sub);
}

// =============================================
// FEATURE ACCESS
// =============================================

export type FeatureKey = keyof PlanFeatures;

/**
 * Can this subscription use this feature?
 *
 * Rule: if premium is active → use premium features.
 *       otherwise → use FREE features.
 */
export function canAccessFeature(
    sub: LocalSubscription | null | undefined,
    feature: FeatureKey
): boolean {
    if (isPremium(sub)) {
        // Premium unlocks everything
        return true;
    }
    return FREE_FEATURES[feature] ?? false;
}

// =============================================
// LIMIT CHECKS
// =============================================

export type LimitKey = keyof PlanLimits;

/**
 * Effective limits for the current plan.
 * Premium = unlimited products. FREE = 120.
 */
export function getEffectiveLimits(
    sub: LocalSubscription | null | undefined
): PlanLimits {
    if (isPremium(sub)) {
        return { maxProducts: null };
    }
    return FREE_LIMITS;
}

/**
 * Has this pharmacy hit the limit?
 * Returns false when limit is null (unlimited).
 */
export function hasReachedLimit(
    sub: LocalSubscription | null | undefined,
    limitKey: LimitKey,
    currentCount: number
): boolean {
    const limits = getEffectiveLimits(sub);
    const max = limits[limitKey];
    if (max === null) return false;
    return currentCount >= max;
}

/**
 * How many more items can they add?
 * Returns null for unlimited.
 */
export function remainingQuota(
    sub: LocalSubscription | null | undefined,
    limitKey: LimitKey,
    currentCount: number
): number | null {
    const limits = getEffectiveLimits(sub);
    const max = limits[limitKey];
    if (max === null) return null;
    return Math.max(0, max - currentCount);
}

// =============================================
// DISPLAY HELPERS
// =============================================

export function getPlanLabel(planCode: PlanCode | null | undefined): string {
    return planCode === 'premium' ? 'Premium' : 'Free';
}

export function getStatusLabel(sub: LocalSubscription | null | undefined): string {
    if (!sub) return 'Free Plan';
    if (isPremium(sub)) return 'Premium Active';
    if (isPastDue(sub)) return 'Renewal Due';
    return 'Free Plan';
}

export function getUpgradeMessage(feature: FeatureKey): string {
    const messages: Record<FeatureKey, string> = {
        pos: 'Available on Free',
        inventory: 'Available on Free',
        customers: 'Available on Free',
        suppliers: 'Available on Free',
        loyalty: 'Available on Free',
        stockTracking: 'Available on Free',
        basicSalesOverview: 'Available on Free',
        basicStockOverview: 'Available on Free',
        activityTracking: 'Available on Free',
        businessIntelligence:
            'Upgrade to Premium to unlock Business Intelligence — see trends, best sellers, and profit insights.',
        dailyReport:
            'Upgrade to Premium to receive a daily pharmacy report every day.',
        advancedReporting:
            'Upgrade to Premium to unlock weekly trends, monthly trends, and detailed product performance.',
    };
    return messages[feature];
}

// =============================================
// NORMALIZERS (for Supabase JSONB)
// =============================================

/**
 * Supabase returns JSONB as plain objects usually, but sometimes as strings
 * depending on driver config. Normalize both.
 */
export function normalizeFeatures(raw: any): PlanFeatures {
    const obj = coerceToObject(raw);
    return { ...FREE_FEATURES, ...obj };
}

export function normalizeLimits(raw: any): PlanLimits {
    const obj = coerceToObject(raw);
    // maxProducts can legitimately be null (unlimited) — don't let the
    // spread overwrite it with a fallback 120.
    if ('maxProducts' in obj && obj.maxProducts === null) {
        return { maxProducts: null };
    }
    return { ...FREE_LIMITS, ...obj };
}

function coerceToObject(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    if (typeof raw === 'object') return raw;
    return {};
}