import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowLeft, Loader2, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, signInWithGoogle, signOutFromSupabase } from '../services/supabase.js';
import { api } from '../services/api.js';

interface AdminLoginProps {
  onSuccess: (adminUser: any) => void;
  onNavigateHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onNavigateHome }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deniedAccount, setDeniedAccount] = useState<string | null>(null);

  const handleContinueWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    setDeniedAccount(null);

    try {
      if (isSupabaseConfigured()) {
        // Official Supabase Google OAuth flow
        await signInWithGoogle();
        return;
      }

      // If Supabase client credentials are not yet configured in local environment,
      // prompt the user clearly about Supabase configuration
      setAuthError(
        'Supabase URL एवं Anon Key कॉन्फ़िगर नहीं हैं। कृपया .env में VITE_SUPABASE_URL एवं VITE_SUPABASE_ANON_KEY सेट करें।'
      );
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setAuthError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAndReset = async () => {
    try {
      await signOutFromSupabase();
      await api.logoutAdmin();
    } catch {}
    setDeniedAccount(null);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 max-w-5xl w-full mx-auto p-4 sm:p-6 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>मुख्य वेबसाइट पर लौटें (Return to Website)</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
            Production Security Active
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          {deniedAccount ? (
            /* ACCESS DENIED VIEW */
            <div className="space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-400 shadow-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-serif font-black text-rose-400 tracking-wide">
                  Access Denied
                </h2>
                <p className="text-xs text-rose-200/90 font-medium mt-1">
                  यह Google account MERU Mobile Shop Admin के लिए authorized नहीं है।
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-left">
                <p className="text-[11px] text-slate-400">प्रयास किया गया Google खाता:</p>
                <p className="text-xs font-mono font-bold text-white break-all mt-0.5">{deniedAccount}</p>
                <p className="text-[11px] text-rose-400 mt-2">
                  ⚠️ यह ईमेल <code>admin_users</code> डेटाबेस टेबल में अधिकृत नहीं है अथवा निष्क्रिय (Deactivated) है।
                </p>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                यदि आप MERU Mobile Shop के अधिकृत व्यवस्थापक हैं, तो कृपया अपने प्राथमिक Super Admin (<span className="text-amber-400 font-mono">rohitjain221199@gmail.com</span>) से संपर्क करें।
              </p>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSignOutAndReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sign Out & Try Another Google Account</span>
                </button>
              </div>
            </div>
          ) : (
            /* NORMAL LOGIN VIEW */
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400/90 block mb-1">
                  MERU MOBILE SHOP · GANJ BASODA
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-wide">
                  Secure Admin Login
                </h1>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Only authorized MERU Mobile Shop administrators can access this panel.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  (केवल अधिकृत जीमेल खातों को ही प्रवेश की अनुमति है)
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left animate-fade-in">
                  <p className="font-bold mb-0.5">लॉगिन विफल:</p>
                  <p>{authError}</p>
                </div>
              )}

              {/* PRIMARY ACTION BUTTON: Continue with Google */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleContinueWithGoogle}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-slate-700 animate-spin" />
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
              </div>

              {/* Security Features Info Box */}
              <div className="pt-4 border-t border-slate-800 text-left space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Google OAuth + Supabase Auth क्रिप्टोग्राफ़िक टोकन सत्यापन</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>सर्वर-साइड <code>admin_users</code> टेबल एवं RLS सुरक्षा</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>अनधिकृत खातों के लिए स्वचालित 403 Access Denied सुरक्षा</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto p-4 sm:p-6 text-center text-[11px] text-slate-600 border-t border-slate-900">
        MERU MOBILE SHOP · Tyoda Road, Ganj Basoda · Super Admin: rohitjain221199@gmail.com
      </footer>
    </div>
  );
};
