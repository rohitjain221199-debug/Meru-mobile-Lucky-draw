import express, { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { AdminSession } from './types.js';

export const apiRouter = express.Router();

// Middleware to parse JSON
apiRouter.use(express.json({ limit: '10mb' }));

// Extend express Request to hold admin session
interface AuthenticatedRequest extends Request {
  adminSession?: AdminSession;
}

// IN-MEMORY SLIDING WINDOW RATE LIMITER
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();
const mobileRateLimits = new Map<string, RateLimitRecord>();

function cleanOldRateLimits() {
  const now = Date.now();
  for (const [key, val] of ipRateLimits.entries()) {
    if (val.resetAt <= now) ipRateLimits.delete(key);
  }
  for (const [key, val] of mobileRateLimits.entries()) {
    if (val.resetAt <= now) mobileRateLimits.delete(key);
  }
}
setInterval(cleanOldRateLimits, 60000);

function rateLimit(windowMs: number, maxRequests: number, keyPrefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const record = ipRateLimits.get(key);
    if (!record || record.resetAt <= now) {
      ipRateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'कृपया थोड़ी देर बाद प्रयास करें (Too many requests. Please try again in a few moments)'
      });
    }

    record.count++;
    next();
  };
}

// Mobile-specific rate limiter to prevent bot brute-forcing single mobile
function mobileRateLimit(req: Request, res: Response, next: NextFunction) {
  const mobile = req.body?.mobile;
  if (!mobile || typeof mobile !== 'string') return next();
  const clean = mobile.replace(/\D/g, '').slice(-10);
  const now = Date.now();
  const key = `mobile:${clean}`;

  const record = mobileRateLimits.get(key);
  if (!record || record.resetAt <= now) {
    mobileRateLimits.set(key, { count: 1, resetAt: now + 30000 }); // 30 sec window
    return next();
  }

  if (record.count >= 4) {
    return res.status(429).json({
      success: false,
      error: 'इस नंबर से बहुत अधिक प्रयास किए गए हैं। कृपया 30 सेकंड बाद प्रयास करें।'
    });
  }

  record.count++;
  next();
}

// Input sanitization helper
function sanitizeText(val: any, maxLen = 100): string {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLen);
}

