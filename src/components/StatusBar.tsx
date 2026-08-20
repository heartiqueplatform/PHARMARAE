import React, { useEffect, useState, useCallback } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Info,
    Loader2,
    XCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface StatusItem {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    details?: string;
}

interface StatusBarProps {
    message: string | null;
    type: 'loading' | 'success' | 'error' | 'info' | null;
    show: boolean;
    onClose?: () => void;
    items?: StatusItem[];
    onItemClick?: (id: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    message,
    type,
    show,
    onClose,
    items = [],
    onItemClick,
}) => {
    const { isDark } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);

    // Animated progress through verification steps
    useEffect(() => {
        if (type === 'loading' && show && items.length > 0) {
            const totalSteps = items.length;
            const interval = setInterval(() => {
                setCurrentStep((prev) => {
                    const next = prev + 1;
                    if (next >= totalSteps) {
                        clearInterval(interval);
                        return totalSteps - 1;
                    }
                    return next;
                });
            }, 400);

            return () => clearInterval(interval);
        }
    }, [type, show, items.length]);

    // Progress bar animation
    useEffect(() => {
        if (type === 'loading' && show) {
            let startTime = Date.now();
            const duration = 2000;

            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min((elapsed / duration) * 100, 90);
                setProgress(newProgress);

                if (newProgress < 90) {
                    requestAnimationFrame(animateProgress);
                }
            };

            const animFrame = requestAnimationFrame(animateProgress);
            return () => cancelAnimationFrame(animFrame);
        } else if (type === 'success') {
            setProgress(100);
        } else if (type === 'error') {
            setProgress(0);
        }
    }, [type, show]);

    // Show/hide animation
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
                setProgress(0);
                setCurrentStep(0);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [show, message, shouldRender]);

    // Auto-close for non-loading states
    useEffect(() => {
        if (type && type !== 'loading' && show && message && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [type, show, message, onClose]);

    if (!shouldRender || !message) return null;

    const getIcon = () => {
        switch (type) {
            case 'loading':
                return null;
            case 'success':
                return (
                    <div className="relative flex-shrink-0">
                        <div className={`absolute inset-0 rounded-full animate-ping ${isDark ? 'bg-emerald-300/30' : 'bg-emerald-700/20'
                            }`} />
                        <CheckCircle className={`h-5 w-5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
                    </div>
                );
            case 'error':
                return (
                    <div className="relative flex-shrink-0">
                        <div className={`absolute inset-0 rounded-full animate-ping ${isDark ? 'bg-rose-300/30' : 'bg-rose-700/20'
                            }`} />
                        <XCircle className={`h-5 w-5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />
                    </div>
                );
            case 'info':
            default:
                return <Info className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} />;
        }
    };

    const getBackgroundColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'bg-slate-900/95 backdrop-blur-xl';
                case 'success': return 'bg-emerald-950/95 backdrop-blur-xl';
                case 'error': return 'bg-rose-950/95 backdrop-blur-xl';
                case 'info': return 'bg-cyan-950/95 backdrop-blur-xl';
                default: return 'bg-slate-900/95 backdrop-blur-xl';
            }
        }

        switch (type) {
            case 'loading': return 'bg-white/95 backdrop-blur-xl';
            case 'success': return 'bg-emerald-50/95 backdrop-blur-xl';
            case 'error': return 'bg-rose-50/95 backdrop-blur-xl';
            case 'info': return 'bg-cyan-50/95 backdrop-blur-xl';
            default: return 'bg-white/95 backdrop-blur-xl';
        }
    };

    const getBorderColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'border-slate-700/50';
                case 'success': return 'border-emerald-500/30';
                case 'error': return 'border-rose-500/30';
                case 'info': return 'border-cyan-500/30';
                default: return 'border-slate-700/50';
            }
        }

        switch (type) {
            case 'loading': return 'border-slate-200';
            case 'success': return 'border-emerald-200';
            case 'error': return 'border-rose-200';
            case 'info': return 'border-cyan-200';
            default: return 'border-slate-200';
        }
    };

    const getAnimationClasses = () => {
        if (isLeaving) {
            return 'opacity-0 -translate-y-4 scale-95';
        }
        if (isVisible) {
            return 'opacity-100 translate-y-0 scale-100';
        }
        return 'opacity-0 -translate-y-4 scale-95';
    };

    // Verification-style loader
    const VerificationLoader = () => {
        const totalSteps = items.length || 5;
        const completedSteps = items.filter(item => item.status === 'success').length;
        const failedSteps = items.filter(item => item.status === 'error').length;

        return (
            <div className="w-full max-w-sm space-y-3">
                {/* Header with status */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <svg className="h-8 w-8" viewBox="0 0 40 40">
                                {/* Background circle */}
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    fill="none"
                                    stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                                    strokeWidth="3"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    fill="none"
                                    stroke={isDark ? '#5eead4' : '#0f766e'}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray="100.48"
                                    strokeDashoffset={100.48 - (progress / 100) * 100.48}
                                    className={`transition-all duration-300 ${type === 'loading' ? 'animate-[spin_1.5s_linear_infinite]' : ''
                                        }`}
                                    style={{
                                        transformOrigin: 'center',
                                        transform: 'rotate(-90deg)',
                                    }}
                                />
                                {/* Inner icon */}
                                <foreignObject x="8" y="8" width="24" height="24">
                                    <div className="flex h-full w-full items-center justify-center">
                                        {type === 'loading' ? (
                                            <Loader2 className={`h-5 w-5 animate-spin ${isDark ? 'text-teal-300' : 'text-teal-700'}`} />
                                        ) : type === 'success' ? (
                                            <CheckCircle className={`h-5 w-5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
                                        ) : type === 'error' ? (
                                            <XCircle className={`h-5 w-5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />
                                        ) : null}
                                    </div>
                                </foreignObject>
                            </svg>
                        </div>

                        <div>
                            <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {message}
                            </div>
                            {type === 'loading' && (
                                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {Math.round(progress)}% • {completedSteps}/{totalSteps} complete
                                </div>
                            )}
                            {type === 'success' && (
                                <div className={`text-[10px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                    ✓ All checks passed
                                </div>
                            )}
                            {type === 'error' && (
                                <div className={`text-[10px] ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                                    ✗ {failedSteps} check{failedSteps > 1 ? 's' : ''} failed
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expand/collapse button */}
                    {items.length > 0 && type === 'loading' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(!expanded);
                            }}
                            className={`rounded-full p-1 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                                }`}
                        >
                            {expanded ? (
                                <ChevronUp className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                            ) : (
                                <ChevronDown className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                            )}
                        </button>
                    )}
                </div>

                {/* Verification steps */}
                {expanded && items.length > 0 && (
                    <div className={`space-y-1.5 border-t pt-2.5 ${isDark ? 'border-slate-700/50' : 'border-slate-200'
                        }`}>
                        {items.map((item, index) => {
                            const isActive = index === currentStep && type === 'loading';
                            const isCompleted = item.status === 'success';
                            const isFailed = item.status === 'error';
                            const isPending = item.status === 'pending';

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onItemClick?.(item.id)}
                                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all ${isActive ? `${isDark ? 'bg-white/5' : 'bg-black/5'} scale-[1.02]` : ''
                                        } ${onItemClick ? 'cursor-pointer' : ''}`}
                                >
                                    {/* Status indicator */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted
                                                ? `${isDark ? 'border-emerald-400 bg-emerald-400/20' : 'border-emerald-600 bg-emerald-100'}`
                                                : isFailed
                                                    ? `${isDark ? 'border-rose-400 bg-rose-400/20' : 'border-rose-600 bg-rose-100'}`
                                                    : isActive
                                                        ? `${isDark ? 'border-teal-400' : 'border-teal-600'} animate-pulse`
                                                        : `${isDark ? 'border-slate-600' : 'border-slate-300'}`
                                            }`}>
                                            {isCompleted && (
                                                <CheckCircle className={`h-3 w-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                            )}
                                            {isFailed && (
                                                <XCircle className={`h-3 w-3 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                                            )}
                                            {isActive && !isCompleted && !isFailed && (
                                                <Loader2 className={`h-3 w-3 animate-spin ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                                            )}
                                            {isPending && !isActive && (
                                                <div className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Label */}
                                    <span className={`flex-1 text-xs font-medium ${isCompleted
                                            ? `${isDark ? 'text-emerald-300' : 'text-emerald-700'}`
                                            : isFailed
                                                ? `${isDark ? 'text-rose-300' : 'text-rose-700'}`
                                                : isActive
                                                    ? `${isDark ? 'text-slate-200' : 'text-slate-800'}`
                                                    : `${isDark ? 'text-slate-500' : 'text-slate-500'}`
                                        }`}>
                                        {item.label}
                                    </span>

                                    {/* Details */}
                                    {item.details && (
                                        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {item.details}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
            <div className={`
                flex w-fit max-w-[92vw] items-center justify-center
                rounded-2xl border px-4 py-3
                shadow-[0_20px_60px_rgba(15,23,42,0.2)]
                transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${getBackgroundColor()}
                ${getBorderColor()}
                ${getAnimationClasses()}
                pointer-events-auto
                min-w-[200px]
            `}>
                {type === 'loading' ? (
                    <VerificationLoader />
                ) : (
                    <div className="flex items-center gap-2.5">
                        {getIcon()}
                        <span className={`
                            text-sm font-medium leading-relaxed
                            ${isDark ? 'text-slate-200' : 'text-slate-800'}
                        `}>
                            {message}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};