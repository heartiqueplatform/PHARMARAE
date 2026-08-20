// components/views/SecurityView.tsx
import React, { useState } from 'react';
import {
    Shield, Lock, Key, User, Trash2,
    AlertCircle, CheckCircle2, Loader2,
    ArrowLeft, Mail, Phone, UserCheck,
    Eye, EyeOff, Save, X, Crown, UserMinus
} from 'lucide-react';
import { Profile } from '../../types';

interface SecurityViewProps {
    profile: Profile | null;
    currentRole: string;
    profiles: Profile[];
    theme?: 'dark' | 'light';
    onBack?: () => void;
    onChangePin: (data: { currentPin: string; newPin: string; confirmPin: string }) => Promise<void>;
    onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
    onDeleteAccount: (profileId: string) => Promise<{ success: boolean; isSelf: boolean }>;
    onSignOut?: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
    profile,
    currentRole,
    profiles,
    theme = 'dark',
    onBack,
    onChangePin,
    onChangePassword,
    onDeleteAccount,
    onSignOut,
}) => {
    const isDark = theme === 'dark';

    // Theme variables
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
    const cardBgAlt = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const inputBg = isDark ? 'bg-[#0d1117] text-[#f0f6fc]' : 'bg-[#f6f8fa] text-[#1f2328]';
    const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

    // State for PIN change
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinData, setPinData] = useState({
        currentPin: '',
        newPin: '',
        confirmPin: '',
    });
    const [isSavingPin, setIsSavingPin] = useState(false);

    // State for Password change
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // State for Delete Account
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<'self' | 'staff' | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // State for showing/hiding passwords
    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Check if user is owner
    const isOwner = currentRole === 'owner';

    // Staff list for owner (non-owner staff)
    const staffList = profiles.filter(p =>
        !p.is_owner && p.id !== profile?.id && p.pharmacy_name === profile?.pharmacy_name
    );

    // Handlers
    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingPin) return;

        if (!pinData.currentPin || pinData.currentPin.length !== 4) {
            alert('Current PIN must be 4 digits.');
            return;
        }
        if (!pinData.newPin || pinData.newPin.length !== 4) {
            alert('New PIN must be 4 digits.');
            return;
        }
        if (pinData.newPin !== pinData.confirmPin) {
            alert('New PIN and confirmation do not match.');
            return;
        }
        if (pinData.currentPin === pinData.newPin) {
            alert('New PIN must be different from current PIN.');
            return;
        }

        setIsSavingPin(true);
        try {
            await onChangePin(pinData);
            setShowPinModal(false);
            setPinData({ currentPin: '', newPin: '', confirmPin: '' });
            alert('PIN changed successfully!');
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to change PIN'));
        } finally {
            setIsSavingPin(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingPassword) return;

        if (!passwordData.currentPassword || passwordData.currentPassword.length < 6) {
            alert('Current password must be at least 6 characters.');
            return;
        }
        if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
            alert('New password must be at least 6 characters.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('New password and confirmation do not match.');
            return;
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            alert('New password must be different from current password.');
            return;
        }

        setIsSavingPassword(true);
        try {
            await onChangePassword(passwordData);
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            alert('Password changed successfully!');
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to change password'));
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (isDeleting) return;
        if (deleteConfirmText !== 'DELETE') {
            alert('Please type "DELETE" to confirm.');
            return;
        }

        setIsDeleting(true);
        try {
            const profileId = deleteTarget === 'self'
                ? profile!.id
                : selectedStaffId!;

            const result = await onDeleteAccount(profileId);

            if (result.isSelf) {
                // Self-delete - sign out
                localStorage.removeItem('medp_authenticated');
                localStorage.removeItem('medp_current_user_id');
                if (onSignOut) {
                    onSignOut();
                }
                window.location.reload();
            } else {
                // Staff deleted
                setShowDeleteModal(false);
                setDeleteConfirmText('');
                setSelectedStaffId(null);
                alert('Staff member removed successfully!');
            }
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to delete account'));
        } finally {
            setIsDeleting(false);
        }
    };

    const openDeleteModal = (target: 'self' | 'staff', staffId?: string) => {
        setDeleteTarget(target);
        if (staffId) setSelectedStaffId(staffId);
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    // Get staff name by ID
    const getStaffName = (id: string) => {
        const staff = profiles.find(p => p.id === id);
        return staff?.full_name || 'Unknown Staff';
    };

    return (
        <div className="space-y-4 px-0 md:px-4 pb-20 md:pb-6">

            {/* Back Button */}
            <button
                onClick={onBack}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${touchTargetSmall} ${isDark ? 'text-[#8b949e] hover:text-[#f0f6fc]' : 'text-[#656d76] hover:text-[#1f2328]'
                    }`}
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Settings</span>
            </button>

            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-sm ${cardBg}`}>
                <div>
                    <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <Shield className="w-5 h-5 text-[#2ea043]" />
                        <span>Security and Account Management</span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        Manage your PIN, password, and account settings securely.
                    </p>
                </div>
                <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'} ${textMuted}`}>
                    {isOwner ? (
                        <>
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Owner</span>
                        </>
                    ) : (
                        <>
                            <Shield className="w-3 h-3 text-blue-400" />
                            <span>Staff</span>
                        </>
                    )}
                </div>
            </div>

            {/* Account Info */}
            <div className={`rounded-2xl p-4 space-y-3 ${cardBg}`}>
                <h3 className={`font-bold text-sm ${textTitle}`}>
                    <User className="w-4 h-4 inline-block mr-2 text-[#58a6ff]" />
                    Account Details
                </h3>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className={textMuted}>Name:</span>
                            <span className={`ml-2 font-bold ${textTitle}`}>{profile?.full_name}</span>
                        </div>
                        <div>
                            <span className={textMuted}>Role:</span>
                            <span className={`ml-2 font-bold ${textTitle} capitalize`}>{profile?.role}</span>
                        </div>
                        <div>
                            <span className={textMuted}>Email:</span>
                            <span className={`ml-2 font-bold ${textTitle}`}>{profile?.email}</span>
                        </div>
                        <div>
                            <span className={textMuted}>Phone:</span>
                            <span className={`ml-2 font-bold ${textTitle}`}>{profile?.phone || 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-2">
                            <span className={textMuted}>Pharmacy:</span>
                            <span className={`ml-2 font-bold ${textTitle}`}>{profile?.pharmacy_name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className={`rounded-2xl p-4 ${cardBg}`}>
                <h3 className={`font-bold text-sm mb-3 ${textTitle}`}>
                    <Lock className="w-4 h-4 inline-block mr-2 text-[#2ea043]" />
                    Security Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Change PIN */}
                    <button
                        onClick={() => setShowPinModal(true)}
                        className={`p-4 rounded-xl text-left transition-colors ${isDark ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Key className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Change PIN</p>
                                <p className={`text-[11px] ${textMuted}`}>Update your 4-digit login PIN</p>
                                <p className={`text-[10px] mt-0.5 font-mono ${textMuted}`}>Current: ••••</p>
                            </div>
                        </div>
                    </button>

                    {/* Change Password */}
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className={`p-4 rounded-xl text-left transition-colors ${isDark ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'bg-[#f6f8fa] hover:bg-slate-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Change Password</p>
                                <p className={`text-[11px] ${textMuted}`}>Update your email password</p>
                                <p className={`text-[10px] mt-0.5 ${textMuted}`}>Minimum 6 characters</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Danger Zone - Delete Account */}
            <div className={`rounded-2xl p-4 border-2 border-rose-500/30 ${cardBg}`}>
                <h3 className={`font-bold text-sm mb-3 text-rose-500`}>
                    <AlertCircle className="w-4 h-4 inline-block mr-2" />
                    Danger Zone
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Delete Self */}
                    <button
                        onClick={() => openDeleteModal('self')}
                        className={`p-4 rounded-xl text-left transition-colors border border-rose-500/30 ${isDark ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'bg-rose-50 hover:bg-rose-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-rose-500">Delete My Account</p>
                                <p className={`text-[11px] ${textMuted}`}>Permanently delete your account</p>
                                <p className={`text-[10px] mt-0.5 text-rose-400`}>Warning: Cannot be undone</p>
                            </div>
                        </div>
                    </button>

                    {/* Delete Staff - Owner Only */}
                    {isOwner && staffList.length > 0 && (
                        <button
                            onClick={() => {
                                if (staffList.length === 1) {
                                    openDeleteModal('staff', staffList[0].id);
                                } else {
                                    // Show staff selection modal
                                    // For simplicity, we'll use the first one or add a select
                                    // You can add a staff selection dropdown here
                                }
                            }}
                            className={`p-4 rounded-xl text-left transition-colors border border-rose-500/30 ${isDark ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'bg-rose-50 hover:bg-rose-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                    <UserMinus className="w-6 h-6 text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-rose-500">Remove Staff</p>
                                    <p className={`text-[11px] ${textMuted}`}>Remove a staff member ({staffList.length})</p>
                                    <p className={`text-[10px] mt-0.5 text-rose-400`}>Owner only</p>
                                </div>
                            </div>
                        </button>
                    )}
                </div>

                {/* Staff list for deletion - Owner Only */}
                {isOwner && staffList.length > 1 && (
                    <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                        <p className={`text-xs font-bold mb-2 ${textMuted}`}>Select staff to remove:</p>
                        <div className="flex flex-wrap gap-2">
                            {staffList.map(staff => (
                                <button
                                    key={staff.id}
                                    onClick={() => openDeleteModal('staff', staff.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]' : 'bg-slate-200 hover:bg-slate-300 text-[#1f2328]'
                                        }`}
                                >
                                    {staff.full_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* =============================================
          CHANGE PIN MODAL
          ============================================ */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-md w-full p-4 shadow-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-base pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            <Key className="w-5 h-5 inline-block mr-2 text-blue-400" />
                            Change PIN
                        </h3>

                        <form onSubmit={handleChangePin} className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Current PIN *</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPin ? 'text' : 'password'}
                                        maxLength={4}
                                        required
                                        value={pinData.currentPin}
                                        onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value.replace(/\D/g, '') })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>New PIN *</label>
                                <div className="relative">
                                    <input
                                        type={showNewPin ? 'text' : 'password'}
                                        maxLength={4}
                                        required
                                        value={pinData.newPin}
                                        onChange={(e) => setPinData({ ...pinData, newPin: e.target.value.replace(/\D/g, '') })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPin(!showNewPin)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Confirm New PIN *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPin ? 'text' : 'password'}
                                        maxLength={4}
                                        required
                                        value={pinData.confirmPin}
                                        onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value.replace(/\D/g, '') })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPinModal(false);
                                        setPinData({ currentPin: '', newPin: '', confirmPin: '' });
                                    }}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPin}
                                    className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                                >
                                    {isSavingPin ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Changing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Change PIN</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =============================================
          CHANGE PASSWORD MODAL
          ============================================ */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-md w-full p-4 shadow-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-base pb-3 mb-3 ${borderLine} ${textTitle}`}>
                            <Lock className="w-5 h-5 inline-block mr-2 text-purple-400" />
                            Change Password
                        </h3>

                        <form onSubmit={handleChangePassword} className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Current Password *</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        required
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>New Password *</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="Minimum 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>Confirm New Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ea043]/50 ${inputBg}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword}
                                    className="px-6 py-3 bg-[#2ea043] hover:bg-[#3fb950] text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                                >
                                    {isSavingPassword ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Changing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Change Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =============================================
          DELETE ACCOUNT MODAL
          ============================================ */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                    <div className={`rounded-2xl max-w-md w-full p-4 shadow-2xl ${cardBg}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h3 className={`font-bold text-base text-rose-500`}>
                                    {deleteTarget === 'self' ? 'Delete My Account' : 'Remove Staff Member'}
                                </h3>
                                <p className={`text-xs ${textMuted}`}>
                                    {deleteTarget === 'self'
                                        ? 'This action is permanent and cannot be undone.'
                                        : `Remove ${selectedStaffId ? getStaffName(selectedStaffId) : 'staff member'} from the system.`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-rose-950/20 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}>
                            <p className={`text-xs ${textMuted}`}>
                                <span className="font-bold text-rose-500">Warning:</span>
                                {deleteTarget === 'self'
                                    ? ' All your data, including sales, stock movements, and audit logs will be permanently removed.'
                                    : ` All data associated with ${selectedStaffId ? getStaffName(selectedStaffId) : 'this staff member'} will be removed.`
                                }
                            </p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <label className={`block mb-1.5 font-bold ${textMuted}`}>
                                    Type <span className="text-rose-500 font-bold">DELETE</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                    className={`w-full rounded-xl px-4 py-3.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${inputBg}`}
                                    placeholder="Type DELETE here"
                                />
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 ${borderLine}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmText('');
                                        setSelectedStaffId(null);
                                    }}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm ${touchTargetSmall} ${isDark ? 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                                    className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 touchTargetSmall"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            <span>{deleteTarget === 'self' ? 'Delete Account' : 'Remove Staff'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};