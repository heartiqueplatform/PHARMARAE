// contexts/SubscriptionContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import {
    FREE_FEATURES,
    FREE_LIMITS,
    isPremium,
    isSubscriptionActive,
    isPastDue,
    daysUntilRenewal,
    canAccessFeature,
    hasReachedLimit,
    remainingQuota,
    normalizeFeatures,
    normalizeLimits,
    type FeatureKey,
    type LimitKey,
} from '../lib/subscription';
import type {
    LocalSubscription,
    PlanFeatures,
    PlanLimits,
    PlanCode,
} from '../types/subscription';

// =============================================
// Auto-expire: if current_period_end is in the past, downgrade locally.
// This handles the case where Supabase still says 'active' but the
// subscription period has actually ended.
// =============================================
function applyExpiryRules(sub: LocalSubscription | null): LocalSubscription | null {
    if (!sub) return null;
    if (sub.status === 'canceled' || sub.status === 'expired') return sub;
    if (!sub.current_period_end) return sub;

    const end = new Date(sub.current_period_end).getTime();
    if (Number.isNaN(end)) return sub;

    if (Date.now() > end) {
        return { ...sub, status: 'expired' };
    }
    return sub;
}

// =============================================
// CONTEXT SHAPE
// =============================================
interface SubscriptionContextValue {
    subscription: LocalSubscription | null;
    features: PlanFeatures;
    limits: PlanLimits;

    isLoading: boolean;
    isPremium: boolean;
    isActive: boolean;
    isPastDue: boolean;
    daysLeft: number;

    can: (feature: FeatureKey) => boolean;
    hasReached: (limitKey: LimitKey, currentCount: number) => boolean;
    remaining: (limitKey: LimitKey, currentCount: number) => number | null;

    refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// =============================================
// SAFE DEFAULT
// Returned when a component reads subscription state outside the
// provider tree (Vite HMR, mount races, etc). Free-tier, everything
// locked — the app renders instead of crashing.
// =============================================
const DEFAULT_CONTEXT: SubscriptionContextValue = {
    subscription: null,
    features: FREE_FEATURES,
    limits: FREE_LIMITS,
    isLoading: false,
    isPremium: false,
    isActive: false,
    isPastDue: false,
    daysLeft: 0,
    can: (feature) => FREE_FEATURES[feature] ?? false,
    hasReached: (limitKey, currentCount) => {
        const max = FREE_LIMITS[limitKey];
        if (max === null) return false;
        return currentCount >= max;
    },
    remaining: (limitKey, currentCount) => {
        const max = FREE_LIMITS[limitKey];
        if (max === null) return null;
        return Math.max(0, max - currentCount);
    },
    refresh: async () => {
        // no-op when no provider is mounted
    },
};

// =============================================
// PROVIDER
// =============================================
interface SubscriptionProviderProps {
    pharmacyName: string | null | undefined;
    children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
    pharmacyName,
    children,
}) => {
    const [subscription, setSubscription] = useState<LocalSubscription | null>(null);
    const [features, setFeatures] = useState<PlanFeatures>(FREE_FEATURES);
    const [limits, setLimits] = useState<PlanLimits>(FREE_LIMITS);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const normalizedPharmacy = useMemo(
        () => (pharmacyName || '').trim().replace(/\s+/g, ' ').toUpperCase(),
        [pharmacyName]
    );

    // =============================================
    // Load the plan definition (features + limits)
    // =============================================
    const loadPlan = useCallback(async (planCode: PlanCode) => {
        try {
            let plan = await db.subscription_plans.where('code').equals(planCode).first();

            if (!plan && supabase) {
                const { data, error } = await supabase
                    .from('subscription_plans')
                    .select('*')
                    .eq('code', planCode)
                    .maybeSingle();

                if (!error && data) {
                    plan = data as any;
                    await db.subscription_plans.put(plan);
                }
            }

            if (plan && mountedRef.current) {
                setFeatures(normalizeFeatures(plan.features));
                setLimits(normalizeLimits(plan.limits));
            } else if (mountedRef.current) {
                setFeatures(FREE_FEATURES);
                setLimits(FREE_LIMITS);
            }
        } catch (err) {
            console.warn('[Subscription] plan load failed:', err);
            if (mountedRef.current) {
                setFeatures(FREE_FEATURES);
                setLimits(FREE_LIMITS);
            }
        }
    }, []);

    // =============================================
    // Load subscription from Dexie
    // =============================================
    const loadLocal = useCallback(async () => {
        if (!normalizedPharmacy) {
            if (mountedRef.current) {
                setSubscription(null);
                setFeatures(FREE_FEATURES);
                setLimits(FREE_LIMITS);
            }
            return;
        }

        try {
            const local = await db.subscriptions
                .where('pharmacy_name')
                .equals(normalizedPharmacy)
                .first();

            if (local) {
                const checked = applyExpiryRules(local);

                if (checked && checked.status !== local.status) {
                    await db.subscriptions.put(checked);
                }

                if (checked && mountedRef.current) {
                    setSubscription(checked);
                    await loadPlan(checked.plan_code);
                }
            } else {
                if (mountedRef.current) {
                    setSubscription(null);
                    setFeatures(FREE_FEATURES);
                    setLimits(FREE_LIMITS);
                }
            }
        } catch (err) {
            console.warn('[Subscription] local load failed:', err);
        }
    }, [normalizedPharmacy, loadPlan]);

    // =============================================
    // Refresh from Supabase — always authoritative.
    // =============================================
    const refresh = useCallback(async () => {
        if (!normalizedPharmacy || !supabase) return;

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('pharmacy_name', normalizedPharmacy)
                .maybeSingle();

            if (error) {
                console.warn('[Subscription] supabase fetch failed:', error.message);
                return;
            }

            if (!data) {
                await db.subscriptions
                    .where('pharmacy_name')
                    .equals(normalizedPharmacy)
                    .delete();

                if (mountedRef.current) {
                    setSubscription(null);
                    setFeatures(FREE_FEATURES);
                    setLimits(FREE_LIMITS);
                }
                return;
            }

            let fresh: LocalSubscription = {
                ...(data as any),
                last_synced_at: new Date().toISOString(),
            };

            const originalStatus = fresh.status;
            fresh = applyExpiryRules(fresh) as LocalSubscription;

            await db.subscriptions.put(fresh);

            if (fresh.status === 'expired' && originalStatus === 'active') {
                try {
                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'expired',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('pharmacy_name', normalizedPharmacy);
                } catch (pushErr) {
                    console.warn('[Subscription] expiry push-back failed:', pushErr);
                }
            }

            if (mountedRef.current) {
                setSubscription(fresh);
                await loadPlan(fresh.plan_code);
            }
        } catch (err) {
            console.warn('[Subscription] refresh failed:', err);
        }
    }, [normalizedPharmacy, loadPlan]);

    // =============================================
    // Boot: local load → background refresh
    // =============================================
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setIsLoading(true);
            await loadLocal();
            if (cancelled) return;
            refresh().finally(() => {
                if (!cancelled && mountedRef.current) setIsLoading(false);
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [loadLocal, refresh]);

    // =============================================
    // Periodic refresh every 5 minutes
    // =============================================
    useEffect(() => {
        if (!normalizedPharmacy) return;
        const id = setInterval(() => {
            refresh().catch(() => { });
        }, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [normalizedPharmacy, refresh]);

    // =============================================
    // Derived values
    // =============================================
    const premium = useMemo(() => isPremium(subscription), [subscription]);
    const active = useMemo(() => isSubscriptionActive(subscription), [subscription]);
    const pastDue = useMemo(() => isPastDue(subscription), [subscription]);
    const daysLeft = useMemo(() => daysUntilRenewal(subscription), [subscription]);

    const can = useCallback(
        (feature: FeatureKey) => canAccessFeature(subscription, feature),
        [subscription]
    );

    const hasReached = useCallback(
        (limitKey: LimitKey, currentCount: number) =>
            hasReachedLimit(subscription, limitKey, currentCount),
        [subscription]
    );

    const remaining = useCallback(
        (limitKey: LimitKey, currentCount: number) =>
            remainingQuota(subscription, limitKey, currentCount),
        [subscription]
    );

    const value: SubscriptionContextValue = {
        subscription,
        features,
        limits,
        isLoading,
        isPremium: premium,
        isActive: active,
        isPastDue: pastDue,
        daysLeft,
        can,
        hasReached,
        remaining,
        refresh,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

// =============================================
// HOOK
// =============================================
export function useSubscription(): SubscriptionContextValue {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) {
        // Safe default — Free tier, no crash. Only hit in edge cases
        // (HMR module swaps, mount races).
        if (typeof window !== 'undefined') {
            console.warn(
                '[useSubscription] No provider found — falling back to Free tier.'
            );
        }
        return DEFAULT_CONTEXT;
    }
    return ctx;
}