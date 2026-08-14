import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { Building2, User, KeyRound, Phone, Mail, Eye, EyeOff, LogIn, UserPlus, CheckCircle2, Database, ShieldCheck, Sparkles, AlertCircle, Wifi, WifiOff, Users, Fingerprint, AlertTriangle, Info, RefreshCw, Copy, Check } from 'lucide-react';
import { db } from '../lib/db';
import {
  queueOfflineMutation,
  getSupabaseClient,
  saveSupabaseCredentials,
  getSupabaseCredentials,
} from '../lib/supabase';

interface AuthModalProps {
  onAuthSuccess: (profile: Profile) => void;
  theme?: 'dark' | 'light';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess, theme = 'light' }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Use the passed theme or detect system preference
  const isDark = theme === 'dark' || (theme === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Supabase Config state
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.key);

  // Form State
  const [pharmacyName, setPharmacyName] = useState('');
  const [normalizedPharmacyName, setNormalizedPharmacyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameIsAvailable, setNameIsAvailable] = useState<boolean | null>(null);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-focus PIN input on login
  useEffect(() => {
    if (mode === 'login') {
      const pinInput = document.getElementById('pin-login-input');
      if (pinInput) setTimeout(() => pinInput.focus(), 100);
    }
  }, [mode]);

  // Normalize pharmacy name whenever it changes
  useEffect(() => {
    const normalized = normalizePharmacyName(pharmacyName);
    setNormalizedPharmacyName(normalized);

    // Check availability when name changes
    if (normalized && normalized.length >= 3) {
      checkPharmacyNameAvailability(normalized);
    } else {
      setNameIsAvailable(null);
    }
  }, [pharmacyName]);

  // Generate a unique PIN on component mount and when needed
  useEffect(() => {
    if (mode === 'register') {
      generateUniquePin();
    }
  }, [mode]);

  const normalizePharmacyName = (name: string): string => {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  };

  const validatePharmacyName = (name: string): { isValid: boolean; error?: string } => {
    const normalized = normalizePharmacyName(name);

    if (!normalized || normalized.length === 0) {
      return { isValid: false, error: 'Pharmacy name is required' };
    }

    if (normalized.length < 3) {
      return { isValid: false, error: 'Pharmacy name must be at least 3 characters' };
    }

    if (normalized.length > 100) {
      return { isValid: false, error: 'Pharmacy name is too long (max 100 characters)' };
    }

    if (!/^[A-Z0-9\s\-'&.]+$/.test(normalized)) {
      return { isValid: false, error: 'Only letters, numbers, spaces, and basic punctuation allowed' };
    }

    return { isValid: true };
  };

  const checkPharmacyNameAvailability = async (name: string) => {
    if (!name || name.length < 3) {
      setNameIsAvailable(null);
      return;
    }

    setIsCheckingName(true);
    try {
      const localProfiles = await db.profiles
        .where('pharmacy_name')
        .equals(name)
        .toArray();

      if (localProfiles.length > 0) {
        setNameIsAvailable(false);
        setIsCheckingName(false);
        return;
      }

      if (isOnline) {
        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client
            .from('profiles')
            .select('pharmacy_name')
            .eq('pharmacy_name', name)
            .limit(1);

          if (!error && data && data.length > 0) {
            setNameIsAvailable(false);
            setIsCheckingName(false);
            return;
          }
        }
      }

      setNameIsAvailable(true);
    } catch (err) {
      console.warn('Error checking pharmacy name availability:', err);
      setNameIsAvailable(null);
    } finally {
      setIsCheckingName(false);
    }
  };

  const generateUniquePin = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 100;
    let newPin: string;
    let isUnique = false;

    while (!isUnique && attempts < maxAttempts) {
      // Generate a random 4-digit PIN (1000-9999, excluding 0000)
      newPin = String(Math.floor(1000 + Math.random() * 9000));

      // Check if PIN exists in local DB
      const localProfiles = await db.profiles
        .where('pin_code')
        .equals(newPin)
        .toArray();

      let existsLocally = localProfiles.length > 0;

      // Check cloud if online
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
        setPinCode(newPin);
        return newPin;
      }

      attempts++;
    }

    // Fallback: use timestamp-based PIN
    const fallbackPin = String(Date.now() % 10000).padStart(4, '0');
    setPinCode(fallbackPin);
    return fallbackPin;
  };

  const handleRegeneratePin = () => {
    generateUniquePin();
    setPinCopied(false);
  };

  const handleCopyPin = () => {
    if (pinCode) {
      navigator.clipboard.writeText(pinCode);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameValidation = validatePharmacyName(pharmacyName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid pharmacy name');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid Email Address.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (nameIsAvailable === false) {
      setError('This pharmacy name is already taken. Please choose a different name.');
      return;
    }

    if (nameIsAvailable === null) {
      setError('Please wait while we check name availability...');
      return;
    }

    setShowConfirmation(true);
    setConfirmationInput('');
    setConfirmationError('');
  };

  const confirmRegistration = async () => {
    const normalizedName = normalizePharmacyName(pharmacyName);

    if (confirmationInput.trim().toUpperCase() !== normalizedName) {
      setConfirmationError('Pharmacy name does not match. Please type it exactly as shown.');
      return;
    }

    setLoading(true);
    setConfirmationError('');
    setShowConfirmation(false);

    try {
      const client = getSupabaseClient();

      if (!client) {
        setError('Supabase is not configured. Please set up your credentials.');
        setLoading(false);
        return;
      }

      // Regenerate PIN one final time to ensure uniqueness
      const finalPin = await generateUniquePin();

      const { data: authData, error: authErr } = await client.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            pharmacy_name: normalizedName
          }
        }
      });

      if (authErr) {
        if (authErr.message.includes('User already registered')) {
          setError('This email is already registered. Please login instead.');
        } else {
          setError('Auth error: ' + authErr.message);
        }
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Failed to create user account.');
        setLoading(false);
        return;
      }

      const authUserId = authData.user.id;
      const profileId = generateUUID();

      const newProfile: Profile = {
        id: profileId,
        auth_user_id: authUserId,

        pharmacy_name: normalizedName,
        pharmacy_trading_name: normalizedName,
        pharmacy_phone: phone.trim() || '+254 700 000 000',
        pharmacy_email: email.trim(),
        pharmacy_address: 'Main Branch',
        pharmacy_county: 'Nairobi',
        pharmacy_town: 'Nairobi',
        pharmacy_receipt_header: `${normalizedName}\nTel: ${phone || '+254 700 000 000'}`,
        pharmacy_receipt_footer: 'Thank you for trusting us with your healthcare!',
        pharmacy_currency: 'KSh',
        pharmacy_settings: {
          allow_negative_stock: false,
          low_stock_threshold: 10,
          expiry_warning_days: 90
        },
        pharmacy_is_active: true,

        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || '+254 700 000 000',
        pin_code: finalPin, // Use the auto-generated PIN
        role: role,
        is_owner: role === 'owner',
        is_active: true,

        avatar_url: null,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await client
        .from('profiles')
        .insert(newProfile);

      if (insertError) {
        const { error: upsertError } = await client
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' });

        if (upsertError) {
          await db.profiles.put(newProfile);
          setSuccessMsg(`⚠️ Account created locally but cloud sync failed. Your PIN: ${finalPin}`);
        } else {
          await db.profiles.put(newProfile);
          setSuccessMsg(`✅ Account created and synced to cloud! Your PIN: ${finalPin}`);
        }
      } else {
        await db.profiles.put(newProfile);
        setSuccessMsg(`✅ Account created and synced to cloud! Your PIN: ${finalPin}`);
      }

      localStorage.setItem('medp_authenticated', 'true');
      localStorage.setItem('medp_current_user_id', newProfile.id);
      localStorage.setItem('medp_pharmacy_name', newProfile.pharmacy_name);
      localStorage.setItem('medp_user_role', newProfile.role);

      setTimeout(() => setSuccessMsg(''), 5000);
      onAuthSuccess(newProfile);

    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const testClient = getSupabaseClient();
      if (testClient) {
        const { error: testError } = await testClient.from('profiles').select('count').limit(1);
        if (testError) {
          throw new Error('Invalid credentials: ' + testError.message);
        }
      }

      saveSupabaseCredentials(supabaseUrl, supabaseKey);
      setSuccessMsg('✅ Supabase credentials saved successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowSupabaseConfig(false);
      }, 2000);
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Failed to save credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const client = getSupabaseClient();

      if (pinCode.trim()) {
        console.log('🔑 Fast PIN Login...');
        const allProfiles = await db.profiles.toArray();
        let matched = allProfiles.find(p => p.pin_code === pinCode.trim());

        if (!matched && client && isOnline) {
          const { data: remoteProfiles } = await client
            .from('profiles')
            .select('*')
            .eq('pin_code', pinCode.trim());

          if (remoteProfiles && remoteProfiles.length > 0) {
            for (const profile of remoteProfiles) {
              await db.profiles.put(profile);
            }
            matched = remoteProfiles[0];
          }
        }

        if (matched) {
          if (!matched.is_active) {
            setError('This account is deactivated. Please contact your administrator.');
            setLoading(false);
            return;
          }

          matched.last_login_at = new Date().toISOString();
          await db.profiles.put(matched);

          if (client && isOnline) {
            try {
              await client
                .from('profiles')
                .update({ last_login_at: matched.last_login_at })
                .eq('id', matched.id);
            } catch (updateError) {
              console.warn('Failed to update last login in cloud:', updateError);
            }
          }

          localStorage.setItem('medp_authenticated', 'true');
          localStorage.setItem('medp_current_user_id', matched.id);
          localStorage.setItem('medp_pharmacy_name', matched.pharmacy_name);
          localStorage.setItem('medp_user_role', matched.role);

          onAuthSuccess(matched);
          setLoading(false);
          return;
        }
      }

      if (email.trim() && password.trim() && client && isOnline) {
        console.log('📧 Email Login...');
        const { data: authData, error: authErr } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (!authErr && authData?.user) {
          const { data: remoteProfile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .single();

          if (!profileError && remoteProfile) {
            await db.profiles.put(remoteProfile);

            localStorage.setItem('medp_authenticated', 'true');
            localStorage.setItem('medp_current_user_id', remoteProfile.id);
            localStorage.setItem('medp_pharmacy_name', remoteProfile.pharmacy_name);
            localStorage.setItem('medp_user_role', remoteProfile.role);

            onAuthSuccess(remoteProfile);
            setLoading(false);
            return;
          }
        }
      }

      if (!pinCode.trim() && !email.trim()) {
        setError('Please enter your PIN or Email + Password.');
      } else if (pinCode.trim() && !email.trim()) {
        setError('No account found for this PIN. Please check with your administrator.');
      } else {
        setError('Invalid credentials. Please check your Email, Password, or PIN.');
      }

    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Get theme-specific styles
  const bgPrimary = isDark ? 'bg-slate-950' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900' : 'bg-white';
  const bgInput = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const borderLight = isDark ? 'border-slate-700/50' : 'border-slate-200/50';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto no-scrollbar ${isDark ? 'bg-slate-950/95' : 'bg-white/95'
      } backdrop-blur-sm`}>
      <div className={`${bgCard} ${borderColor} border rounded-2xl w-full max-w-md p-4 shadow-xl space-y-3 my-auto max-h-[96vh] overflow-y-auto no-scrollbar`}>

        {/* Brand & Header */}
        <div className="text-center space-y-1.5">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-emerald-500/20`}>
            P
          </div>
          <h2 className={`text-lg font-black tracking-tight ${textPrimary}`}>
            Pharmienta Kenya POS
          </h2>
          <p className={`text-[11px] ${textSecondary} flex items-center justify-center gap-1.5 flex-wrap`}>
            {showSupabaseConfig
              ? 'Configure your Supabase Cloud Database'
              : mode === 'register'
                ? 'Create your Pharmacy Account'
                : 'Sign in with PIN or Email'}
            {!showSupabaseConfig && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${isOnline
                ? isDark ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : isDark ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80' : 'bg-rose-100 text-rose-700 border border-rose-200'
                }`}>
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </p>
        </div>

        {/* Supabase Config Toggle */}
        <button
          type="button"
          onClick={() => setShowSupabaseConfig(!showSupabaseConfig)}
          className={`w-full py-2 px-3 ${isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80' : 'bg-slate-100 hover:bg-slate-200 border-slate-300'} border rounded-xl text-[11px] font-semibold ${textSecondary} flex items-center justify-between transition-colors`}
        >
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Supabase Cloud</span>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${creds.url && !creds.url.includes('your-supabase-project')
            ? isDark ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
            : isDark ? 'text-amber-400 bg-amber-950/80 border-amber-800/80' : 'text-amber-700 bg-amber-100 border-amber-200'
            }`}>
            {creds.url && !creds.url.includes('your-supabase-project') ? '✅' : '⚠️'}
          </span>
        </button>

        {showSupabaseConfig ? (
          <form onSubmit={handleSaveSupabase} className={`space-y-2.5 text-[11px] ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'} p-3 rounded-xl ${borderColor} border`}>
            <div>
              <label className={`block ${textSecondary} mb-1 font-medium`}>Supabase URL</label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500 font-mono`}
              />
            </div>

            <div>
              <label className={`block ${textSecondary} mb-1 font-medium`}>Anon Key</label>
              <textarea
                required
                rows={2}
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className={`w-full ${bgInput} ${borderColor} border rounded-xl p-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500 font-mono`}
              />
            </div>

            {error && (
              <div className={`p-2 ${isDark ? 'bg-rose-950/80 border-rose-800' : 'bg-rose-100 border-rose-200'} border rounded-xl text-${isDark ? 'rose-300' : 'rose-700'} text-center text-[11px] font-semibold flex items-center justify-center gap-1.5`}>
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className={`p-2 ${isDark ? 'bg-emerald-950/80 border-emerald-800' : 'bg-emerald-100 border-emerald-200'} border rounded-xl text-${isDark ? 'emerald-300' : 'emerald-700'} text-center text-[11px] font-semibold`}>
                {successMsg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-[11px]"
              >
                {loading ? 'Testing...' : 'Save & Test'}
              </button>
              <button
                type="button"
                onClick={() => setShowSupabaseConfig(false)}
                className={`px-4 py-2.5 ${bgInput} ${textSecondary} font-medium rounded-xl hover:bg-opacity-80 transition-colors text-[11px]`}
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Mode Selector Tabs */}
            <div className={`grid grid-cols-2 ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'} p-1 rounded-xl text-[11px] font-semibold`}>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'register'
                  ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'login'
                  ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>

            {error && (
              <div className={`p-2.5 ${isDark ? 'bg-rose-950/80 border-rose-800/80' : 'bg-rose-100 border-rose-200'} border rounded-xl text-${isDark ? 'rose-300' : 'rose-700'} text-[11px] font-medium flex items-start gap-1.5`}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className={`p-2.5 ${isDark ? 'bg-emerald-950/80 border-emerald-800/80' : 'bg-emerald-100 border-emerald-200'} border rounded-xl text-${isDark ? 'emerald-300' : 'emerald-700'} text-[11px] font-medium flex items-start gap-1.5`}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-2.5 text-[11px]">
                <div>
                  <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                    <Building2 className="w-3 h-3 inline mr-1" />
                    Pharmacy / Chemist Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. Apex Healthcare Pharmacy"
                    className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500 uppercase`}
                  />
                  {normalizedPharmacyName && normalizedPharmacyName !== pharmacyName && (
                    <p className={`text-[10px] mt-1 ${textMuted}`}>
                      Will be saved as: <span className="font-mono font-bold text-emerald-500">{normalizedPharmacyName}</span>
                    </p>
                  )}
                  {isCheckingName && (
                    <p className={`text-[10px] mt-1 ${textMuted} flex items-center gap-1`}>
                      <div className="w-2.5 h-2.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      Checking availability...
                    </p>
                  )}
                  {nameIsAvailable === true && normalizedPharmacyName && (
                    <p className="text-[10px] mt-1 text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Name is available ✓
                    </p>
                  )}
                  {nameIsAvailable === false && normalizedPharmacyName && (
                    <p className="text-[10px] mt-1 text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      This name is already taken. Please choose another.
                    </p>
                  )}
                  <div className={`mt-1.5 p-2 rounded-lg ${isDark ? 'bg-amber-950/30 border-amber-800/30' : 'bg-amber-50 border-amber-200'} border flex items-start gap-1.5`}>
                    <Info className={`w-3 h-3 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <p className={`text-[9px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      <strong>Important:</strong> Pharmacy name is permanent, unique ID. Will be auto-converted to <strong>UPPERCASE</strong>.
                    </p>
                  </div>
                </div>

                <div>
                  <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                    <User className="w-3 h-3 inline mr-1" />
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. John Kamau"
                    className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <Mail className="w-3 h-3 inline mr-0.5" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@chemist.com"
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    />
                  </div>

                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <KeyRound className="w-3 h-3 inline mr-0.5" />
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <Phone className="w-3 h-3 inline mr-0.5" />
                      Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+2547123..."
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    />
                  </div>

                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <Users className="w-3 h-3 inline mr-0.5" />
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-2 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Manager</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="cashier">Cashier</option>
                      <option value="storekeeper">Storekeeper</option>
                    </select>
                  </div>
                </div>

                {/* Auto-generated PIN Section */}
                <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'} border`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block ${textSecondary} font-medium text-[10px] flex items-center gap-1.5`}>
                      <Fingerprint className="w-3 h-3 text-emerald-500" />
                      Your Staff PIN (Auto-generated)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleRegeneratePin}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                        title="Generate new PIN"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                        title="Copy PIN"
                      >
                        {pinCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className={`font-mono text-2xl font-bold text-center py-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'} tracking-[0.3em]`}>
                    {pinCode || '----'}
                  </div>
                  <p className={`text-[9px] text-center ${textMuted} mt-1`}>
                    Use this 4-digit PIN for quick login • Save it securely
                  </p>
                  <div className={`mt-1.5 p-1.5 rounded-lg ${isDark ? 'bg-amber-950/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'} border`}>
                    <p className={`text-[8px] text-center ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      ⚠️ Auto-generated unique PIN • Cannot be changed manually
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || nameIsAvailable === false || isCheckingName || !pinCode}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Review & Confirm</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 text-[11px]">
                {/* PIN Login - Primary */}
                <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'} border`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Fingerprint className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <p className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      FAST PIN LOGIN
                    </p>
                  </div>
                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px] text-center`}>Enter 4-Digit PIN</label>

                    <div className="relative">
                      <input
                        id="pin-login-input"
                        type={showPin ? "text" : "password"}
                        maxLength={4}
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className={`w-full max-w-[160px] mx-auto block ${bgInput} ${borderColor} border rounded-xl px-3 py-3 ${textPrimary} text-base focus:outline-none focus:border-emerald-500 font-mono tracking-[0.3em] text-center pr-12`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                          }`}
                      >
                        {showPin ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className={`text-[9px] text-center mt-1.5 ${textMuted}`}>
                      Enter your 4-digit staff PIN to login instantly
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative flex py-0.5 items-center">
                  <div className={`flex-grow border-t ${borderColor}`}></div>
                  <span className={`flex-shrink mx-2 ${textMuted} text-[9px] font-medium`}>OR</span>
                  <div className={`flex-grow border-t ${borderColor}`}></div>
                </div>

                {/* Email Login */}
                <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'} border`}>
                  <p className={`text-[9px] ${textMuted} text-center mb-2`}>CLOUD LOGIN</p>
                  <div>
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@chemist.com"
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    />
                  </div>

                  <div className="mt-2">
                    <label className={`block ${textSecondary} mb-1 font-medium text-[10px]`}>
                      <KeyRound className="w-3 h-3 inline mr-1" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full ${bgInput} ${borderColor} border rounded-xl px-3 py-2.5 ${textPrimary} text-[11px] focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        <div className={`text-[10px] ${textMuted} text-center border-t ${borderColor} pt-2.5 flex items-center justify-center gap-1.5 flex-wrap`}>
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Supabase Auth • Offline First</span>
          <span className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></span>
          <span className="text-[9px]">v2.0</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`${bgCard} border ${borderColor} rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4`}>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className={`text-lg font-bold ${textPrimary}`}>
                ⚠️ Confirm Registration
              </h3>
              <p className={`text-[13px] ${textSecondary}`}>
                This action is <strong className="text-rose-500">PERMANENT</strong> and cannot be changed!
              </p>
            </div>

            {/* Info */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-rose-950/20 border-rose-800/30' : 'bg-rose-50 border-rose-200'} border space-y-2`}>
              <p className={`text-[12px] ${isDark ? 'text-rose-300' : 'text-rose-700'} font-medium`}>
                <strong>Pharmacy Name:</strong> {normalizedPharmacyName}
              </p>
              <p className={`text-[12px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'} font-medium`}>
                <strong>Your PIN:</strong> <span className="font-mono tracking-[0.2em]">{pinCode}</span>
              </p>
              <p className={`text-[11px] ${textMuted} mt-1`}>
                This PIN is auto-generated and unique. Save it securely for login.
              </p>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className={`block ${textSecondary} mb-1.5 text-[12px] font-medium`}>
                Type the pharmacy name to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  setConfirmationError('');
                }}
                placeholder={`Type "${normalizedPharmacyName}" exactly`}
                className={`w-full ${bgInput} ${borderColor} border rounded-xl px-4 py-3 ${textPrimary} text-[13px] focus:outline-none focus:border-emerald-500 font-mono uppercase`}
                autoFocus
              />
              {confirmationError && (
                <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {confirmationError}
                </p>
              )}
              <p className={`text-[10px] ${textMuted} mt-1.5`}>
                Must match <strong className="text-emerald-500">{normalizedPharmacyName}</strong> exactly
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationInput('');
                  setConfirmationError('');
                }}
                className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRegistration}
                disabled={loading || confirmationInput.trim().toUpperCase() !== normalizedPharmacyName}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 text-[13px] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confirm & Create</span>
                  </>
                )}
              </button>
            </div>

            <p className={`text-[10px] ${textMuted} text-center`}>
              <Info className="w-3 h-3 inline mr-1" />
              Pharmacy name is permanent ID • PIN is auto-generated
            </p>
          </div>
        </div>
      )}
    </div>
  );
};