// src/components/PwaInstallPrompt.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles, CheckCircle2, BellRing, Monitor } from 'lucide-react';

interface PwaInstallPromptProps {
    theme?: 'dark' | 'light';
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
    theme = 'dark',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);
    const isDark = theme === 'dark';

    // Detect device type
    const isDesktop = !/iPad|iPhone|iPod|Android/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Check if already installed
    useEffect(() => {
        const hasBeenInstalled = localStorage.getItem('pwa_installed');

        if (hasBeenInstalled === 'true') {
            setIsInstalled(true);
            return;
        }

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            localStorage.setItem('pwa_installed', 'true');
            return;
        }

        // Check if running in Chrome/Edge on desktop - show prompt
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // Play sound when prompt becomes visible
    useEffect(() => {
        if (isVisible && !hasPlayedSound) {
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.08);

                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.25);

                setHasPlayedSound(true);
            } catch (error) {
                console.log('Audio not available');
                setHasPlayedSound(true);
            }
        }
    }, [isVisible, hasPlayedSound]);

    // Listen for beforeinstallprompt event
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Store that we have the prompt available
            localStorage.setItem('pwa_prompt_available', 'true');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            localStorage.setItem('pwa_installed', 'true');
            localStorage.removeItem('pwa_prompt_available');
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (isInstalling) return;
        setIsInstalling(true);

        try {
            // Method 1: Use deferredPrompt (works on Chrome/Edge mobile and some desktop)
            if (deferredPrompt) {
                try {
                    const result = await deferredPrompt.prompt();
                    const outcome = result.outcome;

                    if (outcome === 'accepted') {
                        setIsInstalled(true);
                        setIsVisible(false);
                        localStorage.setItem('pwa_installed', 'true');
                        localStorage.removeItem('pwa_prompt_available');
                        setDeferredPrompt(null);
                        setIsInstalling(false);
                        return;
                    } else {
                        // User dismissed the prompt
                        setIsInstalling(false);
                        return;
                    }
                } catch (err) {
                    console.log('Deferred prompt failed, trying alternate method');
                }
            }

            // Method 2: Try to trigger install via the browser's native install
            // This works on some desktop browsers
            if (isDesktop) {
                // Try to use the beforeinstallprompt event again
                // Some browsers trigger it on user gesture
                const promptEvent = new CustomEvent('beforeinstallprompt');
                window.dispatchEvent(promptEvent);

                // Check if we got a new prompt
                if (deferredPrompt) {
                    const result = await deferredPrompt.prompt();
                    if (result.outcome === 'accepted') {
                        setIsInstalled(true);
                        setIsVisible(false);
                        localStorage.setItem('pwa_installed', 'true');
                        setDeferredPrompt(null);
                        setIsInstalling(false);
                        return;
                    }
                }
            }

            // Method 3: Manual instructions if automatic install is not available
            showManualInstallInstructions();

        } catch (error) {
            console.error('Installation error:', error);
            showManualInstallInstructions();
        }

        setIsInstalling(false);
    };

    const showManualInstallInstructions = () => {
        let message = '';

        if (isDesktop) {
            message = 'To install on your computer:\n\n';
            message += '1. Look for the install icon in the address bar\n';
            message += '2. Click Install App\n';
            message += '3. Follow the on-screen instructions';
        } else if (isIOS) {
            message = 'To install on your iPhone or iPad:\n\n';
            message += '1. Tap the Share button\n';
            message += '2. Scroll down and tap Add to Home Screen\n';
            message += '3. Tap Add';
        } else if (isAndroid) {
            message = 'To install on your Android phone:\n\n';
            message += '1. Tap the menu button (three dots)\n';
            message += '2. Tap Add to Home Screen\n';
            message += '3. Tap Add';
        }

        alert(message);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (isInstalled) {
        return null;
    }

    if (!isVisible) {
        return null;
    }

    const deviceName = isDesktop ? 'computer' : 'phone';
    const installAction = isDesktop ? 'Install App' : 'Install Now';
    const featureText = isDesktop
        ? 'Launch from your desktop or taskbar'
        : 'One tap access from your home screen';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className={`relative max-w-md w-full rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328]'
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-6 sm:p-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <img
                                src="/pwa-192x192.png"
                                alt="Pharmienta"
                                className="w-14 h-14 rounded-full"
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-extrabold text-center flex items-center justify-center gap-2">
                        <span>Install Pharmienta 4P</span>
                        <BellRing className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </h3>

                    <p className={`text-sm text-center mt-2 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                        Install the app on your {deviceName} for the best experience
                    </p>

                    {/* Features */}
                    <div className="mt-5 space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                {isDesktop ? (
                                    <Monitor className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <Smartphone className="w-4 h-4 text-emerald-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold">
                                    {isDesktop ? 'Desktop Access' : 'Phone Access'}
                                </p>
                                <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                    {featureText}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Faster Experience</p>
                                <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                    Faster loading and smoother performance
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Offline Ready</p>
                                <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                    Works offline with automatic sync
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Install instruction */}
                    <div className={`mt-3 p-2.5 rounded-xl text-center text-xs ${isDark ? 'bg-[#21262d] text-[#8b949e]' : 'bg-slate-100 text-[#656d76]'
                        }`}>
                        <Download className="w-3 h-3 inline mr-1" />
                        {isDesktop
                            ? 'Click Install to add to your computer'
                            : 'Tap Install to add to your phone'}
                    </div>

                    {/* Buttons */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                        >
                            {isInstalling ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Installing...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span>{installAction}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleDismiss}
                            className={`flex-1 py-3.5 rounded-xl font-medium transition-all ${isDark
                                ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                                : 'bg-slate-100 hover:bg-slate-200 text-[#1f2328]'
                                }`}
                        >
                            Later
                        </button>
                    </div>

                    <div className="mt-4 text-center">
                        <p className={`text-[10px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                            No account needed • Free to install • Secure
                        </p>
                        <p className="text-[9px] text-emerald-400/60 mt-1 animate-pulse">
                            Install for the best experience
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PwaInstallPrompt;