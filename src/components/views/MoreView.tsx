import React, { useState } from 'react';
import { Profile, UserRole, Supplier, AuditLog } from '../../types';
import { Users, Truck, Settings, RefreshCw, Shield, Save, Check, Loader2, Database, ShieldCheck, CheckCircle2, AlertCircle, Image } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';
import { db } from '../../lib/db';
// Option 1: Use relative path from current file
import { AvatarUpload } from '@/components/AvatarUpload';


interface MoreViewProps {
  profile: Profile | null;
  profiles: Profile[];
  currentRole: UserRole;
  suppliers: Supplier[];
  auditLogs: AuditLog[];
  isOnline: boolean;
  syncPendingCount: number;
  onUpdateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  onUpdatePharmacyName?: (newName: string) => Promise<void>;
  onAddSupplier: (supplier: Partial<Supplier>) => Promise<void>;
  onAddStaff: (staffData: Partial<Profile>) => Promise<void>;
  onTriggerSync: () => void;
  onResetLocalCache?: () => void;
  theme?: 'dark' | 'light';
}

export const MoreView: React.FC<MoreViewProps> = ({
  profile,
  profiles,
  currentRole,
  suppliers,
  auditLogs,
  isOnline,
  syncPendingCount,
  onUpdateProfile,
  onUpdatePharmacyName,
  onAddSupplier,
  onAddStaff,
  onTriggerSync,
  onResetLocalCache,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]' : 'bg-white border-[#d0d7de] text-[#1f2328] shadow-sm';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] border-[#30363d] text-[#f0f6fc]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]';

  const [activeSection, setActiveSection] = useState<'staff' | 'suppliers' | 'settings' | 'sync' | 'audit'>('settings');

  // Loading States
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isSavingEditProfile, setIsSavingEditProfile] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [successToast, setSuccessToast] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Pharmacy Form State
  const [pharmName, setPharmName] = useState(profile?.pharmacy_name || '');
  const [pharmTradingName, setPharmTradingName] = useState(profile?.pharmacy_trading_name || '');
  const [pharmPhone, setPharmPhone] = useState(profile?.pharmacy_phone || '');
  const [pharmAddress, setPharmAddress] = useState(profile?.pharmacy_address || '');
  const [pharmCounty, setPharmCounty] = useState(profile?.pharmacy_county || 'Nairobi');
  const [pharmTown, setPharmTown] = useState(profile?.pharmacy_town || 'Nairobi');
  const [pharmHeader, setPharmHeader] = useState(profile?.pharmacy_receipt_header || '');
  const [pharmFooter, setPharmFooter] = useState(profile?.pharmacy_receipt_footer || '');
  const [pharmCurrency, setPharmCurrency] = useState(profile?.pharmacy_currency || 'KSh');

  // ✅ Avatar State
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarPublicId, setAvatarPublicId] = useState(profile?.avatar_public_id || '');

  // Check if pharmacy name already exists
  const checkPharmacyNameExists = async (name: string): Promise<boolean> => {
    if (!name.trim()) return false;
    const existingProfiles = await db.profiles
      .where('pharmacy_name')
      .equals(name.trim())
      .toArray();

    if (profile && existingProfiles.some(p => p.id === profile.id)) {
      return false;
    }
    return existingProfiles.length > 0;
  };

  // Generate unique pharmacy name suggestion
  const generateUniqueName = async (desiredName: string): Promise<string> => {
    let baseName = desiredName.trim();
    let counter = 1;
    let testName = baseName;

    while (await checkPharmacyNameExists(testName)) {
      testName = `${baseName} ${String(counter).padStart(2, '0')}`;
      counter++;
    }
    return testName;
  };

  // Handle pharmacy name change with validation
  const handlePharmacyNameChange = async (newName: string) => {
    setNameError('');
    if (!newName.trim()) {
      setNameError('Pharmacy name is required');
      return;
    }

    const exists = await checkPharmacyNameExists(newName.trim());
    if (exists) {
      const suggestedName = await generateUniqueName(newName.trim());
      setNameError(`⚠️ "${newName.trim()}" is already taken. Suggested: "${suggestedName}"`);
      if (confirm(`"${newName.trim()}" is already taken. Use "${suggestedName}" instead?`)) {
        setPharmName(suggestedName);
        setNameError('');
        return;
      }
    }
  };

  // Staff Form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('cashier');

  // Edit Staff Profile Form
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');

  const handleStartEditProfile = (p: Profile) => {
    setEditingProfile(p);
    setEditName(p.full_name || '');
    setEditEmail(p.email || '');
    setEditPhone(p.phone || '');
    setEditPin(p.pin_code || '');
    setEditRole(p.role || 'cashier');
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !onUpdateProfile || isSavingEditProfile) return;
    setIsSavingEditProfile(true);
    try {
      await onUpdateProfile(editingProfile.id, {
        full_name: editName,
        email: editEmail,
        phone: editPhone,
        pin_code: editPin,
        role: editRole,
      });
      setEditingProfile(null);
      triggerToast('✅ Staff profile updated successfully!');
    } catch (err: any) {
      alert('Error updating profile: ' + (err.message || err));
    } finally {
      setIsSavingEditProfile(false);
    }
  };

  // Supplier Form
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  // In MoreView.tsx - The handleSaveSettings function
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings || !profile) return;

    if (!canManage) {
      alert('Only the pharmacy owner can change settings.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const nameChanged = pharmName !== profile.pharmacy_name;

      // ✅ Prepare updates with avatar
      const updates: Partial<Profile> = {
        pharmacy_name: pharmName.trim(),
        pharmacy_trading_name: pharmTradingName,
        pharmacy_phone: pharmPhone,
        pharmacy_address: pharmAddress,
        pharmacy_county: pharmCounty,
        pharmacy_town: pharmTown,
        pharmacy_receipt_header: pharmHeader,
        pharmacy_receipt_footer: pharmFooter,
        pharmacy_currency: pharmCurrency,
        avatar_url: avatarUrl, // ✅ Include avatar URL
      };

      if (nameChanged) {
        const exists = await checkPharmacyNameExists(pharmName.trim());
        if (exists) {
          const suggestedName = await generateUniqueName(pharmName.trim());
          setNameError(`⚠️ "${pharmName.trim()}" is already taken. Suggested: "${suggestedName}"`);
          setIsSavingSettings(false);
          return;
        }

        if (onUpdatePharmacyName) {
          await onUpdatePharmacyName(pharmName.trim());
          // Then update other settings including avatar
          await onUpdateProfile(profile.id, updates);
        } else {
          await onUpdateProfile(profile.id, updates);
        }
      } else {
        await onUpdateProfile(profile.id, updates);
      }

      triggerToast('✅ Pharmacy settings updated successfully!');
    } catch (err: any) {
      alert('Error saving settings: ' + (err.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPin || isSavingStaff) return;

    if (staffPin.length !== 4) {
      alert('PIN must be exactly 4 digits.');
      return;
    }

    setIsSavingStaff(true);
    try {
      await onAddStaff({
        full_name: staffName,
        email: staffEmail,
        phone: staffPhone || '+254 700 000 000',
        pin_code: staffPin,
        role: staffRole,
        is_active: true,
      });
      setShowAddStaffModal(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPin('');
      triggerToast(`✅ Staff member "${staffName}" added successfully!`);
    } catch (err: any) {
      alert('Error adding staff: ' + (err.message || err));
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName || !suppPhone || isSavingSupplier) return;
    setIsSavingSupplier(true);
    try {
      await onAddSupplier({
        name: suppName,
        phone: suppPhone,
        active: true,
        pharmacy_name: profile?.pharmacy_name || ''
      });
      setShowAddSupplierModal(false);
      setSuppName('');
      setSuppPhone('');
      triggerToast(`✅ Supplier "${suppName}" registered successfully!`);
    } catch (err: any) {
      alert('Error adding supplier: ' + (err.message || err));
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleTriggerSyncQueue = async () => {
    if (isTriggeringSync) return;
    setIsTriggeringSync(true);
    try {
      await onTriggerSync();
      triggerToast('✅ Offline queue processed & synchronized with Supabase cloud!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setTimeout(() => setIsTriggeringSync(false), 800);
    }
  };

  const handleResetCache = async () => {
    if (!onResetLocalCache || isResettingCache) return;
    if (confirm('Are you sure you want to clear local offline cache and re-sync fresh from Supabase cloud?')) {
      setIsResettingCache(true);
      try {
        await onResetLocalCache();
        triggerToast('✅ Local cache wiped & clean state synchronized!');
      } catch (err: any) {
        alert('Cache reset error: ' + (err.message || err));
      } finally {
        setIsResettingCache(false);
      }
    }
  };

  // Only owner can manage settings - staff can only view
  const canManage = currentRole === 'owner';
  const canView = currentRole === 'owner' || currentRole === 'admin';

  return (
    <div className="space-y-4 pb-20 md:pb-6">

      {/* Top Hub Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveSection('settings')}
          className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center gap-1 transition-colors ${activeSection === 'settings'
            ? 'bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] font-bold shadow-sm'
            : `${cardBg} hover:border-[#2ea043]/40`
            }`}
        >
          <Settings className={`w-5 h-5 mb-1 ${canManage ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-xs font-bold ${canManage ? '' : 'text-slate-500'}`}>
            Settings {!canManage && '🔒'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('staff')}
          className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center gap-1 transition-colors ${activeSection === 'staff'
            ? 'bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] font-bold shadow-sm'
            : `${cardBg} hover:border-[#2ea043]/40`
            }`}
        >
          <Users className={`w-5 h-5 mb-1 ${canView ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-xs font-bold ${canView ? '' : 'text-slate-500'}`}>
            Staff {!canView && '🔒'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('suppliers')}
          className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center gap-1 transition-colors ${activeSection === 'suppliers'
            ? 'bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] font-bold shadow-sm'
            : `${cardBg} hover:border-[#2ea043]/40`
            }`}
        >
          <Truck className={`w-5 h-5 mb-1 ${canView ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-xs font-bold ${canView ? '' : 'text-slate-500'}`}>
            Suppliers {!canView && '🔒'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('sync')}
          className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center gap-1 transition-colors ${activeSection === 'sync'
            ? 'bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] font-bold shadow-sm'
            : `${cardBg} hover:border-[#2ea043]/40`
            }`}
        >
          <RefreshCw className="w-5 h-5 mb-1 text-[#2ea043]" />
          <span className="text-xs font-bold">Sync</span>
        </button>

        <button
          onClick={() => setActiveSection('audit')}
          className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center gap-1 transition-colors ${activeSection === 'audit'
            ? 'bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] font-bold shadow-sm'
            : `${cardBg} hover:border-[#2ea043]/40`
            }`}
        >
          <Shield className="w-5 h-5 mb-1 text-[#2ea043]" />
          <span className="text-xs font-bold">Audit</span>
        </button>
      </div>

      {/* Settings Panel - Owner Only */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveSettings} className={`border rounded-2xl p-4 space-y-3 text-xs ${cardBg}`}>
          <h3 className={`font-bold text-sm pb-2 border-b ${borderLine} ${textTitle}`}>
            Pharmacy Profile Settings
            {!canManage && (
              <span className="ml-2 text-xs text-amber-500 font-normal">
                🔒 Owner Only
              </span>
            )}
          </h3>

          {!canManage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Only the pharmacy owner can edit these settings.</span>
            </div>
          )}

          {/* ✅ Avatar Upload Section */}
          <div className="flex flex-col items-center py-4 border-b border-slate-800">
            <AvatarUpload
              currentImage={avatarUrl}
              onUploadSuccess={(url, publicId) => {
                setAvatarUrl(url);
                setAvatarPublicId(publicId);
                triggerToast('✅ Avatar uploaded successfully!');
              }}
              onRemove={() => {
                setAvatarUrl('');
                setAvatarPublicId('');
                triggerToast('✅ Avatar removed');
              }}
              size="large"
              theme={theme}
            />
            <p className={`text-[10px] mt-2 ${textMuted}`}>
              Upload a pharmacy logo or avatar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>Pharmacy Name *</label>
              <input
                type="text"
                required
                value={pharmName}
                onChange={(e) => setPharmName(e.target.value)}
                onBlur={() => {
                  if (pharmName !== profile?.pharmacy_name) {
                    handlePharmacyNameChange(pharmName);
                  }
                }}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none font-semibold ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {nameError && (
                <div className="mt-1 text-[10px] text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{nameError}</span>
                </div>
              )}
            </div>
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>Trading Name</label>
              <input
                type="text"
                value={pharmTradingName}
                onChange={(e) => setPharmTradingName(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>Phone Number</label>
              <input
                type="text"
                value={pharmPhone}
                onChange={(e) => setPharmPhone(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>Currency</label>
              <select
                value={pharmCurrency}
                onChange={(e) => setPharmCurrency(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="KSh">KSh - Kenya Shilling</option>
                <option value="UGX">UGX - Uganda Shilling</option>
                <option value="TZS">TZS - Tanzania Shilling</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>County</label>
              <input
                type="text"
                value={pharmCounty}
                onChange={(e) => setPharmCounty(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className={`block mb-1 font-bold ${textMuted}`}>Town</label>
              <input
                type="text"
                value={pharmTown}
                onChange={(e) => setPharmTown(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className={`block mb-1 font-bold ${textMuted}`}>Address</label>
            <input
              type="text"
              value={pharmAddress}
              onChange={(e) => setPharmAddress(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl px-3 py-2 focus:outline-none ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className={`block mb-1 font-bold ${textMuted}`}>Receipt Header</label>
            <textarea
              rows={2}
              value={pharmHeader}
              onChange={(e) => setPharmHeader(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl p-2 focus:outline-none font-mono text-[11px] ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className={`block mb-1 font-bold ${textMuted}`}>Receipt Footer</label>
            <textarea
              rows={2}
              value={pharmFooter}
              onChange={(e) => setPharmFooter(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl p-2 focus:outline-none font-mono text-[11px] ${inputBg} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSettings || !canManage}
              className={`px-5 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] active:scale-98 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Pharmacy Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Staff Management */}
      {activeSection === 'staff' && (
        <div className={`border rounded-2xl p-4 space-y-3 ${cardBg}`}>
          <div className={`flex items-center justify-between pb-2 border-b ${borderLine}`}>
            <h3 className={`font-bold text-sm ${textTitle}`}>
              Staff Members ({profiles.filter(p => !p.is_owner).length})
            </h3>
            {canManage && (
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-3 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>+ Add Staff</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {profiles.filter(p => !p.is_owner).map(p => (
              <div key={p.id} className={`p-3 border rounded-xl flex items-center justify-between text-xs ${isDark ? 'bg-[#0d1117]/60 border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'
                }`}>
                <div className="flex items-center gap-3">
                  {/* ✅ Show avatar if available */}
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#58a6ff]/20 text-[#58a6ff] font-extrabold flex items-center justify-center text-xs">
                      {p.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className={`font-bold ${textTitle}`}>{p.full_name}</div>
                    <div className={`text-[10px] ${textMuted}`}>
                      {p.email} • Phone: {p.phone || 'N/A'} • PIN: {p.pin_code || 'None'}
                    </div>
                    <div className="text-[10px] mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400`}>
                        {p.role}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleStartEditProfile(p)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers Management */}
      {activeSection === 'suppliers' && (
        <div className={`border rounded-2xl p-4 space-y-3 ${cardBg}`}>
          <div className={`flex items-center justify-between pb-2 border-b ${borderLine}`}>
            <h3 className={`font-bold text-sm ${textTitle}`}>Suppliers</h3>
            {canManage && (
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="px-3 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                + Add Supplier
              </button>
            )}
          </div>

          <div className="space-y-2">
            {suppliers.map(s => (
              <div key={s.id} className={`p-3 border rounded-xl flex items-center justify-between text-xs ${isDark ? 'bg-[#0d1117]/60 border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'
                }`}>
                <div>
                  <div className={`font-bold ${textTitle}`}>{s.name}</div>
                  <div className={`text-[10px] ${textMuted}`}>Tel: {s.phone}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Sync */}
      {activeSection === 'sync' && (
        <div className="space-y-4">
          <div className={`border rounded-2xl p-4 space-y-3 ${cardBg}`}>
            <h3 className={`font-bold text-sm pb-2 border-b ${borderLine} ${textTitle} flex items-center justify-between`}>
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#2ea043]" />
                Supabase Cloud Sync
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#2ea043] animate-ping' : 'bg-amber-500'}`} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </span>
            </h3>

            <div className={`p-3.5 border rounded-xl text-xs space-y-2.5 ${isDark ? 'bg-[#0d1117]/80 border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'
              }`}>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Status:</span>
                <span className="font-bold text-[#2ea043] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Auto-Sync Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Pending Sync Items:</span>
                <span className={`font-bold ${syncPendingCount > 0 ? 'text-amber-400' : 'text-[#2ea043]'}`}>
                  {syncPendingCount} item(s)
                </span>
              </div>
            </div>
          </div>

          <div className={`border rounded-2xl p-4 space-y-3 ${cardBg}`}>
            <h3 className={`font-bold text-sm pb-2 border-b ${borderLine} ${textTitle}`}>
              Manual Sync & Maintenance
            </h3>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleTriggerSyncQueue}
                disabled={isTriggeringSync}
                className="flex-1 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {isTriggeringSync ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync Now ({syncPendingCount})</span>
                  </>
                )}
              </button>

              {onResetLocalCache && canManage && (
                <button
                  onClick={handleResetCache}
                  disabled={isResettingCache}
                  className={`py-2.5 px-4 border text-rose-500 hover:bg-rose-500/10 active:scale-98 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${isDark ? 'border-[#30363d] bg-[#0d1117]' : 'border-[#d0d7de] bg-[#f6f8fa]'
                    }`}
                >
                  {isResettingCache ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Clear Cache & Re-Sync</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {activeSection === 'audit' && (
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
          <div className={`p-3 border-b font-bold text-xs ${borderLine} ${textTitle}`}>
            Activity Audit Trail
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-bold text-[10px] tracking-wider sticky top-0 ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
                }`}>
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderLine}`}>
                {auditLogs.slice(0, 50).map(a => (
                  <tr key={a.id} className={`transition-colors ${isDark ? 'hover:bg-[#21262d]/50' : 'hover:bg-[#f6f8fa]'
                    }`}>
                    <td className={`p-3 text-[10px] ${textMuted}`}>{new Date(a.created_at).toLocaleString()}</td>
                    <td className={`p-3 font-semibold ${textTitle}`}>{a.user_name || 'System'}</td>
                    <td className="p-3 font-bold text-[#2ea043]">{a.action}</td>
                    <td className={`p-3 ${textMuted}`}>{a.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-sm mb-3 pb-2 border-b ${borderLine} ${textTitle}`}>Add Staff Member</h3>
            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                  placeholder="e.g. Jane Muthoni"
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Email *</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                  placeholder="jane@pharmacy.com"
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Phone</label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>4-Digit PIN *</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full rounded-xl px-3 py-2 font-mono text-center text-base tracking-widest ${inputBg}`}
                  placeholder="1234"
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as UserRole)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                >
                  <option value="cashier">Cashier</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-4 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingStaff ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Staff</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-sm mb-3 pb-2 border-b ${borderLine} ${textTitle}`}>Add Supplier</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Phone *</label>
                <input
                  type="text"
                  required
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  className="px-4 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingSupplier ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Supplier</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-sm mb-3 pb-2 border-b ${borderLine} ${textTitle}`}>Edit Staff Profile</h3>
            <form onSubmit={handleSaveEditProfile} className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>PIN Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full rounded-xl px-3 py-2 font-mono text-center tracking-widest ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block mb-1 font-bold ${textMuted}`}>Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className={`w-full rounded-xl px-3 py-2 ${inputBg}`}
                >
                  <option value="cashier">Cashier</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditProfile}
                  className="px-4 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEditProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {successToast && (
        <div className="fixed bottom-16 right-4 z-50 bg-[#2ea043] text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-300/40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

    </div>
  );
};