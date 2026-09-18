// components/settings/LoyaltySettings.tsx
// =============================================
// LOYALTY & REWARDS SETTINGS
// =============================================
// v2 — Full rewrite:
//   - Uses `queueLoyaltyMutation` (dedicated loyalty queue)
//   - Uses `processLoyaltyQueue` (not processOfflineSyncQueue)
//   - Always-expanded sections (no toggles)
//   - Horizontal-scrolling customer stories (Facebook-style)
//   - No local refresh button (global sync handles it)
//   - Clean cards, zero borders, premium feel
// =============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
    Gift,
    Plus,
    X,
    Check,
    Edit,
    Trash2,
    Loader2,
    Heart,
    Droplet,
    Pill,
    Beaker,
    Syringe,
    Truck,
    Sparkles,
    Award,
    Users,
    TrendingUp,
    Calendar,
    AlertCircle,
    Star,
    Crown,
    Zap,
    ChevronRight,
} from 'lucide-react';
import { RewardCatalog, LoyaltyTransaction, Customer } from '../../types';
import { db } from '../../lib/db';
import { queueLoyaltyMutation, queueOfflineMutation } from '../../lib/supabase';

interface LoyaltySettingsProps {
    pharmacyName: string;
    theme?: 'dark' | 'light';
    currentProfileId?: string;
}

// =============================================
// LOYALTY TIER
// =============================================
type Tier = {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
    minPoints: number;
};

