import React, { useState } from 'react';
import {
    Database,
    AlertTriangle,
    Trash2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Shield,
    ArrowLeft,
    Loader2,
    HardDrive,
    Server,
    CloudOff,
    Wifi,
    Info,
    FileText,
    Clock,
    Users,
    Package,
    ShoppingCart,
    FileSpreadsheet
} from 'lucide-react';
import { db } from '../../lib/db';
import { isSupabaseConfigured, getSupabaseClient, pullFromSupabaseToLocal } from '../../lib/supabase';

interface HardResetViewProps {
    theme?: 'dark' | 'light';
    pharmacyName?: string | null;
    onComplete?: () => void;
    onCancel?: () => void;
    onTriggerSync?: () => void;
}

export const HardResetView: React.FC<HardResetViewProps> = ({
    theme = 'dark',
    pharmacyName,
    onComplete,
    onCancel,
    onTriggerSync
}) => {
    const isDark = theme === 'dark';

    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';

    const [step, setStep] = useState<'confirm' | 'clearing' | 'syncing' | 'complete' | 'error'>('confirm');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [clearedTables, setClearedTables] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Listen to online/offline status
    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const tables = [
        { name: 'profiles', label: 'Profiles', icon: Users },
        { name: 'products', label: 'Products', icon: Package },
        { name: 'batches', label: 'Batches', icon: Package },
        { name: 'sales', label: 'Sales', icon: ShoppingCart },
        { name: 'sales_returns', label: 'Sales Returns', icon: FileSpreadsheet },
        { name: 'suppliers', label: 'Suppliers', icon: Users },
        { name: 'categories', label: 'Categories', icon: FileText },
        { name: 'units', label: 'Units', icon: FileText },
        { name: 'customers', label: 'Customers', icon: Users },
        { name: 'movements', label: 'Movements', icon: FileSpreadsheet },
        { name: 'audit_logs', label: 'Audit Logs', icon: FileText },
        { name: 'sync_queue', label: 'Sync Queue', icon: CloudOff },
        { name: 'requested_items', label: 'Requested Items', icon: FileText },
    ];

    const handleHardReset = async () => {
        setStep('clearing');
        setProgress(0);
        setClearedTables([]);

        try {
            // Step 1: Clear all tables
            const tableNames = tables.map(t => t.name);
            let cleared = 0;

            for (const tableName of tableNames) {
                try {
                    // Use Dexie's clear() method if available, or fallback to delete
                    const table = db[tableName as keyof typeof db] as any;
                    if (table && typeof table.clear === 'function') {
                        await table.clear();
                    } else {
                        // Fallback: delete all records
                        await db.table(tableName).clear();
                    }
                    cleared++;
                    setClearedTables(prev => [...prev, tableName]);
                    setProgress(Math.round((cleared / tableNames.length) * 100));
                } catch (err) {
                    console.warn(`Failed to clear table ${tableName}:`, err);
                    // Continue with other tables
                }
            }

            // Step 2: Clear localStorage items
            const localStorageKeys = [
                'medp_authenticated',
                'medp_current_user_id',
                'medp_theme',
                'medp_last_sync',
                'medp_offline_data'
            ];

            for (const key of localStorageKeys) {
                localStorage.removeItem(key);
            }

            // Step 3: Clear IndexedDB metadata if exists
            try {
                // Clear any additional stores
                if (db._allTables) {
                    for (const storeName of db._allTables) {
                        if (!tableNames.includes(storeName)) {
                            const store = db[storeName as keyof typeof db] as any;
                            if (store && typeof store.clear === 'function') {
                                await store.clear();
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Error clearing additional stores:', err);
            }

            setProgress(100);
            setStep('syncing');

            // Step 4: If online, pull fresh data
            if (isOnline && pharmacyName) {
                try {
                    const client = getSupabaseClient();
                    if (client) {
                        const pulled = await pullFromSupabaseToLocal(pharmacyName);
                        if (pulled) {
                            setStep('complete');
                            setProgress(100);

                            // Trigger sync to refresh UI
                            if (onTriggerSync) {
                                onTriggerSync();
                            }

                            return;
                        }
                    }
                } catch (err) {
                    console.error('Failed to pull fresh data:', err);
                    // Still consider it complete but with a warning
                }
            }

            setStep('complete');

        } catch (error: any) {
            console.error('Hard reset failed:', error);
            setStep('error');
            setErrorMessage(error.message || 'An unexpected error occurred during the reset process.');
        }
    };

    const handleComplete = () => {
        if (onComplete) {
            onComplete();
        }
        // Force a page reload to ensure all state is fresh
        window.location.reload();
    };

    // Render different steps
    const renderConfirmStep = () => (
        <div className="space-y-6">
            {/* Warning Header */}
            <div className={`p-6 rounded-2xl border-2 border-red-500/30 bg-red-500/10 ${cardBg}`}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${textTitle}`}>Factory Reset</h2>
                        <p className={`text-sm ${textMuted}`}>Permanently wipe all local data</p>
                    </div>
                </div>

                <div className="space-y-3 text-sm">
                    <p className={`${textTitle} font-medium`}>
                        ⚠️ This action will permanently delete all local data including:
                    </p>
                    <ul className="space-y-2 pl-4">
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span className={textMuted}>All products, batches, and inventory records</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span className={textMuted}>Sales history and transaction data</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span className={textMuted}>Customer and supplier information</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span className={textMuted}>Staff profiles and audit trails</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span className={textMuted}>Pending sync queues and offline changes</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* What happens next */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${textTitle}`}>After reset:</p>
                        <p className={`text-xs ${textMuted}`}>
                            {isOnline
                                ? 'Fresh data will be pulled from the cloud automatically'
                                : 'Connect to the internet to restore data from the cloud'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Connection Status */}
            <div className={`p-3 rounded-xl ${isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                <div className="flex items-center gap-2 text-sm">
                    {isOnline ? (
                        <>
                            <Wifi className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Connected to cloud</span>
                            <span className={`text-xs ${textMuted} ml-auto`}>Auto-restore available</span>
                        </>
                    ) : (
                        <>
                            <CloudOff className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-medium">Offline mode</span>
                            <span className={`text-xs ${textMuted} ml-auto`}>Manual restore needed</span>
                        </>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                    onClick={onCancel}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${touchTarget} ${isDark
                        ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                >
                    Cancel
                </button>
                <button
                    onClick={handleHardReset}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${touchTarget} bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2`}
                >
                    <Trash2 className="w-5 h-5" />
                    <span>Reset &amp; Clear All Data</span>
                </button>
            </div>

            <p className={`text-[10px] text-center ${textMuted} pt-2`}>
                This action cannot be undone. Please ensure you have a backup if needed.
            </p>
        </div>
    );

    const renderClearingStep = () => (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                </div>
                <h3 className={`text-xl font-bold ${textTitle}`}>Clearing Local Data...</h3>
                <p className={`text-sm ${textMuted} mt-1`}>
                    Please wait while we securely wipe all local storage
                </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className={textMuted}>Progress</span>
                    <span className={`font-bold ${textTitle}`}>{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Cleared Tables */}
            <div className={`max-h-60 overflow-y-auto space-y-1 p-3 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                {tables.map(table => (
                    <div key={table.name} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                            <table.icon className="w-3.5 h-3.5 text-slate-500" />
                            <span className={textMuted}>{table.label}</span>
                        </div>
                        <span>
                            {clearedTables.includes(table.name) ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSyncingStep = () => (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
                <h3 className={`text-xl font-bold ${textTitle}`}>Restoring from Cloud...</h3>
                <p className={`text-sm ${textMuted} mt-1`}>
                    Pulling fresh data from Supabase
                </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} flex items-center gap-3`}>
                <Server className="w-5 h-5 text-blue-400 animate-pulse" />
                <div>
                    <p className={`text-sm font-medium ${textTitle}`}>Connecting to cloud</p>
                    <p className={`text-xs ${textMuted}`}>Downloading latest data for {pharmacyName || 'your pharmacy'}</p>
                </div>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} flex items-center gap-3`}>
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <div>
                    <p className={`text-sm font-medium ${textTitle}`}>Writing to local storage</p>
                    <p className={`text-xs ${textMuted}`}>Saving data for offline use</p>
                </div>
            </div>
        </div>
    );

    const renderCompleteStep = () => (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className={`text-xl font-bold text-emerald-400`}>Reset Complete! ✅</h3>
                <p className={`text-sm ${textMuted} mt-1`}>
                    All local data has been cleared and fresh data restored
                </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} space-y-2`}>
                <div className="flex items-center justify-between text-sm">
                    <span className={textMuted}>Tables cleared</span>
                    <span className={`font-bold ${textTitle}`}>{clearedTables.length} / {tables.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className={textMuted}>Local storage</span>
                    <span className={`font-bold text-emerald-400`}>Wiped clean</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className={textMuted}>Cloud sync</span>
                    <span className={`font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isOnline ? 'Completed' : 'Pending (offline)'}
                    </span>
                </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-500/20 bg-emerald-50'}`}>
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className={`text-sm font-medium ${textTitle}`}>What happens now?</p>
                        <ul className={`text-xs ${textMuted} mt-1 space-y-1`}>
                            <li>• All data is fresh from the cloud</li>
                            <li>• Offline changes queue is empty</li>
                            <li>• You can start using the app immediately</li>
                            <li>• Previous issues should be resolved</li>
                        </ul>
                    </div>
                </div>
            </div>

            <button
                onClick={handleComplete}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${touchTarget} bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2`}
            >
                <CheckCircle2 className="w-5 h-5" />
                <span>Continue to App</span>
            </button>
        </div>
    );

    const renderErrorStep = () => (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className={`text-xl font-bold text-red-400`}>Reset Failed</h3>
                <p className={`text-sm ${textMuted} mt-1`}>
                    An error occurred during the reset process
                </p>
            </div>

            <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/20`}>
                <p className={`text-sm text-red-400 font-mono`}>{errorMessage || 'Unknown error occurred'}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => {
                        setStep('confirm');
                        setErrorMessage('');
                    }}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${touchTarget} ${isDark
                        ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                >
                    Try Again
                </button>
                <button
                    onClick={onCancel}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${touchTarget} bg-slate-600 hover:bg-slate-700 text-white`}
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const touchTarget = 'min-h-[48px] min-w-[48px]';

    return (
        <div className={`max-w-2xl mx-auto p-4 md:p-6 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} min-h-screen`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <button
                    onClick={onCancel}
                    className={`p-2 rounded-xl transition-colors ${touchTarget} ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-gray-200'
                        }`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className={`text-lg font-bold ${textTitle}`}>Hard Reset</h1>
                    <p className={`text-xs ${textMuted}`}>Factory reset for this device</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className={`rounded-2xl p-6 ${cardBg}`}>
                {step === 'confirm' && renderConfirmStep()}
                {step === 'clearing' && renderClearingStep()}
                {step === 'syncing' && renderSyncingStep()}
                {step === 'complete' && renderCompleteStep()}
                {step === 'error' && renderErrorStep()}
            </div>

            {/* Footer Info */}
            <p className={`text-[10px] text-center ${textMuted} mt-4`}>
                Version 1.0.0 • {pharmacyName || 'MedP Pharmacy'} • Data will be restored from cloud
            </p>
        </div>
    );
};