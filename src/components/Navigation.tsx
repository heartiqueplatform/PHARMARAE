// components/Navigation.tsx
import React, { useState } from 'react';
import {
  Home, ShoppingBag, Package, BarChart3, MoreHorizontal,
  Sun, Moon, ShieldCheck, Info, Shield, FileCheck,
  TrendingUp,
  Undo2, X, Settings, ChevronRight,
  Brain
} from 'lucide-react';
import { Pharmacy, Profile } from '../types';
// components/Navigation.tsx - Line ~10
export type NavTab = 'home' | 'sell' | 'stock' | 'reports' | 'more' | 'about' | 'privacy' | 'terms' | 'requests' | 'returns' | 'intelligence' | 'orders';
//                                                                                                                          ↑ ADD THIS
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
  const [showMoreOverlay, setShowMoreOverlay] = useState(false);

  // Main tabs shown in bottom nav
  // Main tabs shown in bottom nav
  const mainTabs = [
    { id: 'home' as NavTab, label: 'Dashboard', icon: Home },
    { id: 'sell' as NavTab, label: 'POS Terminal', icon: ShoppingBag, isPrimary: true, badge: cartCount },
    { id: 'stock' as NavTab, label: 'Stock Manager', icon: Package },
    { id: 'reports' as NavTab, label: 'Sale Analytics', icon: BarChart3 },

  ];

  // Tabs shown in the More overlay
  // Tabs shown in the More overlay
  const moreOverlayTabs = [
    { id: 'intelligence' as NavTab, label: ' Business Intelligence (BI)', icon: Brain }, // New tab
    { id: 'orders' as NavTab, label: 'Orders', icon: Package }, //  ADD THIS
    { id: 'requests' as NavTab, label: 'Requests', icon: TrendingUp }, // Moved from main to here
    { id: 'returns' as NavTab, label: 'Returns', icon: Undo2 },
    { id: 'more' as NavTab, label: 'Settings & Hub', icon: Settings },
  ];

  // Legal tabs
  const legalTabs = [
    { id: 'about' as NavTab, label: 'About', icon: Info },
    { id: 'privacy' as NavTab, label: 'Privacy Policy', icon: Shield },
    { id: 'terms' as NavTab, label: 'Terms & Conditions', icon: FileCheck },
  ];

  // All tabs for sidebar
  const allTabs = [
    ...mainTabs,
    ...moreOverlayTabs,
  ];

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

  const handleTabClick = (tabId: NavTab) => {
    onTabChange(tabId);
    setShowMoreOverlay(false);
  };

  const handleMoreClick = () => {
    setShowMoreOverlay(!showMoreOverlay);
  };

  return (
    <>
      {/* MOBILE EDGE-TO-EDGE BOTTOM NAVIGATION */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-1 py-1 border-t backdrop-blur-md shadow-2xl transition-colors ${isDark
        ? 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9]'
        : 'bg-white/95 border-[#d0d7de] text-[#1f2328]'
        }`}>
        <div className="flex items-center justify-around max-w-md mx-auto">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.isPrimary) {
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
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
                onClick={() => handleTabClick(tab.id)}
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

          {/* More Button */}
          <button
            onClick={handleMoreClick}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${showMoreOverlay
              ? isDark ? 'text-[#58a6ff] font-bold' : 'text-[#0969da] font-bold'
              : isDark ? 'text-[#8b949e] hover:text-[#f0f6fc]' : 'text-[#656d76] hover:text-[#1f2328]'
              }`}
          >
            <Settings className="w-5 h-5 stroke-2" />
            <span className="text-[10px] font-medium mt-0.5">More Options</span>
          </button>
        </div>
      </nav>

      {/* MOBILE MORE OVERLAY - EDGE TO EDGE WITH PROFESSIONAL FOOTER */}
      {showMoreOverlay && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setShowMoreOverlay(false)}
          />

          {/* Overlay Content - Edge to Edge */}
          <div
            className={`relative w-full rounded-t-3xl shadow-2xl px-0 pb-0 max-h-[85vh] overflow-y-auto ${isDark
              ? 'bg-[#0d1117] text-[#c9d1d9]'
              : 'bg-white text-[#1f2328]'
              }`}
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2 sticky top-0 z-10 bg-transparent">
              <div className={`w-12 h-1 rounded-full ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'}`} />
            </div>


            {/* Header with Pharmienta Branding */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-[#30363d]/30">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Pharmienta Kenya"
                  className="w-12 h-12 rounded-full flex-shrink-0 object-cover border-0 border-[#2ea043]/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xl font-extrabold tracking-tight">
                      <span style={{ color: '#003366' }}>Pharm</span>
                      <span style={{ color: '#B30000' }}>ienta</span>
                    </h3>
                    <span className="text-[#2ea043]">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.915-3.435 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.435 2.25 1.512 0 2.818-.916 3.435-2.25.415.163.865.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.59 4.59c-.353.353-.93.353-1.283 0l-2.14-2.14c-.353-.353-.353-.93 0-1.283.353-.353.93-.353 1.283 0l1.488 1.487 3.94-3.94c.354-.353.93-.353 1.283 0 .354.353.354.93 0 1.283z" />
                      </svg>
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                    Oriented To Care
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreOverlay(false)}
                className={`p-2 rounded-full transition-all ${isDark
                  ? 'hover:bg-[#21262d] active:scale-95'
                  : 'hover:bg-[#f3f4f6] active:scale-95'
                  }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* More Tabs */}
            <div className="space-y-1.5 px-4 pb-4">
              {moreOverlayTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${isActive
                      ? isDark
                        ? 'bg-[#238636] text-white shadow-lg shadow-[#238636]/20'
                        : 'bg-[#1f883d] text-white shadow-lg shadow-[#1f883d]/20'
                      : isDark
                        ? 'hover:bg-[#21262d] text-[#c9d1d9]'
                        : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                      }`}
                  >
                    <div className={`p-2 rounded-xl ${isActive
                      ? 'bg-white/20'
                      : isDark
                        ? 'bg-[#21262d]'
                        : 'bg-[#f0f0f0]'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm flex-1 text-left">{tab.label}</span>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                );
              })}

              {/* Theme Toggle in Overlay */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${isDark
                    ? 'hover:bg-[#21262d] text-[#c9d1d9]'
                    : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                    }`}
                >
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-[#21262d]' : 'bg-[#f0f0f0]'}`}>
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <span className="font-medium text-sm flex-1 text-left">
                    {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-30" />
                </button>
              )}

              {/* Legal Tabs */}
              <div className={`pt-4 pb-2 ${isDark ? '' : ''}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider px-2 mb-2 ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'
                  }`}>
                  Legal Information
                </p>
                {legalTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isActive
                        ? isDark
                          ? 'bg-[#238636] text-white shadow-lg shadow-[#238636]/20'
                          : 'bg-[#1f883d] text-white shadow-lg shadow-[#1f883d]/20'
                        : isDark
                          ? 'hover:bg-[#21262d] text-[#c9d1d9]'
                          : 'hover:bg-[#f3f4f6] text-[#1f2328]'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-sm flex-1 text-left">{tab.label}</span>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PROFESSIONAL SMART FOOTER */}
            {/* PROFESSIONAL SMART FOOTER */}
            <div className={`px-6 py-4 ${isDark
              ? 'bg-[#161b22] border-t border-[#30363d]'
              : 'bg-[#f6f8fa] border-t border-[#d0d7de]'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getUserAvatar() ? (
                    <img
                      src={getUserAvatar()!}
                      alt={currentProfile?.full_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#2ea043]/30"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm border-2 ${currentProfile?.role === 'owner'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : currentProfile?.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : 'bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]/30'
                      }`}>
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-bold text-sm leading-tight">
                      {currentProfile?.full_name || 'User'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className={`text-xs font-medium capitalize ${isDark ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                        {currentProfile?.role || 'User'}
                      </span>
                      {pharmacy && (
                        <>
                          <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'}`} />
                          <span className={`text-xs ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                            {pharmacy.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`text-right ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                  <p className="text-[10px] font-medium">v1.0.1</p>
                  <p className="text-[9px]">© 2026 Pharmienta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-60 transition-all duration-300 ease-in-out border-0 w-16 hover:w-60 group shadow-2xl overflow-hidden select-none ${isDark
        ? 'bg-[#0d1117] border-0 text-[#c9d1d9]'
        : 'bg-white border-[#d0d7de] text-[#1f2328]'
        }`}>

        {/* Sidebar Header */}
        <div className={`p-3.5 border-0 flex items-center gap-3 min-w-[240px] ${isDark ? 'border-0' : 'border-0'
          }`}>
          <img
            src="/pwa-192x192.png"
            alt="Pharmienta Kenya"
            className="w-9 h-9 rounded-xl flex-shrink-0 object-cover border border-[#2ea043]/30"
          />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-tight truncate">
                <span style={{ color: '#003366' }}>Pharm</span>
                <span style={{ color: '#B30000' }}>ienta</span>
              </h1>
              <span className="text-[#2ea043]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.915-3.435 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.435 2.25 1.512 0 2.818-.916 3.435-2.25.415.163.865.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.59 4.59c-.353.353-.93.353-1.283 0l-2.14-2.14c-.353-.353-.353-.93 0-1.283.353-.353.93-.353 1.283 0l1.488 1.487 3.94-3.94c.354-.353.93-.353 1.283 0 .354.353.354.93 0 1.283z" />
                </svg>
              </span>
            </div>
            <p className={`text-[11px] truncate ${isDark ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
              Oriented To Care
            </p>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto min-w-[240px]">
          {allTabs.map(tab => {
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

        {/* Sidebar Footer */}
        <div className={`p-2.5 border-t min-w-[240px] space-y-2 ${isDark ? 'border-[#30363d] bg-[#0d1117]/60' : 'border-[#d0d7de] bg-[#f6f8fa]/80'
          }`}>
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