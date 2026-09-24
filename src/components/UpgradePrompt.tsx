// components/UpgradePrompt.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import {
    Sparkles,
    Lock,
    TrendingUp,
    BarChart3,
    Lightbulb,
    FileText,
    Check,
    Crown,
    Package,
    X,
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getUpgradeMessage, type FeatureKey } from '../lib/subscription';
import { UpgradePage } from './UpgradePage';

type UpgradeReason = 'productLimit' | 'reportDownload';

interface UpgradePromptProps {
    feature?: FeatureKey;
    reason?: UpgradeReason;
    theme?: 'dark' | 'light';
    onClose?: () => void;
    pharmacyName?: string | null;
    inline?: boolean;
    onUpgrade?: () => void;
}

const FEATURE_BENEFITS = [
    {
        icon: TrendingUp,
        title: 'Business Intelligence',
        description:
            'Sales trends, best sellers, slow movers, and profit insights — see how your business is actually performing.',
    },
    {
        icon: BarChart3,
        title: 'Daily Reports',
        description:
            'A summary of every day: revenue, transactions, top products, and important stock observations.',
    },
    {
        icon: FileText,
        title: 'Advanced Reporting',
        description:
            'Weekly and monthly trends, product performance, and revenue comparisons over time.',
    },
    {
        icon: Lightbulb,
        title: 'Smart Insights',
        description:
            'Automatic alerts on peak hours, product concentration, and business recommendations.',
    },
];

const PRODUCT_LIMIT_BENEFITS = [
    {
        icon: Package,
        title: 'Unlimited Products',
        description: 'Add as many products as your pharmacy needs — no caps, ever.',
    },
    {
        icon: TrendingUp,
        title: 'Business Intelligence',
        description:
            'Sales trends, best sellers, slow movers, and profit insights — see how your business is actually performing.',
    },
    {
        icon: BarChart3,
        title: 'Daily Reports',
        description:
            'A summary of every day: revenue, transactions, top products, and important stock observations.',
    },
    {
        icon: FileText,
        title: 'Advanced Reporting',
        description:
            'Weekly and monthly trends, product performance, and revenue comparisons over time.',
    },
];

const REASON_CONFIG: Record<
    UpgradeReason,
    { title: string; subtitle: string; benefits: typeof FEATURE_BENEFITS }