const TIERS: Tier[] = [
    { label: 'Member', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Users, minPoints: 0 },
    { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-500/20', icon: Award, minPoints: 50 },
    { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-400/20', icon: Award, minPoints: 100 },
    { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/20', icon: Star, minPoints: 200 },
    { label: 'Platinum', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Crown, minPoints: 500 },
];

function getTier(points: number): Tier {
    let current = TIERS[0];
    for (const t of TIERS) {
        if (points >= t.minPoints) current = t;
    }
    return current;
}

// =============================================
// AVATAR HELPERS
// =============================================
const AVATAR_GRADIENTS = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-purple-600',
];

function getAvatarGradient(name: string): string {
    if (!name) return AVATAR_GRADIENTS[0];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// =============================================
// COMPONENT
// =============================================
export const LoyaltySettings: React.FC<LoyaltySettingsProps> = ({
    pharmacyName,
    theme = 'dark',
    currentProfileId,
}) => {
    const isDark = theme === 'dark';

    // Theme classes
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';
    const cardSoft = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';
    const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const pillBg = isDark ? 'bg-[#21262d]' : 'bg-[#eaeef2]';

    // State
    const [rewards, setRewards] = useState<RewardCatalog[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingReward, setEditingReward] = useState<RewardCatalog | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<RewardCatalog>>({
        name: '',
        description: '',
        points_required: 50,
        category: 'bp_check',
        is_active: true,
        max_redemptions_per_customer: null,
        requires_approval: false,
        icon_name: 'heart-pulse',
    });

    // Normalize pharmacy name
    const normalized = useMemo(
        () => (pharmacyName || '').trim().replace(/\s+/g, ' ').toUpperCase(),
        [pharmacyName]
    );

    // =============================================
    // LOAD ALL DATA
    // =============================================
    const loadAll = async () => {
        if (!normalized) return;
        setLoading(true);
        setError(null);

        try {
            const [systemRewards, pharmacyRewards, allCustomers, allTx] = await Promise.all([
                db.customers_rewards_catalog.where('pharmacy_name').equals('SYSTEM').toArray(),
                db.customers_rewards_catalog.where('pharmacy_name').equals(normalized).toArray(),
                db.customers.where('pharmacy_name').equals(normalized).toArray(),
                db.customers_loyalty_transactions
                    .where('pharmacy_name').equals(normalized)
                    .reverse()
                    .sortBy('created_at'),
            ]);

            // Merge rewards: pharmacy overrides system
            const pharmacyCategories = new Set(pharmacyRewards.map(r => r.category));
            const merged = [
                ...systemRewards.filter(r => !pharmacyCategories.has(r.category)),
                ...pharmacyRewards,
            ].sort((a, b) => a.points_required - b.points_required);

            // Sort customers by points desc
            const sortedCustomers = [...allCustomers].sort(
                (a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0)
            );

            setRewards(merged);
            setCustomers(sortedCustomers);
            setTransactions(allTx);
        } catch (err: any) {
            setError(err.message || 'Failed to load loyalty data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalized]);

    // =============================================
    // ANALYTICS (derived)
    // =============================================
    const analytics = useMemo(() => {
        const totalMembers = customers.length;
        const activeMembers = customers.filter(c => (c.loyalty_points || 0) > 0).length;
        const totalPointsEarned = transactions
            .filter(t => t.points > 0)
            .reduce((sum, t) => sum + t.points, 0);
        const totalPointsRedeemed = transactions
            .filter(t => t.points < 0)
            .reduce((sum, t) => sum + Math.abs(t.points), 0);
        const totalPointsOutstanding = customers.reduce(
            (sum, c) => sum + (c.loyalty_points || 0),
            0
        );

        const recentActivity = transactions.slice(0, 20);

        return {
            totalMembers,
            activeMembers,
            totalPointsEarned,
            totalPointsRedeemed,
            totalPointsOutstanding,
            recentActivity,
            conversionRate: totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
        };
    }, [customers, transactions]);

    // =============================================
    // REWARD ICONS
    // =============================================
    const getRewardIcon = (category: string, className: string = 'w-5 h-5') => {
        const iconMap: Record<string, any> = {
            'bp_check': Heart,
            'glucose_test': Droplet,
            'dewormer': Pill,
            'vitamins': Beaker,
            'hiv_test': Syringe,
            'delivery': Truck,
            'discount': Sparkles,
        };
        const Icon = iconMap[category] || Gift;
        return <Icon className={className} />;
    };

    const getCategoryStyle = (category: string): string => {
        const styleMap: Record<string, string> = {
            'bp_check': 'text-rose-400 bg-rose-500/15',
            'glucose_test': 'text-blue-400 bg-blue-500/15',
            'dewormer': 'text-emerald-400 bg-emerald-500/15',
            'vitamins': 'text-amber-400 bg-amber-500/15',
            'hiv_test': 'text-purple-400 bg-purple-500/15',
            'delivery': 'text-cyan-400 bg-cyan-500/15',
            'discount': 'text-yellow-400 bg-yellow-500/15',
        };
        return styleMap[category] || 'text-slate-400 bg-slate-500/15';
    };

    // =============================================
    // SAVE REWARD
    // =============================================
    const handleSaveReward = async () => {
        if (!formData.name?.trim()) {
            setError('Reward name is required');
            return;
        }
        if (!formData.points_required || formData.points_required < 1) {
            setError('Points must be at least 1');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const now = new Date().toISOString();

            if (editingReward) {
                // UPDATE
                const updates = {
                    name: formData.name,
                    description: formData.description || null,
                    points_required: formData.points_required,
                    category: formData.category,
                    is_active: formData.is_active !== false,
                    max_redemptions_per_customer: formData.max_redemptions_per_customer || null,
                    requires_approval: formData.requires_approval || false,
                    icon_name: formData.icon_name || null,
                    updated_at: now,
                };

                await db.customers_rewards_catalog.update(editingReward.id, updates);

                // 🆕 Route to LOYALTY queue (not main queue)
                await queueLoyaltyMutation(
                    normalized,
                    currentProfileId || 'system',
                    'customers_rewards_catalog',
                    'UPDATE',
                    {
                        id: editingReward.id,
                        pharmacy_name: normalized,
                        ...updates,
                    }
                );

                setSuccess('Reward updated');
            } else {
                // CREATE
                const newReward: RewardCatalog = {
                    id: crypto.randomUUID(),
                    pharmacy_name: normalized,
                    name: formData.name,
                    description: formData.description || null,
                    points_required: formData.points_required,
                    category: (formData.category || 'bp_check') as any,
                    is_active: formData.is_active !== false,
                    max_redemptions_per_customer: formData.max_redemptions_per_customer || null,
                    requires_approval: formData.requires_approval || false,
                    icon_name: formData.icon_name || null,
                    image_url: null,
                    created_at: now,
                    updated_at: now,
                };

                await db.customers_rewards_catalog.add(newReward);

                // 🆕 Route to LOYALTY queue
                await queueLoyaltyMutation(
                    normalized,
                    currentProfileId || 'system',
                    'customers_rewards_catalog',
                    'INSERT',
                    newReward
                );

                setSuccess('Reward created');
            }

            // Flush loyalty queue (sale-side sync runs on its own schedule)
            if (navigator.onLine) {
                try {
                    const { processLoyaltyQueue } = await import('../../lib/supabase');
                    await processLoyaltyQueue();
                } catch {
                    // Background cycle will retry
                }
            }

            // Reset & reload
            setShowAddForm(false);
            setEditingReward(null);
            resetForm();
            await loadAll();

            setTimeout(() => setSuccess(null), 2500);
        } catch (err: any) {
            setError(err.message || 'Failed to save reward');
        } finally {
            setSaving(false);
        }
    };

    // =============================================
    // DELETE REWARD
    // =============================================
    const handleDeleteReward = async (rewardId: string) => {
        if (!confirm('Delete this reward? This cannot be undone.')) return;

        try {
            const reward = await db.customers_rewards_catalog.get(rewardId);
            if (!reward) return;

            await db.customers_rewards_catalog.delete(rewardId);

            await queueLoyaltyMutation(
                normalized,
                currentProfileId || 'system',
                'customers_rewards_catalog',
                'DELETE',
                { id: rewardId, pharmacy_name: normalized }
            );

            if (navigator.onLine) {
                try {
                    const { processLoyaltyQueue } = await import('../../lib/supabase');
                    await processLoyaltyQueue();
                } catch { }
            }

            setSuccess('Reward deleted');
            await loadAll();
            setTimeout(() => setSuccess(null), 2500);
        } catch (err: any) {
            setError(err.message || 'Failed to delete reward');
        }
    };

    // =============================================
    // FORM HELPERS
    // =============================================
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            points_required: 50,
            category: 'bp_check',
            is_active: true,
            max_redemptions_per_customer: null,
            requires_approval: false,
            icon_name: 'heart-pulse',
        });
        setEditingReward(null);
    };

    const handleEditReward = (reward: RewardCatalog) => {
        setEditingReward(reward);
        setFormData({
            name: reward.name,
            description: reward.description || '',
            points_required: reward.points_required,
            category: reward.category,
            is_active: reward.is_active,
            max_redemptions_per_customer: reward.max_redemptions_per_customer,
            requires_approval: reward.requires_approval,
            icon_name: reward.icon_name,
        });
        setShowAddForm(true);
    };

    // =============================================
    // CATEGORY / ICON OPTIONS
    // =============================================
    const categoryOptions = [
        { value: 'bp_check', label: 'BP Check' },
        { value: 'glucose_test', label: 'Glucose Test' },
        { value: 'dewormer', label: 'Dewormer' },
        { value: 'vitamins', label: 'Vitamins' },
        { value: 'hiv_test', label: 'HIV Test' },
        { value: 'delivery', label: 'Delivery' },
        { value: 'discount', label: 'Discount' },
    ];

    const iconOptions = [
        { value: 'heart-pulse', label: 'Heart' },
        { value: 'droplet', label: 'Droplet' },
        { value: 'pill', label: 'Pill' },
        { value: 'beaker', label: 'Beaker' },
        { value: 'syringe', label: 'Syringe' },
        { value: 'truck', label: 'Truck' },
        { value: 'sparkles', label: 'Sparkles' },
    ];

    // =============================================
    // RENDER
    // =============================================
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">

            {/* =============================================
                HEADER
            ============================================= */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className={`text-2xl font-black tracking-tight ${textTitle}`}>
                        Loyalty & Rewards
                    </h1>
                    <p className={`text-sm ${textMuted} mt-1`}>
                        Manage rewards, track members, view insights
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowAddForm(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2ea043] hover:bg-[#2c9b3e] text-white text-sm font-bold transition-transform active:scale-95"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    New Reward
                </button>
            </div>

            {/* Toasts */}
            {success && (
                <div
                    className={`p-3 rounded-2xl ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-700'
                        } text-sm font-medium flex items-center gap-2`}
                >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                </div>
            )}
            {error && (
                <div
                    className={`p-3 rounded-2xl ${isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-500/10 text-rose-700'
                        } text-sm font-medium flex items-center gap-2`}
                >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* =============================================
                STATS ROW — 4 cards, always visible
            ============================================= */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    label="Members"
                    value={analytics.totalMembers.toString()}
                    sub={`${analytics.activeMembers} active`}
                    icon={Users}
                    tint="emerald"
                    isDark={isDark}
                />
                <StatCard
                    label="Points Earned"
                    value={analytics.totalPointsEarned.toLocaleString()}
                    sub="All time"
                    icon={TrendingUp}
                    tint="amber"
                    isDark={isDark}
                />
                <StatCard
                    label="Points Redeemed"
                    value={analytics.totalPointsRedeemed.toLocaleString()}
                    sub="All time"
                    icon={Gift}
                    tint="rose"
                    isDark={isDark}
                />
                <StatCard
                    label="Outstanding"
                    value={analytics.totalPointsOutstanding.toLocaleString()}
                    sub="Points owed"
                    icon={Zap}
                    tint="purple"
                    isDark={isDark}
                />
            </div>

            {/* =============================================
                TOP CUSTOMERS — Horizontal story scroller
                Facebook-style avatar cards
            ============================================= */}
            {customers.length > 0 && (
                <section>
                    <SectionHeader
                        title="Top Customers"
                        subtitle={`${customers.length} loyalty members`}
                        isDark={isDark}
                    />
                    <div className="flex gap-3 overflow-x-auto pb-3 pt-1 no-scrollbar">
                        {customers.slice(0, 20).map((c) => (
                            <CustomerStoryCard
                                key={c.id}
                                customer={c}
                                isDark={isDark}
                                transactions={transactions.filter(t => t.customer_id === c.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* =============================================
                RECENT ACTIVITY — Compact feed
            ============================================= */}
            {analytics.recentActivity.length > 0 && (
                <section>
                    <SectionHeader
                        title="Recent Activity"
                        subtitle="Latest loyalty transactions"
                        isDark={isDark}
                    />
                    <div className={`rounded-3xl ${cardBg} overflow-hidden`}>
                        {analytics.recentActivity.slice(0, 15).map((t, i) => {
                            const customer = customers.find(c => c.id === t.customer_id);
                            const isPositive = t.points > 0;
                            return (
                                <div
                                    key={t.id || i}
                                    className={`flex items-center gap-3 p-3 ${i > 0 ? (isDark ? 'border-t border-[#21262d]' : 'border-t border-[#eaeef2]') : ''
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                            customer?.name || '?'
                                        )} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                                    >
                                        {getInitials(customer?.name || '?')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${textTitle}`}>
                                            {customer?.name || 'Unknown'}
                                        </p>
                                        <p className={`text-xs ${textMuted} truncate`}>
                                            {t.description || t.transaction_type}
                                        </p>
                                    </div>
                                    <div
                                        className={`text-sm font-bold shrink-0 ${isPositive ? 'text-emerald-500' : 'text-rose-500'
                                            }`}
                                    >
                                        {isPositive ? '+' : ''}
                                        {t.points}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* =============================================
                REWARDS CATALOG — Always expanded
            ============================================= */}
            <section>
                <SectionHeader
                    title="Rewards Catalog"
                    subtitle={`${rewards.length} reward${rewards.length === 1 ? '' : 's'} available`}
                    isDark={isDark}
                    action={
                        <button
                            onClick={() => {
                                resetForm();
                                setShowAddForm(true);
                            }}
                            className={`text-xs font-bold text-[#2ea043] flex items-center gap-1 ${cardHover} px-3 py-1.5 rounded-full transition-colors`}
                        >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            Add
                        </button>
                    }
                />
                {rewards.length === 0 ? (
                    <div
                        className={`rounded-3xl ${cardBg} py-12 text-center ${textMuted}`}
                    >
                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No rewards configured</p>
                        <p className="text-sm mt-1">Create your first reward to get started</p>
                    </div>
                ) : (
                    <div className={`rounded-3xl ${cardBg} overflow-hidden`}>
                        {rewards.map((reward, i) => {
                            const isSystem = reward.pharmacy_name === 'SYSTEM';
                            const categoryStyle = getCategoryStyle(reward.category);
                            return (
                                <div
                                    key={reward.id}
                                    className={`flex items-center gap-3 p-4 ${i > 0 ? (isDark ? 'border-t border-[#21262d]' : 'border-t border-[#eaeef2]') : ''
                                        }`}
                                >
                                    <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${categoryStyle}`}
                                    >
                                        {getRewardIcon(reward.category, 'w-6 h-6')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-bold ${textTitle} truncate`}>
                                                {reward.name}
                                            </span>
                                            {isSystem && (
                                                <span
                                                    className={`text-[10px] font-bold uppercase ${pillBg} ${textMuted} px-2 py-0.5 rounded-full`}
                                                >
                                                    System
                                                </span>
                                            )}
                                            {!reward.is_active && (
                                                <span className="text-[10px] font-bold uppercase bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded-full">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        {reward.description && (
                                            <p className={`text-xs ${textMuted} truncate mt-0.5`}>
                                                {reward.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span
                                                className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'} flex items-center gap-1`}
                                            >
                                                <Award className="w-3 h-3" />
                                                {reward.points_required} pts
                                            </span>
                                            {reward.max_redemptions_per_customer && (
                                                <span className={`text-[10px] ${textMuted}`}>
                                                    • Max {reward.max_redemptions_per_customer}
                                                </span>
                                            )}
                                            {reward.requires_approval && (
                                                <span className={`text-[10px] ${textMuted}`}>
                                                    • Approval
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!isSystem && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleEditReward(reward)}
                                                className={`p-2 rounded-xl ${cardHover} ${textMuted} transition-colors`}
                                                aria-label="Edit reward"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReward(reward.id)}
                                                className={`p-2 rounded-xl ${cardHover} text-rose-500 transition-colors`}
                                                aria-label="Delete reward"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* =============================================
                ADD / EDIT REWARD MODAL
            ============================================= */}
            {showAddForm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div
                        className={`max-w-md w-full rounded-3xl shadow-2xl ${cardBg} max-h-[90vh] overflow-y-auto`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 pb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#2ea043]/20' : 'bg-[#2ea043]/10'
                                        }`}
                                >
                                    <Gift
                                        className={`w-5 h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`}
                                    />
                                </div>
                                <h3 className={`font-bold text-lg ${textTitle}`}>
                                    {editingReward ? 'Edit Reward' : 'New Reward'}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    resetForm();
                                }}
                                className={`p-2 rounded-xl ${cardHover}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 pb-5 space-y-4">
                            <Field label="Reward Name" required muted={textMuted}>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData(prev => ({ ...prev, name: e.target.value }))
                                    }
                                    className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40`}
                                    placeholder="Free BP Check"
                                />
                            </Field>

                            <Field label="Description" muted={textMuted}>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40 resize-none`}
                                    placeholder="Blood pressure check at the pharmacy"
                                    rows={2}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Points Required" required muted={textMuted}>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.points_required}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                points_required: parseInt(e.target.value) || 0,
                                            }))
                                        }
                                        className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40`}
                                        placeholder="50"
                                    />
                                </Field>
                                <Field label="Max per Customer" muted={textMuted}>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_redemptions_per_customer || ''}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                max_redemptions_per_customer:
                                                    parseInt(e.target.value) || null,
                                            }))
                                        }
                                        className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40`}
                                        placeholder="Unlimited"
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Category" muted={textMuted}>
                                    <select
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                category: e.target.value as any,
                                            }))
                                        }
                                        className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40`}
                                    >
                                        {categoryOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Icon" muted={textMuted}>
                                    <select
                                        value={formData.icon_name || 'heart-pulse'}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                icon_name: e.target.value,
                                            }))
                                        }
                                        className={`w-full px-4 py-3 rounded-2xl text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/40`}
                                    >
                                        {iconOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="flex items-center gap-6 pt-1">
                                <label
                                    className={`flex items-center gap-2 text-sm ${textMuted} cursor-pointer`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active !== false}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                is_active: e.target.checked,
                                            }))
                                        }
                                        className="w-4 h-4 rounded"
                                    />
                                    Active
                                </label>
                                <label
                                    className={`flex items-center gap-2 text-sm ${textMuted} cursor-pointer`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_approval || false}
                                        onChange={(e) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                requires_approval: e.target.checked,
                                            }))
                                        }
                                        className="w-4 h-4 rounded"
                                    />
                                    Requires approval
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    resetForm();
                                }}
                                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${pillBg} ${cardHover}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReward}
                                disabled={saving}
                                className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-[#2ea043] hover:bg-[#2c9b3e] transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {editingReward ? 'Update' : 'Create'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================
// SUB-COMPONENTS
// =============================================

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    isDark: boolean;
    action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, isDark, action }) => {
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    return (
        <div className="flex items-center justify-between mb-3">
            <div>
                <h2 className={`text-base font-bold ${textTitle}`}>{title}</h2>
                {subtitle && <p className={`text-xs ${textMuted} mt-0.5`}>{subtitle}</p>}
            </div>
            {action}
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    tint: 'emerald' | 'amber' | 'rose' | 'purple';
    isDark: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, tint, isDark }) => {
    const tints = {
        emerald: {
            bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
            icon: 'text-emerald-500',
        },
        amber: {
            bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
            icon: 'text-amber-500',
        },
        rose: {
            bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
            icon: 'text-rose-500',
        },
        purple: {
            bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
            icon: 'text-purple-500',
        },
    };
    const t = tints[tint];
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';

    return (
        <div className={`rounded-3xl p-4 ${cardBg}`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${textMuted}`}>{label}</span>
                <div className={`w-7 h-7 rounded-xl ${t.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${t.icon}`} />
                </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${textTitle}`}>{value}</div>
            <div className={`text-[11px] mt-1 ${textMuted}`}>{sub}</div>
        </div>
    );
};

interface CustomerStoryCardProps {
    customer: Customer;
    isDark: boolean;
    transactions: LoyaltyTransaction[];
}

const CustomerStoryCard: React.FC<CustomerStoryCardProps> = ({ customer, isDark, transactions }) => {
    const points = customer.loyalty_points || 0;
    const tier = getTier(points);
    const TierIcon = tier.icon;
    const gradient = getAvatarGradient(customer.name || '?');
    const initials = getInitials(customer.name || '?');

    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';

    const txCount = transactions.length;

    return (
        <div
            className={`shrink-0 w-[160px] rounded-3xl ${cardBg} p-3 flex flex-col items-center text-center`}
        >
            {/* Avatar */}
            <div className="relative mb-2">
                <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-black ring-4 ${isDark ? 'ring-[#0d1117]' : 'ring-[#f6f8fa]'
                        }`}
                >
                    {initials}
                </div>
                {/* Tier badge */}
                <div
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${tier.bg} flex items-center justify-center ring-2 ${isDark ? 'ring-[#161b22]' : 'ring-white'
                        }`}
                >
                    <TierIcon className={`w-3 h-3 ${tier.color}`} />
                </div>
            </div>

            {/* Name */}
            <p className={`text-xs font-bold ${textTitle} truncate w-full`}>{customer.name || 'Unknown'}</p>
            <p className={`text-[10px] ${textMuted} truncate w-full mt-0.5`}>
                {customer.phone || 'No phone'}
            </p>

            {/* Points badge */}
            <div
                className={`mt-2 px-2 py-1 rounded-full ${isDark ? 'bg-[#2ea043]/15' : 'bg-[#2ea043]/10'
                    } flex items-center gap-1`}
            >
                <Gift className="w-3 h-3 text-[#2ea043]" />
                <span className="text-[10px] font-black text-[#2ea043]">{points}</span>
            </div>

            {/* Tier label */}
            <div className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider ${tier.color}`}>
                {tier.label}
            </div>

            {/* Mini stats */}
            {txCount > 0 && (
                <div className={`mt-1.5 text-[9px] ${textMuted}`}>
                    {txCount} transaction{txCount === 1 ? '' : 's'}
                </div>
            )}
        </div>
    );
};

interface FieldProps {
    label: string;
    required?: boolean;
    muted: string;
    children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, muted, children }) => (
    <div>
        <label className={`text-xs font-semibold ${muted} block mb-1.5`}>
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);