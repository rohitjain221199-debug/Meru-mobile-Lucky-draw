import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

/**
 * Normalizes and sanitizes Supabase URL.
 * Automatically trims whitespace, strips trailing slashes,
 * and strips any appended PostgREST path (e.g. /rest/v1 or /rest/v1/)
 * so that Supabase Auth, REST, and Realtime endpoints always receive the correct project origin.
 */
export function cleanSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest if accidentally appended
  url = url.replace(/\/rest(\/v1)?$/i, '');
  // Strip any remaining trailing slash
  return url.replace(/\/+$/, '');
}

/**
 * Normalizes Supabase API key (anon / publishable).
 */
export function cleanSupabaseKey(rawKey?: string): string {
  if (!rawKey) return '';
  return rawKey.trim();
}

// Dynamically read environment variables injected by Vite via import.meta.env
// (No hardcoded credentials — values come strictly from environment / .env)
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const SUPABASE_URL = cleanSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = cleanSupabaseKey(rawKey);

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingVars: string[];
  url: string;
  hasAnonKey: boolean;
  errorMessage?: string;
  errorHindi?: string;
}

/**
 * Validates the Supabase configuration and identifies any missing variables.
 */
export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    return {
      isConfigured: false,
      missingVars: missing,
      url: SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      errorMessage: `Supabase environment variables missing: ${missing.join(', ')}. Please configure them in your .env or deployment environment.`,
      errorHindi: `Supabase कॉन्फ़िगरेशन अधूरी है: ${missing.join(', ')} अनुपलब्ध है। कृपया .env में सेट करें।`
    };
  }

  if (!SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.startsWith('http://localhost')) {
    return {
      isConfigured: false,
      missingVars: [],
      url: SUPABASE_URL,
      hasAnonKey: true,
      errorMessage: 'Invalid VITE_SUPABASE_URL: URL must start with https://',
      errorHindi: 'अमान्य VITE_SUPABASE_URL: यह https:// से शुरू होना चाहिए।'
    };
  }

  return {
    isConfigured: true,
    missingVars: [],
    url: SUPABASE_URL,
    hasAnonKey: true
  };
}

/**
 * Returns true if both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present and valid.
 */
export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfigStatus().isConfigured;
};

/**
 * Centralized, singleton Supabase Client for the entire application.
 * Configured with PKCE flow, persistent storage, and automatic token refresh.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? SUPABASE_URL : 'https://meru-placeholder.supabase.co',
  isSupabaseConfigured() ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'meru-mms-supabase-auth'
    }
  }
);

export interface SupabaseVerificationResult {
  ok: boolean;
  message: string;
  messageHindi: string;
  latencyMs?: number;
  sessionExists?: boolean;
  userEmail?: string | null;
}

/**
 * Verifies Supabase connection and auth state at startup or on demand (Requirement 16).
 */
export async function verifySupabaseConnection(): Promise<SupabaseVerificationResult> {
  const status = getSupabaseConfigStatus();
  if (!status.isConfigured) {
    return {
      ok: false,
      message: status.errorMessage || 'Supabase not configured',
      messageHindi: status.errorHindi || 'Supabase कॉन्फ़िगर नहीं है',
      latencyMs: 0,
      sessionExists: false
    };
  }

  const startTime = Date.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        ok: false,
        message: `Supabase Auth error: ${error.message}`,
        messageHindi: `Supabase प्रमाणीकरण त्रुटि: ${error.message}`,
        latencyMs: latency,
        sessionExists: false
      };
    }

    return {
      ok: true,
      message: 'Supabase connection verified successfully',
      messageHindi: 'Supabase कनेक्शन सफलतापूर्वक सत्यापित हुआ',
      latencyMs: latency,
      sessionExists: !!data.session,
      userEmail: data.session?.user?.email || null
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Connection failed: ${err.message || 'Network error'}`,
      messageHindi: `कनेक्शन विफल: ${err.message || 'नेटवर्क त्रुटि'}`,
      latencyMs: Date.now() - startTime,
      sessionExists: false
    };
  }
}

/**
 * Initiates Google OAuth authentication flow through Supabase Auth.
 * Redirects user to Google OAuth consent, returning to /admin for verification.
 */
export async function signInWithGoogle(): Promise<{ provider: string; url: string | null }> {
  const status = getSupabaseConfigStatus();
  if (!status.isConfigured) {
    throw new Error(status.errorMessage || 'Supabase is not configured.');
  }

  const redirectUrl = `${window.location.origin}/admin`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account'
      }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Signs out the current user session from Supabase Auth (Requirement 18).
 */
export async function signOutFromSupabase(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut warning:', err);
    }
  }
}

/**
 * Retrieves the current Supabase Auth session if one exists.
 */
export async function getSupabaseSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current Supabase Auth user if logged in.
 */
export async function getSupabaseUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
