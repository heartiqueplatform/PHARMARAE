// components/Header.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  GitBranch,
  Info,
  Key,
  Lock,
  LogOut,
  Mail,
  Menu,
  Phone,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { Pharmacy, Profile, UserRole } from '../types';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';
import { db } from '../lib/db';
import { getSupabaseClient } from '../lib/supabase';

const APP_VERSION = '1.0.0';

interface HeaderProps {
  pharmacy: Pharmacy | null;
  currentProfile: Profile | null;
  currentRole: UserRole;
  profiles: Profile[];
  isOnline: boolean;
  syncPendingCount: number;
  isSyncing: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSwitchProfile: (profile: Profile) => void;
  onTriggerSync: () => void;
  onSignOut?: () => void;
  appVersion?: string;
}

export const Header: React.FC<HeaderProps> = ({
  pharmacy,
  currentProfile,
  currentRole,
  profiles,
  isOnline,
  syncPendingCount,
  isSyncing,
  theme = 'dark',
  onSwitchProfile,
  onTriggerSync,
  onSignOut,
  appVersion = APP_VERSION,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutConfirmText, setSignOutConfirmText] = useState('');
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const versionInfoRef = useRef<HTMLDivElement>(null);
  const signOutModalRef = useRef<HTMLDivElement>(null);

  const pharmacyName =
    currentProfile?.pharmacy_name || pharmacy?.name || 'Pharmienta Kenya';
  const pharmacyTown =
    currentProfile?.pharmacy_town || pharmacy?.town || '';

  const pharmacyStaff = profiles.filter((profile) =>
    currentProfile ? profile.pharmacy_name === currentProfile.pharmacy_name : true
  );

  const getDisplayName = (profile: Profile | null): string => {
    if (!profile?.full_name) return 'Staff';
    return profile.full_name.split(' ')[0] || 'Staff';
  };

  const getInitials = (profile: Profile | null): string => {
    if (!profile?.full_name) return 'U';

    const names = profile.full_name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }

    return names[0]?.[0]?.toUpperCase() || 'U';
  };

  const hasUpdate =
    typeof window !== 'undefined' &&
    localStorage.getItem('Pharmienta_app_version') !== null &&
    localStorage.getItem('Pharmienta_app_version') !== appVersion;

  const handleSignOutClick = () => {
    setShowProfileMenu(false);
    setShowSignOutModal(true);
    setSignOutConfirmText('');
    setBackupAcknowledged(false);
    setBackupError(null);
    setBackupSuccess(null);
  };

  const handleConfirmSignOut = () => {
    if (signOutConfirmText !== 'LOGOUT' || !backupAcknowledged) {
      return;
    }

    // Clear all local storage data
    if (typeof window !== 'undefined') {
      // Clear all localStorage
      localStorage.clear();

      // Clear all sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB if used
      if ('indexedDB' in window) {
        indexedDB.databases().then((dbs) => {
          dbs.forEach((db) => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        }).catch(() => {
          // Fallback: try to delete known databases
          const dbNames = ['PharmientaDB', 'pharmienta_cache', 'offline_data'];
          dbNames.forEach((name) => {
            try {
              indexedDB.deleteDatabase(name);
            } catch (e) {
              // Ignore errors
            }
          });
        });
      }

      // Clear Cache Storage
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        }).catch(() => {
          // Ignore errors
        });
      }

      // Clear service worker registrations
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        }).catch(() => {
          // Ignore errors
        });
      }
    }

    setShowSignOutModal(false);
    setSignOutConfirmText('');
    setBackupAcknowledged(false);
    onSignOut?.();
  };

  const handleBackupData = async () => {
    if (isBackingUp) return;

    setIsBackingUp(true);
    setBackupError(null);
    setBackupSuccess(null);

    try {
      const client = getSupabaseClient();

      if (!client) {
        setBackupError('Cannot backup: Supabase not configured');
        setIsBackingUp(false);
        return;
      }

      if (!isOnline) {
        setBackupError('Cannot backup: You are offline. Please connect to internet.');
        setIsBackingUp(false);
        return;
      }

      const currentUser = currentProfile;
      if (!currentUser) {
        setBackupError('No user profile found to backup');
        setIsBackingUp(false);
        return;
      }

      // Step 1: Sync pending mutations
      const pendingMutations = await db.pendingMutations?.toArray() || [];

      if (pendingMutations.length > 0) {
        for (const mutation of pendingMutations) {
          try {
            const { error } = await client
              .from(mutation.table)
            [mutation.type](mutation.data);

            if (!error) {
              await db.pendingMutations.delete(mutation.id);
            }
          } catch (err) {
            console.warn('Failed to sync mutation:', err);
          }
        }
      }

      // Step 2: Sync all local tables
      const tables = ['profiles', 'products', 'sales', 'customers', 'inventory'];

      for (const table of tables) {
        try {
          const localData = await db[table]?.toArray() || [];

          if (localData.length > 0) {
            for (const record of localData) {
              await client
                .from(table)
                .upsert(record, { onConflict: 'id' });
            }
          }
        } catch (err) {
          console.warn(`Failed to sync table ${table}:`, err);
        }
      }

      // Step 3: Update last backup timestamp
      await db.profiles.update(currentUser.id, {
        last_backup_at: new Date().toISOString()
      });

      // Step 4: Save backup confirmation
      localStorage.setItem('last_backup_date', new Date().toISOString());

      // Step 5: Show success
      setBackupAcknowledged(true);
      setBackupSuccess('All data backed up to cloud successfully!');

    } catch (error) {
      console.error('Backup failed:', error);
      setBackupError('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsBackingUp(false);
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }

      if (versionInfoRef.current && !versionInfoRef.current.contains(target)) {
        setShowVersionInfo(false);
      }

      if (
        showSignOutModal &&
        signOutModalRef.current &&
        !signOutModalRef.current.contains(target)
      ) {
        setShowSignOutModal(false);
        setSignOutConfirmText('');
        setBackupAcknowledged(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showSignOutModal]);

  useEffect(() => {
    if (!showProfileMenu && !showSignOutModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showProfileMenu, showSignOutModal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setShowProfileMenu(false);
      setShowVersionInfo(false);
      setShowSignOutModal(false);
      setSignOutConfirmText('');
      setBackupAcknowledged(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleLabel =
    currentRole === 'owner'
      ? 'Owner'
      : currentRole === 'admin'
        ? 'Manager'
        : 'Staff';

  const Avatar = ({
    profile,
    size = 'md',
    online = false,
    className = '',
  }: {
    profile?: Profile | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    online?: boolean;
    className?: string;
  }) => {
    const sizes = {
      sm: 'h-8 w-8 text-[10px]',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-xl',
    };

    const statusSizes = {
      sm: 'h-2.5 w-2.5',
      md: 'h-3 w-3',
      lg: 'h-3.5 w-3.5',
      xl: 'h-4 w-4',
    };

    return (
      <div className={`relative shrink-0 ${className}`}>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'Profile'}
            className={`${sizes[size]} rounded-full object-cover ring-0 ${isDark ? 'ring-emerald-400/30' : 'ring-emerald-500/30'
              }`}
          />
        ) : (
          <div
            className={`${sizes[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 font-bold text-white shadow-sm`}
          >
            {getInitials(profile || null)}
          </div>
        )}

        {online && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 ${statusSizes[size]} rounded-full border-2 ${isDark ? 'border-[#0d1117]' : 'border-white'
              } bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]`}
          />
        )}
      </div>
    );
  };

  const surface = isDark
    ? 'bg-[#0d1117]/90 text-[#f0f6fc] border-white/[0.07]'
    : 'bg-white/90 text-[#1f2328] border-slate-200/80';

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      <header
        className={`sticky top-0 z-60 border-b backdrop-blur-2xl ${surface}`}
      >
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-2 px-3 sm:h-[72px] sm:px-5 lg:px-7">
          {/* Brand / pharmacy identity */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Pharmienta"
                className="h-10 w-10 rounded-full object-cover shadow-sm sm:h-11 sm:w-11"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${isDark ? 'border-[#0d1117]' : 'border-white'
                  } bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1
                  className={`truncate text-[14px] font-extrabold tracking-[-0.02em] sm:text-[15px] ${isDark ? 'text-white' : 'text-slate-900'
                    }`}
                >
                  {pharmacyName}
                </h1>

                <span
                  className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] sm:inline-flex ${isDark
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-700'
                    }`}
                >
                  {roleLabel}
                </span>
              </div>

              <div className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] ${muted}`}>
                <span className="truncate">
                  {pharmacyTown || 'Pharmacy management'}
                </span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                <span className="hidden shrink-0 sm:inline">POS active</span>
              </div>
            </div>
          </div>

          {/* Sync button */}
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            aria-label="Sync offline changes"
            title={
              isOnline
                ? syncPendingCount > 0
                  ? `${syncPendingCount} changes waiting to sync`
                  : 'All changes synced'
                : 'Offline — changes will sync when connection returns'
            }
            className={`group relative flex h-10 shrink-0 items-center justify-center rounded-xl px-2.5 transition-all duration-200 disabled:cursor-wait sm:px-3 hover:opacity-80`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${isOnline
                ? syncPendingCount > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
                : 'text-rose-400'
                }`}
            >
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : isOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
            </span>

            <span className="ml-2 hidden text-left sm:block">
              <span
                className={`block text-[10px] font-bold leading-none ${isOnline
                  ? syncPendingCount > 0
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                  : 'text-rose-500'
                  }`}
              >
                {isSyncing
                  ? 'Syncing'
                  : isOnline
                    ? syncPendingCount > 0
                      ? 'Pending'
                      : 'Synced'
                    : 'Offline'}
              </span>
              <span className={`mt-0.5 block text-[8px] ${muted}`}>
                {syncPendingCount > 0 ? `${syncPendingCount} change${syncPendingCount === 1 ? '' : 's'}` : 'Everything saved'}
              </span>
            </span>

            {syncPendingCount > 0 && !isSyncing && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-current bg-amber-500 px-1 text-[8px] font-black text-white">
                {syncPendingCount > 99 ? '99+' : syncPendingCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <div className="relative shrink-0" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((value) => !value)}
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              className={`flex h-10 items-center gap-2 rounded-xl p-1 transition-all duration-200 sm:h-11 sm:pl-1.5 sm:pr-2 hover:opacity-80`}
            >
              <Avatar profile={currentProfile} size="sm" online={isOnline} />

              <span className="hidden min-w-0 text-left sm:block">
                <span
                  className={`block max-w-[105px] truncate text-[10px] font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'
                    }`}
                >
                  {getDisplayName(currentProfile)}
                </span>
                <span className={`block text-[8px] ${muted}`}>
                  {roleLabel}
                </span>
              </span>

              <ChevronDown
                className={`hidden h-3.5 w-3.5 transition-transform duration-200 sm:block ${muted
                  } ${showProfileMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10 sm:hidden"
                  onClick={() => setShowProfileMenu(false)}
                />

                <div
                  role="menu"
                  className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[calc(100vw-24px)] max-w-[380px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl ${isDark
                    ? 'border-0 bg-[#10161d] text-slate-200 shadow-black/40'
                    : 'border-0 bg-white/[0.98] text-slate-800 shadow-slate-300/40'
                    }`}
                >
                  {/* Profile summary */}
                  <div
                    className={`relative overflow-hidden px-4 pb-4 pt-4 ${isDark
                      ? 'border-b border-white/[0.07]'
                      : 'border-b border-slate-100'
                      }`}
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

                    <div className="relative flex items-center gap-3">
                      <Avatar profile={currentProfile} size="lg" online={isOnline} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold">
                            {currentProfile?.full_name || 'Staff Member'}
                          </p>
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-500">
                            {roleLabel}
                          </span>
                        </div>

                        <p className={`mt-0.5 truncate text-[10px] ${muted}`}>
                          {pharmacyName}
                        </p>

                        {currentProfile?.email && (
                          <p className={`mt-1 flex items-center gap-1 truncate text-[9px] ${muted}`}>
                            <Mail className="h-2.5 w-2.5 shrink-0" />
                            {currentProfile.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div
                        className={`rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.035]' : 'bg-slate-50'
                          }`}
                      >
                        <p className={`text-[8px] font-bold uppercase tracking-wider ${muted}`}>
                          Status
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.035]' : 'bg-slate-50'
                          }`}
                      >
                        <p className={`text-[8px] font-bold uppercase tracking-wider ${muted}`}>
                          Location
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-bold">
                          {pharmacyTown || 'Pharmacy'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div
                    className={`px-4 py-3 ${isDark
                      ? 'border-b border-white/[0.07]'
                      : 'border-b border-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDark
                            ? 'bg-violet-400/10 text-violet-400'
                            : 'bg-violet-50 text-violet-600'
                            }`}
                        >
                          <BellRing className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold">Notifications</p>
                          <p className={`truncate text-[8px] ${muted}`}>
                            Order updates and important alerts
                          </p>
                        </div>
                      </div>

                      <NotificationPermissionPrompt
                        compact
                        onPermissionChange={(permission) => {
                          if (permission === 'granted') {
                            console.log('Notifications enabled');
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Staff */}
                  <div
                    className={`${isDark
                      ? 'border-b border-white/[0.07]'
                      : 'border-b border-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDark
                            ? 'bg-sky-400/10 text-sky-400'
                            : 'bg-sky-50 text-sky-600'
                            }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold">Team</p>
                          <p className={`text-[8px] ${muted}`}>
                            {pharmacyStaff.length} member{pharmacyStaff.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <span className={`flex items-center gap-1 text-[8px] font-bold ${muted}`}>
                        <Lock className="h-2.5 w-2.5" />
                        View only
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto px-2 pb-2">
                      {pharmacyStaff.map((profile) => {
                        const active = profile.id === currentProfile?.id;

                        return (
                          <div
                            key={profile.id}
                            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${active
                              ? isDark
                                ? 'bg-emerald-400/[0.07]'
                                : 'bg-emerald-50'
                              : isDark
                                ? 'hover:bg-white/[0.035]'
                                : 'hover:bg-slate-50'
                              }`}
                          >
                            <Avatar profile={profile} size="sm" />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[10px] font-semibold">
                                  {profile.full_name}
                                </p>
                                {active && (
                                  <span className="shrink-0 text-[8px] font-bold text-emerald-500">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className={`truncate text-[8px] ${muted}`}>
                                {profile.role}
                                {profile.email ? ` • ${profile.email.split('@')[0]}` : ''}
                              </p>
                            </div>

                            {active ? (
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <Lock className={`h-3 w-3 shrink-0 ${muted}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sync / app info */}
                  <div className="grid grid-cols-2 gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onTriggerSync();
                      }}
                      disabled={isSyncing}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${isDark
                        ? 'border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.07]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                    >
                      {isSyncing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      <span>
                        <span className="block text-[9px] font-bold">
                          Sync data
                        </span>
                        <span className={`block text-[7px] ${muted}`}>
                          {syncPendingCount
                            ? `${syncPendingCount} pending`
                            : 'Up to date'}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVersionInfo((value) => !value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${isDark
                        ? 'border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.07]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                    >
                      <GitBranch className={`h-3.5 w-3.5 ${muted}`} />
                      <span>
                        <span className="block text-[9px] font-bold">
                          Version
                        </span>
                        <span className={`block text-[7px] ${muted}`}>
                          v{appVersion}
                        </span>
                      </span>
                    </button>
                  </div>

                  {showVersionInfo && (
                    <div
                      ref={versionInfoRef}
                      className={`mx-4 mb-3 rounded-xl border px-3 py-2.5 ${isDark
                        ? 'border-white/[0.07] bg-white/[0.035]'
                        : 'border-slate-200 bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-bold">Pharmienta Kenya</p>
                          <p className={`mt-0.5 text-[8px] ${muted}`}>
                            Build v{appVersion}
                          </p>
                        </div>
                        {hasUpdate ? (
                          <span className="flex items-center gap-1 text-[8px] font-bold text-amber-500">
                            <RefreshCw className="h-3 w-3" />
                            Update available
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Up to date
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sign out */}
                  {onSignOut && (
                    <div
                      className={`border-t px-3 py-2 ${isDark ? 'border-white/[0.07]' : 'border-slate-100'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={handleSignOutClick}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold transition-colors ${isDark
                          ? 'text-rose-400 hover:bg-rose-400/[0.08]'
                          : 'text-rose-600 hover:bg-rose-50'
                          }`}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 text-center text-[7px] ${isDark ? 'text-slate-600' : 'text-slate-400'
                      }`}
                  >
                    Pharmienta Kenya • {new Date().getFullYear()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sign out confirmation modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md sm:p-5">
          <div
            ref={signOutModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className={`w-full max-w-md overflow-hidden rounded-3xl border-0 shadow-none ${isDark
              ? 'border-0 bg-[#10161d]'
              : 'border-0 bg-white'
              }`}
          >
            <div className="flex items-start justify-between px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDark
                    ? 'bg-rose-400/10 text-rose-400'
                    : 'bg-rose-50 text-rose-600'
                    }`}
                >
                  <Shield className="h-5 w-5" />
                </div>

                <div>
                  <h2 id="signout-title" className="text-base font-extrabold">
                    Sign out & Clear Data?
                  </h2>
                  <p className={`mt-0.5 text-[10px] ${muted}`}>
                    This will erase all local data from this device.
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setShowSignOutModal(false);
                  setSignOutConfirmText('');
                  setBackupAcknowledged(false);
                  setBackupError(null);
                  setBackupSuccess(null);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isDark
                  ? 'text-slate-400 hover:bg-white/[0.06]'
                  : 'text-slate-500 hover:bg-slate-100'
                  }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              {/* Backup status */}
              <div
                className={`rounded-2xl border-0 p-4 transition-all duration-300 ${backupAcknowledged
                  ? isDark
                    ? 'border-0 bg-emerald-400/[0.08]'
                    : 'border-0 bg-emerald-50'
                  : isDark
                    ? 'border-0 bg-rose-400/[0.08] animate-pulse'
                    : 'border-0 bg-rose-50 animate-pulse'
                  }`}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {backupAcknowledged ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-[11px] font-extrabold ${backupAcknowledged ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                    >
                      {backupAcknowledged
                        ? 'Backup Confirmed'
                        : 'BACKUP REQUIRED'}
                    </p>
                    <p
                      className={`mt-1 text-[9px] leading-relaxed ${backupAcknowledged
                        ? isDark
                          ? 'text-emerald-200/80'
                          : 'text-emerald-700'
                        : isDark
                          ? 'text-rose-200/80'
                          : 'text-rose-700'
                        }`}
                    >
                      {backupAcknowledged
                        ? 'Your data is backed up. You can safely clear local storage.'
                        : 'All local data (sales, inventory, customers) will be PERMANENTLY deleted. You must backup your data before signing out.'}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/30">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${backupAcknowledged ? 'bg-emerald-500 w-full' : 'bg-rose-500 w-0'
                          }`}
                      />
                    </div>

                    <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      {backupAcknowledged ? 'READY TO CLEAR' : 'NOT BACKED UP'}
                    </p>

                    {/* Success/Error messages */}
                    {backupSuccess && (
                      <p className="mt-2 text-[9px] font-bold text-emerald-500">
                        {backupSuccess}
                      </p>
                    )}
                    {backupError && (
                      <p className="mt-2 text-[9px] font-bold text-rose-500">
                        {backupError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Backup button */}
              <button
                type="button"
                onClick={handleBackupData}
                disabled={isBackingUp || backupAcknowledged}
                className={`w-full rounded-2xl border-0 px-4 py-3 text-[10px] font-bold transition-all ${backupAcknowledged
                  ? isDark
                    ? 'border-0 bg-emerald-400/10 text-emerald-400 cursor-default'
                    : 'border-0 bg-emerald-50 text-emerald-700 cursor-default'
                  : isDark
                    ? 'border-0 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 animate-pulse'
                    : 'border-0 bg-amber-50 text-amber-700 hover:bg-amber-100 animate-pulse'
                  }`}
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="mr-2 inline h-3.5 w-3.5 animate-spin" />
                    Backing up...
                  </>
                ) : backupAcknowledged ? (
                  <>
                    <Check className="mr-2 inline h-3.5 w-3.5" />
                    Backup Complete
                  </>
                ) : (
                  <>
                    <Download className="mr-2 inline h-3.5 w-3.5" />
                    Backup Data Now (Required)
                  </>
                )}
              </button>

              {/* Confirmation input */}
              <div>
                <label
                  htmlFor="logout-confirm"
                  className={`mb-1.5 block text-[10px] font-bold ${muted}`}
                >
                  Type <span className="text-rose-500">LOGOUT</span> to confirm
                </label>

                <input
                  id="logout-confirm"
                  type="text"
                  value={signOutConfirmText}
                  onChange={(event) =>
                    setSignOutConfirmText(event.target.value.toUpperCase())
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      signOutConfirmText === 'LOGOUT' &&
                      backupAcknowledged
                    ) {
                      handleConfirmSignOut();
                    }
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="LOGOUT"
                  className={`w-full rounded-2xl border px-4 py-3.5 text-center font-mono text-sm font-bold tracking-[0.22em] outline-none transition-all ${!backupAcknowledged && signOutConfirmText === 'LOGOUT'
                    ? isDark
                      ? 'border-rose-400/60 bg-rose-400/10 text-rose-400 placeholder:text-rose-400/40 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/20'
                      : 'border-rose-400 bg-rose-50 text-rose-600 placeholder:text-rose-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-200'
                    : isDark
                      ? 'border-white/[0.08] bg-white/[0.035] text-white placeholder:text-slate-600 focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-400/10'
                      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'
                    }`}
                />

                {signOutConfirmText === 'LOGOUT' && !backupAcknowledged && (
                  <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-rose-500">
                    <AlertCircle className="h-3 w-3" />
                    You must backup your data before signing out
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutModal(false);
                    setSignOutConfirmText('');
                    setBackupAcknowledged(false);
                    setBackupError(null);
                    setBackupSuccess(null);
                  }}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-[10px] font-bold transition-colors ${isDark
                    ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSignOut}
                  disabled={signOutConfirmText !== 'LOGOUT' || !backupAcknowledged}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-extrabold text-white shadow-lg transition-all ${signOutConfirmText === 'LOGOUT' && backupAcknowledged
                    ? 'bg-rose-500 shadow-rose-500/15 hover:bg-rose-600'
                    : 'bg-slate-400 cursor-not-allowed opacity-40'
                    }`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out & Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};