> = {
    productLimit: {
        title: 'Product Limit Reached',
        subtitle:
            "You've reached the Free plan limit of 120 products. Upgrade to Premium for unlimited products plus every insight tool.",
        benefits: PRODUCT_LIMIT_BENEFITS,
    },
    reportDownload: {
        title: 'Unlock Report Downloads',
        subtitle:
            'Export professional PDF reports of your daily sales, monthly audits, most-requested items, and business intelligence. Upgrade to Premium to download any report.',
        benefits: FEATURE_BENEFITS,
    },
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
    feature,
    reason,
    theme = 'dark',
    onClose,
    pharmacyName,
    inline = false,
    onUpgrade,
}) => {
    const { subscription, isPremium } = useSubscription();
    const isDark = theme === 'dark';
    const [showPage, setShowPage] = React.useState(false);

    let title = 'Unlock Premium';
    let subtitle = feature
        ? getUpgradeMessage(feature)
        : 'Upgrade to unlock Premium features.';
    let benefits = FEATURE_BENEFITS;

    if (reason && REASON_CONFIG[reason]) {
        const cfg = REASON_CONFIG[reason];
        title = cfg.title;
        subtitle = cfg.subtitle;
        benefits = cfg.benefits;
    }

    const pageBg = isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328]';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const innerBg = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';

    // Internal payment page — portaled too
    if (showPage && !onUpgrade) {
        return createPortal(
            <div className={`fixed inset-0 z-[10000] overflow-y-auto ${pageBg}`}>
                <UpgradePage
                    theme={theme}
                    pharmacyName={pharmacyName || subscription?.pharmacy_name || null}
                    onBack={() => setShowPage(false)}
                    onSuccess={() => {
                        setShowPage(false);
                        setTimeout(() => window.location.reload(), 400);
                    }}
                />
            </div>,
            document.body
        );
    }

    if (isPremium) return null;

    const handleUpgradeClick = () => {
        if (onUpgrade) onUpgrade();
        else setShowPage(true);
    };

    // ---------- INLINE VARIANT (no portal, used inside tabs) ----------
    if (inline) {
        return (
            <div className={`w-full min-h-full ${pageBg}`}>
                <InlineCard
                    title={title}
                    subtitle={subtitle}
                    benefits={benefits}
                    textTitle={textTitle}
                    textMuted={textMuted}
                    innerBg={innerBg}
                    cardBg={cardBg}
                    isDark={isDark}
                    onClose={onClose}
                    onUpgrade={handleUpgradeClick}
                    planCode={subscription?.plan_code}
                />
            </div>
        );
    }

    // ---------- FULLSCREEN VARIANT via PORTAL ----------
    return createPortal(
        <div className={`fixed inset-0 z-[9998] overflow-y-auto ${pageBg}`}>
            {/* Close button — fixed so it floats above everything */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="
                        fixed top-3 right-3 z-[10000]
                        w-9 h-9 rounded-full
                        bg-black/40 hover:bg-black/60
                        backdrop-blur-sm
                        flex items-center justify-center
                        text-white transition-colors
                    "
                    aria-label="Close"
                >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
            )}

            <div className="min-h-full flex flex-col">
                {/* HERO HEADER */}
                <div className="relative bg-gradient-to-br from-[#2ea043] via-[#238636] to-[#1a7f37] px-4 py-6 sm:px-6 sm:py-8 md:py-10 text-center">
                    <div className="absolute top-3 right-4 opacity-20">
                        <Sparkles className="w-14 h-14 sm:w-16 sm:h-16 text-white" />
                    </div>
                    <div className="absolute bottom-3 left-4 opacity-10">
                        <Sparkles className="w-9 h-9 sm:w-12 sm:h-12 text-white" />
                    </div>

                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/15 backdrop-blur-sm mb-2 md:mb-3">
                        <Lock
                            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                            strokeWidth={2.5}
                        />
                    </div>

                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                        {title}
                    </h1>

                    <p className="mt-1.5 md:mt-2 text-sm sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>

                    <div className="inline-flex items-center gap-2 mt-4 md:mt-5 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white text-[#1a7f37] font-black text-sm">
                        <Crown className="w-4 h-4" />
                        <span>KSh 299</span>
                        <span className="text-xs font-semibold opacity-70">/ month</span>
                    </div>
                </div>

                {/* BODY */}
                <div className={`flex-1 w-full ${cardBg}`}>
                    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-3.5 md:space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#2ea043]" />
                            <h2 className={`text-base md:text-lg font-extrabold ${textTitle}`}>
                                What you'll get with Premium
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
                            {benefits.map((benefit, idx) => {
                                const Icon = benefit.icon;
                                return (
                                    <div
                                        key={idx}
                                        className={`p-3.5 md:p-4 rounded-2xl ${innerBg} flex gap-3`}
                                    >
                                        <div className="flex-shrink-0">
                                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#2ea043]/15 flex items-center justify-center">
                                                <Icon
                                                    className="w-4.5 h-4.5 md:w-5 md:h-5 text-[#2ea043]"
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm ${textTitle} mb-0.5`}>
                                                {benefit.title}
                                            </p>
                                            <p className={`text-xs leading-relaxed ${textMuted}`}>
                                                {benefit.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={`h-px ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'}`} />

                        <div className="flex items-start gap-2.5">
                            <div className="flex-shrink-0 mt-0.5">
                                <div className="w-6 h-6 rounded-full bg-[#2ea043]/15 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-[#2ea043]" strokeWidth={3} />
                                </div>
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${textTitle}`}>
                                    Your Free plan keeps working
                                </p>
                                <p className={`text-xs ${textMuted} mt-0.5 leading-relaxed`}>
                                    Selling, stock management, customers, suppliers, loyalty — all still
                                    yours. Premium adds the insights and lifts the caps on top.
                                </p>
                            </div>
                        </div>

                        <div className="pt-1 md:pt-2 space-y-2 max-w-xl mx-auto w-full">
                            <button
                                onClick={handleUpgradeClick}
                                className="
                                    w-full py-3.5 rounded-2xl
                                    bg-gradient-to-r from-[#2ea043] to-[#238636]
                                    hover:from-[#3fb950] hover:to-[#2ea043]
                                    text-white font-black text-base
                                    transition-all duration-200
                                    active:scale-[0.98]
                                    flex items-center justify-center gap-2
                                "
                            >
                                <Crown className="w-5 h-5" strokeWidth={2.5} />
                                <span>Upgrade to Premium</span>
                            </button>

                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className={`w-full py-2.5 rounded-2xl text-sm font-bold ${textMuted} hover:opacity-80 transition-opacity`}
                                >
                                    Maybe later
                                </button>
                            )}

                            <p className={`text-center text-xs ${textMuted}`}>
                                Cancel anytime. Your data stays yours.
                            </p>
                        </div>

                        <p className={`text-center text-[10px] ${textMuted} opacity-60`}>
                            Current plan: {subscription?.plan_code?.toUpperCase() || 'FREE'}
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ---------- Small inline card used by the `inline` prop ----------
const InlineCard: React.FC<any> = ({
    title, subtitle, benefits, textTitle, textMuted, innerBg, cardBg, isDark,
    onClose, onUpgrade, planCode,
}) => (
    <div className="min-h-full flex items-start justify-center px-3 py-6 md:py-10">
        <div className={`w-full max-w-2xl rounded-3xl overflow-hidden ${cardBg}`}>
            <div className="relative bg-gradient-to-br from-[#2ea043] via-[#238636] to-[#1a7f37] px-6 py-8 md:py-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/15 backdrop-blur-sm mb-3">
                    <Lock className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h1>
                <p className="mt-2 text-sm md:text-base text-white/90 max-w-md mx-auto leading-relaxed">
                    {subtitle}
                </p>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white text-[#1a7f37] font-black text-sm">
                    <Crown className="w-4 h-4" />
                    <span>KSh 299</span>
                    <span className="text-xs font-semibold opacity-70">/ month</span>
                </div>
            </div>
            <div className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {benefits.map((b: any, i: number) => {
                        const Icon = b.icon;
                        return (
                            <div key={i} className={`p-3.5 rounded-2xl ${innerBg} flex gap-3`}>
                                <div className="w-9 h-9 rounded-xl bg-[#2ea043]/15 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4.5 h-4.5 text-[#2ea043]" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm ${textTitle} mb-0.5`}>{b.title}</p>
                                    <p className={`text-xs leading-relaxed ${textMuted}`}>{b.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={onUpgrade}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2ea043] to-[#238636] hover:from-[#3fb950] hover:to-[#2ea043] text-white font-black text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <Crown className="w-5 h-5" strokeWidth={2.5} />
                    <span>Upgrade to Premium</span>
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className={`w-full py-2.5 rounded-2xl text-sm font-bold ${textMuted} hover:opacity-80`}
                    >
                        Maybe later
                    </button>
                )}
                <p className={`text-center text-[10px] ${textMuted} opacity-60`}>
                    Current plan: {planCode?.toUpperCase() || 'FREE'}
                </p>
            </div>
        </div>
    </div>
);