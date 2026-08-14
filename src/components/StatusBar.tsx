// components/StatusBar.tsx
import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
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
    }, [show, message]);

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
                return (
                    <div className="relative flex-shrink-0">
                        <Loader2 className={`w-3 h-3 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                        <span className={`absolute inset-0 rounded-full border ${isDark ? 'border-blue-400/20' : 'border-blue-500/20'} animate-pulse`} />
                    </div>
                );
            case 'success':
                return <CheckCircle className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />;
            case 'error':
                return <AlertCircle className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />;
            case 'info':
            default:
                return <Info className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />;
        }
    };

    const getTextColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'text-blue-300';
                case 'success': return 'text-emerald-300';
                case 'error': return 'text-red-300';
                case 'info': return 'text-cyan-300';
                default: return 'text-[#8b949e]';
            }
        } else {
            switch (type) {
                case 'loading': return 'text-blue-700';
                case 'success': return 'text-emerald-700';
                case 'error': return 'text-red-700';
                case 'info': return 'text-cyan-700';
                default: return 'text-[#656d76]';
            }
        }
    };

    const getBackgroundColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'bg-[#0d1a2d]/95';
                case 'success': return 'bg-[#0d1f0d]/95';
                case 'error': return 'bg-[#1f0d0d]/95';
                case 'info': return 'bg-[#0d1a2d]/95';
                default: return 'bg-[#1c2333]/95';
            }
        } else {
            switch (type) {
                case 'loading': return 'bg-[#e8f0fe]/95';
                case 'success': return 'bg-[#e6f4ea]/95';
                case 'error': return 'bg-[#fce8e8]/95';
                case 'info': return 'bg-[#e8f0fe]/95';
                default: return 'bg-[#f0f2f5]/95';
            }
        }
    };

    const getBorderColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'border-blue-500/40';
                case 'success': return 'border-emerald-500/40';
                case 'error': return 'border-red-500/40';
                case 'info': return 'border-cyan-500/40';
                default: return 'border-[#30363d]';
            }
        } else {
            switch (type) {
                case 'loading': return 'border-blue-400/40';
                case 'success': return 'border-emerald-400/40';
                case 'error': return 'border-red-400/40';
                case 'info': return 'border-cyan-400/40';
                default: return 'border-[#d0d7de]';
            }
        }
    };

    const getDotColors = () => {
        if (isDark) {
            return {
                dot1: 'bg-blue-400/60',
                dot2: 'bg-blue-400/40',
                dot3: 'bg-blue-400/20',
            };
        } else {
            return {
                dot1: 'bg-blue-500/60',
                dot2: 'bg-blue-500/40',
                dot3: 'bg-blue-500/20',
            };
        }
    };

    const dotColors = getDotColors();

    const LoadingSpinner = () => {
        const dots = [
            { color: dotColors.dot1, delay: '0ms' },
            { color: dotColors.dot2, delay: '300ms' },
            { color: dotColors.dot3, delay: '600ms' },
        ];

        return (
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Loader2 className={`w-3 h-3 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <div className="flex items-center gap-0.5 ml-0.5">
                    {dots.map((dot, index) => (
                        <span
                            key={index}
                            className={`w-1 h-1 rounded-full ${dot.color} animate-pulse`}
                            style={{ animationDelay: dot.delay }}
                        />
                    ))}
                </div>
            </div>
        );
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

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`
                flex items-center justify-center
                w-fit max-w-[90%]
                px-3 py-1.5 rounded-lg
                ${getBackgroundColor()}
                ${getBorderColor()}
                border
                shadow-lg backdrop-blur-sm
                transition-all duration-300 ease-out
                ${getAnimationClasses()}
                pointer-events-auto
            `}>
                <div className="flex items-center gap-1.5">
                    {type === 'loading' ? <LoadingSpinner /> : getIcon()}
                    <span className={`
                        font-serif text-[10px] tracking-wide leading-relaxed
                        font-medium
                        ${getTextColor()}
                        whitespace-nowrap
                    `}>
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
};