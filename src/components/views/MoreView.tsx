import React, { useState } from 'react';
import { Profile, UserRole, Supplier, AuditLog } from '../../types';
import {
  Users, Truck, Eye, EyeOff, RefreshCw as RefreshIcon,
  Settings, RefreshCw, Shield, Save, Check, Loader2,
  Database, ShieldCheck, CheckCircle2, AlertCircle,
  Image, FileCheck, Info, Download, X, UserPlus,
  Truck as TruckIcon, UserCog, Cloud, CloudOff,
  Clock, AlertTriangle, Edit, Trash2, ChevronRight
} from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient, pullFromSupabaseToLocal } from '../../lib/supabase';
import { db } from '../../lib/db';
import { AvatarUpload } from '@/components/AvatarUpload';
import { generateAuditReportPdf } from '../../utils/auditPdfGenerator';

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) {
    return err;
  }
  return fallback;
};

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
  onNavigateToTab?: (tab: 'about' | 'privacy' | 'terms') => void;
  onNavigateToSecurity?: () => void;
  onNavigateToHardReset?: () => void;
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
  theme = 'dark',
  onNavigateToTab,
  onNavigateToSecurity,
  onNavigateToHardReset,
}) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
  const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
  const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';

  const touchTarget = 'min-h-[44px] min-w-[44px]';
  const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

  const [activeSection, setActiveSection] = useState<'staff' | 'suppliers' | 'settings' | 'sync' | 'audit'>('settings');

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isSavingEditProfile, setIsSavingEditProfile] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [successToast, setSuccessToast] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [nameError, setNameError] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isPullingData, setIsPullingData] = useState(false);
  const [showStaffPin, setShowStaffPin] = useState(false);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastType(type);
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const [pharmName, setPharmName] = useState(profile?.pharmacy_name || '');
  const [pharmTradingName, setPharmTradingName] = useState(profile?.pharmacy_trading_name || '');
  const [pharmPhone, setPharmPhone] = useState(profile?.pharmacy_phone || '');
  const [pharmAddress, setPharmAddress] = useState(profile?.pharmacy_address || '');
  const [pharmCounty, setPharmCounty] = useState(profile?.pharmacy_county || 'Nairobi');
  const [pharmTown, setPharmTown] = useState(profile?.pharmacy_town || 'Nairobi');
  const [pharmHeader, setPharmHeader] = useState(profile?.pharmacy_receipt_header || '');
  const [pharmFooter, setPharmFooter] = useState(profile?.pharmacy_receipt_footer || '');
  const [pharmCurrency, setPharmCurrency] = useState(profile?.pharmacy_currency || 'KSh');

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarPublicId, setAvatarPublicId] = useState(profile?.avatar_public_id || '');

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

  const generateUniqueStaffPin = async (): Promise<string> => {
    setIsGeneratingPin(true);
    let attempts = 0;
    const maxAttempts = 100;
    let newPin: string;
    let isUnique = false;

    while (!isUnique && attempts < maxAttempts) {
      newPin = String(Math.floor(1000 + Math.random() * 9000));

      const localProfiles = await db.profiles
        .where('pin_code')
        .equals(newPin)
        .toArray();

      let existsLocally = localProfiles.length > 0;

      let existsInCloud = false;
      if (!existsLocally && isOnline) {
        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client
            .from('profiles')
            .select('pin_code')
            .eq('pin_code', newPin)
            .limit(1);

          if (!error && data && data.length > 0) {
            existsInCloud = true;
          }
        }
      }

      if (!existsLocally && !existsInCloud) {
        isUnique = true;
        setStaffPin(newPin);
        setIsGeneratingPin(false);
        return newPin;
      }

      attempts++;
    }

    const fallbackPin = String(Date.now() % 10000).padStart(4, '0');
    setStaffPin(fallbackPin);
    setIsGeneratingPin(false);
    return fallbackPin;
  };

  const handleOpenStaffModal = () => {
    setShowAddStaffModal(true);
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffRole('cashier');
    setShowStaffPin(false);
    generateUniqueStaffPin();
  };

  const handleRegenerateStaffPin = () => {
    generateUniqueStaffPin();
  };

  const handlePharmacyNameChange = async (newName: string) => {
    setNameError('');
    if (!newName.trim()) {
      setNameError('Pharmacy name is required');
      return;
    }

    const exists = await checkPharmacyNameExists(newName.trim());
    if (exists) {
      const suggestedName = await generateUniqueName(newName.trim());
      setNameError(`"${newName.trim()}" is already taken. Suggested: "${suggestedName}"`);
      triggerToast(`Name already exists. Suggested name: ${suggestedName}`, 'info');
    }
  };

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('cashier');

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
      triggerToast('Staff profile updated successfully');
    } catch (err) {
      triggerToast(getErrorMessage(err, 'Staff profile could not be updated'), 'error');
    } finally {
      setIsSavingEditProfile(false);
    }
  };

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings || !profile) return;

    if (!canManage) {
      triggerToast('Only the pharmacy owner can change settings', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      const nameChanged = pharmName !== profile.pharmacy_name;

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
        avatar_url: avatarUrl,
        avatar_public_id: avatarPublicId,
      };

      if (nameChanged) {
        const exists = await checkPharmacyNameExists(pharmName.trim());
        if (exists) {
          const suggestedName = await generateUniqueName(pharmName.trim());
          setNameError(`"${pharmName.trim()}" is already taken. Suggested: "${suggestedName}"`);
          setIsSavingSettings(false);
          return;
        }

        if (onUpdatePharmacyName) {
          await onUpdatePharmacyName(pharmName.trim());
          await onUpdateProfile(profile.id, updates);
        } else {
          await onUpdateProfile(profile.id, updates);
        }
      } else {
        await onUpdateProfile(profile.id, updates);
      }

      triggerToast('Pharmacy settings updated successfully');
    } catch (err) {
      triggerToast(getErrorMessage(err, 'Pharmacy settings could not be saved'), 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };


  // Then, in the MoreView component, add the download handler:
  const handleDownloadAuditReport = () => {
    if (!profile) {
      triggerToast('Pharmacy profile was not found', 'error');
      return;
    }

    // Create pharmacy object from profile
    const pharmacy = {
      name: profile.pharmacy_name || 'Pharmacy',
      address: profile.pharmacy_address || '',
      phone: profile.pharmacy_phone || '',
      currency: profile.pharmacy_currency || 'KSh'
    };

    // Call the PDF generator
    try {
      generateAuditReportPdf(
        pharmacy,
        auditLogs,
        profile,
        { from: '2024-01-01', to: new Date().toISOString().split('T')[0] }
      );
      triggerToast('Audit report is being prepared');
    } catch (err) {
      triggerToast(getErrorMessage(err, 'Audit report could not be generated'), 'error');
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPin || isSavingStaff) return;

    if (staffPin.length !== 4) {
      triggerToast('PIN must be exactly 4 digits', 'error');
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
      triggerToast(`Staff member "${staffName}" added successfully`);
    } catch (err) {
      triggerToast(getErrorMessage(err, 'Staff member could not be added'), 'error');
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
      triggerToast(`Supplier "${suppName}" registered successfully`);
    } catch (err) {
      triggerToast(getErrorMessage(err, 'Supplier could not be registered'), 'error');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleTriggerSyncQueue = async () => {
    if (isTriggeringSync) return;

    if (!isOnline) {
      setSyncStatus('Offline. New changes will sync automatically when the connection returns.');
      triggerToast('Sync is paused while offline', 'info');
      return;
    }

    if (!isSupabaseConfigured()) {
      setSyncStatus('Cloud sync is not configured for this installation.');
      triggerToast('Cloud sync is not configured', 'error');
      return;
    }

    setIsTriggeringSync(true);
    setSyncStatus('Starting secure cloud sync...');

    try {
      const pendingBefore = await db.sync_queue.where('status').equals('pending').count();
      setSyncStatus(pendingBefore > 0
        ? `Syncing ${pendingBefore} pending record(s)...`
        : 'Checking for cloud updates...');

      await Promise.resolve(onTriggerSync());

      const pendingAfter = await db.sync_queue.where('status').equals('pending').count();

      if (pendingAfter > 0) {
        setSyncStatus(`${pendingAfter} record(s) are still waiting to sync. The app will retry automatically.`);
        triggerToast(`${pendingAfter} record(s) still pending`, 'info');
      } else {
        setSyncStatus('Cloud sync completed successfully.');
        triggerToast('Cloud sync completed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      const message = getErrorMessage(err, 'Cloud sync could not complete');
      setSyncStatus(message);
      triggerToast(message, 'error');
    } finally {
      setTimeout(() => {
        setIsTriggeringSync(false);
        setSyncStatus('');
      }, 3000);
    }
  };

  const handlePullData = async () => {
    if (!profile || isPullingData) return;

    if (!isOnline) {
      setSyncStatus('Offline. Connect to the internet before pulling cloud data.');
      triggerToast('Cloud pull is unavailable offline', 'info');
      return;
    }

    if (!isSupabaseConfigured()) {
      setSyncStatus('Cloud sync is not configured for this installation.');
      triggerToast('Cloud sync is not configured', 'error');
      return;
    }

    setIsPullingData(true);
    setSyncStatus('Refreshing local records from cloud...');

    try {
      const pulled = await pullFromSupabaseToLocal(profile.pharmacy_name);

      if (pulled) {
        triggerToast('Local data refreshed from cloud');
        setSyncStatus('Local data refreshed from cloud.');
        await Promise.resolve(onTriggerSync());
      } else {
        triggerToast('No cloud changes were applied', 'info');
        setSyncStatus('No cloud changes were applied.');
      }
    } catch (err) {
      console.error('Pull error:', err);
      const message = getErrorMessage(err, 'Cloud refresh could not complete');
      triggerToast(message, 'error');
      setSyncStatus(message);
    } finally {
      setIsPullingData(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const canManage = currentRole === 'owner';
  const canView = currentRole === 'owner' || currentRole === 'admin';

  return (
    <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveSection('settings')}
          className={`p-4 rounded-2xl text-left flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${touchTarget} ${activeSection === 'settings'
            ? 'bg-[#2ea043]/20 text-[#2ea043] font-bold shadow-sm'
            : `${cardBg}`
            }`}
        >
          <Settings className={`w-6 h-6 mb-1 ${canManage ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-sm font-bold ${canManage ? '' : 'text-slate-500'}`}>
            Settings {!canManage && 'Locked'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('staff')}
          className={`p-4 rounded-2xl text-left flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${touchTarget} ${activeSection === 'staff'
            ? 'bg-[#2ea043]/20 text-[#2ea043] font-bold shadow-sm'
            : `${cardBg}`
            }`}
        >
          <Users className={`w-6 h-6 mb-1 ${canView ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-sm font-bold ${canView ? '' : 'text-slate-500'}`}>
            Staff {!canView && 'Locked'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('suppliers')}
          className={`p-4 rounded-2xl text-left flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${touchTarget} ${activeSection === 'suppliers'
            ? 'bg-[#2ea043]/20 text-[#2ea043] font-bold shadow-sm'
            : `${cardBg}`
            }`}
        >
          <Truck className={`w-6 h-6 mb-1 ${canView ? 'text-[#2ea043]' : 'text-slate-500'}`} />
          <span className={`text-sm font-bold ${canView ? '' : 'text-slate-500'}`}>
            Suppliers {!canView && 'Locked'}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('sync')}
          className={`p-4 rounded-2xl text-left flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${touchTarget} ${activeSection === 'sync'
            ? 'bg-[#2ea043]/20 text-[#2ea043] font-bold shadow-sm'
            : `${cardBg}`
            }`}
        >
          <RefreshCw className="w-6 h-6 mb-1 text-[#2ea043]" />
          <span className="text-sm font-bold">Sync</span>
        </button>

        <button
          onClick={() => setActiveSection('audit')}
          className={`p-4 rounded-2xl text-left flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${touchTarget} ${activeSection === 'audit'
            ? 'bg-[#2ea043]/20 text-[#2ea043] font-bold shadow-sm'
            : `${cardBg}`
            }`}
        >
          <Shield className="w-6 h-6 mb-1 text-[#2ea043]" />
          <span className="text-sm font-bold">Audit</span>
        </button>
      </div>

      {/* Settings Panel */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveSettings} className={`rounded-2xl p-4 space-y-4 text-sm ${cardBg}`}>
          <h3 className={`font-bold text-base pb-3 ${borderLine} ${textTitle}`}>
            Pharmacy Profile Settings
            {!canManage && (
              <span className="ml-2 text-xs text-amber-500 font-normal">
                Owner Only
              </span>
            )}
          </h3>

          {!canManage && (
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Only the pharmacy owner can edit these settings.</span>
            </div>
          )}

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center py-4 border-b border-slate-800">
            <AvatarUpload
              currentImage={avatarUrl}
              onUploadSuccess={async (url, publicId) => {
                setAvatarUrl(url);
                setAvatarPublicId(publicId);
                triggerToast('Avatar uploaded successfully');

                if (profile && onUpdateProfile) {
                  try {
                    await onUpdateProfile(profile.id, {
                      avatar_url: url,
                      avatar_public_id: publicId,
                    });
                    triggerToast('Avatar saved to database');
                  } catch (err) {
                    console.error('Failed to save avatar:', err);
                    triggerToast('Avatar uploaded but failed to save to database');
                  }
                }
              }}
              onRemove={async () => {
                setAvatarUrl('');
                setAvatarPublicId('');
                triggerToast('Avatar removed');

                if (profile && onUpdateProfile) {
                  try {
                    await onUpdateProfile(profile.id, {
                      avatar_url: null,
                      avatar_public_id: null,
                    });
                    triggerToast('Avatar removal saved to database');
                  } catch (err) {
                    console.error('Failed to remove avatar:', err);
                  }
                }
              }}
              size="large"
              theme={theme}
            />
            <p className={`text-[11px] mt-2 ${textMuted}`}>
              Upload a pharmacy logo or avatar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>Pharmacy Name *</label>
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
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none font-semibold ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {nameError && (
                <div className="mt-1 text-[11px] text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{nameError}</span>
                </div>
              )}
            </div>
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>Trading Name</label>
              <input
                type="text"
                value={pharmTradingName}
                onChange={(e) => setPharmTradingName(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>Phone Number</label>
              <input
                type="text"
                value={pharmPhone}
                onChange={(e) => setPharmPhone(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>Currency</label>
              <select
                value={pharmCurrency}
                onChange={(e) => setPharmCurrency(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="KSh">KSh - Kenya Shilling</option>
                <option value="UGX">UGX - Uganda Shilling</option>
                <option value="TZS">TZS - Tanzania Shilling</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>County</label>
              <input
                type="text"
                value={pharmCounty}
                onChange={(e) => setPharmCounty(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <label className={`block mb-1.5 font-bold ${textMuted}`}>Town</label>
              <input
                type="text"
                value={pharmTown}
                onChange={(e) => setPharmTown(e.target.value)}
                disabled={!canManage}
                className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className={`block mb-1.5 font-bold ${textMuted}`}>Address</label>
            <input
              type="text"
              value={pharmAddress}
              onChange={(e) => setPharmAddress(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className={`block mb-1.5 font-bold ${textMuted}`}>Receipt Header</label>
            <textarea
              rows={2}
              value={pharmHeader}
              onChange={(e) => setPharmHeader(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl p-3 text-sm focus:outline-none font-mono text-[11px] ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className={`block mb-1.5 font-bold ${textMuted}`}>Receipt Footer</label>
            <textarea
              rows={2}
              value={pharmFooter}
              onChange={(e) => setPharmFooter(e.target.value)}
              disabled={!canManage}
              className={`w-full rounded-xl p-3 text-sm focus:outline-none font-mono text-[11px] ${inputBg} ${touchTarget} ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSettings || !canManage}
              className={`px-6 py-3.5 bg-[#2ea043] hover:bg-[#3fb950] active:scale-98 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 ${touchTarget} ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Pharmacy Settings</span>
                </>
              )}
            </button>
          </div>

          <div className={`pt-4 border-t ${borderLine}`}>
            <button
              onClick={() => {
                if (onNavigateToSecurity) {
                  onNavigateToSecurity();
                }
              }}
              className={`w-full p-4 rounded-xl text-left transition-colors ${isDark ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">Security and Account</p>
                  <p className={`text-[11px] ${textMuted}`}>Manage PIN, password, and account settings</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto opacity-40 text-[#2ea043]" />
              </div>
            </button>
          </div>
          {/* Dedicated reset page */}
          <div className={`pt-4 border-t ${borderLine}`}>
            <button
              onClick={() => {
                if (onNavigateToHardReset) {
                  onNavigateToHardReset();
                }
              }}
              className={`w-full p-4 rounded-xl text-left transition-colors ${isDark ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-red-400">Factory Reset</p>
                  <p className={`text-[11px] ${textMuted}`}>Open the dedicated reset page</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto opacity-40 text-red-400" />
              </div>
            </button>
          </div>
        </form>
      )}

      {/* Staff Management */}
      {activeSection === 'staff' && (
        <div className={`rounded-2xl p-4 space-y-4 ${cardBg}`}>
          <div className={`flex items-center justify-between pb-3 ${borderLine}`}>
            <h3 className={`font-bold text-base ${textTitle}`}>
              Staff Members ({profiles.filter(p => !p.is_owner && p.pharmacy_name === profile?.pharmacy_name).length})
            </h3>
            {canManage && (
              <button
                onClick={handleOpenStaffModal}
                className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 ${touchTargetSmall}`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {profiles
              .filter(p => !p.is_owner && p.pharmacy_name === profile?.pharmacy_name)
              .map(p => (
                <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between text-sm ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'
                  }`}>
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.full_name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#58a6ff]/20 text-[#58a6ff] font-extrabold flex items-center justify-center text-sm">
                        {p.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className={`font-bold ${textTitle}`}>{p.full_name}</div>
                      <div className={`text-[11px] ${textMuted}`}>
                        {p.email} • Phone: {p.phone || 'N/A'}
                        {currentRole === 'owner' ? (
                          <> • PIN: <span className="font-mono font-bold text-emerald-400">{p.pin_code || 'None'}</span></>
                        ) : (
                          <> • PIN: <span className="font-mono">****</span></>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`ml-1.5 px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400`}>
                          {p.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleStartEditProfile(p)}
                      className={`px-3 py-2 text-sm font-bold rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors ${touchTargetSmall}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

            {profiles.filter(p => !p.is_owner && p.pharmacy_name === profile?.pharmacy_name).length === 0 && (
              <div className={`p-6 text-center ${textMuted}`}>
                <Users className="w-12 h-12 mx-auto opacity-20 mb-2" />
                <p className="font-medium">No staff members found</p>
                <p className="text-xs mt-1">Add your first staff member to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suppliers Management */}
      {activeSection === 'suppliers' && (
        <div className={`rounded-2xl p-4 space-y-4 ${cardBg}`}>
          <div className={`flex items-center justify-between pb-3 ${borderLine}`}>
            <h3 className={`font-bold text-base ${textTitle}`}>Suppliers</h3>
            {canManage && (
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 ${touchTargetSmall}`}
              >
                <TruckIcon className="w-4 h-4" />
                <span>Add Supplier</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {suppliers.map(s => (
              <div key={s.id} className={`p-4 rounded-xl flex items-center justify-between text-sm ${isDark ? 'bg-[#0d1117]/60' : 'bg-[#f6f8fa]'
                }`}>
                <div>
                  <div className={`font-bold ${textTitle}`}>{s.name}</div>
                  <div className={`text-[11px] ${textMuted}`}>Tel: {s.phone}</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-[#2ea043]/20 text-[#2ea043]">
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
          <div className={`rounded-2xl p-4 space-y-4 ${cardBg}`}>
            <h3 className={`font-bold text-base pb-3 ${borderLine} ${textTitle} flex items-center justify-between`}>
              <span className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#2ea043]" />
                Cloud Sync
              </span>
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#2ea043]/20 text-[#2ea043] flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#2ea043] animate-ping' : 'bg-amber-500'}`} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </span>
            </h3>

            <div className={`p-4 rounded-xl text-sm space-y-3 ${isDark ? 'bg-[#0d1117]/80' : 'bg-[#f6f8fa]'
              }`}>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Status:</span>
                <span className="font-bold text-[#2ea043] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Auto-Sync Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Pending Sync Items:</span>
                <span className={`font-bold ${syncPendingCount > 0 ? 'text-amber-400' : 'text-[#2ea043]'}`}>
                  {syncPendingCount} item(s)
                </span>
              </div>
              {syncStatus && (
                <div className={`mt-2 p-2 rounded-lg text-xs font-mono ${isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#f6f8fa] text-[#1f2328]'}`}>
                  {syncStatus}
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-2xl p-4 space-y-4 ${cardBg}`}>
            <h3 className={`font-bold text-base pb-3 ${borderLine} ${textTitle}`}>
              Manual Sync
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={handleTriggerSyncQueue}
                disabled={isTriggeringSync || !isOnline}
                className={`flex-1 py-3.5 bg-[#2ea043] hover:bg-[#3fb950] active:scale-98 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 ${touchTarget}`}
              >
                {isTriggeringSync ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Sync Now ({syncPendingCount})</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePullData}
                disabled={isPullingData || !isOnline}
                className={`flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 ${touchTarget}`}
              >
                {isPullingData ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Pulling...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Refresh From Cloud</span>
                  </>
                )}
              </button>
            </div>

            {!isOnline && (
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>You are offline. Changes will be queued and synced when you reconnect.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'audit' && (
        <div className={`rounded-2xl overflow-hidden shadow-sm ${cardBg}`}>
          <div className={`p-4 flex items-center justify-between ${borderLine}`}>
            <div className={`font-bold text-base ${textTitle}`}>
              Activity Audit Trail
            </div>
            <button
              onClick={handleDownloadAuditReport}
              className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${touchTargetSmall}`}
              title="Download Audit Report PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className={`uppercase font-bold text-[11px] tracking-wider sticky top-0 ${isDark ? 'bg-[#21262d]/80 text-[#8b949e]' : 'bg-[#f6f8fa] text-[#656d76]'
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
                    <td className={`p-3 text-[11px] ${textMuted}`}>{new Date(a.created_at).toLocaleString()}</td>
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
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-base mb-4 pb-3 ${borderLine} ${textTitle}`}>Add Staff Member</h3>
            <form onSubmit={handleSaveStaff} className="space-y-4 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                  placeholder="e.g. Jane Muthoni"
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Email *</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                  placeholder="jane@pharmacy.com"
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Phone</label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`font-bold ${textMuted}`}>4-Digit PIN *</label>
                  <button
                    type="button"
                    onClick={handleRegenerateStaffPin}
                    disabled={isGeneratingPin}
                    className={`text-[11px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-slate-200 text-emerald-600'
                      } disabled:opacity-50`}
                  >
                    <RefreshIcon className="w-3.5 h-3.5" />
                    {isGeneratingPin ? 'Generating...' : 'Generate New'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showStaffPin ? "text" : "password"}
                    maxLength={4}
                    required
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                    className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center text-base tracking-widest ${inputBg} ${touchTarget} pr-12`}
                    placeholder="Auto-generated"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPin(!showStaffPin)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                      }`}
                  >
                    {showStaffPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className={`text-[10px] ${textMuted} text-center`}>
                    Auto-generated unique PIN. Click "Generate New" for a different PIN
                  </p>
                </div>
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as UserRole)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                >
                  <option value="cashier">Cashier</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className={`px-5 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall}`}
                >
                  {isSavingStaff ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-base mb-4 pb-3 ${borderLine} ${textTitle}`}>Add Supplier</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-4 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Phone *</label>
                <input
                  type="text"
                  required
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  className={`px-5 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall}`}
                >
                  {isSavingSupplier ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className={`rounded-2xl max-w-sm w-full p-4 shadow-2xl ${cardBg}`}>
            <h3 className={`font-bold text-base mb-4 pb-3 ${borderLine} ${textTitle}`}>Edit Staff Profile</h3>
            <form onSubmit={handleSaveEditProfile} className="space-y-4 text-sm">
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>PIN Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest ${inputBg} ${touchTarget}`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 font-bold ${textMuted}`}>Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className={`w-full rounded-xl px-4 py-3.5 text-sm ${inputBg} ${touchTarget}`}
                >
                  <option value="cashier">Cashier</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9]' : 'bg-slate-200 text-slate-800'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditProfile}
                  className={`px-5 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 ${touchTargetSmall}`}
                >
                  {isSavingEditProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
      {/* Floating Toast - Top Right */}
      {successToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-[#2ea043] text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 max-w-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{successToast}</span>
          <button
            onClick={() => setSuccessToast('')}
            className="flex-shrink-0 ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Legal and Resources Section */}
      {activeSection === 'settings' && (
        <div className={`rounded-2xl p-4 space-y-4 ${cardBg}`}>
          <h3 className={`font-bold text-base ${textTitle} flex items-center gap-2`}>
            <span className="text-[#2ea043]">Legal and Resources</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('about');
                }
              }}
              className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95 group ${isDark
                ? 'bg-[#0d1117] hover:bg-[#21262d]'
                : 'bg-[#f6f8fa] hover:bg-[#f3f4f6]'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">About</p>
                  <p className={`text-[11px] ${textMuted} truncate`}>App version 1.0.0</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#2ea043]" />
              </div>
            </button>

            <button
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('privacy');
                }
              }}
              className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95 group ${isDark
                ? 'bg-[#0d1117] hover:bg-[#21262d]'
                : 'bg-[#f6f8fa] hover:bg-[#f3f4f6]'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">Privacy Policy</p>
                  <p className={`text-[11px] ${textMuted} truncate`}>Data protection</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#2ea043]" />
              </div>
            </button>

            <button
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('terms');
                }
              }}
              className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95 group ${isDark
                ? 'bg-[#0d1117] hover:bg-[#21262d]'
                : 'bg-[#f6f8fa] hover:bg-[#f3f4f6]'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">Terms and Conditions</p>
                  <p className={`text-[11px] ${textMuted} truncate`}>Usage agreement</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#2ea043]" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
