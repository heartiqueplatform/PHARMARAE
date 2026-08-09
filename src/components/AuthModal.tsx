import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { Building2, User, KeyRound, Phone, Mail, LogIn, UserPlus, CheckCircle2, Database, ShieldCheck, Sparkles, AlertCircle, Wifi, WifiOff, Users } from 'lucide-react';
import { db } from '../lib/db';
import {
  queueOfflineMutation,
  getSupabaseClient,
  saveSupabaseCredentials,
  getSupabaseCredentials,
} from '../lib/supabase';

interface AuthModalProps {
  onAuthSuccess: (profile: Profile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Supabase Config state
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.key);

  // Form State
  const [pharmacyName, setPharmacyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // For staff login - show pharmacy name input
  const [loginPharmacyName, setLoginPharmacyName] = useState('');

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!pharmacyName.trim()) {
      setError('Please enter your Pharmacy / Chemist Name.');
      setLoading(false);
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your Full Name.');
      setLoading(false);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid Email Address.');
      setLoading(false);
      return;
    }
    if (!pinCode.trim() || pinCode.length < 4) {
      setError('Please enter a 4-digit PIN Code.');
      setLoading(false);
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const client = getSupabaseClient();

      if (!client) {
        setError('Supabase is not configured. Please set up your credentials.');
        setLoading(false);
        return;
      }

      console.log('🚀 Starting registration...');
      console.log('📧 Email:', email);
      console.log('🏪 Pharmacy:', pharmacyName);

      // STEP 1: CREATE SUPABASE AUTH USER
      console.log('📧 Creating Supabase Auth user...');
      const { data: authData, error: authErr } = await client.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            pharmacy_name: pharmacyName.trim()
          }
        }
      });

      if (authErr) {
        console.error('❌ Auth error:', authErr);
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
      console.log('✅ Auth user created:', authUserId);

      // STEP 2: CREATE PROFILE
      const profileId = generateUUID();
      console.log('📦 Creating profile...');

      const newProfile: Profile = {
        id: profileId,
        auth_user_id: authUserId,

        // Pharmacy Info
        pharmacy_name: pharmacyName.trim(),
        pharmacy_trading_name: pharmacyName.trim(),
        pharmacy_phone: phone.trim() || '+254 700 000 000',
        pharmacy_email: email.trim(),
        pharmacy_address: 'Main Branch',
        pharmacy_county: 'Nairobi',
        pharmacy_town: 'Nairobi',
        pharmacy_receipt_header: `${pharmacyName.toUpperCase()}\nTel: ${phone || '+254 700 000 000'}`,
        pharmacy_receipt_footer: 'Thank you for trusting us with your healthcare!',
        pharmacy_currency: 'KSh',
        pharmacy_settings: {
          allow_negative_stock: false,
          low_stock_threshold: 10,
          expiry_warning_days: 90
        },
        pharmacy_is_active: true,

        // User Info
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || '+254 700 000 000',
        pin_code: pinCode.trim(),
        role: role,
        is_owner: role === 'owner',
        is_active: true,

        // Metadata
        avatar_url: null,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // STEP 3: SAVE TO SUPABASE
      console.log('☁️ Saving profile to Supabase...');
      const { error: insertError } = await client
        .from('profiles')
        .insert(newProfile);

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        const { error: upsertError } = await client
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' });

        if (upsertError) {
          console.error('❌ Upsert error:', upsertError);
          await db.profiles.put(newProfile);
          setSuccessMsg('⚠️ Account created locally but cloud sync failed.');
        } else {
          console.log('✅ Profile upserted!');
          await db.profiles.put(newProfile);
          setSuccessMsg('✅ Account created and synced to cloud!');
        }
      } else {
        console.log('✅ Profile inserted!');
        await db.profiles.put(newProfile);
        setSuccessMsg('✅ Account created and synced to cloud!');
      }

      // STEP 4: SET AUTH STATE
      localStorage.setItem('medp_authenticated', 'true');
      localStorage.setItem('medp_current_user_id', newProfile.id);
      localStorage.setItem('medp_pharmacy_name', newProfile.pharmacy_name);
      localStorage.setItem('medp_user_role', newProfile.role);

      console.log('🎉 Registration complete!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onAuthSuccess(newProfile);

    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setError(err.message || 'Failed to complete registration.');
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

      // OPTION 1: Email + Password Login (For users with Supabase Auth)
      if (client && isOnline && email.trim() && password.trim()) {
        console.log('📧 Logging in with email...');
        const { data: authData, error: authErr } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (!authErr && authData?.user) {
          console.log('✅ Auth user found:', authData.user.id);

          // Get profile from Supabase
          const { data: remoteProfile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .single();

          if (!profileError && remoteProfile) {
            console.log('✅ Profile found!');
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

      // OPTION 2: PIN Login (For all users - Fast Terminal Login)
      if (!pinCode.trim()) {
        setError('Please enter your 4-digit PIN code.');
        setLoading(false);
        return;
      }

      console.log('🔑 Trying PIN login...');

      // Get all profiles from local DB
      const allProfiles = await db.profiles.toArray();
      console.log(`📋 Found ${allProfiles.length} profiles locally`);

      // Find profile by PIN
      let matched = allProfiles.find(p => p.pin_code === pinCode.trim());

      // If not found locally and online, try to fetch from Supabase
      if (!matched && client && isOnline) {
        console.log('🔍 Searching for profile in Supabase...');
        const { data: remoteProfiles } = await client
          .from('profiles')
          .select('*')
          .eq('pin_code', pinCode.trim());

        if (remoteProfiles && remoteProfiles.length > 0) {
          // Save all found profiles locally
          for (const profile of remoteProfiles) {
            await db.profiles.put(profile);
          }
          matched = remoteProfiles[0];
          console.log('✅ Profile found in Supabase!');
        }
      }

      if (!matched) {
        setError('No account found for this PIN code. Please check with your administrator.');
        setLoading(false);
        return;
      }

      // Check if profile is active
      if (!matched.is_active) {
        setError('This account is deactivated. Please contact your administrator.');
        setLoading(false);
        return;
      }

      console.log(`✅ Login successful! Welcome ${matched.full_name} (${matched.role})`);

      // Update last login
      matched.last_login_at = new Date().toISOString();
      await db.profiles.put(matched);

      // If online, update in Supabase too
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

      // Set local storage
      localStorage.setItem('medp_authenticated', 'true');
      localStorage.setItem('medp_current_user_id', matched.id);
      localStorage.setItem('medp_pharmacy_name', matched.pharmacy_name);
      localStorage.setItem('medp_user_role', matched.role);

      onAuthSuccess(matched);

    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto">
        {/* Brand & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl mx-auto shadow-lg shadow-emerald-500/20">
            P
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">
            PHARMARAE KENYA POS
          </h2>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            {showSupabaseConfig
              ? 'Configure your Supabase Cloud Database'
              : mode === 'register'
                ? 'Create your Pharmacy Account'
                : 'Sign in to access POS & Stock Management'}
            {!showSupabaseConfig && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isOnline ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80' : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </p>
        </div>

        {/* Supabase Config Toggle Bar */}
        <button
          type="button"
          onClick={() => setShowSupabaseConfig(!showSupabaseConfig)}
          className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Supabase Cloud Settings</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${creds.url && !creds.url.includes('your-supabase-project') ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80' : 'text-amber-400 bg-amber-950/80 border-amber-800/80'}`}>
            {creds.url && !creds.url.includes('your-supabase-project') ? '✅ Connected' : '⚠️ Not Configured'}
          </span>
        </button>

        {showSupabaseConfig ? (
          <form onSubmit={handleSaveSupabase} className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* ... Supabase config form ... */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Supabase Project URL</label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Supabase Anon Key</label>
              <textarea
                required
                rows={3}
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-center text-xs font-semibold">
                {successMsg}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-colors"
              >
                {loading ? 'Testing...' : 'Save & Test Connection'}
              </button>
              <button
                type="button"
                onClick={() => setShowSupabaseConfig(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'register' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'login' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs rounded-xl font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-3 text-xs">
                {/* ... Registration form ... */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
                    Pharmacy / Chemist Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. Apex Healthcare Pharmacy"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    <User className="w-3.5 h-3.5 inline mr-1.5" />
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. John Kamau"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@chemist.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (min 6 chars)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+2547123..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Manager</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="cashier">Cashier</option>
                      <option value="storekeeper">Storekeeper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">4-Digit PIN *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Register & Open App</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 text-xs">
                {/* OPTION 1: Email Login */}
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 text-center mb-2">CLOUD LOGIN</p>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@chemist.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* OPTION 2: PIN Login */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-slate-500 text-[10px]">OR FAST PIN LOGIN</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/30">
                  <p className="text-[10px] text-emerald-400 text-center mb-2">TERMINAL PIN LOGIN</p>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium text-center">4-Digit PIN Code</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="••••"
                      className="w-full max-w-[180px] mx-auto block bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center text-base"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        <div className="text-[11px] text-slate-500 text-center border-t border-slate-800/80 pt-3 flex items-center justify-center gap-1.5 flex-wrap">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Supabase Auth • Offline First</span>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <span className="text-slate-600">v2.0</span>
        </div>
      </div>
    </div>
  );
};