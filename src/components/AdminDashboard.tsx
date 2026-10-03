import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Sparkles,
  RefreshCw,
  Gift as GiftIcon,
  Trophy,
  Sliders,
  Settings,
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
  ListOrdered,
  Shuffle,
  Target,
  Image as ImageIcon,
  LogOut,
  Play,
  Save,
  Check,
  Eye,
  Database,
  Volume2,
  KeyRound,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Search,
  BookOpen,
  UserPlus,
  Trash2
} from 'lucide-react';
import { api } from '../services/api.js';
import { AdminStats, Gift, GrandPrize, AdminUser } from '../types.js';
import { PrizeControlCenter } from './PrizeControlCenter.js';
import { isSupabaseConfigured, signInWithGoogle, signOutFromSupabase, supabase } from '../services/supabase.js';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshPublicConfig: () => void;
  initialTab?: 'control' | 'gifts' | 'campaign' | 'winners' | 'counter' | 'logs' | 'users' | 'supabase';
  authenticatedAdminUser?: AdminUser | null;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onRefreshPublicConfig,
  initialTab = 'control',
  authenticatedAdminUser,
  onLogout,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!authenticatedAdminUser || false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(authenticatedAdminUser || null);

  // Google Sign-In state (Zero hardcoded passwords)
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [deniedAccount, setDeniedAccount] = useState<string | null>(null);

  // Admin Users Management State (SUPER_ADMIN)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'gifts' | 'campaign' | 'winners' | 'counter' | 'logs' | 'users' | 'supabase'>(initialTab);

  // Next gift control state
  const [selectedNextGift, setSelectedNextGift] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Shop photo & Maps state
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newMapsUrl, setNewMapsUrl] = useState('');

  // Counter Claim Verification Search
  const [counterQuery, setCounterQuery] = useState('');
  const [counterEntry, setCounterEntry] = useState<any | null>(null);
  const [counterError, setCounterError] = useState<string | null>(null);
  const [counterLoading, setCounterLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const token = api.getAdminToken();
      if (token) {
        api.getCurrentAdminUser()
          .then((res) => {
            if (res.success && res.user) {
              setIsAuthenticated(true);
              setAdminUser(res.user);
              loadStats();
              if (res.user.role === 'SUPER_ADMIN') {
                loadAdminUsers();
              }
            } else {
              handleLogout();
            }
          })
          .catch(() => {
            handleLogout();
          });
      }

      // Check for Supabase session (e.g. from Google OAuth redirect)
      if (isSupabaseConfigured()) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email && !api.getAdminToken()) {
            handleGoogleLogin(session.user.email, session.user.user_metadata?.full_name, session.access_token);
          }
        });
      }
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminStats();
      if (res.success && res.stats) {
        setStats(res.stats);
        setSelectedNextGift(res.stats.settings.nextGiftId || '');
        setNewPhotoUrl(res.stats.settings.shopPhotoUrl || '');
        setNewMapsUrl(res.stats.settings.googleMapsUrl || '');
        if (res.stats.adminUsers) {
          setAdminUsers(res.stats.adminUsers);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('unauthorized')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      setAdminUsersLoading(true);
      const res = await api.getAdminUsers();
      if (res.success && res.users) {
        setAdminUsers(res.users);
      }
    } catch (err) {
      console.warn('Failed to load admin users:', err);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const handleGoogleLogin = async (targetEmail?: string, targetName?: string, accessToken?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setDeniedAccount(null);

    try {
      // If Supabase is configured and no specific email was provided, trigger Supabase Google OAuth
      if (isSupabaseConfigured() && !targetEmail && !accessToken) {
        await signInWithGoogle();
        return;
      }

      const emailToAuth = (targetEmail || '').trim().toLowerCase();
      if (!emailToAuth) {
        if (!isSupabaseConfigured()) {
          setAuthError('Supabase URL एवं Anon Key कॉन्फ़िगर नहीं हैं। कृपया VITE_SUPABASE_URL एवं VITE_SUPABASE_ANON_KEY सेट करें।');
        }
        return;
      }

      const res = await api.loginWithGoogle(emailToAuth, targetName, accessToken);
      if (res.success && res.user) {
        setIsAuthenticated(true);
        setAdminUser(res.user);
        setAuthError(null);
        setDeniedAccount(null);
        loadStats();
        if (res.user.role === 'SUPER_ADMIN') {
          loadAdminUsers();
        }
      } else {
        setDeniedAccount(emailToAuth);
        setAuthError(res.error || 'Access Denied — This Google account is not authorized for MERU Mobile Shop Admin.');
      }
    } catch (err: any) {
      if (targetEmail) setDeniedAccount(targetEmail);
      setAuthError(err.message || 'Access Denied — This Google account is not authorized for MERU Mobile Shop Admin.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logoutAdmin();
    await signOutFromSupabase();
    setIsAuthenticated(false);
    setAdminUser(null);
    setStats(null);
    setAuthError(null);
    setDeniedAccount(null);
  };

  // Admin User Management actions (SUPER_ADMIN Only)
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.addAdminUser({
        email: newAdminEmail,
        name: newAdminName,
        role: newAdminRole,
      });
      if (res.success) {
        showFeedback(`नया एडमिन जोड़ा गया: ${newAdminEmail}`);
        setIsAddAdminOpen(false);
        setNewAdminEmail('');
        setNewAdminName('');
        loadAdminUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add admin');
    }
  };

  const handleToggleAdminActive = async (user: AdminUser) => {
    if (user.email === 'rohitjain221199@gmail.com') {
      alert('प्राथमिक सुपर एडमिन (Store Owner) को निष्क्रिय नहीं किया जा सकता।');
      return;
    }
    const confirmMsg = user.is_active
      ? `क्या आप एडमिन '${user.email}' को निष्क्रिय (Deactivate) करना चाहते हैं? वे तुरंत लॉगआउट हो जाएंगे।`
      : `क्या आप एडमिन '${user.email}' को पुनः सक्रिय (Activate) करना चाहते हैं?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminUser(user.id, { is_active: !user.is_active });
      showFeedback(`एडमिन स्थिति अपडेट: ${user.email} (${!user.is_active ? 'ACTIVE' : 'INACTIVE'})`);
      loadAdminUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update admin');
    }
  };

  const handleChangeAdminRole = async (user: AdminUser, newRole: 'SUPER_ADMIN' | 'ADMIN') => {
    if (user.email === 'rohitjain221199@gmail.com' && newRole !== 'SUPER_ADMIN') {
      alert('प्राथमिक स्टोर ओनर का रोल नहीं बदला जा सकता।');
      return;
    }
    try {
      await api.updateAdminUser(user.id, { role: newRole });
      showFeedback(`रोल अपडेट: ${user.email} -> ${newRole}`);
      loadAdminUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    }
  };

  const handleRemoveAdmin = async (user: AdminUser) => {
    if (user.email === 'rohitjain221199@gmail.com') {
      alert('प्राथमिक स्टोर ओनर को हटाया नहीं जा सकता।');
      return;
    }
    if (user.id === adminUser?.id) {
      alert('आप स्वयं के एडमिन खाते को नहीं हटा सकते।');
      return;
    }
    if (!window.confirm(`क्या आप सचमुच एडमिन '${user.email}' को हटाना चाहते हैं?`)) return;

    try {
      await api.removeAdminUser(user.id);
      showFeedback(`एडमिन हटा दिया गया: ${user.email}`);
      loadAdminUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove admin');
    }
  };

  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Set Next Gift
  const handleSetNextGift = async (giftId: string | null) => {
    try {
      await api.setNextGift(giftId);
      setSelectedNextGift(giftId || '');
      showFeedback(giftId ? 'अगला गिफ्ट सफलता पूर्वक लॉक हुआ (RESERVED FOR NEXT ELIGIBLE CUSTOMER)' : 'Auto / Random Mode सेट हुआ');
      loadStats();
      onRefreshPublicConfig();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Set Draw Mode
  const handleSetMode = async (mode: 'random' | 'next_gift' | 'queue') => {
    try {
      await api.setDrawMode(mode);
      showFeedback(`मोड सक्रिय: ${mode.toUpperCase()}`);
      loadStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Campaign Feature Toggle
  const handleToggleCampaignFeature = async (key: keyof AdminStats['campaign'], currentVal: boolean) => {
    try {
      await api.updateCampaign({ [key]: !currentVal });
      showFeedback(`सेटिंग अपडेट हो गई: ${String(key)}`);
      loadStats();
      onRefreshPublicConfig();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Test Mode Toggle
  const handleToggleTestMode = async () => {
    if (!stats) return;
    try {
      await api.updateSettings({ testMode: !stats.settings.testMode });
      showFeedback(`टेस्ट मोड: ${!stats.settings.testMode ? 'चालू (ON - Safe Sandbox)' : 'बंद (OFF)'}`);
      loadStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Run Simulated Test Draw
  const handleRunTestDraw = async () => {
    try {
      await api.runTestDraw();
      showFeedback('सिम्युलेटेड टेस्ट ड्रॉ पूर्ण! (Real stock unchanged)');
      loadStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Shop Photo
  const handleSaveShopPhoto = async () => {
    if (!newPhotoUrl.trim()) return;
    try {
      await api.updateShopPhoto(newPhotoUrl.trim());
      showFeedback('दुकान का वास्तविक फोटो सफलतापूर्वक अपडेट हुआ!');
      loadStats();
      onRefreshPublicConfig();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Google Maps URL
  const handleSaveMapsUrl = async () => {
    try {
      await api.updateGoogleMapsUrl(newMapsUrl);
      showFeedback('Google Maps लोकेशन लिंक अपडेट हुआ!');
      loadStats();
      onRefreshPublicConfig();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Local Photo File Upload (Base64 / Supabase storage preview)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setNewPhotoUrl(base64);
        try {
          await api.updateShopPhoto(base64);
          showFeedback('दुकान का वास्तविक फोटो अपडेट हो गया!');
          loadStats();
          onRefreshPublicConfig();
        } catch (err: any) {
          alert(err.message);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Counter Claim Verification
  const handleCounterSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterQuery.trim()) return;
    setCounterLoading(true);
    setCounterError(null);
    setCounterEntry(null);
    try {
      const res = await api.verifyEntry(counterQuery.trim());
      if (res.success && res.entry) {
        setCounterEntry(res.entry);
      } else {
        setCounterError('कूपन रिकॉर्ड नहीं मिला। कृपया सही Entry ID दर्ज करें।');
      }
    } catch (err: any) {
      setCounterError(err.message || 'सत्यापन में त्रुटि');
    } finally {
      setCounterLoading(false);
    }
  };

  const handleMarkClaimed = async (entryId: string) => {
    try {
      const res = await api.claimEntry(entryId);
      showFeedback(`कूपन ${entryId} को डिलीवर मार्क कर दिया गया!`);
      loadStats();
      if (counterEntry && counterEntry.id === entryId) {
        setCounterEntry(res.entry);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Top Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-white text-base">
                  MERU MOBILE SHOP · Admin Command Center
                </h3>
                {stats?.settings.testMode && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    🟡 TEST MODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Authorized Access · Ganj Basoda, Madhya Pradesh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAuthenticated && adminUser && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-inner">
                {/* Profile Photo / Avatar */}
                {adminUser.avatar_url ? (
                  <img
                    src={adminUser.avatar_url}
                    alt={adminUser.name || 'Admin'}
                    className="w-8 h-8 rounded-full border border-amber-400/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-md">
                    {(adminUser.name || adminUser.email || 'A')[0].toUpperCase()}
                  </div>
                )}

                <div className="hidden sm:block text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white max-w-[140px] truncate">{adminUser.name || 'Admin'}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider ${
                      adminUser.role === 'SUPER_ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {adminUser.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[170px] block">{adminUser.email}</span>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <button
                onClick={loadStats}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Refresh stats"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action toast feedback */}
        {actionMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center animate-fade-in flex items-center justify-center gap-1.5 shadow-md">
            <Check className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* AUTHENTICATION VIEW: GOOGLE OAUTH + ALLOWLIST AUTHORIZATION */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-10 max-w-md mx-auto text-center w-full">
            {deniedAccount ? (
              /* ACCESS DENIED SCREEN (Requirement 2 & 9) */
              <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center animate-fade-in shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-400 mb-4 shadow-lg">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-serif font-black text-rose-300 mb-1">
                  Access Denied
                </h4>
                <p className="text-xs text-rose-200/90 font-medium mb-3">
                  This Google account is not authorized for MERU Mobile Shop Admin.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-left mb-4">
                  <p className="text-[11px] text-slate-400">प्रयास किया गया Google खाता (Account):</p>
                  <p className="text-xs font-mono font-bold text-white break-all mt-0.5">{deniedAccount}</p>
                  <p className="text-[11px] text-rose-400 mt-2">
                    ⚠️ यह ईमेल Admin Allowlist में पंजीकृत नहीं है अथवा खाता निष्क्रिय (Deactivated) है।
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 mb-5">
                  यदि आप MERU Mobile Shop के अधिकृत एडमिन हैं, तो कृपया Primary Super Admin (<span className="text-amber-400 font-mono">rohitjain221199@gmail.com</span>) से संपर्क करें।
                </p>
                <button
                  onClick={() => {
                    setDeniedAccount(null);
                    setAuthError(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try with Another Google Account</span>
                </button>
              </div>
            ) : (
              /* STANDARD GOOGLE LOGIN SCREEN (Requirement 1 & 9) */
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400 shadow-xl">
                  <Lock className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400/90 block mb-1">
                    MERU MOBILE SHOP
                  </span>
                  <h3 className="text-2xl font-serif font-black text-white tracking-wide">
                    ADMIN PANEL
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    सुरक्षित एडमिन नियंत्रण केंद्र (Control Center)
                  </p>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left">
                    {authError}
                  </div>
                )}

                {/* PRIMARY ACTION: CONTINUE WITH GOOGLE */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => handleGoogleLogin()}
                    className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-5 h-5 text-slate-700 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.17 0 9.99 0 12s.45 3.83 1.24 5.41l4.04-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                        />
                      </svg>
                    )}
                    <span className="font-sans font-bold">Continue with Google</span>
                  </button>

                  {/* Required user prompt 9 subtext */}
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    Authorized Google accounts only
                  </p>
                  <p className="text-[11px] text-slate-500">
                    (केवल डेटाबेस Allowlist में पंजीकृत Google खातों को ही एडमिन डैशबोर्ड का एक्सेस मिलेगा)
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="bg-slate-950/60 border-b border-slate-800 px-4 flex items-center gap-1 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveTab('control')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'control'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>🎯 PRIZE CONTROL CENTER</span>
              </button>

              <button
                onClick={() => setActiveTab('gifts')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'gifts'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <GiftIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Gifts & Inventory ({stats?.gifts.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('counter')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'counter'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Counter Claim Verification</span>
              </button>

              <button
                onClick={() => setActiveTab('campaign')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'campaign'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Campaign & Store Details</span>
              </button>

              <button
                onClick={() => setActiveTab('winners')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'winners'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>Entries & Winners ({stats?.totalEntries || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('supabase')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'supabase'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Supabase SQL & Storage</span>
              </button>

              {adminUser?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'users'
                      ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Admin Management ({adminUsers.length || stats?.adminUsers?.length || 1})</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* TAB 1: LIVE NEXT RESULT CONTROL & DASHBOARD CARDS */}
              {activeTab === 'control' && stats && (
                <div className="space-y-6">
                  {/* Dashboard Metrics Cards as required by Section 17 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">TOTAL ENTRIES</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-white">{stats.totalEntries}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">PLAYED</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-blue-400">{stats.realEntries}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">UNPLAYED</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-slate-400">
                        {Math.max(0, stats.campaign.maxDailyEntries - stats.realEntries)}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">DISTRIBUTED</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-amber-300">{stats.distributedInventory}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">REMAINING</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-emerald-400">{stats.remainingInventory}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">CLAIMED</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-emerald-300">{stats.claimedCount}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">UNCLAIMED</span>
                      <span className="text-lg sm:text-xl font-mono font-black text-rose-300">{stats.unclaimedCount}</span>
                    </div>
                  </div>

                  {/* PRIZE CONTROL CENTER (Section 1: Complete Suite) */}
                  <PrizeControlCenter
                    stats={stats}
                    onRefreshStats={loadStats}
                    showFeedback={showFeedback}
                    adminUser={adminUser}
                  />

                  {/* Sandbox Test Mode Bar */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">TEST MODE SANDBOX</span>
                        {stats.settings.testMode ? (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                            🟡 ACTIVE
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded">
                            DISABLED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        * केवल एडमिन सक्रिय कर सकता है। टेस्ट ड्रॉ से असली स्टॉक, नेक्स्ट गिफ्ट या सार्वजनिक आँकड़े प्रभावित नहीं होते।
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleTestMode}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          stats.settings.testMode
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {stats.settings.testMode ? 'Turn Test Mode OFF' : 'Turn Test Mode ON'}
                      </button>

                      <button
                        onClick={handleRunTestDraw}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                      >
                        Run Test Draw
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GIFTS & INVENTORY MANAGER */}
              {activeTab === 'gifts' && stats && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-serif font-black text-white">
                        Instant Gifts Inventory & Probabilities
                      </h4>
                      <p className="text-xs text-slate-400">
                        कुल सक्रिय प्रतिशत संभावना ठीक 100.00% होना अनिवार्य है
                      </p>
                    </div>

                    <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 flex items-center gap-2">
                      <span>Total Probability:</span>
                      <span className="text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        {stats.gifts.filter((g) => g.active).reduce((s, g) => s + Number(g.probability || 0), 0)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Inventory Grid as required by Section 18 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stats.gifts.map((gift) => (
                      <div
                        key={gift.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={gift.image}
                              alt={gift.name}
                              className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                            />
                            <div>
                              <h5 className="font-bold text-sm text-white">{gift.name}</h5>
                              <p className="text-xs text-amber-200/80">{gift.nameHi}</p>
                              <span className="text-[11px] text-slate-400">Prob: {gift.probability}%</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gift.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                            {gift.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        {/* Inventory Visual Card: Total, Remaining, Distributed */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-xs">
                          <div className="bg-slate-900/80 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">Total</span>
                            <span className="font-mono font-bold text-white text-sm">{gift.totalQuantity}</span>
                          </div>
                          <div className="bg-slate-900/80 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">Remaining</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">{gift.remainingQuantity}</span>
                          </div>
                          <div className="bg-slate-900/80 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">Distributed</span>
                            <span className="font-mono font-bold text-amber-300 text-sm">{gift.totalQuantity - gift.remainingQuantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COUNTER CLAIM VERIFICATION */}
              {activeTab === 'counter' && (
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div className="text-center">
                    <h4 className="text-base font-serif font-black text-white">
                      दुकान काउंटर कूपन क्लेम सत्यापन
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ग्राहक की Entry ID दर्ज करें और उपहार प्रदान करते समय 'MARK CLAIMED' दबाएँ
                    </p>
                  </div>

                  <form onSubmit={handleCounterSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={counterQuery}
                        onChange={(e) => setCounterQuery(e.target.value)}
                        placeholder="MMS-2026-XXXXXXXX या मोबाइल नंबर..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={counterLoading}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {counterLoading ? 'खोज रहे हैं...' : 'खोजें (Search)'}
                    </button>
                  </form>

                  {counterError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                      {counterError}
                    </div>
                  )}

                  {counterEntry && (
                    <div className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Entry ID</span>
                          <span className="text-lg font-mono font-black text-amber-300">{counterEntry.id}</span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            counterEntry.resultStatus === 'claimed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {counterEntry.resultStatus === 'claimed' ? 'उपहार वितरित (Claimed)' : 'वितरण बाकी (Unclaimed)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">ग्राहक का नाम:</span>
                          <span className="font-bold text-white text-sm">{counterEntry.customerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">मोबाइल नंबर:</span>
                          <span className="font-mono text-slate-200">{counterEntry.customerMobile}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">जीता गया उपहार:</span>
                          <span className="font-bold text-amber-300 text-sm">{counterEntry.giftName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">दिनांक:</span>
                          <span className="text-slate-300">{new Date(counterEntry.playedAt).toLocaleString('hi-IN')}</span>
                        </div>
                      </div>

                      {counterEntry.resultStatus !== 'claimed' ? (
                        <button
                          onClick={() => handleMarkClaimed(counterEntry.id)}
                          className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>MARK CLAIMED (उपहार डिलीवर हुआ)</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
                          यह उपहार पहले ही क्लेम किया जा चुका है ({counterEntry.claimedAt})।
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CAMPAIGN & STORE DETAILS (PHOTO & GOOGLE MAPS) */}
              {activeTab === 'campaign' && stats && (
                <div className="space-y-6">
                  {/* Real Shop Photo Customizer */}
                  <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-5 h-5 text-amber-400" />
                      <h4 className="text-base font-serif font-black text-white">
                        दुकान का वास्तविक फोटो (Official Real Storefront Photograph)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      यहाँ से वास्तविक दुकान का फोटो बदलें या नया अपलोड करें। यह पोस्टर, वेबसाइट और कार्ड्स पर तुरंत दिखेगा।
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-4 h-36 rounded-xl overflow-hidden border border-amber-400/40 bg-slate-900">
                        <img
                          src={newPhotoUrl || stats.settings.shopPhotoUrl}
                          alt="Store Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="sm:col-span-8 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Photo URL or Storage Link:
                          </label>
                          <input
                            type="text"
                            value={newPhotoUrl}
                            onChange={(e) => setNewPhotoUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors">
                            📁 डिवाइस से फोटो चुनें
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={handleSaveShopPhoto}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-serif font-black cursor-pointer shadow-md"
                          >
                            Save Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Maps Link Configuration as required by Section 28 */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <h4 className="text-base font-serif font-black text-white">
                        Google Maps Destination Link (दुकान का मैप लिंक)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Google Maps का सटीक शेयर लिंक यहाँ दर्ज करें। यदि यह खाली होगा, तो पब्लिक 'GET DIRECTIONS' बटन डिसेबल रहेगा (गलत GPS निर्देशांक नहीं बनाए जाएँगे)।
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newMapsUrl}
                        onChange={(e) => setNewMapsUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      />
                      <button
                        onClick={handleSaveMapsUrl}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Save Link
                      </button>
                    </div>
                  </div>

                  {/* Campaign Feature Toggles */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                    <h4 className="text-base font-serif font-black text-white mb-3">
                      अभियान सेटिंग्स (Campaign Controls)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Campaign Active</span>
                          <span className="text-[11px] text-slate-400">Status: {stats.campaign.status.toUpperCase()}</span>
                        </div>
                        <button
                          onClick={() => handleToggleCampaignFeature('status' as any, stats.campaign.status === 'active')}
                          className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                            stats.campaign.status === 'active' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {stats.campaign.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Spin & Win Wheel</span>
                          <span className="text-[11px] text-slate-400">व्हील गेम चालू/बंद</span>
                        </div>
                        <button
                          onClick={() => handleToggleCampaignFeature('spinEnabled', stats.campaign.spinEnabled)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                            stats.campaign.spinEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {stats.campaign.spinEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Scratch & Win</span>
                          <span className="text-[11px] text-slate-400">कूपन स्क्रैच चालू/बंद</span>
                        </div>
                        <button
                          onClick={() => handleToggleCampaignFeature('scratchEnabled', stats.campaign.scratchEnabled)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                            stats.campaign.scratchEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {stats.campaign.scratchEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Sound Effects</span>
                          <span className="text-[11px] text-slate-400">ध्वनि प्रभाव</span>
                        </div>
                        <button
                          onClick={() => handleToggleCampaignFeature('soundEnabled', stats.campaign.soundEnabled)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                            stats.campaign.soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {stats.campaign.soundEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ENTRIES & RECENT WINNERS */}
              {activeTab === 'winners' && stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-serif font-black text-white">
                        Customer Draw Entries & Winners
                      </h4>
                      <p className="text-xs text-slate-400">
                        दुकान पर कूपन क्लेम होने पर 'Mark Claimed' दबाएँ
                      </p>
                    </div>

                    <a
                      href="/api/admin/export-csv"
                      download
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </a>
                  </div>

                  <div className="space-y-2">
                    {stats.recentEntries.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">
                        अभी तक कोई एंट्री दर्ज नहीं हुई है।
                      </p>
                    ) : (
                      stats.recentEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{entry.customerName}</span>
                              <span className="font-mono text-amber-300 font-bold">{entry.id}</span>
                              {entry.isTest && (
                                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 rounded">
                                  TEST
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              📞 {entry.customerMobile} · {(entry.gameType || 'spin').toUpperCase()} · Won:{' '}
                              <span className="text-amber-300 font-bold">{entry.giftName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                entry.resultStatus === 'claimed'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {entry.resultStatus}
                            </span>

                            {entry.resultStatus !== 'claimed' && (
                              <button
                                onClick={() => handleMarkClaimed(entry.id)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer"
                              >
                                Mark Claimed
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: SUPABASE SQL & STORAGE SETUP */}
              {activeTab === 'supabase' && (
                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30">
                    <h4 className="text-base font-serif font-black text-white mb-1">
                      Supabase Cloud Deployment & Storage Guide
                    </h4>
                    <p className="text-slate-400 mb-3">
                      This application comes fully self-contained with zero external dependencies. To connect to Supabase Cloud, run the migration SQL file located at <code className="text-amber-300 font-mono">/supabase_schema.sql</code>.
                    </p>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-200 space-y-1 overflow-x-auto">
                      <p>-- Features Included:</p>
                      <p>✓ Campaign-Scoped Unique Constraint: UNIQUE(campaign_id, customer_mobile)</p>
                      <p>✓ Collision-safe Entry ID: MMS-2026-XXXXXXXX</p>
                      <p>✓ 100.00% Probability Enforcement</p>
                      <p>✓ Supabase Storage Bucket: store-assets</p>
                      <p>✓ Atomic Row-Locking RPC: allocate_lucky_draw()</p>
                      <p>✓ RLS Policies for Public Anonymized Reads & Authenticated Admin Writes</p>
                      <p>✓ Admin Allowlist & Row Level Security: admin_users table</p>
                      <p>✓ Prize Control Center & Atomic Locking: prize_assignments table</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: ADMIN MANAGEMENT (SUPER_ADMIN ONLY - Requirement 4) */}
              {activeTab === 'users' && adminUser?.role === 'SUPER_ADMIN' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-purple-500/30">
                    <div>
                      <h4 className="text-base font-serif font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>Authorized Admin Accounts & Allowlist</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        केवल इस डेटाबेस सूची में उपस्थित Google खातों को ही एडमिन पैनल का एक्सेस प्राप्त होगा। (Server-side Allowlist & RBAC)
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddAdminOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Authorized Admin</span>
                    </button>
                  </div>

                  {/* Add Admin Modal/Form */}
                  {isAddAdminOpen && (
                    <form onSubmit={handleAddAdminSubmit} className="p-4 rounded-xl bg-slate-950 border border-purple-500/40 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                          नया Google एडमिन खाता अधिकृत करें (Add Authorized Google Account)
                        </h5>
                        <button
                          type="button"
                          onClick={() => setIsAddAdminOpen(false)}
                          className="text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">Google Gmail Address *</label>
                          <input
                            type="email"
                            required
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="admin@gmail.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">Name / Description</label>
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="e.g. Ramesh Sharma"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">Role *</label>
                          <select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                          >
                            <option value="ADMIN">ADMIN (Operational Controls)</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN (Full Admin Access)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddAdminOpen(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                        >
                          रद्द करें
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                        >
                          Allowlist में जोड़ें
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Admin Users Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">User & Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Last Login</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {adminUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-white text-sm">{u.name}</div>
                                <div className="font-mono text-slate-400 text-xs">{u.email}</div>
                                {u.email === 'rohitjain221199@gmail.com' && (
                                  <span className="text-[10px] text-amber-400 font-semibold mt-0.5 inline-block">
                                    ★ Primary Store Owner
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.role === 'SUPER_ADMIN'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.is_active
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">
                                {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never logged in'}
                              </td>
                              <td className="p-3 text-right space-x-2">
                                {u.email !== 'rohitjain221199@gmail.com' && (
                                  <>
                                    <button
                                      onClick={() => handleChangeAdminRole(u, u.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN')}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                                      title="Change Role"
                                    >
                                      Make {u.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'}
                                    </button>
                                    <button
                                      onClick={() => handleToggleAdminActive(u)}
                                      className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                        u.is_active
                                          ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300 hover:bg-rose-900'
                                          : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900'
                                      }`}
                                    >
                                      {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveAdmin(u)}
                                      className="p-1 rounded bg-rose-950/40 text-rose-400 hover:text-rose-200 hover:bg-rose-900 cursor-pointer inline-flex items-center"
                                      title="Remove Admin"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
