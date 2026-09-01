// components/StatusBar.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';

interface StatusBarProps {
    message: string | null;
    type: 'loading' | 'success' | 'error' | 'info' | null;
    show: boolean;
    onClose?: () => void;
    syncPendingCount?: number;
    isOnline?: boolean;
    isSyncing?: boolean;
    isRefreshing?: boolean; // New prop to track refresh state
}

export const StatusBar: React.FC<StatusBarProps> = ({
    message,
    type,
    show,
    onClose,
    syncPendingCount = 0,
    isOnline = true,
    isSyncing = false,
    isRefreshing = false,
}) => {
    const { isDark } = useTheme();
    const [progress, setProgress] = useState(0);
    const [showSuccessFlash, setShowSuccessFlash] = useState(false);
    const [currentColor, setCurrentColor] = useState<string>('');
    const animationRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle refresh animation
    useEffect(() => {
        if (isRefreshing) {
            // Start loading animation
            setProgress(0);
            setShowSuccessFlash(false);

            let startTime = Date.now();
            const duration = 2000;

            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min((elapsed / duration) * 100, 90);
                setProgress(newProgress);

                if (newProgress < 90) {
                    animationRef.current = requestAnimationFrame(animateProgress);
                }
            };

            animationRef.current = requestAnimationFrame(animateProgress);
        } else {
            // Animation stopped - show success flash
            if (progress > 0) {
                setProgress(100);
                setShowSuccessFlash(true);

                // Reset after flash
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    setProgress(0);
                    setShowSuccessFlash(false);
                }, 1500);
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isRefreshing, progress]);

    // Handle status type changes
    useEffect(() => {
        if (type === 'success' && show) {
            setShowSuccessFlash(true);
            setProgress(100);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setProgress(0);
                setShowSuccessFlash(false);
            }, 2000);
        }

        if (type === 'error' && show) {
            setProgress(0);
            setShowSuccessFlash(false);
        }
    }, [type, show]);

    // Auto-close for non-loading states
    useEffect(() => {
        if (type && type !== 'loading' && show && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [type, show, onClose]);

    // Determine the base color based on status
    const getBaseColor = () => {
        // If refreshing, show loading color
        if (isRefreshing || type === 'loading') {
            return isDark ? 'bg-teal-500' : 'bg-teal-600';
        }

        // Success flash
        if (showSuccessFlash || type === 'success') {
            return isDark ? 'bg-emerald-500' : 'bg-emerald-600';
        }

        // Error state
        if (type === 'error') {
            return isDark ? 'bg-rose-500' : 'bg-rose-600';
        }

        // Default status based on sync/online state
        if (!isOnline) {
            return isDark ? 'bg-rose-500' : 'bg-rose-600'; // Red - offline
        }
        if (isSyncing) {
            return isDark ? 'bg-amber-500' : 'bg-amber-600'; // Amber - syncing
        }
        if (syncPendingCount > 0) {
            return isDark ? 'bg-amber-500' : 'bg-amber-600'; // Amber - pending
        }
        // All good - green
        return isDark ? 'bg-emerald-500' : 'bg-emerald-600';
    };

    const color = getBaseColor();

    return (
        <div className="w-full h-[2px] overflow-hidden relative">
            {/* Base line */}
            <div
                className={`w-full h-full transition-colors duration-700 ease-out ${color}`}
            >
                {/* Progress animation for loading/refreshing */}
                {(isRefreshing || type === 'loading') && progress > 0 && progress < 100 && (
                    <div
                        className="absolute top-0 left-0 h-full bg-white/40 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                )}

                {/* Success flash animation */}
                {showSuccessFlash && (
                    <div
                        className="absolute top-0 left-0 h-full bg-white/50 transition-all duration-1000 ease-out"
                        style={{
                            width: `${progress}%`,
                            animation: 'successPulse 0.8s ease-out 1'
                        }}
                    />
                )}
            </div>

            {/* Status dot indicator - subtle pulse when something is happening */}
            {(isRefreshing || type === 'loading' || isSyncing || (!isOnline)) && !showSuccessFlash && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2">
                    <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${color}`} />
                </div>
            )}

            {/* Success checkmark indicator */}
            {showSuccessFlash && !isRefreshing && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2 transition-all duration-500">
                    <svg
                        className={`h-3 w-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};