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

    // Handle enter/exit animations
    useEffect(() => {
        if (show && message) {
            // Show the component
            setShouldRender(true);
            // Small delay to trigger enter animation
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsLeaving(false);
            });
        } else if (shouldRender) {
            // Start exit animation
            setIsLeaving(true);
            setIsVisible(false);
            // Remove from DOM after animation completes
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 400); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [show, message]);

    // Auto-close after 1.5 seconds for non-loading states
    useEffect(() => {
        if (type && type !== 'loading' && show && message && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [type, show, message, onClose]);

    // Don't render if not needed
    if (!shouldRender || !message) return null;

    // Get icon based on type with specific colors
    const getIcon = () => {
        switch (type) {
            case 'loading':
                return (
                    <div className="relative flex-shrink-0">
                        <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                        <span className={`absolute inset-0 rounded-full border-2 ${isDark ? 'border-blue-400/20' : 'border-blue-500/20'} animate-pulse`} />
                    </div>
                );
            case 'success':
                return <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />;
            case 'error':
                return <AlertCircle className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />;
            case 'info':
            default:
                return <Info className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />;
        }
    };

    // Get text color based on type
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

    // Get background color based on type and theme
    const getBackgroundColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'bg-[#0d1a2d]';
                case 'success': return 'bg-[#0d1f0d]';
                case 'error': return 'bg-[#1f0d0d]';
                case 'info': return 'bg-[#0d1a2d]';
                default: return 'bg-[#1c2333]';
            }
        } else {
            switch (type) {
                case 'loading': return 'bg-[#e8f0fe]';
                case 'success': return 'bg-[#e6f4ea]';
                case 'error': return 'bg-[#fce8e8]';
                case 'info': return 'bg-[#e8f0fe]';
                default: return 'bg-[#f0f2f5]';
            }
        }
    };

    // Get border color based on type and theme
    const getBorderColor = () => {
        if (isDark) {
            switch (type) {
                case 'loading': return 'border-blue-500/30';
                case 'success': return 'border-emerald-500/30';
                case 'error': return 'border-red-500/30';
                case 'info': return 'border-cyan-500/30';
                default: return 'border-[#30363d]';
            }
        } else {
            switch (type) {
                case 'loading': return 'border-blue-400/30';
                case 'success': return 'border-emerald-400/30';
                case 'error': return 'border-red-400/30';
                case 'info': return 'border-cyan-400/30';
                default: return 'border-[#d0d7de]';
            }
        }
    };

    // Get dot colors for loading state
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

    // Loading spinner with animated dots
    const LoadingSpinner = () => {
        const dots = [
            { color: dotColors.dot1, delay: '0ms' },
            { color: dotColors.dot2, delay: '300ms' },
            { color: dotColors.dot3, delay: '600ms' },
        ];

        return (
            <div className="flex items-center gap-2 flex-shrink-0">
                <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <div className="flex items-center gap-1 ml-0.5">
                    {dots.map((dot, index) => (
                        <span
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full ${dot.color} animate-pulse`}
                            style={{ animationDelay: dot.delay }}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Animation classes - smooth transitions
    const getAnimationClasses = () => {
        if (isLeaving) {
            // Exit animation: fade out + slide up + shrink
            return 'opacity-0 -translate-y-3 scale-95';
        }
        if (isVisible) {
            // Enter animation: fade in + slide down + grow
            return 'opacity-100 translate-y-0 scale-100';
        }
        // Initial state (will be invisible then animate in)
        return 'opacity-0 -translate-y-3 scale-95';
    };

    return (
        <div className={`
            flex items-center justify-center gap-3 px-4 py-2.5 text-sm
            ${getBackgroundColor()}
            ${getBorderColor()}
            border-b
            transition-all duration-300 ease-out
            ${getAnimationClasses()}
        `}>
            <div className="flex items-center gap-3">
                {type === 'loading' ? <LoadingSpinner /> : getIcon()}
                <span className={`font-medium text-center ${getTextColor()}`}>
                    {message}
                </span>
            </div>
        </div>
    );
};