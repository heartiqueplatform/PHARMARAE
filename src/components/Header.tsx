import React, { useState } from 'react';
import { Pharmacy, Profile, UserRole } from '../types';
import { Wifi, WifiOff, RefreshCw, UserCheck, ChevronDown, Sun, Moon, User, Settings, LogOut, Shield, Calendar, Mail, Phone, Info, GitBranch } from 'lucide-react';

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
  const isDark = theme === 'dark';

  // Get the pharmacy name from current profile or pharmacy object
  const pharmacyName = currentProfile?.pharmacy_name || pharmacy?.name || 'PHARMARAE KENYA';
  const pharmacyTown = currentProfile?.pharmacy_town || pharmacy?.town || '';

  // Filter profiles to only show those from the SAME pharmacy
  const filteredProfiles = profiles.filter(p => {
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner': return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '👑 Owner' };
      case 'admin': return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '📋 Manager' };
      case 'pharmacist': return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '💊 Pharmacist' };
      case 'cashier': return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '💰 Cashier' };
      case 'storekeeper': return { bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30', label: '📦 Storekeeper' };
      default: return { bg: 'bg-gray-500/20 text-gray-300', label: role };
    }
  };

  const badge = getRoleBadge(currentRole);

  // Get avatar URL from profile
  const getAvatarUrl = (profile: Profile | null): string | null => {
    return profile?.avatar_url || null;
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
    const storedVersion = localStorage.getItem('pharmarae_app_version');
    if (storedVersion && storedVersion !== appVersion) {
      return true;
    }
    return false;
  };

  const hasUpdate = checkForAppUpdate();

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-all duration-300 px-3 py-2.5 ${isDark
      ? 'bg-[#161b22]/95 text-[#f0f6fc] border-[#30363d]/50'
      : 'bg-white/95 text-[#1f2328] border-[#d0d7de]/50'
      }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Pharmacy Title & Brand */}
        <div className="flex items-center gap-3">
          {/*  Perfect Circle Avatar with floating style */}
          {currentProfile?.avatar_url ? (
            <div className="relative">
              <img
                src={currentProfile.avatar_url}
                alt={pharmacyName}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#2ea043]/30 shadow-lg shadow-[#2ea043]/10"
              />
              {/* Online status dot - floating style */}
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#161b22] shadow-sm" />
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2ea043] to-[#58a6ff] flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-[#2ea043]/20">
                {pharmacyName.charAt(0).toUpperCase()}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#161b22] shadow-sm" />
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight leading-none">
                {pharmacyName}
              </h1>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${isDark
                ? 'bg-[#2ea043]/20 text-[#2ea043] border-[#2ea043]/30'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                {currentRole === 'owner' ? 'Owner' : currentRole === 'admin' ? 'Manager' : 'Staff'}
              </span>
              {/*  Version Badge - Floating style */}
              <button
                onClick={() => setShowVersionInfo(!showVersionInfo)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all duration-200 ${isDark
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
            <p className={`text-[10px] truncate max-w-[150px] sm:max-w-xs mt-0.5 flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
              }`}>
              {pharmacyTown ? `${pharmacyTown} • POS active` : 'Pharmacy Management System'}
              {hasUpdate && (
                <span className="text-[8px] text-emerald-500 font-medium animate-pulse">
                  • Update available
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Controls: Theme Toggle, Sync Badge, Profile Switcher */}
        <div className="flex items-center gap-2">

          {/* Theme Toggle Button - Floating style */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-full border transition-all duration-200 hover:scale-105 ${isDark
                ? 'bg-[#21262d]/80 border-[#30363d] text-amber-400 hover:bg-[#30363d]'
                : 'bg-[#f6f8fa]/80 border-[#d0d7de] text-indigo-600 hover:bg-slate-200'
                }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Sync & Network Badge - Floating style */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-105 ${isOnline
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

          {/*  Profile Switcher with Avatar - Floating style */}
          {filteredProfiles.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 border px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 ${isDark
                  ? 'bg-[#21262d]/80 border-[#30363d] hover:bg-[#30363d] text-[#f0f6fc]'
                  : 'bg-[#f6f8fa]/80 border-[#d0d7de] hover:bg-slate-200 text-[#1f2328]'
                  }`}
              >
                {/*  Perfect Circle Avatar */}
                {getAvatarUrl(currentProfile) ? (
                  <img
                    src={getAvatarUrl(currentProfile)!}
                    alt={currentProfile?.full_name || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-[#2ea043]/30"
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentRole === 'owner'
                    ? 'bg-amber-500/20 text-amber-400'
                    : currentRole === 'admin'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                    }`}>
                    {getInitials(currentProfile)}
                  </div>
                )}
                <span className="font-semibold max-w-[80px] sm:max-w-[120px] truncate hidden xs:inline">
                  {getDisplayName(currentProfile)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/*  Profile Dropdown Menu - Floating style with perfect circles */}
              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl py-1 z-50 text-xs backdrop-blur-xl border ${isDark
                  ? 'bg-[#161b22]/95 border-[#30363d]/50 text-[#c9d1d9]'
                  : 'bg-white/95 border-[#d0d7de]/50 text-[#1f2328]'
                  }`}>
                  {/*  Current User Section with Perfect Circle Avatar */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} flex items-center gap-3`}>
                    {/* Large Perfect Circle Avatar */}
                    {getAvatarUrl(currentProfile) ? (
                      <div className="relative">
                        <img
                          src={getAvatarUrl(currentProfile)!}
                          alt={currentProfile?.full_name || 'User'}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#2ea043]/30 shadow-lg shadow-[#2ea043]/10"
                        />
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#161b22] shadow-sm" />
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-lg ${currentRole === 'owner'
                          ? 'bg-amber-500/20 text-amber-400'
                          : currentRole === 'admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                          }`}>
                          {getInitials(currentProfile)}
                        </div>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#161b22] shadow-sm" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-base truncate">
                        {currentProfile?.full_name || 'Staff Member'}
                      </p>
                      <p className={`text-[10px] capitalize flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                        }`}>
                        <Shield className="w-3 h-3" />
                        {currentRole} • {pharmacyName}
                      </p>
                      {currentProfile?.email && (
                        <p className={`text-[9px] truncate flex items-center gap-1 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                          }`}>
                          <Mail className="w-2.5 h-2.5" />
                          {currentProfile.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/*  Staff List with Perfect Circle Avatars */}
                  <div className="py-1 max-h-56 overflow-y-auto">
                    <p className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                      }`}>
                      All Staff Members ({filteredProfiles.length})
                    </p>
                    {filteredProfiles.map(p => {
                      const isActive = p.id === currentProfile?.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSwitchProfile(p);
                            setShowProfileMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-3 transition-colors ${isActive
                            ? isDark ? 'bg-[#21262d]/80 text-[#58a6ff] font-bold' : 'bg-[#f3f4f6] text-[#0969da] font-bold'
                            : isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-slate-100'
                            }`}
                        >
                          {/*  Perfect Circle Avatar in staff list */}
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={p.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-[#2ea043]/20"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${p.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-400'
                              : p.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                              }`}>
                              {getInitials(p)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{p.full_name}</p>
                            <p className={`text-[9px] truncate ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                              {p.role} • {p.email?.split('@')[0] || ''}
                            </p>
                          </div>
                          {isActive && <UserCheck className="w-4 h-4 text-[#2ea043] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/*  Version Info Section */}
                  <div className={`border-t ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} px-3 py-2`}>
                    <div className={`flex items-center justify-between text-[9px] ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        v{appVersion}
                      </span>
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
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
                      <span>PHARMARAE KENYA</span>
                      <span>{new Date().getFullYear()}</span>
                    </div>
                  </div>

                  {/*  Action Buttons */}
                  <div className={`border-t ${isDark ? 'border-[#30363d]/50' : 'border-[#d0d7de]/50'} pt-1`}>
                    {/* Sign Out */}
                    {onSignOut && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSignOut();
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 font-bold rounded-b-2xl ${isDark
                          ? 'text-rose-400 hover:bg-rose-500/10'
                          : 'text-rose-600 hover:bg-rose-50'
                          }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/*  Version Info Tooltip - Floating style */}
      {showVersionInfo && (
        <div className={`absolute left-4 top-full mt-1 px-3 py-2 rounded-xl border shadow-lg text-xs max-w-xs z-40 backdrop-blur-xl ${isDark
          ? 'bg-[#161b22]/95 border-[#30363d]/50 text-[#c9d1d9]'
          : 'bg-white/95 border-[#d0d7de]/50 text-[#1f2328]'
          }`}>
          <p className="font-mono font-bold">PHARMARAE KENYA</p>
          <p className={`${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
            Version: <span className="font-mono text-emerald-500">{appVersion}</span>
          </p>
          <p className={`${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'} text-[8px] mt-0.5`}>
            {hasUpdate ? '🔄 Update available - Refresh to install' : ' Up to date'}
          </p>
        </div>
      )}
    </header>
  );
};