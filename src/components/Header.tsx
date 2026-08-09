import React, { useState } from 'react';
import { Pharmacy, Profile, UserRole } from '../types';
import { Wifi, WifiOff, RefreshCw, UserCheck, ChevronDown, Sun, Moon, User, Settings, LogOut, Shield, Calendar, Mail, Phone } from 'lucide-react';

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
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  return (
    <header className={`sticky top-0 z-30 shadow-md border-b px-3 py-2.5 transition-colors ${isDark
      ? 'bg-[#161b22] text-[#f0f6fc] border-[#30363d]'
      : 'bg-white text-[#1f2328] border-[#d0d7de]'
      }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Pharmacy Title & Brand */}
        <div className="flex items-center gap-2.5">
          {/* ✅ Show pharmacy avatar if available */}
          {currentProfile?.avatar_url ? (
            <img
              src={currentProfile.avatar_url}
              alt={pharmacyName}
              className="w-8 h-8 rounded-xl object-cover border border-[#2ea043]/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2ea043] to-[#58a6ff] flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              P
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-tight leading-none">
                {pharmacyName}
              </h1>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                {currentRole === 'owner' ? 'Owner' : currentRole === 'admin' ? 'Manager' : 'Staff'}
              </span>
            </div>
            <p className={`text-[10px] truncate max-w-[150px] sm:max-w-xs mt-0.5 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
              }`}>
              {pharmacyTown ? `${pharmacyTown} • POS active` : 'Pharmacy Management System'}
            </p>
          </div>
        </div>

        {/* Controls: Theme Toggle, Sync Badge, Profile Switcher */}
        <div className="flex items-center gap-2">

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-xl border transition-colors ${isDark
                ? 'bg-[#21262d] border-[#30363d] text-amber-400 hover:bg-[#30363d]'
                : 'bg-[#f6f8fa] border-[#d0d7de] text-indigo-600 hover:bg-slate-200'
                }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Sync & Network Badge */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${isOnline
              ? syncPendingCount > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : isDark
                  ? 'bg-[#21262d] text-[#2ea043] border-[#30363d]'
                  : 'bg-[#f6f8fa] text-[#1f883d] border-[#d0d7de]'
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

          {/* ✅ Profile Switcher with Avatar */}
          {filteredProfiles.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${isDark
                  ? 'bg-[#21262d] border-[#30363d] hover:bg-[#30363d] text-[#f0f6fc]'
                  : 'bg-[#f6f8fa] border-[#d0d7de] hover:bg-slate-200 text-[#1f2328]'
                  }`}
              >
                {/* ✅ Avatar with initials fallback */}
                {getAvatarUrl(currentProfile) ? (
                  <img
                    src={getAvatarUrl(currentProfile)!}
                    alt={currentProfile?.full_name || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentRole === 'owner'
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
                <span className={`text-[9px] px-1 rounded border hidden sm:inline ${badge.bg}`}>
                  {badge.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* ✅ Profile Dropdown Menu with Full Details */}
              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-2xl py-1 z-50 text-xs ${isDark
                  ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
                  : 'bg-white border-[#d0d7de] text-[#1f2328]'
                  }`}>
                  {/* ✅ Current User Section with Avatar */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} flex items-center gap-3`}>
                    {/* Large Avatar */}
                    {getAvatarUrl(currentProfile) ? (
                      <img
                        src={getAvatarUrl(currentProfile)!}
                        alt={currentProfile?.full_name || 'User'}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#2ea043]/30"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${currentRole === 'owner'
                        ? 'bg-amber-500/20 text-amber-400'
                        : currentRole === 'admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                        }`}>
                        {getInitials(currentProfile)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm truncate">
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

                  {/* ✅ Staff List */}
                  <div className="py-1 max-h-48 overflow-y-auto">
                    <p className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
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
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors ${isActive
                            ? isDark ? 'bg-[#21262d] text-[#58a6ff] font-bold' : 'bg-[#f3f4f6] text-[#0969da] font-bold'
                            : isDark ? 'hover:bg-[#21262d]' : 'hover:bg-slate-100'
                            }`}
                        >
                          {/* ✅ Avatar in staff list */}
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={p.full_name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${p.role === 'owner'
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
                          {isActive && <UserCheck className="w-3.5 h-3.5 text-[#2ea043] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* ✅ Action Buttons */}
                  <div className={`border-t pt-1 mt-1 ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'}`}>
                    {/* Settings - Only for Owner/Admin */}
                    {(currentRole === 'owner' || currentRole === 'admin') && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          // Navigate to settings - you can add this logic
                          // onNavigateToSettings?.();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                    )}

                    {/* Sign Out */}
                    {onSignOut && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2 font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
    </header>
  );
};