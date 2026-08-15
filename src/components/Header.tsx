// components/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Pharmacy, Profile, UserRole } from '../types';
import {
  Wifi, WifiOff, RefreshCw, UserCheck, ChevronDown, Sun, Moon,
  User, Settings, LogOut, Shield, Calendar, Mail, Phone, Info,
  GitBranch, Lock, Users, AlertCircle, Key, Bell, BellOff, BellRing,
  CheckCircle, XCircle
} from 'lucide-react';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';

// =============================================
// APP VERSION - Import from App or define here
// =============================================
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
  onToggleTheme,
  onSwitchProfile,
  onTriggerSync,
  onSignOut,
  appVersion = APP_VERSION,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutConfirmText, setSignOutConfirmText] = useState('');
  const isDark = theme === 'dark';

  // Refs for click-outside detection
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const versionInfoRef = useRef<HTMLDivElement>(null);
  const signOutModalRef = useRef<HTMLDivElement>(null);

  // =============================================
  // CLICK OUTSIDE HANDLERS
  // =============================================

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Close version info when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (versionInfoRef.current && !versionInfoRef.current.contains(event.target as Node)) {
        setShowVersionInfo(false);
      }
    };

    if (showVersionInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVersionInfo]);

  // Close sign out modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (signOutModalRef.current && !signOutModalRef.current.contains(event.target as Node)) {
        setShowSignOutModal(false);
        setSignOutConfirmText('');
      }
    };

    if (showSignOutModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSignOutModal]);

  // Get the pharmacy name from current profile or pharmacy object
  const pharmacyName = currentProfile?.pharmacy_name || pharmacy?.name || 'Pharmienta Kenya';
  const pharmacyTown = currentProfile?.pharmacy_town || pharmacy?.town || '';

  // Filter profiles to only show those from the SAME pharmacy
  const pharmacyStaff = profiles.filter(p => {
    if (currentProfile) {
      return p.pharmacy_name === currentProfile.pharmacy_name;
    }
    return true;
  });

  // Get the display name (first name or full name)
  const getDisplayName = (profile: Profile): string => {
    if (!profile) return 'Staff';
    const nameParts = profile.full_name?.split(' ') || [];
    return nameParts.length > 1 ? nameParts[0] : profile.full_name || 'Staff';
  };

  // Get user initials
  const getInitials = (profile: Profile | null): string => {
    if (!profile?.full_name) return 'U';
    const names = profile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return profile.full_name.charAt(0).toUpperCase();
  };

  // Check for app update (simplified)
  const checkForAppUpdate = () => {
    const storedVersion = localStorage.getItem('Pharmienta_app_version');
    if (storedVersion && storedVersion !== appVersion) {
      return true;
    }
    return false;
  };

  const hasUpdate = checkForAppUpdate();

  // Handle sign out with confirmation
  const handleSignOutClick = () => {
    setShowProfileMenu(false);
    setShowSignOutModal(true);
    setSignOutConfirmText('');
  };

  const handleConfirmSignOut = () => {
    if (signOutConfirmText !== 'LOGOUT') {
      alert('Please type "LOGOUT" to confirm.');
      return;
    }
    setShowSignOutModal(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  // Avatar component for consistent perfect circles
  const AvatarCircle = ({
    src,
    alt,
    initials,
    size = 'md',
    showStatus = false,
    statusPosition = 'bottom-right',
    className = ''
  }: {
    src?: string | null;
    alt?: string;
    initials: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showStatus?: boolean;
    statusPosition?: 'bottom-right' | 'bottom-left';
    className?: string;
  }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-[10px]',
      md: 'w-10 h-10 text-base',
      lg: 'w-14 h-14 text-xl',
      xl: 'w-16 h-16 text-2xl'
    };

    const statusSize = {
      sm: 'w-2.5 h-2.5',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
      xl: 'w-4 h-4'
    };

    const statusOffset = {
      'bottom-right': '-bottom-0.5 -right-0.5',
      'bottom-left': '-bottom-0.5 -left-0.5'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const statusClass = statusSize[size] || statusSize.md;
    const offsetClass = statusOffset[statusPosition] || statusOffset['bottom-right'];

    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className={`${sizeClass} rounded-full object-cover border-2 ${isDark ? 'border-[#2ea043]/30' : 'border-emerald-400/30'} shadow-lg shadow-[#2ea043]/10`}
          />
        ) : (
          <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold shadow-lg bg-gradient-to-br from-[#2ea043] to-[#58a6ff] text-white`}>
            {initials || 'U'}
          </div>
        )}
        {showStatus && isOnline && (
          <span className={`absolute ${offsetClass} ${statusClass} bg-emerald-500 rounded-full border-2 ${isDark ? 'border-[#161b22]' : 'border-white'} shadow-sm`} />
        )}
      </div>
    );
  };

  return (
    <>
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-all duration-300 px-3 py-2.5 ${isDark
        ? 'bg-[#161b22]/95 text-[#f0f6fc] border-[#30363d]/50'
        : 'bg-white/95 text-[#1f2328] border-[#d0d7de]/50'
        }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Pharmacy Title & Brand */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <AvatarCircle
              src={currentProfile?.avatar_url}
              initials={pharmacyName.charAt(0).toUpperCase()}
              size="md"
              showStatus={true}
              statusPosition="bottom-right"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`font-extrabold text-base tracking-tight leading-none truncate max-w-[180px] sm:max-w-[300px] md:max-w-[400px] ${isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]'}`}>
                  {pharmacyName}
                </h1>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${isDark
                  ? 'bg-[#2ea043]/20 text-[#2ea043] border-[#2ea043]/30'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                  {currentRole === 'owner' ? 'Owner' : currentRole === 'admin' ? 'Manager' : 'Staff'}
                </span>
                {/* Version Badge */}
                <button
                  onClick={() => setShowVersionInfo(!showVersionInfo)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all duration-200 shrink-0 ${isDark
                    ? 'bg-[#21262d]/80 text-[#8b949e] border-[#30363d] hover:bg-[#30363d]'
                    : 'bg-[#f6f8fa]/80 text-[#656d76] border-[#d0d7de] hover:bg-slate-200'
                    }`}
                  title={`Version ${appVersion}`}
                >
                  v{appVersion}
                  {hasUpdate && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </button>
              </div>
              <p className={`text-[10px] truncate max-w-[180px] sm:max-w-xs mt-0.5 flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                }`}>
                {pharmacyTown ? `${pharmacyTown} • POS active` : 'Pharmacy Management System'}
                {hasUpdate && (
                  <span className="text-[8px] text-emerald-500 font-medium animate-pulse hidden sm:inline">
                    • Update available
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controls: Sync Badge, Profile Switcher - NO THEME TOGGLE */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Sync & Network Badge */}
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-105 flex-shrink-0 ${isOnline
                ? syncPendingCount > 0
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : isDark
                    ? 'bg-[#21262d]/80 text-[#2ea043] border-[#30363d] hover:bg-[#30363d]'
                    : 'bg-[#f6f8fa]/80 text-[#1f883d] border-[#d0d7de] hover:bg-slate-200'
                : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              title="Click to process offline sync queue"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2ea043]" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-[#2ea043]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className="hidden xs:inline">
                {isSyncing ? 'Syncing...' : isOnline ? (syncPendingCount > 0 ? `${syncPendingCount} Pending` : 'Online') : 'Offline'}
              </span>
            </button>

            {/* Profile Menu - With click-outside detection */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 border px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 ${isDark
                  ? 'bg-[#21262d]/80 border-[#30363d] hover:bg-[#30363d] text-[#f0f6fc]'
                  : 'bg-[#f6f8fa]/80 border-[#d0d7de] hover:bg-slate-200 text-[#1f2328]'
                  }`}
              >
                <AvatarCircle
                  src={currentProfile?.avatar_url}
                  initials={getInitials(currentProfile)}
                  size="sm"
                  showStatus={false}
                />
                <span className="font-semibold max-w-[60px] sm:max-w-[100px] truncate hidden xs:inline">
                  {getDisplayName(currentProfile)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
              </button>

              {/* Profile Dropdown - Closes on outside click */}
              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl py-1 z-50 text-xs backdrop-blur-xl border ${isDark
                  ? 'bg-[#161b22]/95 border-[#30363d]/50 text-[#c9d1d9]'
                  : 'bg-white/95 border-[#d0d7de]/50 text-[#1f2328]'
                  }`}>

                  {/* 🔔 NOTIFICATION PERMISSION - NOW INSIDE PROFILE OVERLAY */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} flex items-center gap-1.5`}>
                        <Bell className="w-3.5 h-3.5" />
                        Notifications
                      </span>
                      <NotificationPermissionPrompt
                        compact={true}
                        onPermissionChange={(permission) => {
                          console.log('Notification permission changed:', permission);
                          if (permission === 'granted') {
                            console.log('✅ Notifications enabled!');
                          }
                        }}
                      />
                    </div>
                    <p className={`text-[9px] mt-0.5 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                      Enable notifications for order updates and alerts
                    </p>
                  </div>

                  {/* Current User Section */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} flex items-center gap-3`}>
                    <AvatarCircle
                      src={currentProfile?.avatar_url}
                      initials={getInitials(currentProfile)}
                      size="lg"
                      showStatus={true}
                      statusPosition="bottom-right"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-extrabold text-base truncate ${isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]'}`}>
                        {currentProfile?.full_name || 'Staff Member'}
                      </p>
                      <p className={`text-[10px] capitalize flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                        }`}>
                        <Shield className="w-3 h-3 flex-shrink-0" />
                        {currentRole} • {pharmacyName}
                      </p>
                      {currentProfile?.email && (
                        <p className={`text-[9px] truncate flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                          }`}>
                          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                          {currentProfile.email}
                        </p>
                      )}
                      {currentProfile?.phone && (
                        <p className={`text-[9px] truncate flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                          }`}>
                          <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                          {currentProfile.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <div className={`px-3 py-1.5 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                      }`}>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Staff Members ({pharmacyStaff.length})
                      </span>
                      <span className="text-[8px] text-emerald-500 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        View Only
                      </span>
                    </div>

                    {pharmacyStaff.map(p => {
                      const isActive = p.id === currentProfile?.id;

                      return (
                        <div
                          key={p.id}
                          className={`px-3 py-2.5 text-xs flex items-center gap-3 ${isActive
                            ? isDark ? 'bg-[#21262d]/80' : 'bg-[#f3f4f6]'
                            : isDark ? 'hover:bg-[#21262d]/30' : 'hover:bg-slate-50'
                            }`}
                        >
                          <AvatarCircle
                            src={p.avatar_url}
                            initials={getInitials(p)}
                            size="sm"
                            showStatus={false}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`truncate font-medium ${isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]'}`}>{p.full_name}</p>
                              {isActive && (
                                <span className="text-[8px] font-bold text-emerald-500 flex-shrink-0">(You)</span>
                              )}
                            </div>
                            <p className={`text-[9px] truncate ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                              {p.role} • {p.email?.split('@')[0] || ''}
                            </p>
                          </div>
                          {isActive ? (
                            <UserCheck className="w-4 h-4 text-[#2ea043] flex-shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-500/50 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}

                    <div className={`px-3 py-2 text-center text-[9px] border-t ${isDark ? 'border-[#30363d]/50 text-[#8b949e]' : 'border-[#d0d7de]/50 text-[#656d76]'}`}>
                      <Lock className="w-3 h-3 inline-block mr-1" />
                      Account switching is disabled for security
                    </div>
                  </div>

                  {/* Version Info */}
                  <div className={`border-t ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} px-3 py-2`}>
                    <div className={`flex items-center justify-between text-[9px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 flex-shrink-0" />
                        v{appVersion}
                      </span>
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3 flex-shrink-0" />
                        {hasUpdate ? (
                          <span className="text-emerald-500 font-medium animate-pulse">
                            Update available
                          </span>
                        ) : (
                          <span>Up to date</span>
                        )}
                      </span>
                    </div>
                    <div className={`text-[8px] mt-0.5 flex items-center justify-between ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                      <span>Pharmienta Kenya</span>
                      <span>{new Date().getFullYear()}</span>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <div className={`border-t ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} pt-1`}>
                    {onSignOut && (
                      <button
                        onClick={handleSignOutClick}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 font-bold rounded-b-2xl ${isDark
                          ? 'text-rose-400 hover:bg-rose-500/10'
                          : 'text-rose-600 hover:bg-rose-50'
                          }`}
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Version Info Tooltip - With click-outside */}
        {showVersionInfo && (
          <div
            ref={versionInfoRef}
            className={`absolute left-4 top-full mt-1 px-3 py-2 rounded-xl border shadow-lg text-xs max-w-xs z-40 backdrop-blur-xl ${isDark
              ? 'bg-[#161b22]/95 border-[#30363d]/50 text-[#c9d1d9]'
              : 'bg-white/95 border-[#d0d7de]/50 text-[#1f2328]'
              }`}
          >
            <p className="font-mono font-bold">Pharmienta Kenya</p>
            <p className={`${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
              Version: <span className="font-mono text-emerald-500">{appVersion}</span>
            </p>
            <p className={`${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} text-[8px] mt-0.5`}>
              {hasUpdate ? ' Update available - Refresh to install' : '✓ Up to date'}
            </p>
          </div>
        )}
      </header>

      {/* =============================================
          SIGN OUT CONFIRMATION MODAL - Click outside to close
          ============================================ */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            ref={signOutModalRef}
            className={`rounded-2xl max-w-md w-full p-6 shadow-2xl ${isDark ? 'bg-[#161b22]' : 'bg-white'} relative`}
          >
            {/* Close button (X) */}
            <button
              onClick={() => {
                setShowSignOutModal(false);
                setSignOutConfirmText('');
              }}
              className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${isDark
                ? 'hover:bg-[#30363d] text-[#8b949e]'
                : 'hover:bg-slate-100 text-[#656d76]'
                }`}
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Key className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className={`font-bold text-base ${isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]'}`}>
                  Confirm Sign Out
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                  Make sure you remember your PIN
                </p>
              </div>
            </div>

            {/* PIN Reminder */}
            <div className={`p-4 rounded-xl mb-4 border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Remember Your PIN
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-amber-300/70' : 'text-amber-600'}`}>
                    You will need your <span className="font-bold">4-digit PIN</span> to sign back in.
                    If you forget your PIN, you will need to contact the pharmacy owner.
                  </p>
                  <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
                    <p className={`text-center font-mono text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      PIN: ••••
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-rose-950/20 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}>
              <p className={`text-xs ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                <span className="font-bold">⚠️ Warning:</span> You are about to sign out of your account.
                Please ensure you have your PIN ready before continuing.
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-3 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                  Type <span className="text-rose-500 font-bold">LOGOUT</span> to confirm
                </label>
                <input
                  type="text"
                  value={signOutConfirmText}
                  onChange={(e) => setSignOutConfirmText(e.target.value.toUpperCase())}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${isDark ? 'bg-[#0d1117] text-[#f0f6fc] border-[#30363d]' : 'bg-[#f6f8fa] text-[#1f2328] border-[#d0d7de]'}`}
                  placeholder="Type LOGOUT here"
                  autoFocus
                />
              </div>

              <div className={`flex justify-end gap-3 pt-2 ${isDark ? 'border-t border-[#30363d]' : 'border-t border-[#d0d7de]'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutModal(false);
                    setSignOutConfirmText('');
                  }}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSignOut}
                  disabled={signOutConfirmText !== 'LOGOUT'}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Confirm Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};