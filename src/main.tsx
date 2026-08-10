import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// App version - update this when you release new versions
const APP_VERSION = '1.2.0';
const APP_NAME = 'PHARMIENTA KENYA';

// Store current version in localStorage for comparison
const VERSION_KEY = 'PHARMIENTA_app_version';
const LAST_UPDATE_CHECK = 'PHARMIENTA_last_update_check';

// Check for updates function
const checkForUpdates = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK);
  const now = Date.now();

  // Check every hour (3600000 ms)
  const shouldCheck = !lastCheck || (now - parseInt(lastCheck) > 3600000);

  if (storedVersion !== APP_VERSION && shouldCheck) {
    console.log(`🔄 App update detected: ${storedVersion} → ${APP_VERSION}`);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    localStorage.setItem(LAST_UPDATE_CHECK, now.toString());

    // Show update notification
    if ('serviceWorker' in navigator) {
      // Check if service worker has an update
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }

    return true;
  }

  if (shouldCheck) {
    localStorage.setItem(LAST_UPDATE_CHECK, now.toString());
  }

  return false;
};

// Update notification component
const UpdateNotification = ({ onUpdate, onDismiss }: { onUpdate: () => void, onDismiss: () => void }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">Update Available!</h4>
          <p className="text-gray-600 text-xs mt-0.5">
            Version {APP_VERSION} is ready. Refresh to get the latest features.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onUpdate}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main App component with version checking
const RootApp = () => {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    const hasUpdate = checkForUpdates();
    if (hasUpdate) {
      setUpdateAvailable(true);
      setShowUpdateNotification(true);
    }

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates every 30 seconds
        const intervalId = setInterval(() => {
          registration.update().then(() => {
            if (registration.waiting) {
              console.log('🔄 New service worker waiting...');
              setUpdateAvailable(true);
              setShowUpdateNotification(true);
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
                setUpdateAvailable(true);
                setShowUpdateNotification(true);
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
        setUpdateAvailable(true);
        setShowUpdateNotification(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          // Send skip waiting message to service worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    // Reload the page to apply updates
    setShowUpdateNotification(false);
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
  };

  return (
    <>
      <App />
      {showUpdateNotification && (
        <UpdateNotification onUpdate={handleUpdate} onDismiss={handleDismiss} />
      )}
    </>
  );
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

// Check for service worker updates periodically
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registered successfully');

        // Check for updates every minute
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