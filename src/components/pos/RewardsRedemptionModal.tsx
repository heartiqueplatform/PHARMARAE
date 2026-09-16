// components/pos/RewardsRedemptionModal.tsx
import React, { useState, useEffect } from 'react';
import {
    X,
    Gift,
    Loader2,
    Check,
    AlertCircle,
    Heart,
    Droplet,
    Pill,
    Beaker,
    Syringe,
    Truck,
    Sparkles,
    Award,
    Star
} from 'lucide-react';
import { Customer, RewardCatalog } from '../../types';
import { db } from '../../lib/db';

interface RewardsRedemptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
    pharmacyName: string;
    theme?: 'dark' | 'light';
    onRedeemed?: (rewardName: string, pointsUsed: number) => void;
}

export const RewardsRedemptionModal: React.FC<RewardsRedemptionModalProps> = ({
    isOpen,
    onClose,
    customer,
    pharmacyName,
    theme = 'dark',
    onRedeemed
}) => {
    const isDark = theme === 'dark';
    const [rewards, setRewards] = useState<RewardCatalog[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [pointsBalance, setPointsBalance] = useState(0);

    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22]' : 'bg-white';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const cardHover = isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

    // Get reward icon
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
        const Icon = iconMap[category] || Gift;
        return <Icon className={className} />;
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

    // Load rewards
    useEffect(() => {
        if (!isOpen || !customer) return;

        const loadRewards = async () => {
            setLoading(true);
            setError(null);
            try {
                const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

                // Get customer points
                const customerData = await db.customers.where('id').equals(customer.id).first();
                setPointsBalance(customerData?.loyalty_points || 0);

                // Get rewards catalog
                const systemRewards = await db.customers_rewards_catalog
                    .where('pharmacy_name')
                    .equals('SYSTEM')
                    .toArray();

                const pharmacyRewards = await db.customers_rewards_catalog
                    .where('pharmacy_name')
                    .equals(normalized)
                    .toArray();

                let allRewards = [...systemRewards, ...pharmacyRewards];

                // Remove duplicates (pharmacy-specific overrides SYSTEM)
                const seen = new Set();
                allRewards = allRewards.filter(reward => {
                    const key = reward.category;
                    if (seen.has(key) && reward.pharmacy_name !== 'SYSTEM') {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });

                // Filter active rewards
                allRewards = allRewards.filter(r => r.is_active);

                // Sort by points required (lowest first)
                allRewards.sort((a, b) => a.points_required - b.points_required);

                setRewards(allRewards);
            } catch (err: any) {
                console.error('Load rewards error:', err);
                setError(err.message || 'Failed to load rewards');
            } finally {
                setLoading(false);
            }
        };

        loadRewards();
    }, [isOpen, customer, pharmacyName]);

    // Handle redemption
    const handleRedeem = async (rewardId: string, rewardName: string, pointsRequired: number) => {
        if (pointsBalance < pointsRequired) {
            setError(`Insufficient points. Need ${pointsRequired}, have ${pointsBalance}`);
            return;
        }

        setRedeeming(rewardId);
        setError(null);
        setSuccess(null);

        try {
            const normalized = pharmacyName.trim().replace(/\s+/g, ' ').toUpperCase();

            // Get current customer
            const customerData = await db.customers.where('id').equals(customer.id).first();
            if (!customerData) {
                throw new Error('Customer not found');
            }

            // Check if already redeemed max
            const reward = rewards.find(r => r.id === rewardId);
            if (reward?.max_redemptions_per_customer) {
                const redemptions = await db.customers_loyalty_transactions
                    .where('[pharmacy_name+customer_id]')
                    .equals([normalized, customer.id])
                    .filter(t => t.transaction_type === 'redeem_reward' && t.reward_id === rewardId)
                    .count();

                if (redemptions >= reward.max_redemptions_per_customer) {
                    throw new Error(`Maximum redemptions (${reward.max_redemptions_per_customer}) reached for this reward`);
                }
            }

            const newBalance = customerData.loyalty_points - pointsRequired;

            // Create transaction
            const transaction = {
                id: crypto.randomUUID(),
                pharmacy_name: normalized,
                customer_id: customer.id,
                sale_id: null,
                points: -pointsRequired,
                balance_after: newBalance,
                transaction_type: 'redeem_reward',
                trigger_rule: null,
                reward_id: rewardId,
                reward_name: rewardName,
                description: `Redeemed: ${rewardName}`,
                metadata: { reward_id: rewardId, reward_name: rewardName },
                created_at: new Date().toISOString(),
                created_by: 'pos_user'
            };

            // Update customer and add transaction
            await db.transaction('rw', db.customers, db.customers_loyalty_transactions, async () => {
                await db.customers.update(customer.id, {
                    loyalty_points: newBalance,
                    total_points_redeemed: (customerData.total_points_redeemed || 0) + pointsRequired,
                    updated_at: new Date().toISOString()
                });
                await db.customers_loyalty_transactions.add(transaction);
            });

            setSuccess(`Successfully redeemed ${rewardName}!`);
            setPointsBalance(newBalance);

            if (onRedeemed) {
                onRedeemed(rewardName, pointsRequired);
            }

            // Close after delay
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Redemption error:', err);
            setError(err.message || 'Failed to redeem reward');
        } finally {
            setRedeeming(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`max-w-2xl w-full rounded-2xl shadow-2xl ${cardBg} border ${borderLine} max-h-[90vh] overflow-hidden flex flex-col`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${borderLine}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isDark ? 'bg-amber-500/20' : 'bg-amber-500/10'}`}>
                            <Gift className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg ${textTitle}`}>Redeem Points</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={textMuted}>Customer:</span>
                                <span className={`font-medium ${textTitle}`}>{customer.name}</span>
                                <span className={textMuted}>•</span>
                                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {pointsBalance} pts
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#f6f8fa]'} transition-colors`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} />
                        </div>
                    ) : error && !rewards.length ? (
                        <div className={`text-center py-12 ${textMuted}`}>
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className={`text-center py-12 ${textMuted}`}>
                            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No rewards available</p>
                            <p className="text-sm">Check back later for new rewards</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rewards.map((reward) => {
                                const canAfford = pointsBalance >= reward.points_required;
                                const isRedeeming = redeeming === reward.id;
                                const categoryColor = getCategoryColor(reward.category);

                                return (
                                    <div
                                        key={reward.id}
                                        className={`p-4 rounded-xl border transition-all ${borderLine} ${canAfford ? cardHover : 'opacity-60'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${categoryColor}`}>
                                                {getRewardIcon(reward.category, 'w-5 h-5')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm ${textTitle}`}>{reward.name}</h4>
                                                <p className={`text-xs ${textMuted} mt-0.5 line-clamp-2`}>
                                                    {reward.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className={`flex items-center gap-1 text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                                        <Award className="w-3.5 h-3.5" />
                                                        {reward.points_required} pts
                                                    </div>
                                                    {reward.max_redemptions_per_customer && (
                                                        <span className={`text-[10px] ${textMuted}`}>
                                                            • Max {reward.max_redemptions_per_customer}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRedeem(reward.id, reward.name, reward.points_required)}
                                                disabled={!canAfford || isRedeeming}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${!canAfford
                                                    ? isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                                                    : isRedeeming
                                                        ? 'bg-[#2ea043]/70 text-white'
                                                        : 'bg-[#2ea043] hover:bg-[#2c9b3e] text-white'
                                                    }`}
                                            >
                                                {isRedeeming ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : canAfford ? (
                                                    'Redeem'
                                                ) : (
                                                    `Need ${reward.points_required - pointsBalance} more`
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${borderLine}`}>
                    {error && (
                        <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 text-rose-600'} text-sm flex items-center gap-2`}>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'} text-sm flex items-center gap-2`}>
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted}`}>
                            {rewards.length} rewards available
                        </span>
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d]' : 'bg-[#f6f8fa] hover:bg-[#eaeef2]'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};