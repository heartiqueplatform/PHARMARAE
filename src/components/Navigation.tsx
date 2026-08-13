// components/Navigation.tsx
import React from 'react';
import {
  Home, ShoppingBag, Package, BarChart3, MoreHorizontal,
  Sun, Moon, ShieldCheck, Info, Shield, FileCheck,
  TrendingUp, // NEW - for Requests tab
  Undo2 // NEW - for Returns tab
} from 'lucide-react';
import { Pharmacy, Profile } from '../types';

export type NavTab = 'home' | 'sell' | 'stock' | 'reports' | 'more' | 'about' | 'privacy' | 'terms' | 'requests' | 'returns'; // ADD 'requests' and 'returns'

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  pharmacy?: Pharmacy | null;
  currentProfile?: Profile | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
  theme = 'dark',
  onToggleTheme,
  pharmacy,
  currentProfile
}) => {
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'home' as NavTab, label: 'Dashboard', icon: Home },
    { id: 'sell' as NavTab, label: 'POS Terminal', icon: ShoppingBag, isPrimary: true, badge: cartCount },
    { id: 'stock' as NavTab, label: 'Stock Manager', icon: Package },
    { id: 'requests' as NavTab, label: 'Requests', icon: TrendingUp },
    { id: 'returns' as NavTab, label: 'Returns', icon: Undo2 }, // NEW - Add this
    { id: 'reports' as NavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'more' as NavTab, label: 'Settings & Hub', icon: MoreHorizontal },
  ];

  // Legal tabs - these will be shown in a separate section
  const legalTabs = [
    { id: 'about' as NavTab, label: 'About', icon: Info },
    { id: 'privacy' as NavTab, label: 'Privacy Policy', icon: Shield },
    { id: 'terms' as NavTab, label: 'Terms & Conditions', icon: FileCheck },
  ];

  // Get user avatar or initials
  const getUserAvatar = () => {
    if (currentProfile?.avatar_url) {
      return currentProfile.avatar_url;
    }
    return null;
  };

  const getUserInitials = () => {
    if (!currentProfile?.full_name) return 'U';
    const names = currentProfile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return currentProfile.full_name.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* MOBILE EDGE-TO-EDGE BOTTOM NAVIGATION */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-1 py-1 border-t backdrop-blur-md shadow-2xl transition-colors ${isDark
        ? 'bg-[#161b22]/95 border-[#30363d] text-[#c9d1d9]'
        : 'bg-white/95 border-[#d0d7de] text-[#1f2328]'
        }`}>
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.isPrimary) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex flex-col items-center justify-center -mt-5 px-4 py-2 rounded-2xl transition-all active:scale-95 shadow-xl ${isActive
                    ? 'bg-[#2ea043] text-white ring-4 ring-[#2ea043]/30 scale-105'
                    : 'bg-[#238636] text-white'
                    }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-[10px] font-extrabold tracking-wide mt-0.5 uppercase">
                    {tab.label}
                  </span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${isActive
                  ? isDark ? 'text-[#58a6ff] font-bold' : 'text-[#0969da] font-bold'
                  : isDark ? 'text-[#8b949e] hover:text-[#f0f6fc]' : 'text-[#656d76] hover:text-[#1f2328]'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* DESKTOP HOVER-EXPANDING SIDEBAR */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out border-r w-16 hover:w-60 group shadow-2xl overflow-hidden select-none ${isDark
        ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
        : 'bg-white border-[#d0d7de] text-[#1f2328]'
        }`}>

        {/* Sidebar Header / Brand */}
        <div className={`p-3.5 border-b flex items-center gap-3 min-w-[240px] ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'
          }`}>
          <img
            src="/pwa-192x192.png"
            alt="PHARMIENTA KENYA"
            className="w-9 h-9 rounded-xl flex-shrink-0 object-cover border border-[#2ea043]/30"
          />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-tight truncate">
                <span style={{ color: '#003366' }}>PHARM</span>
                <span style={{ color: '#B30000' }}>IENTA</span>
              </h1>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                PRO
              </span>
            </div>
            <p className={`text-[11px] truncate ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
              Oriented To Care
            </p>
          </div>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto min-w-[240px]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${isActive
                  ? isDark
                    ? 'bg-[#238636] text-white font-bold shadow-md'
                    : 'bg-[#1f883d] text-white font-bold shadow-md'
                  : isDark
                    ? 'hover:bg-[#21262d] text-[#c9d1d9] hover:text-white'
                    : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                  }`}
              >
                <div className="flex-shrink-0 w-6 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-xs">
                  {tab.label}
                </span>

                {tab.badge && tab.badge > 0 ? (
                  <span className="ml-auto bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Divider */}
          <div className={`my-3 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'}`} />

          {/* Legal Tabs */}
          {legalTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${isActive
                  ? isDark
                    ? 'bg-[#238636] text-white font-bold shadow-md'
                    : 'bg-[#1f883d] text-white font-bold shadow-md'
                  : isDark
                    ? 'hover:bg-[#21262d] text-[#c9d1d9] hover:text-white'
                    : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                  }`}
              >
                <div className="flex-shrink-0 w-6 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-xs">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Controls */}
        <div className={`p-2.5 border-t min-w-[240px] space-y-2 ${isDark ? 'border-[#30363d] bg-[#0d1117]/60' : 'border-[#d0d7de] bg-[#f6f8fa]/80'
          }`}>

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${isDark
                ? 'hover:bg-[#21262d] text-[#c9d1d9]'
                : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">Dark Mode</span>
                </>
              )}
            </button>
          )}

          {/* Active User Badge */}
          {currentProfile && (
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-[#161b22]' : 'bg-white'
              }`}>
              {getUserAvatar() ? (
                <img
                  src={getUserAvatar()!}
                  alt={currentProfile.full_name}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-[#2ea043]/30"
                />
              ) : (
                <div className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs flex-shrink-0 border ${currentProfile.role === 'owner'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : currentProfile.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    : 'bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]/30'
                  }`}>
                  {getUserInitials()}
                </div>
              )}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
                <p className="font-bold text-xs truncate leading-tight">{currentProfile.full_name}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{currentProfile.role === 'owner' ? 'Owner' : currentProfile.role}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};