// Server-Sent Events (SSE) for Realtime updates
apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Connected' })}\n\n`);

  const unsubscribe = db.subscribe((msg: string) => {
    res.write(`data: ${msg}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Public Config (Safe fields only, sensitive tokens and admin logs never exposed)
apiRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = db.getPublicConfig();
    res.json({ success: true, ...config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check if customer already played in a specific campaign
apiRouter.get('/customer/:mobile', (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const mobile = req.params.mobile;
    const campaignId = sanitizeText(req.query.campaignId || 'meru-festive-2024', 50);
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    const entry = db.findEntryByMobile(campaignId, cleanMobile);

    if (entry) {
      return res.json({
        success: true,
        alreadyPlayed: true,
        entry: {
          ...entry,
          customerMobile: `${entry.customerMobile.slice(0, 2)}******${entry.customerMobile.slice(-2)}`
        }
      });
    }
    return res.json({ success: true, alreadyPlayed: false });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/entries/:entryId/status - Fetch latest entry state on website refresh (Requirement 4 & 5 & 10)
// Does NOT leak reserved prize identity before play!
apiRouter.get('/entries/:entryId/status', (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const rawEntryId = sanitizeText(req.params.entryId, 50);
    if (!rawEntryId) {
      return res.status(400).json({ success: false, error: 'Entry ID is required' });
    }

    const entry = db.findEntry(rawEntryId);

    // 1. If entry exists and already played: return locked final result (Requirement 7)
    if (entry && (entry.resultStatus === 'locked' || entry.resultStatus === 'claimed')) {
      return res.json({
        success: true,
        can_play: false,
        alreadyPlayed: true,
        status: 'ALREADY_PLAYED',
        entry: {
          id: entry.id,
          campaignId: entry.campaignId,
          customerName: entry.customerName,
          customerMobile: `${entry.customerMobile.slice(0, 2)}******${entry.customerMobile.slice(-2)}`,
          giftId: entry.giftId,
          giftName: entry.giftName,
          giftNameHi: entry.giftNameHi,
          giftImage: entry.giftImage,
          giftIcon: entry.giftIcon,
          voucherCode: entry.voucherCode,
          resultStatus: entry.resultStatus,
          playedAt: entry.playedAt,
          claimedAt: entry.claimedAt
        }
      });
    }

    // 2. If unplayed: check if an ACTIVE assignment is reserved for this entry or mobile
    const activeAsg = db.getAssignments().find((a) => {
      if (a.status !== 'ACTIVE') return false;
      if (a.targetEntryId && a.targetEntryId.toLowerCase() === rawEntryId.toLowerCase()) return true;
      if (entry && a.targetMobile && a.targetMobile === entry.customerMobile) return true;
      return false;
    });

    // CRITICAL: DO NOT expose assigned prize name/image before play (Requirement 5)
    return res.json({
      success: true,
      can_play: true,
      alreadyPlayed: false,
      has_active_assignment: !!activeAsg,
      entryId: entry?.id || rawEntryId,
      customerName: entry?.customerName || activeAsg?.customerName || undefined,
      campaignId: db.getActiveCampaignId()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer Pre-Registration (Generates eligible Entry ID, never leaks assigned prize to frontend)
apiRouter.post(
  '/customer/register',
  rateLimit(60000, 30, 'customer_register'),
  mobileRateLimit,
  async (req: Request, res: Response) => {
    try {
      const fullName = sanitizeText(req.body.fullName, 100);
      const rawMobile = typeof req.body.mobile === 'string' ? req.body.mobile : '';
      const cleanMobile = db.normalizeMobile(rawMobile);
      const billNumber = sanitizeText(req.body.billNumber, 50);
      const locality = sanitizeText(req.body.locality, 100);
      const campaignId = sanitizeText(req.body.campaignId || 'meru-festive-2024', 50);

      if (!fullName || fullName.length < 2) {
        return res.status(400).json({ success: false, error: 'कृपया अपना नाम दर्ज करें (Please enter full name)' });
      }

      if (!cleanMobile) {
        return res.status(400).json({
          success: false,
          error: 'कृपया अपना सही 10 अंकों का मोबाइल नंबर दर्ज करें। इसी नंबर पर आपका Congratulations Message भेजा जाएगा।'
        });
      }

      const regResult = db.registerCustomerEntry({
        campaignId,
        fullName,
        mobile: cleanMobile,
        billNumber: billNumber || undefined,
        locality: locality || undefined
      });

      // If already played, return masked entry details
      if (regResult.alreadyPlayed) {
        return res.json({
          success: true,
          alreadyPlayed: true,
          entry: {
            ...regResult.entry,
            customerMobile: `${regResult.entry.customerMobile.slice(0, 2)}******${regResult.entry.customerMobile.slice(-2)}`
          }
        });
      }

      // Pre-registration success - Notice: Never expose any assigned prize here!
      res.json({
        success: true,
        alreadyPlayed: false,
        alreadyRegistered: regResult.alreadyRegistered,
        entryId: regResult.entry.id,
        customerName: regResult.entry.customerName
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// ATOMIC DRAW PLAY (CAMPAIGN SCOPED, STRICT SERVER-ONLY CONTROL, RATE LIMITED)
// Handles both POST /api/play (Requirement 3) and POST /api/draw/play
const handleDrawPlay = async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let fullName = sanitizeText(req.body.fullName, 100);
    const rawMobile = typeof req.body.mobile === 'string' ? req.body.mobile : '';
    let cleanMobile = db.normalizeMobile(rawMobile);
    const billNumber = sanitizeText(req.body.billNumber, 50);
    const locality = sanitizeText(req.body.locality, 100);
    const gameType = req.body.gameType || 'spin';
    const campaignId = sanitizeText(req.body.campaignId || 'meru-festive-2024', 50);
    const entryId = req.body.entryId ? sanitizeText(req.body.entryId, 50) : undefined;

    // If entryId was provided, resolve customer details if omitted
    if (entryId) {
      const existingEntry = db.findEntry(entryId);
      if (existingEntry) {
        if (!fullName) fullName = existingEntry.customerName;
        if (!cleanMobile) cleanMobile = existingEntry.customerMobile;
      } else {
        const asg = db.getAssignments().find(
          (a) => a.targetEntryId && a.targetEntryId.toLowerCase() === entryId.toLowerCase()
        );
        if (asg) {
          if (!fullName) fullName = asg.customerName || 'Valued Customer';
          if (!cleanMobile && asg.targetMobile) cleanMobile = db.normalizeMobile(asg.targetMobile);
        }
      }
    }

    // Explicitly reject tampering
    if (!fullName || fullName.length < 2) {
      return res.status(400).json({ success: false, error: 'कृपया अपना नाम दर्ज करें (Please enter full name)' });
    }

    if (!cleanMobile) {
      return res.status(400).json({ success: false, error: 'कृपया अपना सही 10 अंकों का मोबाइल नंबर दर्ज करें। इसी नंबर पर आपका Congratulations Message भेजा जाएगा।' });
    }

    if (gameType !== 'spin' && gameType !== 'scratch') {
      return res.status(400).json({ success: false, error: 'अमान्य गेम प्रकार (Invalid game type: choose spin or scratch)' });
    }

    // Any client-submitted gift_id, probability, or inventory is strictly ignored!
    // Server allocates prize atomically with Priority 1: ACTIVE assignment -> Priority 2: Next Gift -> Priority 3: Smart Random
    const result = await db.allocateDraw({
      campaignId,
      fullName,
      mobile: cleanMobile,
      billNumber: billNumber || undefined,
      locality: locality || undefined,
      gameType,
      entryId
    });

    res.json({
      success: true,
      alreadyPlayed: result.alreadyPlayed,
      entry: result.entry
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

apiRouter.post('/play', rateLimit(60000, 20, 'draw_play'), mobileRateLimit, handleDrawPlay);
apiRouter.post('/draw/play', rateLimit(60000, 20, 'draw_play'), mobileRateLimit, handleDrawPlay);

// Verify voucher / gift by ID (Public Verification - Masked Mobile, Sensitive Data Stripped)
apiRouter.get('/verify/:query', rateLimit(60000, 40, 'verify_query'), (req: Request, res: Response) => {
  try {
    const query = sanitizeText(req.params.query, 50);
    const entry = db.findEntry(query);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'यह कूपन या मोबाइल नंबर रिकॉर्ड में नहीं मिला। (Record not found)'
      });
    }

    res.json({
      success: true,
      verified: true,
      entry: {
        id: entry.id,
        campaignId: entry.campaignId,
        customerName: entry.customerName,
        customerMobile: `${entry.customerMobile.slice(0, 2)}******${entry.customerMobile.slice(-2)}`,
        giftName: entry.giftName,
        giftNameHi: entry.giftNameHi,
        giftImage: entry.giftImage,
        voucherCode: entry.voucherCode,
        resultStatus: entry.resultStatus,
        playedAt: entry.playedAt,
        claimedAt: entry.claimedAt,
        isTest: entry.isTest
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to sanitize and retrieve Supabase config from environment
function getSanitizedSupabaseConfig() {
  let url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest(\/v1)?$/i, '');
  url = url.replace(/\/+$/, '');

  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return { url, key, isConfigured: !!(url && key && url.startsWith('https://')) };
}

// SECURE ADMIN AUTHENTICATION MIDDLEWARE (ROLE-BASED & ALLOWLIST ENFORCED)
export async function checkAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'अनधिकृत प्रवेश (Admin authentication required. Please login with authorized Google account)'
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = db.verifySession(token);

  if (session) {
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'निषेध: आपके पास एडमिन अधिकार नहीं हैं (Forbidden: Admin role required)'
      });
    }
    req.adminSession = session;
    return next();
  }

  // Check direct Supabase Auth JWT token if configured
  const { url: supabaseUrl, key: supabaseKey, isConfigured: isSbConfigured } = getSanitizedSupabaseConfig();
  if (isSbConfigured) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user && user.email) {
        const cleanEmail = user.email.toLowerCase();
        const admin = db.getAdminUserByEmail(cleanEmail);
        if (admin) {
          if (!admin.is_active) {
            return res.status(403).json({
              success: false,
              error: 'Access Denied — This administrator account has been deactivated.'
            });
          }
          if (admin.auth_user_id && admin.auth_user_id !== user.id) {
            return res.status(403).json({
              success: false,
              error: 'Access Denied — Authentication User ID mismatch.'
            });
          }
          if (!admin.auth_user_id) {
            admin.auth_user_id = user.id;
          }
          req.adminSession = {
            token,
            userId: admin.id,
            auth_user_id: admin.auth_user_id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            avatar_url: admin.avatar_url,
            expiresAt: Date.now() + 24 * 3600 * 1000
          };
          return next();
        } else {
          return res.status(403).json({
            success: false,
            error: 'Access Denied — यह Google account MERU Mobile Shop Admin के लिए authorized नहीं है।'
          });
        }
      }
    } catch (sbErr) {
      // Fall through to 401
    }
  }

  return res.status(401).json({
    success: false,
    error: 'एडमिन सत्र समाप्त या अमान्य है। कृपया Google से पुनः लॉगिन करें (Session expired or unauthorized)'
  });
}

// Alias for requirement 8 centralized middleware name
export const requireAdmin = checkAdminAuth;

// SUPER_ADMIN ONLY MIDDLEWARE (RBAC Protection)
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.adminSession || req.adminSession.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'निषेध: केवल SUPER_ADMIN को ही यह कार्रवाई करने की अनुमति है (Forbidden: SUPER_ADMIN role required)'
    });
  }
  next();
}

// 1. Google OAuth Verification & Allowlist Authorization
apiRouter.post('/admin/auth/google', rateLimit(60000, 15, 'google_login'), async (req: Request, res: Response) => {
  try {
    const { accessToken, email, name, avatarUrl, authUserId } = req.body;
    if (!email && !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Google authentication credentials required'
      });
    }

    let verifiedEmail = (email || '').trim().toLowerCase();
    let verifiedName = name;
    let verifiedAvatarUrl = avatarUrl;
    let verifiedAuthUserId = authUserId;

    // Verify token with Supabase Auth if Supabase environment is configured
    const { url: supabaseUrl, key: supabaseKey, isConfigured: isSbConfigured } = getSanitizedSupabaseConfig();
    if (isSbConfigured && accessToken) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error || !user || !user.email) {
          return res.status(401).json({
            success: false,
            error: 'Google OAuth token verification failed. Please try signing in again.'
          });
        }
        verifiedEmail = user.email.toLowerCase();
        verifiedName = user.user_metadata?.full_name || user.user_metadata?.name || verifiedName;
        verifiedAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || verifiedAvatarUrl;
        verifiedAuthUserId = user.id;
      } catch (sbErr: any) {
        console.warn('Supabase Auth token verification warning:', sbErr.message);
      }
    }

    // Server-side check: Google authenticated user -> admin_users -> is_active -> role authorized
    const authResult = db.authenticateGoogleAdmin(verifiedEmail, {
      name: verifiedName,
      avatarUrl: verifiedAvatarUrl,
      authUserId: verifiedAuthUserId
    });

    if (!authResult.success) {
      return res.status(403).json(authResult);
    }

    res.json({
      success: true,
      token: authResult.session?.token,
      user: {
        id: authResult.user?.id,
        auth_user_id: authResult.user?.auth_user_id,
        email: authResult.user?.email,
        name: authResult.user?.name,
        role: authResult.user?.role,
        is_active: authResult.user?.is_active,
        avatar_url: authResult.user?.avatar_url,
        last_login_at: authResult.user?.last_login_at
      },
      message: 'Google authentication successful'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Authentication error' });
  }
});

// Supabase Configuration & Status check (Requirement 16)
apiRouter.get('/admin/supabase-status', (req: Request, res: Response) => {
  const sb = getSanitizedSupabaseConfig();
  res.json({
    success: true,
    isConfigured: sb.isConfigured,
    url: sb.url || null,
    hasKey: !!sb.key,
    missingVars: [
      !sb.url && 'VITE_SUPABASE_URL',
      !sb.key && 'VITE_SUPABASE_ANON_KEY'
    ].filter(Boolean)
  });
});

// 2. Current Authenticated Admin Profile (/admin/auth/me)
apiRouter.get('/admin/auth/me', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.adminSession!;
  const user = db.getAdminUserByEmail(session.email);
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'User is not active' });
  }
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    }
  });
});

// 3. Admin Logout
apiRouter.post('/admin/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (token) {
    db.revokeSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Backward compatible logout
apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (token) {
    db.revokeSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// 4. Admin Users Management (SUPER_ADMIN only for mutate, checkAdminAuth for read)
apiRouter.get('/admin/users', checkAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getAdminUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/users', checkAdminAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role } = req.body;
    const newUser = await db.addAdminUser({ email, name, role }, req.adminSession!);
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/users/:id', checkAdminAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, is_active } = req.body;
    const updated = await db.updateAdminUser(id, { name, role, is_active }, req.adminSession!);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/users/:id', checkAdminAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.removeAdminUser(id, req.adminSession!);
    res.json({ success: true, message: 'Admin user successfully removed' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin Stats & Monitor
apiRouter.get('/admin/stats', checkAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = db.getAdminStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set Live Next Gift
apiRouter.post('/admin/next-gift', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { giftId } = req.body;
    const result = db.setNextGift(giftId || null, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Set Draw Mode (random, next_gift, queue)
apiRouter.post('/admin/mode', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mode } = req.body;
    const result = db.setDrawMode(mode, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Set Queue
apiRouter.post('/admin/queue', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queue } = req.body;
    const result = db.updateQueue(Array.isArray(queue) ? queue : [], req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Campaign Settings (SUPER_ADMIN Only)
apiRouter.post('/admin/campaign', checkAdminAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.updateCampaignSettings(req.body, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Admin Settings (SUPER_ADMIN Only)
apiRouter.post('/admin/settings', checkAdminAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.updateAdminSettings(req.body, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Gifts List & Inventory (Enforces 100.00% Probability)
apiRouter.post('/admin/gifts', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gifts } = req.body;
    if (!Array.isArray(gifts)) {
      return res.status(400).json({ success: false, error: 'Gifts array required' });
    }
    const result = db.saveGifts(gifts, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add New Prize (PART 4 & TEST F)
apiRouter.post('/admin/gifts/add', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rebalance, ...params } = req.body;
    const result = db.addNewGift(params, { rebalance: Boolean(rebalance) }, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Probabilities (PART 5 & 6)
apiRouter.post('/admin/gifts/probabilities', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const probs = req.body.probabilities || req.body;
    const result = db.updateProbabilities(probs, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset Gifts to Defaults (PART 3)
apiRouter.post('/admin/gifts/reset-defaults', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.resetDefaultGifts(req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Duplicate Prize (PART 7)
apiRouter.post('/admin/gifts/:id/duplicate', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.duplicateGift(req.params.id, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Gift Stock (PART 10)
apiRouter.post('/admin/gifts/:id/stock', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.updateGiftStock(req.params.id, req.body, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete or Deactivate Prize (PART 7 - HISTORICAL PRESERVATION)
apiRouter.delete('/admin/gifts/:id', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.deleteGift(req.params.id, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Single Gift (Image, stock, active, probability, mode)
const updateSingleGiftHandler = (req: AuthenticatedRequest, res: Response) => {
  try {
    const giftId = req.params.id;
    const patch = req.body;
    const result = db.updateSingleGift(giftId, patch, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
apiRouter.put('/admin/gifts/:id', checkAdminAuth, updateSingleGiftHandler);
apiRouter.post('/admin/gifts/:id', checkAdminAuth, updateSingleGiftHandler);
apiRouter.post('/admin/gift/:id', checkAdminAuth, updateSingleGiftHandler);

// Update Grand Prizes (SUPER_ADMIN Only)
apiRouter.post('/admin/grand-prizes', checkAdminAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { grandPrizes } = req.body;
    if (!Array.isArray(grandPrizes)) {
      return res.status(400).json({ success: false, error: 'Grand prizes array required' });
    }
    const result = db.saveGrandPrizes(grandPrizes, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Counter Claim Verification: Mark Entry as Claimed (Cannot be claimed twice)
apiRouter.post('/admin/claim', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entryId } = req.body;
    if (!entryId) {
      return res.status(400).json({ success: false, error: 'Entry ID is required' });
    }
    const result = db.markEntryClaimed(entryId, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Real Shop Photo (SUPER_ADMIN Only)
apiRouter.post('/admin/shop-photo', checkAdminAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl || typeof photoUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Photo URL or base64 image required' });
    }
    const result = db.setShopPhoto(photoUrl, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Google Maps Link (SUPER_ADMIN Only)
apiRouter.post('/admin/maps', checkAdminAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mapsUrl } = req.body;
    const result = db.setGoogleMapsUrl(typeof mapsUrl === 'string' ? mapsUrl : '', req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Run Test Draw (Simulate customer draw without depleting real stock)
apiRouter.post('/admin/test-draw', checkAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const testName = req.body.name || `Demo Test User #${randomHex}`;
    const testMobile = `98260${randomHex}`;
    const gameType = req.body.gameType || (Math.random() > 0.5 ? 'spin' : 'scratch');

    // Temporarily set testMode flag on settings
    db.updateAdminSettings({ testMode: true }, req.adminSession!);
    const result = await db.allocateDraw({
      campaignId: 'meru-festive-2024',
      fullName: testName,
      mobile: testMobile,
      billNumber: `TEST-${randomHex}`,
      locality: 'Ganj Basoda Market',
      gameType
    });
    db.updateAdminSettings({ testMode: false }, req.adminSession!);

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export CSV of All Entries
apiRouter.get('/admin/export-csv', checkAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const csv = db.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=meru-mobile-luckydraw-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PRIZE CONTROL CENTER API ENDPOINTS
// 1. Get Prize Assignments (with optional status and search filter)
const getPrizeAssignmentsHandler = (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const assignments = db.getPrizeAssignments({ status, search });
    res.json({ success: true, assignments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
apiRouter.get('/admin/assignments', checkAdminAuth, getPrizeAssignmentsHandler);
apiRouter.get('/admin/prize-assignments', checkAdminAuth, getPrizeAssignmentsHandler);

// 2. Assign Prize (Specific Entry, Next Eligible, Scheduled, or Reserve Only)
const assignPrizeHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      prizeId,
      mode,
      targetEntryId,
      targetMobile,
      customerName,
      billNumber,
      scheduledAt,
      expiresAt,
      note,
      campaignId
    } = req.body;

    if (!prizeId) {
      return res.status(400).json({ success: false, error: 'Prize ID is required' });
    }

    if (!mode || !['ENTRY_SPECIFIC', 'NEXT_ELIGIBLE', 'SCHEDULED', 'RESERVE_ONLY'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Valid assignment mode is required' });
    }

    const result = await db.createPrizeAssignment(
      {
        campaignId,
        prizeId,
        mode,
        targetEntryId,
        targetMobile,
        customerName,
        billNumber,
        scheduledAt,
        expiresAt,
        note,
        autoActivate: Boolean(req.body.autoActivate)
      } as any,
      req.adminSession!
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
apiRouter.post('/admin/assignments/assign', checkAdminAuth, assignPrizeHandler);
apiRouter.post('/admin/prize-assignments', checkAdminAuth, assignPrizeHandler);

// 2B. Activate Prize Assignment (Requirement 1: POST /api/admin/prize-assignments/:assignmentId/activate)
const activateAssignmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const assignmentId = req.params.assignmentId || req.body.assignmentId;
    if (!assignmentId) {
      return res.status(400).json({ success: false, error: 'Assignment ID is required' });
    }
    const result = await db.activatePrizeAssignment(assignmentId, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
apiRouter.post('/admin/prize-assignments/:assignmentId/activate', checkAdminAuth, activateAssignmentHandler);
apiRouter.post('/admin/assignments/activate', checkAdminAuth, activateAssignmentHandler);

// 3. Cancel Prize Assignment (Requirement 13: POST /api/admin/prize-assignments/:assignmentId/cancel)
const cancelAssignmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const assignmentId = req.params.assignmentId || req.body.assignmentId;
    const reason = req.body.reason || req.query.reason;
    if (!assignmentId) {
      return res.status(400).json({ success: false, error: 'Assignment ID is required' });
    }
    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Cancellation reason is mandatory (minimum 3 characters)' });
    }
    const result = await db.cancelPrizeAssignment(assignmentId, String(reason).trim(), req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
apiRouter.post('/admin/prize-assignments/:assignmentId/cancel', checkAdminAuth, cancelAssignmentHandler);
apiRouter.post('/admin/assignments/cancel', checkAdminAuth, cancelAssignmentHandler);

// 4. Adjust Allocated Prize (post-play modification with mandatory reason & audit)
apiRouter.post('/admin/assignments/adjust', checkAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entryId, newPrizeId, reason } = req.body;
    if (!entryId || !newPrizeId || !reason) {
      return res.status(400).json({ success: false, error: 'Entry ID, New Prize ID, and reason are required' });
    }
    const result = await db.adjustAllocatedPrize({ entryId, newPrizeId, reason }, req.adminSession!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Search Customers & Entries (Entry ID, Mobile, Name, Bill Number)
apiRouter.get('/admin/search-customers', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const results = db.searchCustomersAndEntries(query);
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Audit Logs
apiRouter.get('/admin/audit-logs', checkAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = db.getAuditLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protect base /admin and all wildcard /admin/* routes
apiRouter.all('/admin', checkAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'Admin API authorized' });
});

apiRouter.all('/admin/*', checkAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.status(404).json({ success: false, error: 'Admin endpoint not found' });
});
