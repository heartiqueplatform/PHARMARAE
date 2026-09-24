// components/UpgradePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Crown,
    Check,
    Smartphone,
    Loader2,
    ShieldCheck,
    ArrowLeft,
    AlertCircle,
    Sparkles,
    TrendingUp,
    Rocket,
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../lib/supabase';

interface UpgradePageProps {
    theme?: 'dark' | 'light';
    pharmacyName?: string | null;
    onBack?: () => void;
    onSuccess?: () => void;
}

type PageState = 'details' | 'entering-phone' | 'waiting' | 'success' | 'error';

const PRICE_MONTHLY = 2
const CURRENCY = 'KSh';

const BENEFITS = [
    'Unlimited products (Free is capped at 120)',
    'Business Intelligence — trends, best sellers, profit insights',
    'Daily reports with revenue and top products',
    'Advanced reporting — weekly and monthly trends',
    'PDF exports of every report',
    'Priority support',
];

// =============================================
// Confetti
// =============================================
const Confetti: React.FC = () => {
    const pieces = useMemo(() => {
        const colors = ['#2ea043', '#3fb950', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
        return Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.8,
            duration: 2.5 + Math.random() * 1.5,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.random() * 6,
            shape: Math.random() > 0.5 ? 'circle' : 'square',
        }));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden">
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(-20vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                .confetti-piece {
                    position: absolute;
                    top: 0;
                    animation: confetti-fall linear forwards;
                }
            `}</style>
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: `${p.left}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        borderRadius: p.shape === 'circle' ? '50%' : '2px',
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        transform: `rotate(${p.rotation}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

export const UpgradePage: React.FC<UpgradePageProps> = ({
    theme = 'dark',
    pharmacyName,
    onBack,
    onSuccess,
}) => {
    const isDark = theme === 'dark';
    const { subscription, refresh } = useSubscription();

    const [state, setState] = useState<PageState>('details');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [checkoutId, setCheckoutId] = useState<string | null>(null);

    // Colors
    const pageBg = isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328]';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const innerBg = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

    // =============================================
    // Poll for activation
    // =============================================
    useEffect(() => {
        if (state !== 'waiting') return;

        let cancelled = false;
        const startTime = Date.now();
        const MAX_WAIT_MS = 180_000;
        const POLL_INTERVAL_MS = 3_000;

        const tick = async () => {
            if (cancelled) return;

            if (Date.now() - startTime > MAX_WAIT_MS) {
                setState('error');
                setError('Payment not confirmed in time. If you paid, please check again in a minute.');
                return;
            }

            try {
                await refresh();
            } catch { }
        };

        const id = setInterval(tick, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [state, refresh]);

    // Watch for premium activation
    useEffect(() => {
        if (state === 'waiting' && subscription?.plan_code === 'premium') {
            setState('success');
        }
    }, [state, subscription]);

    // =============================================
    // Send STK push
    // =============================================
    const handleSendPayment = async () => {
        setError(null);

        const clean = phone.replace(/\D/g, '');
        if (clean.length < 9) {
            setError('Please enter a valid M-Pesa phone number.');
            return;
        }
        if (!pharmacyName) {
            setError('Pharmacy not identified. Please log in again.');
            return;
        }

        try {
            setState('waiting');

            const { data, error: fnError } = await supabase.functions.invoke(
                'pharmienta-subscribe',
                {
                    body: {
                        phone: clean,
                        amount: PRICE_MONTHLY,
                        pharmacy_name: pharmacyName,
                        plan_code: 'premium',
                        duration_type: '1-month',
                    },
                }
            );

            if (fnError) throw new Error(fnError.message || 'Payment request failed');
            if (!data?.success) {
                throw new Error(data?.error || 'Could not send payment request');
            }

            setCheckoutId(data.checkout_request_id || null);
        } catch (err: any) {
            console.error('[UpgradePage] send payment error:', err);
            setState('error');
            setError(err.message || 'Failed to send payment request. Please try again.');
        }
    };

    const handleEnterPremium = async () => {
        try {
            await refresh();
        } catch { }
        setTimeout(() => window.location.reload(), 300);
    };

    // =============================================
    // Full-screen page wrapper
    // =============================================
    const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className={`min-h-screen w-full ${pageBg} flex flex-col`}>
            {children}
        </div>
    );

    // =============================================
    // Hero header
    // =============================================
    const HeroHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
        <div className="relative bg-gradient-to-br from-[#2ea043] via-[#238636] to-[#1a7f37] px-4 py-6 sm:px-6 sm:py-8 md:py-10 text-center">
            <div className="absolute top-3 right-4 opacity-20">
                <Sparkles className="w-16 h-16 text-white" />
            </div>
            <div className="absolute bottom-3 left-4 opacity-10">
                <Sparkles className="w-10 h-10 text-white" />
            </div>
            {onBack && (
                <button
                    onClick={onBack}
                    className="
                        absolute top-3 left-3 z-20
                        w-9 h-9 rounded-full
                        bg-white/15 hover:bg-white/25
                        backdrop-blur-sm
                        flex items-center justify-center
                        text-white transition-colors
                    "
                    aria-label="Back"
                >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
            )}
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/15 backdrop-blur-sm mb-2 md:mb-3">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {title}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
                {subtitle}
            </p>
        </div>
    );

    // =============================================
    // STATE: Details
    // =============================================
    if (state === 'details') {
        return (
            <PageShell>
                <HeroHeader
                    title="Upgrade to Premium"
                    subtitle="Understand your business. Insights, analytics, and deeper reporting — for KSh 299/month."
                />

                <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-3.5">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#2ea043]" />
                        <h2 className={`text-base md:text-lg font-extrabold ${textTitle}`}>
                            Everything in Premium
                        </h2>
                    </div>

                    <div className="space-y-2">
                        {BENEFITS.map((b, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-2.5 p-3 rounded-xl ${cardBg}`}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-5 h-5 rounded-full bg-[#2ea043]/15 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-[#2ea043]" strokeWidth={3} />
                                    </div>
                                </div>
                                <p className={`text-sm ${textTitle} leading-relaxed`}>{b}</p>
                            </div>
                        ))}
                    </div>

                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between`}>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>
                                Total today
                            </p>
                            <p className={`text-2xl font-black ${textTitle}`}>
                                {CURRENCY} {PRICE_MONTHLY}
                            </p>
                            <p className={`text-xs ${textMuted} mt-0.5`}>
                                Renews monthly. Cancel anytime.
                            </p>
                        </div>
                        <Crown className="w-9 h-9 text-[#2ea043]" strokeWidth={2} />
                    </div>

                    <button
                        onClick={() => setState('entering-phone')}
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
                        <span>Continue to Payment</span>
                    </button>

                    <p className={`text-center text-xs ${textMuted}`}>
                        Pay securely with M-Pesa. No card required.
                    </p>
                </div>
            </PageShell>
        );
    }

    // =============================================
    // STATE: Entering phone
    // =============================================
    if (state === 'entering-phone') {
        return (
            <PageShell>
                <HeroHeader
                    title="M-Pesa Payment"
                    subtitle="Enter the phone number registered with M-Pesa. You'll receive a prompt to approve."
                />

                <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-3.5">
                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <label className={`block mb-2 font-bold text-sm ${textMuted}`}>
                            M-Pesa Phone Number
                        </label>
                        <div className="relative">
                            <Smartphone
                                className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`}
                            />
                            <input
                                type="tel"
                                inputMode="numeric"
                                placeholder="0712 345 678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`w-full rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                autoFocus
                            />
                        </div>
                        <p className={`text-xs ${textMuted} mt-2`}>
                            Works with any Kenyan number: 07xx, 01xx, +254, or 254.
                        </p>
                    </div>

                    <div className={`p-4 rounded-2xl ${cardBg} space-y-2`}>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textMuted}>Amount</span>
                            <span className={`font-bold ${textTitle}`}>
                                {CURRENCY} {PRICE_MONTHLY}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textMuted}>Plan</span>
                            <span className={`font-bold ${textTitle}`}>Premium (monthly)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textMuted}>Pharmacy</span>
                            <span className={`font-bold ${textTitle} truncate max-w-[200px]`}>
                                {pharmacyName || '—'}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-4 rounded-xl bg-rose-500/10">
                            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-rose-500 font-semibold">{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => {
                                setError(null);
                                setState('details');
                            }}
                            className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm ${isDark
                                ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                                : 'bg-white text-[#1f2328] hover:bg-[#e8eaed]'
                                }`}
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSendPayment}
                            className="
                                flex-1 py-3.5 rounded-2xl
                                bg-gradient-to-r from-[#2ea043] to-[#238636]
                                hover:from-[#3fb950] hover:to-[#2ea043]
                                text-white font-black text-base
                                transition-all duration-200
                                active:scale-[0.98]
                                flex items-center justify-center gap-2
                            "
                        >
                            <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
                            <span>Pay {CURRENCY} {PRICE_MONTHLY}</span>
                        </button>
                    </div>

                    <div className="flex items-start gap-3">
                        <ShieldCheck className={`w-4 h-4 flex-shrink-0 mt-0.5 ${textMuted}`} />
                        <p className={`text-xs ${textMuted} leading-relaxed`}>
                            Your payment is processed by Safaricom. Pharmienta never sees your M-Pesa PIN.
                        </p>
                    </div>
                </div>
            </PageShell>
        );
    }

    // =============================================
    // STATE: Waiting
    // =============================================
    if (state === 'waiting') {
        return (
            <PageShell>
                <HeroHeader
                    title="Check Your Phone"
                    subtitle={`We've sent an M-Pesa prompt to ${phone}. Enter your PIN to complete the payment.`}
                />

                <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-3.5">
                    <div className={`p-6 rounded-2xl ${cardBg} flex flex-col items-center text-center`}>
                        <div className="w-16 h-16 rounded-full bg-[#2ea043]/15 flex items-center justify-center mb-3">
                            <Smartphone className="w-8 h-8 text-[#2ea043] animate-pulse" />
                        </div>

                        <div className="flex items-center gap-2 text-[#2ea043]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-bold">Waiting for confirmation...</span>
                        </div>

                        <p className={`text-xs ${textMuted} mt-3 max-w-sm leading-relaxed`}>
                            This can take up to 60 seconds. Please don't close this page.
                        </p>
                    </div>

                    <div className={`p-4 rounded-2xl ${cardBg} space-y-2`}>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textMuted}>Amount</span>
                            <span className={`font-bold ${textTitle}`}>
                                {CURRENCY} {PRICE_MONTHLY}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className={textMuted}>Phone</span>
                            <span className={`font-bold ${textTitle}`}>{phone}</span>
                        </div>
                        {checkoutId && (
                            <div className="flex items-center justify-between text-sm">
                                <span className={textMuted}>Reference</span>
                                <span className={`font-mono text-xs ${textMuted} truncate max-w-[200px]`}>
                                    {checkoutId}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <p className={`text-xs ${textMuted} leading-relaxed`}>
                            <strong className={textTitle}>Didn't get the prompt?</strong> Check that your
                            phone has signal. If the prompt doesn't arrive in 60 seconds, you'll be able to
                            try again.
                        </p>
                    </div>
                </div>
            </PageShell>
        );
    }

    // =============================================
    // STATE: Success
    // =============================================
    if (state === 'success') {
        return (
            <PageShell>
                <Confetti />

                <div className="relative bg-gradient-to-br from-[#2ea043] via-[#238636] to-[#1a7f37] px-4 py-8 sm:px-6 sm:py-10 md:py-14 text-center overflow-hidden">
                    <div className="absolute top-4 right-6 opacity-20">
                        <Sparkles className="w-20 h-20 text-white" />
                    </div>
                    <div className="absolute bottom-4 left-6 opacity-15">
                        <Sparkles className="w-14 h-14 text-white" />
                    </div>

                    <div className="relative inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm mb-4 animate-bounce">
                        <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-white">
                            <Check className="w-8 h-8 md:w-10 md:h-10 text-[#1a7f37]" strokeWidth={3.5} />
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                        You're Premium
                    </h1>
                    <p className="mt-2 text-sm md:text-base text-white/95 max-w-lg mx-auto leading-relaxed font-semibold">
                        Welcome to the next level of pharmacy management.
                    </p>
                </div>

                <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-3.5">
                    {/* Personal message */}
                    <div className={`p-4 md:p-5 rounded-2xl ${cardBg}`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-[#2ea043]/15 flex items-center justify-center">
                                    <Rocket className="w-5 h-5 text-[#2ea043]" strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <p className={`text-base md:text-lg font-extrabold ${textTitle} mb-1`}>
                                    {pharmacyName ? `Great move, ${pharmacyName}` : 'Great move'}
                                </p>
                                <p className={`text-sm md:text-base ${textMuted} leading-relaxed`}>
                                    You've just unlocked the tools that turn a pharmacy into a
                                    <span className={`font-bold ${textTitle}`}> data-driven business</span>.
                                    Now you can see what sells, what's sitting on the shelf, and where
                                    your money is really going — at a glance.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What's unlocked */}
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <TrendingUp className="w-5 h-5 text-[#2ea043]" />
                            <h2 className={`text-base md:text-lg font-extrabold ${textTitle}`}>
                                Now unlocked
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                'Unlimited products',
                                'Business Intelligence',
                                'Daily reports',
                                'Advanced reporting',
                                'PDF exports',
                                'Priority support',
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 p-2.5 md:p-3 rounded-xl ${cardBg}`}
                                >
                                    <div className="flex-shrink-0">
                                        <div className="w-5 h-5 rounded-full bg-[#2ea043]/15 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-[#2ea043]" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <span className={`text-sm font-semibold ${textTitle}`}>
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Business closer */}
                    <div className={`p-4 md:p-5 rounded-2xl bg-[#2ea043]/10`}>
                        <p className={`text-sm md:text-base ${textTitle} leading-relaxed text-center font-medium`}>
                            Every insight you uncover from here on out —
                            <span className="font-bold"> every trend, every best-seller, every
                                slow mover</span> — is a decision you can now make with confidence.
                            <br />
                            <span className="text-[#2ea043] font-bold">
                                Let's grow this business.
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={handleEnterPremium}
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
                        <Rocket className="w-5 h-5" strokeWidth={2.5} />
                        <span>Start Using Premium</span>
                    </button>

                    <p className={`text-center text-xs ${textMuted}`}>
                        Reloading your app to activate Premium...
                    </p>
                </div>
            </PageShell>
        );
    }

    // =============================================
    // STATE: Error
    // =============================================
    return (
        <PageShell>
            <HeroHeader
                title="Payment Not Completed"
                subtitle="Something went wrong. Your account has not been charged."
            />

            <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-3.5">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10">
                    <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-500 font-semibold leading-relaxed">
                        {error || 'Your payment was not completed.'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => {
                            setError(null);
                            setState('entering-phone');
                        }}
                        className="
                            flex-1 py-3.5 rounded-2xl
                            bg-gradient-to-r from-[#2ea043] to-[#238636]
                            hover:from-[#3fb950] hover:to-[#2ea043]
                            text-white font-black text-base
                            transition-all duration-200
                            active:scale-[0.98]
                        "
                    >
                        Try Again
                    </button>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm ${isDark
                                ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                                : 'bg-white text-[#1f2328] hover:bg-[#e8eaed]'
                                }`}
                        >
                            Go Back
                        </button>
                    )}
                </div>
            </div>
        </PageShell>
    );
};