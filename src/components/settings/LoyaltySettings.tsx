// components/settings/LoyaltySettings.tsx
import React, { useState, useEffect } from 'react';
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
    ChevronDown,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { RewardCatalog, LoyaltyTransaction } from '../../types';
import { db } from '../../lib/db';
import { pullLoyaltyData } from '../../lib/supabase';

interface LoyaltySettingsProps {
    pharmacyName: string;
    theme?: 'dark' | 'light';
    currentProfileId?: string;
}

export const LoyaltySettings: React.FC<LoyaltySettingsProps> = ({
    pharmacyName,
    theme = 'dark',
    currentProfileId
}) => {
    const isDark = theme === 'dark';
    const [rewards, setRewards] = useState<RewardCatalog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingReward, setEditingReward] = useState<RewardCatalog | null>(null);
    const [analytics, setAnalytics] = useState<{
        totalMembers: number;
        totalPointsEarned: number;
        totalPointsRedeemed: number;
        activeMembers: number;
        recentActivity: LoyaltyTransaction[];
        topCustomers: any[];
        pointsHistory: { date: string; earned: number; redeemed: number }[];
    } | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [showAnalytics, setShowAnalytics] = useState(false);

    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';

    // Form state for new/edit reward
    const [formData, setFormData] = useState<Partial<RewardCatalog>>({
        name: '',
        description: '',
        points_required: 50,
        category: 'bp_check',
        is_active: true,
        max_redemptions_per_customer: null,
        requires_approval: false,
        icon_name: 'heart-pulse'
    });

    // Get reward icon component
    const getRewardIcon = (category: string, className: string = 'w-5 h-5') => {
        const iconMap: Record<string, any> = {
            'bp_check': Heart,
            'glucose_test': Droplet,
            'dewormer': Pill,
            'vitamins': Beaker,
            'hiv_test': Syringe,
            'delivery': Truck,
            'discount': Sparkles
        };
        const IconComponent = iconMap[category] || Gift;
        return React.createElement(IconComponent, { className });
    };

    // Get category color
    const getCategoryColor = (category: string): string => {
        const colorMap: Record<string, string> = {
            'bp_check': 'text-rose-400 bg-rose-500/20',
            'glucose_test': 'text-blue-400 bg-blue-500/20',
            'dewormer': 'text-emerald-400 bg-emerald-500/20',
            'vitamins': 'text-amber-400 bg-amber-500/20',
            'hiv_test': 'text-purple-400 bg-purple-500/20',
            'delivery': 'text-cyan-400 bg-cyan-500/20',
            'discount': 'text-yellow-400 bg-yellow-500/20'
        };
        return colorMap[category] || 'text-gray-400 bg-gray-500/20';
    };

    // Load rewards from local DB
    const loadRewards = async () => {
        setLoading(true);
        setError(null);
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

            // Get system rewards (read-only)
            const systemRewards = await db.customers_rewards_catalog
                .where('pharmacy_name')
                .equals('SYSTEM')
                .toArray();

            // Get pharmacy-specific rewards
            const pharmacyRewards = await db.customers_rewards_catalog
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();

            // Merge: pharmacy rewards override system rewards
            const merged = [...systemRewards];
            const pharmacyCategories = new Set(pharmacyRewards.map(r => r.category));

            // Remove system rewards that have pharmacy overrides
            const filtered = merged.filter(r => !pharmacyCategories.has(r.category));

            setRewards([...filtered, ...pharmacyRewards].sort((a, b) => a.points_required - b.points_required));
        } catch (err: any) {
            setError(err.message || 'Failed to load rewards');
        } finally {
            setLoading(false);
        }
    };

    // Load analytics
    const loadAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

            // Get customers
            const customers = await db.customers
                .where('pharmacy_name')
                .equals(normalized)
                .toArray();

            // Get transactions
            const transactions = await db.customers_loyalty_transactions
                .where('pharmacy_name')
                .equals(normalized)
                .sortBy('created_at');

            // Calculate analytics
            const totalMembers = customers.length;
            const activeMembers = customers.filter(c => (c.loyalty_points || 0) > 0).length;
            const totalPointsEarned = transactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0);
            const totalPointsRedeemed = transactions.filter(t => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0);

            // Get top customers
            const topCustomers = [...customers]
                .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
                .slice(0, 5);

            // Get points history (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const cutoff = thirtyDaysAgo.toISOString();

            const recentTransactions = transactions
                .filter(t => t.created_at >= cutoff)
                .slice(-50)
                .reverse();

            // Group by day
            const historyMap: { [key: string]: { earned: number; redeemed: number } } = {};
            transactions
                .filter(t => t.created_at >= cutoff)
                .forEach(t => {
                    const day = t.created_at.split('T')[0];
                    if (!historyMap[day]) {
                        historyMap[day] = { earned: 0, redeemed: 0 };
                    }
                    if (t.points > 0) {
                        historyMap[day].earned += t.points;
                    } else {
                        historyMap[day].redeemed += Math.abs(t.points);
                    }
                });

            const pointsHistory = Object.entries(historyMap)
                .map(([date, values]) => ({ date, ...values }))
                .sort((a, b) => a.date.localeCompare(b.date));

            setAnalytics({
                totalMembers,
                activeMembers,
                totalPointsEarned,
                totalPointsRedeemed,
                recentActivity: recentTransactions.slice(0, 20),
                topCustomers,
                pointsHistory
            });
        } catch (err: any) {
            console.error('Analytics error:', err);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    // Pull rewards from Supabase
    const handlePullFromCloud = async () => {
        setSyncing(true);
        setError(null);
        setSuccess(null);
        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const pulled = await pullLoyaltyData(normalized);
            await loadRewards();
            setSuccess(`Pulled ${pulled} rewards from cloud`);
        } catch (err: any) {
            setError(err.message || 'Failed to pull rewards from cloud');
        } finally {
            setSyncing(false);
        }
    };

    // Save reward (Create or Update)
    const handleSaveReward = async () => {
        if (!formData.name?.trim()) {
            setError('Reward name is required');
            return;
        }
        if (!formData.points_required || formData.points_required < 1) {
            setError('Points required must be at least 1');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();
            const now = new Date().toISOString();

            if (editingReward) {
                // Update existing reward locally
                const updatedReward = {
                    name: formData.name,
                    description: formData.description || null,
                    points_required: formData.points_required,
                    category: formData.category,
                    is_active: formData.is_active !== undefined ? formData.is_active : true,
                    max_redemptions_per_customer: formData.max_redemptions_per_customer || null,
                    requires_approval: formData.requires_approval || false,
                    icon_name: formData.icon_name || null,
                    updated_at: now
                };

                await db.customers_rewards_catalog.update(editingReward.id, updatedReward);

                // Queue for sync to Supabase
                await db.sync_queue.add({
                    sync_id: crypto.randomUUID(),
                    pharmacy_name: normalized,
                    user_id: currentProfileId || 'system',
                    entity_type: 'customers_rewards_catalog',
                    operation: 'UPDATE',
                    payload: {
                        id: editingReward.id,
                        pharmacy_name: normalized,
                        ...updatedReward
                    },
                    created_at: now,
                    status: 'pending',
                    retry_count: 0
                });

                setSuccess('Reward updated successfully!');
            } else {
                // Create new reward locally
                const newReward = {
                    id: crypto.randomUUID(),
                    pharmacy_name: normalized,
                    name: formData.name,
                    description: formData.description || null,
                    points_required: formData.points_required,
                    category: formData.category as any,
                    is_active: formData.is_active !== undefined ? formData.is_active : true,
                    max_redemptions_per_customer: formData.max_redemptions_per_customer || null,
                    requires_approval: formData.requires_approval || false,
                    icon_name: formData.icon_name || null,
                    image_url: null,
                    created_at: now,
                    updated_at: now
                };

                await db.customers_rewards_catalog.add(newReward);

                // Queue for sync to Supabase
                await db.sync_queue.add({
                    sync_id: crypto.randomUUID(),
                    pharmacy_name: normalized,
                    user_id: currentProfileId || 'system',
                    entity_type: 'customers_rewards_catalog',
                    operation: 'INSERT',
                    payload: newReward,
                    created_at: now,
                    status: 'pending',
                    retry_count: 0
                });

                setSuccess('Reward created successfully!');
            }

            // Trigger sync immediately
            if (navigator.onLine) {
                try {
                    const { processOfflineSyncQueue } = await import('../../lib/supabase');
                    await processOfflineSyncQueue();
                } catch (syncError) {
                    console.log('Background sync will handle this');
                }
            }

            // Reset and reload
            setTimeout(() => {
                setSuccess(null);
                setShowAddForm(false);
                setEditingReward(null);
                resetForm();
                loadRewards();
                loadAnalytics();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Failed to save reward');
        } finally {
            setSaving(false);
        }
    };

    // Delete reward
    const handleDeleteReward = async (rewardId: string) => {
        if (!confirm('Delete this reward? This action cannot be undone.')) return;

        try {
            const reward = await db.customers_rewards_catalog.get(rewardId);
            if (!reward) return;

            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

            // Delete locally
            await db.customers_rewards_catalog.delete(rewardId);

            // Queue for sync to Supabase
            await db.sync_queue.add({
                sync_id: crypto.randomUUID(),
                pharmacy_name: normalized,
                user_id: currentProfileId || 'system',
                entity_type: 'customers_rewards_catalog',
                operation: 'DELETE',
                payload: { id: rewardId },
                created_at: new Date().toISOString(),
                status: 'pending',
                retry_count: 0
            });

            // Trigger sync
            if (navigator.onLine) {
                try {
                    const { processOfflineSyncQueue } = await import('../../lib/supabase');
                    await processOfflineSyncQueue();
                } catch (syncError) {
                    console.log('Background sync will handle this');
                }
            }

            setSuccess('Reward deleted successfully!');
            setTimeout(() => {
                setSuccess(null);
                loadRewards();
                loadAnalytics();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to delete reward');
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            points_required: 50,
            category: 'bp_check',
            is_active: true,
            max_redemptions_per_customer: null,
            requires_approval: false,
            icon_name: 'heart-pulse'
        });
        setEditingReward(null);
    };

    // Edit reward
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
            icon_name: reward.icon_name
        });
        setShowAddForm(true);
    };

    // Load data on mount
    useEffect(() => {
        loadRewards();
        loadAnalytics();
    }, [pharmacyName]);

    // Category options
    const categoryOptions = [
        { value: 'bp_check', label: 'BP Check' },
        { value: 'glucose_test', label: 'Glucose Test' },
        { value: 'dewormer', label: 'Dewormer' },
        { value: 'vitamins', label: 'Vitamins' },
        { value: 'hiv_test', label: 'HIV Test' },
        { value: 'delivery', label: 'Delivery' },
        { value: 'discount', label: 'Discount' }
    ];

    // Icon options
    const iconOptions = [
        { value: 'heart-pulse', label: 'Heart' },
        { value: 'droplet', label: 'Droplet' },
        { value: 'pill', label: 'Pill' },
        { value: 'beaker', label: 'Beaker' },
        { value: 'syringe', label: 'Syringe' },
        { value: 'truck', label: 'Truck' },
        { value: 'sparkles', label: 'Sparkles' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h2 className={`text-xl font-bold ${textTitle}`}>Loyalty & Rewards</h2>
                    <p className={`text-sm ${textMuted}`}>Manage rewards, view analytics, and track customer loyalty</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePullFromCloud}
                        disabled={syncing}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2] text-[#1f2328]'} flex items-center gap-1`}
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        <span>Pull from Cloud</span>
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddForm(true);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white' : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white'}`}
                    >
                        <Plus className="w-4 h-4 inline mr-1" />
                        New Reward
                    </button>
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'} text-sm flex items-center gap-2`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {error && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 text-rose-600'} text-sm flex items-center gap-2`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Analytics Toggle */}
            <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`w-full p-4 rounded-xl border ${borderLine} flex items-center justify-between ${cardHover}`}
            >
                <div className="flex items-center gap-3">
                    <TrendingUp className={`w-5 h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
                    <span className={`font-bold ${textTitle}`}>Analytics Dashboard</span>
                </div>
                {showAnalytics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {/* Analytics Content */}
            {showAnalytics && (
                <div className={`p-4 rounded-xl border ${borderLine} space-y-4`}>
                    {loadingAnalytics ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className={`w-6 h-6 animate-spin ${textMuted}`} />
                        </div>
                    ) : analytics ? (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} text-center`}>
                                    <p className={`text-2xl font-bold ${textTitle}`}>{analytics.totalMembers}</p>
                                    <p className={`text-[10px] uppercase ${textMuted}`}>Total Customers</p>
                                </div>
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} text-center`}>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{analytics.activeMembers}</p>
                                    <p className={`text-[10px] uppercase ${textMuted}`}>Active Members</p>
                                </div>
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} text-center`}>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{analytics.totalPointsEarned.toLocaleString()}</p>
                                    <p className={`text-[10px] uppercase ${textMuted}`}>Points Earned</p>
                                </div>
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} text-center`}>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{analytics.totalPointsRedeemed.toLocaleString()}</p>
                                    <p className={`text-[10px] uppercase ${textMuted}`}>Points Redeemed</p>
                                </div>
                            </div>

                            {/* Top Customers */}
                            {analytics.topCustomers.length > 0 && (
                                <div>
                                    <p className={`text-xs font-bold uppercase ${textMuted} mb-2`}>Top Customers</p>
                                    <div className="space-y-1">
                                        {analytics.topCustomers.map((c, i) => (
                                            <div key={c.id} className={`flex items-center justify-between text-sm p-2 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#eaeef2] text-[#656d76]'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className={`font-medium ${textTitle}`}>{c.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Gift className={`w-3.5 h-3.5 ${textMuted}`} />
                                                    <span className={`font-bold ${textTitle}`}>{c.loyalty_points || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            {analytics.recentActivity.length > 0 && (
                                <div>
                                    <p className={`text-xs font-bold uppercase ${textMuted} mb-2`}>Recent Activity</p>
                                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                        {analytics.recentActivity.map((t, i) => (
                                            <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                                                <span className={textMuted}>{t.description || t.transaction_type}</span>
                                                <span className={`font-bold ${t.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.points > 0 ? '+' : ''}{t.points}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className={`text-sm ${textMuted} text-center py-4`}>No analytics data available</p>
                    )}
                </div>
            )}

            {/* Rewards List */}
            <div className={`p-4 rounded-xl border ${borderLine}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold ${textTitle}`}>Rewards Catalog</h3>
                    <span className={`text-xs ${textMuted}`}>{rewards.length} rewards</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className={`w-6 h-6 animate-spin ${textMuted}`} />
                    </div>
                ) : rewards.length === 0 ? (
                    <div className={`text-center py-8 ${textMuted}`}>
                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No rewards configured</p>
                        <p className="text-sm">Click "New Reward" to create one</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rewards.map(reward => {
                            const isSystem = reward.pharmacy_name === 'SYSTEM';
                            const categoryColor = getCategoryColor(reward.category);
                            const IconComponent = getRewardIcon(reward.category, 'w-5 h-5');

                            return (
                                <div
                                    key={reward.id}
                                    className={`flex items-center justify-between p-3 rounded-lg ${cardHover} border ${borderLine}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`p-2 rounded-lg shrink-0 ${categoryColor}`}>
                                            {IconComponent}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${textTitle}`}>{reward.name}</span>
                                                {isSystem && (
                                                    <span className={`text-[8px] font-bold uppercase ${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'} px-1.5 py-0.5 rounded`}>
                                                        System
                                                    </span>
                                                )}
                                                {!reward.is_active && (
                                                    <span className={`text-[8px] font-bold uppercase bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded`}>
                                                        Disabled
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs ${textMuted} truncate`}>{reward.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                                                <Award className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                                                <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                                    {reward.points_required} pts
                                                </span>
                                            </div>
                                            {reward.max_redemptions_per_customer && (
                                                <span className={`text-[10px] ${textMuted}`}>
                                                    Max {reward.max_redemptions_per_customer}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!isSystem && (
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            <button
                                                onClick={() => handleEditReward(reward)}
                                                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#eaeef2]'} ${textMuted}`}
                                                title="Edit reward"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReward(reward.id)}
                                                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#eaeef2]'} text-rose-500`}
                                                title="Delete reward"
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
            </div>

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className={`max-w-md w-full rounded-2xl shadow-2xl p-6 ${cardBg} border ${borderLine} max-h-[90vh] overflow-y-auto`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isDark ? 'bg-[#2ea043]/20' : 'bg-[#2ea043]/10'}`}>
                                    <Gift className={`w-5 h-5 ${isDark ? 'text-[#2ea043]' : 'text-[#2ea043]'}`} />
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
                                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className={`text-sm font-medium ${textMuted} block mb-1`}>Reward Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                    placeholder="Free BP Check"
                                />
                            </div>

                            <div>
                                <label className={`text-sm font-medium ${textMuted} block mb-1`}>Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                    placeholder="Blood pressure check at the pharmacy"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`text-sm font-medium ${textMuted} block mb-1`}>Points Required *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.points_required}
                                        onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
                                        className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                        placeholder="50"
                                    />
                                </div>
                                <div>
                                    <label className={`text-sm font-medium ${textMuted} block mb-1`}>Max Redemptions</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_redemptions_per_customer || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, max_redemptions_per_customer: parseInt(e.target.value) || null }))}
                                        className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                        placeholder="Unlimited"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`text-sm font-medium ${textMuted} block mb-1`}>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                >
                                    {categoryOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`text-sm font-medium ${textMuted} block mb-1`}>Icon</label>
                                <select
                                    value={formData.icon_name || 'heart-pulse'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, icon_name: e.target.value }))}
                                    className={`w-full px-4 py-2.5 rounded-lg text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50`}
                                >
                                    {iconOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className={`flex items-center gap-2 text-sm ${textMuted}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active !== false}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="w-4 h-4"
                                    />
                                    Active
                                </label>
                                <label className={`flex items-center gap-2 text-sm ${textMuted}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_approval || false}
                                        onChange={(e) => setFormData(prev => ({ ...prev, requires_approval: e.target.checked }))}
                                        className="w-4 h-4"
                                    />
                                    Requires Approval
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    resetForm();
                                }}
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2]'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReward}
                                disabled={saving}
                                className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''} bg-[#2ea043] hover:bg-[#2c9b3e]`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span>{editingReward ? 'Update' : 'Create'}</span>
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