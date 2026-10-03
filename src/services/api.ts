import { PublicConfigResponse, DrawEntry, AdminStats } from '../types.js';

const ADMIN_TOKEN_KEY = 'meru_admin_token';
const SAVED_ENTRY_KEY = 'meru_saved_entry';

export const api = {
  // Public APIs
  async getConfig(): Promise<PublicConfigResponse> {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load campaign configuration');
    return res.json();
  },

  // Check customer played status with no-cache (Requirement 10)
  async checkCustomer(mobile: string, campaignId = 'meru-festive-2024'): Promise<{ success: boolean; alreadyPlayed: boolean; entry?: DrawEntry }> {
    const clean = mobile.replace(/\D/g, '').slice(-10);
    const res = await fetch(`/api/customer/${clean}?campaignId=${encodeURIComponent(campaignId)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-store' }
    });
    if (!res.ok) throw new Error('Failed to check customer status');
    return res.json();
  },

  // Fetch Entry Status for page refresh / live reveal use case (Requirement 4 & 5 & 10)
  // Does NOT leak reserved prize identity before play!
  async getEntryStatus(entryId: string): Promise<{
    success: boolean;
    can_play: boolean;
    alreadyPlayed: boolean;
    has_active_assignment?: boolean;
    status?: string;
    entryId?: string;
    customerName?: string;
    entry?: DrawEntry;
    campaignId?: string;
    error?: string;
  }> {
    const res = await fetch(`/api/entries/${encodeURIComponent(entryId.trim())}/status?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-store' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to check entry status');
    }
    return data;
  },

  // Customer Play - strictly server-authoritative (Requirement 3 & 6)
  async play(payload: {
    campaignId?: string;
    fullName?: string;
    mobile?: string;
    billNumber?: string;
    locality?: string;
    gameType: 'spin' | 'scratch';
    entryId?: string;
  }): Promise<{ success: boolean; alreadyPlayed: boolean; entry: DrawEntry; error?: string }> {
    const res = await fetch('/api/play', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit draw entry');
    }
    try {
      localStorage.setItem(SAVED_ENTRY_KEY, JSON.stringify(data.entry));
    } catch {}
    return data;
  },

  async playDraw(payload: {
    campaignId?: string;
    fullName?: string;
    mobile?: string;
    billNumber?: string;
    locality?: string;
    gameType: 'spin' | 'scratch';
    entryId?: string;
  }): Promise<{ success: boolean; alreadyPlayed: boolean; entry: DrawEntry; error?: string }> {
    return this.play(payload);
  },

  async verifyEntry(query: string): Promise<{ success: boolean; verified: boolean; entry?: DrawEntry; error?: string }> {
    const res = await fetch(`/api/verify/${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Entry could not be verified');
    }
    return data;
  },

  getLocalSavedEntry(): DrawEntry | null {
    try {
      const raw = localStorage.getItem(SAVED_ENTRY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearLocalSavedEntry() {
    try {
      localStorage.removeItem(SAVED_ENTRY_KEY);
    } catch {}
  },

  // Admin Authentication & APIs (SessionStorage Scoped - No credentials in localStorage)
  getAdminToken(): string | null {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAdminToken(token: string) {
    try {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      // Clean up legacy localStorage if present
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {}
  },

  async logoutAdmin(): Promise<void> {
    const token = this.getAdminToken();
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {}
  },

  async loginWithGoogle(
    email: string,
    name?: string,
    accessToken?: string,
    avatarUrl?: string,
    authUserId?: string
  ): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const res = await fetch('/api/admin/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), name, accessToken, avatarUrl, authUserId }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      this.setAdminToken(data.token);
    }
    return data;
  },

  async getCurrentAdminUser(): Promise<{ success: boolean; user?: any; error?: string }> {
    const token = this.getAdminToken();
    if (!token) return { success: false, error: 'No admin token' };
    const res = await fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      this.logoutAdmin();
      return { success: false, error: 'Session expired or unauthorized' };
    }
    return res.json();
  },

  async getAdminUsers(): Promise<{ success: boolean; users?: any[]; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load admin users');
    return res.json();
  },

  async addAdminUser(payload: { email: string; name?: string; role: 'SUPER_ADMIN' | 'ADMIN' }): Promise<{ success: boolean; user?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add admin user');
    return data;
  },

  async updateAdminUser(
    id: string,
    updates: { name?: string; role?: 'SUPER_ADMIN' | 'ADMIN'; is_active?: boolean }
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update admin user');
    return data;
  },

  async removeAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to remove admin user');
    return data;
  },

  async getAdminStats(): Promise<{ success: boolean; stats: AdminStats }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized or failed to load admin dashboard');
    return res.json();
  },

  async setNextGift(giftId: string | null): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/next-gift', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ giftId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update next gift');
    return data;
  },

  async setDrawMode(mode: 'random' | 'next_gift' | 'queue'): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/mode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode }),
    });
    return res.json();
  },

  async updateQueue(queue: string[]): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ queue }),
    });
    return res.json();
  },

  async updateCampaign(patch: Partial<any>): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    return res.json();
  },

  async updateSettings(patch: Partial<any>): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    return res.json();
  },

  async saveGifts(gifts: any[]): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/gifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gifts }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save gifts');
    return data;
  },

  async updateSingleGift(giftId: string, patch: any): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/gift/${encodeURIComponent(giftId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update gift');
    return data;
  },

  async saveGrandPrizes(grandPrizes: any[]): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/grand-prizes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ grandPrizes }),
    });
    return res.json();
  },

  async updateShopPhoto(photoUrl: string): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/shop-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ photoUrl }),
    });
    return res.json();
  },

  async updateGoogleMapsUrl(mapsUrl: string): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mapsUrl }),
    });
    return res.json();
  },

  async claimEntry(entryId: string): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ entryId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to claim entry');
    return data;
  },

  async runTestDraw(name?: string, gameType?: 'spin' | 'scratch'): Promise<any> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/test-draw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, gameType }),
    });
    return res.json();
  },

  // PRIZE CONTROL CENTER APIS
  async getAssignments(status?: string, search?: string): Promise<{ success: boolean; assignments: any[] }> {
    const token = this.getAdminToken();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/assignments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch assignments');
    return res.json();
  },

  async assignPrize(payload: {
    prizeId: string;
    mode: 'ENTRY_SPECIFIC' | 'NEXT_ELIGIBLE' | 'SCHEDULED' | 'RESERVE_ONLY';
    targetEntryId?: string;
    targetMobile?: string;
    customerName?: string;
    billNumber?: string;
    scheduledAt?: string;
    expiresAt?: string;
    note?: string;
    campaignId?: string;
  }): Promise<{ success: boolean; assignment: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/assignments/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to assign prize');
    return data;
  },

  // 2B. Activate Prize Assignment (Requirement 1: POST /api/admin/prize-assignments/:assignmentId/activate)
  async activateAssignment(assignmentId: string): Promise<{ success: boolean; assignment: any; error?: string }> {
    const token = this.getAdminToken();
    let res = await fetch(`/api/admin/prize-assignments/${encodeURIComponent(assignmentId)}/activate`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignmentId }),
    });

    if (res.status === 404) {
      res = await fetch('/api/admin/assignments/activate', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignmentId }),
      });
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to activate assignment');
    }
    return data;
  },

  // 3. Cancel Prize Assignment (Requirement 13: POST /api/admin/prize-assignments/:assignmentId/cancel)
  async cancelAssignment(assignmentId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getAdminToken();
    let res = await fetch(`/api/admin/prize-assignments/${encodeURIComponent(assignmentId)}/cancel`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignmentId, reason }),
    });

    if (res.status === 404) {
      res = await fetch('/api/admin/assignments/cancel', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignmentId, reason }),
      });
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to cancel assignment');
    }
    return data;
  },

  async adjustAllocatedPrize(payload: {
    entryId: string;
    newPrizeId: string;
    reason: string;
  }): Promise<{ success: boolean; entry: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/assignments/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to adjust prize');
    return data;
  },

  async searchCustomers(query: string): Promise<{ success: boolean; results: any[] }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/search-customers?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to search customers');
    return res.json();
  },

  async getAuditLogs(limit = 100): Promise<{ success: boolean; logs: any[] }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/audit-logs?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async addGift(giftData: any, options: { rebalance?: boolean } = {}): Promise<{ success: boolean; gift?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/gifts/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...giftData, rebalance: options.rebalance }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add prize');
    return data;
  },

  async updateGift(giftId: string, patch: any): Promise<{ success: boolean; gift?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/gifts/${encodeURIComponent(giftId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update prize');
    return data;
  },

  async deleteGift(giftId: string): Promise<{ success: boolean; deactivated?: boolean; message?: string; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/gifts/${encodeURIComponent(giftId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete prize');
    return data;
  },

  async duplicateGift(giftId: string): Promise<{ success: boolean; gift?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/gifts/${encodeURIComponent(giftId)}/duplicate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to duplicate prize');
    return data;
  },

  async updateProbabilities(probabilities: Record<string, number>): Promise<{ success: boolean; totalProbability?: number; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch('/api/admin/gifts/probabilities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ probabilities }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update probabilities');
    return data;
  },

  async updateGiftStock(
    giftId: string,
    payload: { delta?: number; newQuantity?: number; totalQuantity?: number }
  ): Promise<{ success: boolean; gift?: any; error?: string }> {
    const token = this.getAdminToken();
    const res = await fetch(`/api/admin/gifts/${encodeURIComponent(giftId)}/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update stock');
    return data;
  },
};

