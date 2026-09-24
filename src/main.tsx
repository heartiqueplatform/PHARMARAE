// main.tsx
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupServiceWorkerAutoUpdate } from './lib/service-worker-update';

const APP_VERSION = '1.0.4';
const APP_NAME = 'Pharmienta Kenya';
const VERSION_KEY = 'Pharmienta_app_version';
const LAST_UPDATE_CHECK = 'Pharmienta_last_update_check';

// Track root instance at module level
let rootInstance: any = null;

const applyThemeAndSplash = () => {
  const savedTheme = (localStorage.getItem('medp_theme') as 'dark' | 'light') || 'light';
  const isDark = savedTheme === 'dark';

  const splash = document.getElementById('splash-screen');
  const root = document.getElementById('root');

  if (isDark) {
    document.documentElement.style.backgroundColor = '#161b22';
    document.body.style.backgroundColor = '#161b22';
    document.body.style.color = '#c9d1d9';
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');

    if (splash) {
      splash.classList.add('dark');
      splash.classList.remove('light');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#161b22');
    }
  } else {
    document.documentElement.style.backgroundColor = '#f6f8fa';
    document.body.style.backgroundColor = '#f6f8fa';
    document.body.style.color = '#1f2328';
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');

    if (splash) {
      splash.classList.add('light');
      splash.classList.remove('dark');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#f6f8fa');
    }
  }

  if (root) {
    root.classList.add('ready');
  }
};

applyThemeAndSplash();

const hideSplash = () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => {
      if (splash.parentNode) {
        splash.style.display = 'none';
      }
    }, 500);
  }
};

// ============================================
// 🔥 AUTO-UPDATE — runs once, globally
// Handles: new SW activated → reload, polling, visibility checks
// ============================================
setupServiceWorkerAutoUpdate();

const RootApp = () => {
  useEffect(() => {
    hideSplash();

    // The heavy-lifting (polling, visibility, message handling)
    // is now done by setupServiceWorkerAutoUpdate() above.
    // Here we just nudge the SW once on boot so users get the
    // update check as soon as the app opens.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          // Immediate check on app boot
          registration.update().catch(() => { });
        })
        .catch(() => { });
    }
  }, []);

  return <App />;
};

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Define render function
const renderApp = () => {
  const appElement = (
    <StrictMode>
      <RootApp />
    </StrictMode>
  );

  if (rootInstance) {
    // Root already exists - just render
    rootInstance.render(appElement);
  } else {
    // First time - create root
    rootInstance = createRoot(root);
    rootInstance.render(appElement);
  }
};

// ============================================
// REGISTER SERVICE WORKER
// Polling and reload-on-activate are handled inside
// setupServiceWorkerAutoUpdate() — no need to duplicate
// setInterval loops here.
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Silent fail - SW registration not critical
      });
  });
}

// Initial render
renderApp();

// Handle HMR updates - ONLY in development
if (import.meta.hot) {
  import.meta.hot.accept('./App.tsx', () => {
    // Re-render with updated App
    renderApp();
  });

  // Clean up on HMR dispose
  import.meta.hot.dispose(() => {
    if (rootInstance) {
      rootInstance.unmount();
      rootInstance = null;
    }
  });
}

(window as any).__APP_VERSION__ = APP_VERSION;
(window as any).__APP_NAME__ = APP_NAME;