// lib/version-check.ts
// Runs on app boot — if server version differs from running version,
// nuke everything and reload.

declare const __APP_VERSION__: string;

const RECHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function fetchServerVersion(): Promise<string | null> {
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.version || null;
    } catch {
        return null;
    }
}

async function nukeAndReload() {
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
        if (typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch {
        // ignore
    }
    // Hard reload, bypass HTTP cache
    window.location.reload();
}

async function checkOnce() {
    const running =
        typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
    if (running === 'unknown') return;

    const server = await fetchServerVersion();
    if (!server) return;

    if (server !== running) {
        console.log(`[VersionCheck] Running ${running}, server ${server}. Updating...`);
        await nukeAndReload();
    }
}

export function setupVersionCheck() {
    if (typeof window === 'undefined') return;

    // 1. Check on boot
    checkOnce();

    // 2. Check when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkOnce();
    });

    // 3. Check when back online
    window.addEventListener('online', () => checkOnce());

    // 4. Poll every 15 minutes
    setInterval(checkOnce, RECHECK_INTERVAL_MS);

    console.log('[VersionCheck] Listening...');
}