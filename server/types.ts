export interface Campaign {
  id: string;
  name: string;
  subtitle: string;
  status: 'active' | 'paused' | 'ended';
  spinEnabled: boolean;
  scratchEnabled: boolean;
  registrationEnabled: boolean;
  instantGiftsEnabled: boolean;
  grandPrizesEnabled: boolean;
  soundEnabled: boolean;
  startDate: string;
  endDate: string;
  maxDailyEntries: number;
  rules: string[];
}

export interface Gift {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  image: string;
  description: string;
  totalQuantity: number;
  remainingQuantity: number;
  active: boolean;
  displayOrder: number;
  probability: number; // percentage (0-100)
  mode: 'smart_random' | 'admin_controlled';
  category: 'gadget' | 'accessory' | 'voucher';
  voucherCode?: string;
  condition?: string; // e.g. applicable condition for ₹500 OFF
  dailyLimit?: number;
  cooldown?: number;
  minStock?: number;
  notes?: string;
  prizeType?: 'SMART_RANDOM' | 'ADMIN_CONTROLLED' | 'GRAND_PRIZE';
  color: string;
}

export interface GrandPrize {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  image: string;
  description: string;
  quantity: number;
  drawDate: string;
  status: 'active' | 'announced';
}

export interface Customer {
  id: string;
  fullName: string;
  mobile: string;
  billNumber?: string;
  locality?: string;
  createdAt: string;
}

export interface DrawEntry {
  id: string; // MMS-2026-XXXXXXXX (collision-safe)
  campaignId: string;
  customerId: string;
  customerName: string;
  customerMobile: string; // Normalized 10 digits
  billNumber?: string;
  locality?: string;
  gameType?: 'spin' | 'scratch';
  giftId?: string;
  giftName?: string;
  giftNameHi?: string;
  giftIcon?: string;
  giftImage?: string;
  voucherCode?: string;
  condition?: string;
  resultStatus: 'registered' | 'locked' | 'claimed';
  createdAt: string;
  playedAt?: string;
  claimedAt?: string;
  claimedBy?: string;
  isTest?: boolean;
  whatsappStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | 'not_configured';
  whatsappMessageId?: string;
  whatsappError?: string;
  whatsappAttemptedAt?: string;
}

export interface PrizeAssignment {
  id: string; // ASG-XXXXXXXX
  campaignId: string;
  prizeId: string;
  prizeName: string;
  prizeNameHi: string;
  prizeImage: string;
  adminId: string;
  adminEmail: string;
  mode: 'ENTRY_SPECIFIC' | 'NEXT_ELIGIBLE' | 'SCHEDULED' | 'RESERVE_ONLY';
  status: 'PENDING' | 'REVIEW' | 'ACTIVE' | 'ALLOCATED' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED';
  targetEntryId?: string; // e.g. MMS-2026-XXXXXXXX
  targetMobile?: string; // Normalized 10 digits
  customerName?: string;
  billNumber?: string;
  createdAt: string;
  activatedAt?: string;
  activatedBy?: string;
  activated_at?: string;
  activated_by?: string;
  scheduledAt?: string; // ISO datetime string
  expiresAt?: string;
  allocatedAt?: string;
  allocatedEntryId?: string;
  allocatedPrizeId?: string;
  allocatedBy?: string;
  allocated_at?: string;
  allocated_entry_id?: string;
  allocated_prize_id?: string;
  allocated_by?: string;
  note?: string;
  isGrandPrize?: boolean;
}

export interface AdminUser {
  id: string; // UUID primary key
  auth_user_id?: string; // UUID from Supabase auth.users
  email: string; // normalized lowercase
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  avatar_url?: string;
}

export interface AdminSession {
  token: string;
  userId: string;
  auth_user_id?: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  avatar_url?: string;
  expiresAt: number;
}

export interface AdminSettings {
  mode: 'random' | 'next_gift' | 'queue';
  nextGiftId: string | null;
  queue: string[]; // list of gift IDs to consume sequentially
  shopPhotoUrl: string;
  googleMapsUrl: string;
  testMode: boolean;
  antiRepeatCooldownWindow: number; // default: 5 draws
  whatsappConfigured?: boolean;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminUser: string;
  admin_user_id?: string;
  email?: string;
  action: string;
  entity: string;
  target?: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface DatabaseSchema {
  campaign: Campaign;
  gifts: Gift[];
  grandPrizes: GrandPrize[];
  customers: Customer[];
  entries: DrawEntry[];
  assignments: PrizeAssignment[];
  settings: AdminSettings;
  auditLogs: AuditLog[];
  adminUsers: AdminUser[];
  sessions: AdminSession[];
  resetTokens: Array<{ token: string; email: string; expiresAt: number }>;
}
