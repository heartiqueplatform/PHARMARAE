// components/NotificationPermissionPrompt.tsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, CheckCircle, Loader2 } from 'lucide-react';
import { getNotificationService } from '../lib/notificationService';
import { useTheme } from '../hooks/useTheme';

interface Props {
    onPermissionChange?: (permission: NotificationPermission) => void;
    className?: string;
    compact?: boolean;
}

export const NotificationPermissionPrompt: React.FC<Props> = ({
    onPermissionChange,
    className = '',
    compact = false
}) => {
    const { isDark } = useTheme();
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        const service = getNotificationService();
        setIsSupported(service.isSupportedBrowser());
    }, []);

    const handleEnable = async () => {
        setIsLoading(true);
        try {
            const service = getNotificationService();
            const newPermission = await service.requestPermission();
            setPermission(newPermission);

            if (newPermission === 'granted') {
                await service.initialize();
                const userId = localStorage.getItem('medp_current_user_id');
                const pharmacyName = localStorage.getItem('medp_pharmacy_name') || 'Pharmacy';

                if (userId) {
                    await service.subscribeToPush(userId, pharmacyName);
                }

                await service.sendNotification({
                    title: 'Notifications Enabled',
                    body: 'You will now receive real-time updates about sales and inventory.',
                    icon: '/pwa-192x192.png',
                    tag: 'welcome',
                    requireInteraction: false
                });
            }

            if (onPermissionChange) {
                onPermissionChange(newPermission);
            }
        } catch (error) {
            // Silent fail - notification not critical
        } finally {
            setIsLoading(false);
        }
    };

    // Already enabled
    if (permission === 'granted') {
        if (compact) {
            return (
                <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    <BellRing className="w-3.5 h-3.5" />
                    <span>On</span>
                </div>
            );
        }
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>Notifications enabled</span>
            </div>
        );
    }

    // Blocked
    if (permission === 'denied') {
        if (compact) {
            return (
                <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <BellOff className="w-3.5 h-3.5" />
                </div>
            );
        }
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'}`}>
                <BellOff className="w-4 h-4" />
                <span>Notifications blocked</span>
                <button
                    onClick={() => {
                        alert('Please enable notifications in your browser settings:\n\nChrome: Settings -> Privacy -> Notifications\nSafari: Settings -> Websites -> Notifications');
                    }}
                    className={`text-xs underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                    How to enable
                </button>
            </div>
        );
    }

    // Default - ask
    if (compact) {
        return (
            <button
                onClick={handleEnable}
                disabled={isLoading || !isSupported}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } ${isLoading ? 'opacity-50 cursor-wait' : ''} ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Bell className="w-3 h-3" />
                )}
                <span>{isLoading ? 'Enabling...' : 'Enable'}</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleEnable}
            disabled={isLoading || !isSupported}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''} ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Bell className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Enabling...' : 'Enable Notifications'}</span>
        </button>
    );
};