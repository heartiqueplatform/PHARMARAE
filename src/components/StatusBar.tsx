import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    BarChart3,
    CheckCircle,
    ClipboardList,
    Info,
    Loader2,
    Package,
    Pill,
    ShoppingCart,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface StatusBarProps {
    message: string | null;
    type: 'loading' | 'success' | 'error' | 'info' | null;
    show: boolean;
    onClose?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    message,
    type,
    show,
    onClose
}) => {
    const { isDark } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (show && message) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsLeaving(false);
            });
        } else if (shouldRender) {
            setIsLeaving(true);
            setIsVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [show, message, shouldRender]);

    useEffect(() => {
        if (type && type !== 'loading' && show && message && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [type, show, message, onClose]);

    if (!shouldRender || !message) return null;

    const getIcon = () => {
        switch (type) {
            case 'loading':
                return <Loader2 className={`h-3.5 w-3.5 animate-spin ${isDark ? 'text-teal-300' : 'text-teal-700'}`} />;
            case 'success':
                return <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />;
            case 'error':
                return <AlertCircle className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />;
            case 'info':
            default:
                return <Info className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} />;
        }
    };

    const getTextColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'text-teal-100';
                case 'success': return 'text-emerald-100';
                case 'error': return 'text-rose-100';
                case 'info': return 'text-cyan-100';
                default: return 'text-slate-200';
            }
        }

        switch (type) {
            case 'loading': return 'text-teal-950';
            case 'success': return 'text-emerald-950';
            case 'error': return 'text-rose-950';
            case 'info': return 'text-cyan-950';
            default: return 'text-slate-700';
        }
    };

    const getBackgroundColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'bg-slate-950/95';
                case 'success': return 'bg-emerald-950/95';
                case 'error': return 'bg-rose-950/95';
                case 'info': return 'bg-cyan-950/95';
                default: return 'bg-slate-950/95';
            }
        }

        switch (type) {
            case 'loading': return 'bg-white/95';
            case 'success': return 'bg-emerald-50/95';
            case 'error': return 'bg-rose-50/95';
            case 'info': return 'bg-cyan-50/95';
            default: return 'bg-white/95';
        }
    };

    const getBorderColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'border-teal-300/20';
                case 'success': return 'border-emerald-300/25';
                case 'error': return 'border-rose-300/25';
                case 'info': return 'border-cyan-300/25';
                default: return 'border-slate-700/70';
            }
        }

        switch (type) {
            case 'loading': return 'border-teal-700/15';
            case 'success': return 'border-emerald-700/15';
            case 'error': return 'border-rose-700/15';
            case 'info': return 'border-cyan-700/15';
            default: return 'border-slate-200';
        }
    };

    const getAnimationClasses = () => {
        if (isLeaving) {
            return 'opacity-0 -translate-y-3 scale-95';
        }
        if (isVisible) {
            return 'opacity-100 translate-y-0 scale-100';
        }
        return 'opacity-0 -translate-y-3 scale-95';
    };

    const PharmacyLoading = () => {
        const iconClass = isDark ? 'text-teal-100' : 'text-teal-900';
        const chipClass = isDark
            ? 'border-white/10 bg-white/10 shadow-teal-950/40'
            : 'border-teal-900/10 bg-teal-50 shadow-teal-100';
        const icons = [
            { Icon: Pill, label: 'Medicine', delay: '0ms' },
            { Icon: Package, label: 'Stock', delay: '120ms' },
            { Icon: ShoppingCart, label: 'Sales', delay: '240ms' },
            { Icon: ClipboardList, label: 'Records', delay: '360ms' },
            { Icon: BarChart3, label: 'Reports', delay: '480ms' },
        ];

        return (
            <div
                className="flex items-center gap-2"
                role="status"
                aria-live="polite"
                aria-label={message}
            >
                <div className="relative flex items-center gap-1.5">
                    <span className={`absolute -inset-x-1 bottom-0 h-px overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-teal-900/10'}`}>
                        <span className={`block h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full ${isDark ? 'bg-teal-300' : 'bg-teal-700'}`} />
                    </span>

                    {icons.map(({ Icon, label, delay }) => (
                        <span
                            key={label}
                            className={`
                                flex h-7 w-7 items-center justify-center rounded-md border
                                shadow-sm transition-transform
                                animate-[pulse_1.6s_ease-in-out_infinite]
                                ${chipClass}
                            `}
                            style={{ animationDelay: delay }}
                            aria-hidden="true"
                        >
                            <Icon className={`h-3.5 w-3.5 ${iconClass}`} strokeWidth={2.2} />
                        </span>
                    ))}
                </div>

                <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.7)]' : 'bg-teal-700 shadow-[0_0_12px_rgba(15,118,110,0.35)]'} animate-pulse`} />
            </div>
        );
    };

    return (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
            <div className={`
                flex w-fit max-w-[90vw] items-center justify-center
                rounded-xl border px-3 py-2
                shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl
                transition-all duration-300 ease-out
                ${getBackgroundColor()}
                ${getBorderColor()}
                ${getAnimationClasses()}
                pointer-events-auto
            `}>
                {type === 'loading' ? (
                    <PharmacyLoading />
                ) : (
                    <div className="flex items-center gap-1.5">
                        {getIcon()}
                        <span className={`
                            max-w-[72vw] truncate text-[11px] font-medium leading-relaxed
                            ${getTextColor()}
                            whitespace-nowrap
                        `}>
                            {message}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
