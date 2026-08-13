// hooks/useAppUpdate.ts
import { useState, useCallback, useEffect } from 'react';
import { APP_VERSION, VERSION_KEY, LAST_UPDATE_CHECK } from '../utils/helpers';

export const useAppUpdate = () => {
    const [showUpdateNotification, setShowUpdateNotification] = useState(false);
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    const checkForUpdates = useCallback(() => {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK);
        const now = Date.now();
        const shouldCheck = !lastCheck || (now - parseInt(lastCheck) > 3600000);

        if (storedVersion !== APP_VERSION && shouldCheck) {
            localStorage.setItem(VERSION_KEY, APP_VERSION);
            localStorage.setItem(LAST_UPDATE_CHECK, now.toString());

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.update();
                });
            }

            setIsUpdateAvailable(true);
            setShowUpdateNotification(true);
            return true;
        }

        if (shouldCheck) {
            localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
        }
        return false;
    }, []);

    const handleUpdate = useCallback(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }
        setShowUpdateNotification(false);
        window.location.reload();
    }, []);

    const handleDismissUpdate = useCallback(() => {
        setShowUpdateNotification(false);
    }, []);

    useEffect(() => {
        checkForUpdates();

        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                setIsUpdateAvailable(true);
                setShowUpdateNotification(true);
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleMessage);

            navigator.serviceWorker.ready.then((registration) => {
                const intervalId = setInterval(() => {
                    registration.update().then(() => {
                        if (registration.waiting) {
                            setIsUpdateAvailable(true);
                            setShowUpdateNotification(true);
                        }
                    });
                }, 30000);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setIsUpdateAvailable(true);
                                setShowUpdateNotification(true);
                            }
                        });
                    }
                });

                return () => clearInterval(intervalId);
            });
        }

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleMessage);
            }
        };
    }, [checkForUpdates]);

    return { showUpdateNotification, isUpdateAvailable, handleUpdate, handleDismissUpdate };
};