import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AdminLogin } from './AdminLogin.js';
import { AdminDashboard } from './AdminDashboard.js';
import { api } from '../services/api.js';
import { supabase, isSupabaseConfigured, signOutFromSupabase } from '../services/supabase.js';
import { AdminUser } from '../types.js';

interface AdminRouteGuardProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefreshPublicConfig: () => void;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  currentPath,
  onNavigate,
  onRefreshPublicConfig,
}) => {
  const [loading, setLoading] = useState(true);
  const [authenticatedUser, setAuthenticatedUser] = useState<AdminUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Map subroute to dashboard tab
  const getTabFromPath = (path: string): 'control' | 'gifts' | 'campaign' | 'winners' | 'counter' | 'logs' | 'users' | 'supabase' => {
    const clean = path.toLowerCase();
    if (clean.includes('/admin/prizes') || clean.includes('/admin/inventory') || clean.includes('/admin/probability')) {
      return 'gifts';
    }
    if (clean.includes('/admin/assignments') || clean.includes('/admin/control') || clean.includes('/admin/dashboard')) {
      return 'control';
    }
    if (clean.includes('/admin/winners')) return 'winners';
    if (clean.includes('/admin/counter')) return 'counter';
    if (clean.includes('/admin/settings')) return 'campaign';
    if (clean.includes('/admin/audit-logs')) return 'logs';
    if (clean.includes('/admin/admin-users') || clean.includes('/admin/users')) return 'users';
    return 'control';
  };

  // Verify current session with server
  const checkCurrentSession = async () => {
    const token = api.getAdminToken();
    if (!token) {
      setAuthenticatedUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentAdminUser();
      if (res.success && res.user && res.user.is_active) {
        setAuthenticatedUser(res.user);
      } else {
        await api.logoutAdmin();
        setAuthenticatedUser(null);
      }
    } catch {
      await api.logoutAdmin();
      setAuthenticatedUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentSession();

    // Monitor Supabase Auth changes (Google OAuth callback / redirect)
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          try {
            setLoading(true);
            const res = await api.loginWithGoogle(
              session.user.email,
              session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              session.access_token,
              session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
              session.user.id
            );

            if (res.success && res.user) {
              setAuthenticatedUser(res.user);
              setAuthError(null);
              if (window.location.pathname === '/admin/login') {
                onNavigate('/admin');
              }
            } else {
              // Unauthorized Google account
              await signOutFromSupabase();
              await api.logoutAdmin();
              setAuthenticatedUser(null);
              setAuthError(res.error || 'Access Denied — This Google account is not authorized for MERU Mobile Shop Admin.');
            }
          } catch (err: any) {
            await signOutFromSupabase();
            setAuthenticatedUser(null);
            setAuthError(err.message || 'Authorization check failed');
          } finally {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          await api.logoutAdmin();
          setAuthenticatedUser(null);
          setLoading(false);
        }
      });
      authListener = data;
    }

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    await api.logoutAdmin();
    await signOutFromSupabase();
    setAuthenticatedUser(null);
    onNavigate('/admin/login');
  };

  // If loading session check
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-xl font-serif font-black text-amber-300">
          MERU MOBILE SHOP
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Verifying Admin Authorization & Security Clearance...
        </p>
      </div>
    );
  }

  // Not authenticated or visiting /admin/login
  if (!authenticatedUser || currentPath === '/admin/login') {
    return (
      <AdminLogin
        onSuccess={(user) => {
          setAuthenticatedUser(user);
          onNavigate('/admin');
        }}
        onNavigateHome={() => onNavigate('/')}
      />
    );
  }

  // Check RBAC route protection for normal ADMIN attempting to open /admin/admin-users
  const initialTab = getTabFromPath(currentPath);
  const safeTab = (initialTab === 'users' && authenticatedUser.role !== 'SUPER_ADMIN')
    ? 'control'
    : initialTab;

  return (
    <AdminDashboard
      isOpen={true}
      onClose={() => onNavigate('/')}
      onRefreshPublicConfig={onRefreshPublicConfig}
      initialTab={safeTab}
      authenticatedAdminUser={authenticatedUser}
      onLogout={handleLogout}
    />
  );
};
