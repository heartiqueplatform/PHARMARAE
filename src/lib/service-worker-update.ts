// lib/service-worker-update.ts
// Auto-update service worker so users always get fresh code.

const SW_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function setupServiceWorkerAutoUpdate() {
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
        console.log('[SW-AutoUpdate] Not supported');
        return;
    }

    let reloadingForUpdate = false;

    // 1. Listen for SW_ACTIVATED message from the new SW
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_ACTIVATED') {
            if (reloadingForUpdate) return;
            reloadingForUpdate = true;
            console.log(`[SW-AutoUpdate] v${event.data.version} active — reloading...`);
            setTimeout(() => window.location.reload(), 500);
        }
    });

    // 2. Belt-and-braces: reload when controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadingForUpdate) return;
        reloadingForUpdate = true;
        console.log('[SW-AutoUpdate] Controller changed — reloading...');
        setTimeout(() => window.location.reload(), 500);
    });

    // 3. Check for updates on boot
    navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => { });

    // 4. Poll every 30 minutes
    setInterval(() => {
        navigator.serviceWorker.getRegistration()
            .then((reg) => reg?.update())
            .catch(() => { });
    }, SW_CHECK_INTERVAL_MS);

    // 5. Check when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            navigator.serviceWorker.getRegistration()
                .then((reg) => reg?.update())
                .catch(() => { });
        }
    });

    // 6. Check when back online
    window.addEventListener('online', () => {
        navigator.serviceWorker.getRegistration()
            .then((reg) => reg?.update())
            .catch(() => { });
    });

    console.log('[SW-AutoUpdate] Listening for updates...');
}