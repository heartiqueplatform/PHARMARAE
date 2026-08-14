import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// App version - update this when you release new versions
const APP_VERSION = '1.0.0';
const APP_NAME = 'PHARMARAE KENYA';

// Store current version in localStorage for comparison
const VERSION_KEY = 'PHARMARAE_app_version';
const LAST_UPDATE_CHECK = 'PHARMARAE_last_update_check';

//  FIX: Apply theme and control splash screen
const applyThemeAndSplash = () => {
  const savedTheme = localStorage.getItem('medp_theme') as 'dark' | 'light' || 'light';
  const isDark = savedTheme === 'dark';

  // Get splash screen element
  const splash = document.getElementById('splash-screen');
  const root = document.getElementById('root');

  if (isDark) {
    // Dark theme
    document.documentElement.style.backgroundColor = '#161b22';
    document.body.style.backgroundColor = '#161b22';
    document.body.style.color = '#c9d1d9';
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');

    // Splash dark
    if (splash) {
      splash.classList.add('dark');
      splash.classList.remove('light');
    }

    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#161b22');
    }
  } else {
    // Light theme
    document.documentElement.style.backgroundColor = '#f6f8fa';
    document.body.style.backgroundColor = '#f6f8fa';
    document.body.style.color = '#1f2328';
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');

    // Splash light
    if (splash) {
      splash.classList.add('light');
      splash.classList.remove('dark');
    }

    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#f6f8fa');
    }
  }

  // Show root and hide splash after React renders
  if (root) {
    root.classList.add('ready');
  }
};

//  Apply theme IMMEDIATELY
applyThemeAndSplash();

//  Hide splash screen when React is ready
const hideSplash = () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('hidden');
    // Remove splash from DOM after animation
    setTimeout(() => {
      if (splash.parentNode) {
        splash.style.display = 'none';
      }
    }, 500);
  }
};

// ✅ REMOVED: checkForUpdates function (moved to useApp.ts)
// ✅ REMOVED: UpdateNotification component (moved to useApp.ts)

// ✅ Main App component - CLEAN (no update notification state)
const RootApp = () => {
  // ✅ REMOVED: showUpdateNotification state
  // ✅ REMOVED: updateAvailable state

  useEffect(() => {
    // Hide splash screen when React is mounted
    hideSplash();

    // ✅ REMOVED: checkForUpdates() call (now in useApp.ts)

    // ✅ KEPT: Service worker update handling
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates every 30 seconds
        const intervalId = setInterval(() => {
          registration.update().then(() => {
            if (registration.waiting) {
              console.log('🔄 New service worker waiting...');
              // ✅ Show update via console only - UI handled by App.tsx toast
            }
          });
        }, 30000);

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New service worker installed!');
              }
            });
          }
        });

        return () => clearInterval(intervalId);
      });
    }

    // Listen for service worker update messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('🔄 Update available from service worker');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return <App />;
};

// Render the app
const root = document.getElementById('root')!;

// Check if root is already rendered (for hot reload)
const renderApp = () => {
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  );
};

// Log app version on startup
console.log(`🚀 ${APP_NAME} v${APP_VERSION} starting...`);
console.log('📱 PWA Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Yes' : 'No');
console.log(`🎨 Theme: ${localStorage.getItem('medp_theme') || 'light'}`);

// Check for service worker updates periodically
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registered successfully');

        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch(err => {
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}

renderApp();

// For development, expose version to console
(window as any).__APP_VERSION__ = APP_VERSION;
(window as any).__APP_NAME__ = APP_NAME;