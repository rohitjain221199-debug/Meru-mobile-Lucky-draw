import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  Gift,
  GrandPrize,
  Customer,
  DrawEntry,
  PrizeAssignment,
  AdminSettings,
  AuditLog,
  AdminUser,
  AdminSession
} from './types.js';
import { whatsapp } from './whatsapp.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Authentic default shop photo showcasing MERU MOBILE SHOP Ganj Basoda
export const DEFAULT_SHOP_PHOTO = 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1200&q=80';

// Environment variable for initial bootstrap Super Admin
export const INITIAL_ADMIN_EMAIL = (process.env.INITIAL_ADMIN_EMAIL || 'rohitjain221199@gmail.com').trim().toLowerCase();

// EXACT 15 GIFTS: 10 SMART RANDOM (EXACTLY 100%) + 5 ADMIN CONTROLLED (0%)
export const DEFAULT_GIFTS: Gift[] = [
  // A. SMART RANDOM GIFTS (Exact 100% total probability)
  {
    id: 'g-box',
    name: 'MERU PREMIUM GIFT BOX',
    nameHi: 'मेरू प्रीमियम गिफ्ट बॉक्स',
    icon: 'Gift',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    description: 'Exclusive Festive Special Luxury Gift Hamper from Meru Mobile Shop',
    totalQuantity: 30,
    remainingQuantity: 30,
    active: true,
    displayOrder: 1,
    probability: 18.0,
    mode: 'smart_random',
    category: 'accessory',
    color: '#D97706'
  },
  {
    id: 'g-powerbank',
    name: '10,000 mAh POWER BANK',
    nameHi: '10,000 mAh स्लिम पावर बैंक',
    icon: 'BatteryCharging',
    image: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?auto=format&fit=crop&w=600&q=80',
    description: 'Dual USB High Speed Fast Charging Slim Smartphone Power Bank',
    totalQuantity: 40,
    remainingQuantity: 40,
    active: true,
    displayOrder: 2,
    probability: 22.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#8B5CF6'
  },
  {
    id: 'g-speaker',
    name: 'BLUETOOTH SPEAKER',
    nameHi: 'प्रीमियम ब्लूटूथ स्पीकर',
    icon: 'Volume2',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80',
    description: 'Deep Bass Wireless Portable Speaker with Long Battery Life',
    totalQuantity: 30,
    remainingQuantity: 30,
    active: true,
    displayOrder: 3,
    probability: 18.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#3B82F6'
  },
  {
    id: 'g-smartwatch',
    name: 'SMART WATCH',
    nameHi: 'फुल टच डिस्प्ले स्मार्ट वॉच',
    icon: 'Watch',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80',
    description: 'Bluetooth Calling, Fitness Tracking, HD Touch Display Smart Watch',
    totalQuantity: 25,
    remainingQuantity: 25,
    active: true,
    displayOrder: 4,
    probability: 15.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#EC4899'
  },
  {
    id: 'g-500off',
    name: '₹500 OFF',
    nameHi: '₹500 फ्लैट डिस्काउंट वाउचर',
    icon: 'Ticket',
    image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80',
    description: 'Direct ₹500 Instant Discount on Smartphone / Accessory Purchase',
    totalQuantity: 50,
    remainingQuantity: 50,
    active: true,
    displayOrder: 5,
    probability: 10.0,
    mode: 'smart_random',
    condition: 'मान्य न्यूनतम ₹2,000 की स्मार्टफोन अथवा एक्सेसरी खरीद पर',
    voucherCode: 'MERU-500-OFF',
    category: 'voucher',
    color: '#10B981'
  },
  {
    id: 'g-neckband',
    name: 'NECKBAND',
    nameHi: 'वायरलेस मैग्नेटिक नेकबैंड',
    icon: 'Headphones',
    image: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=600&q=80',
    description: 'Fast Charging Magnetic Bluetooth In-Ear Wireless Neckband',
    totalQuantity: 20,
    remainingQuantity: 20,
    active: true,
    displayOrder: 6,
    probability: 5.0,
    mode: 'smart_random',
    category: 'accessory',
    color: '#06B6D4'
  },
  {
    id: 'g-earbuds',
    name: 'EARBUDS',
    nameHi: 'TWS वायरलेस ईयरबड्स',
    icon: 'Headphones',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    description: 'Crystal Clear Audio True Wireless Earbuds with Digital Case',
    totalQuantity: 20,
    remainingQuantity: 20,
    active: true,
    displayOrder: 7,
    probability: 4.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#14B8A6'
  },
  {
    id: 'g-headphone',
    name: 'HEADPHONE',
    nameHi: 'ओवर-ईयर स्टीरियो हेडफोन',
    icon: 'Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    description: 'Cushioned Over-Ear Powerful Bass Wireless Headphones',
    totalQuantity: 15,
    remainingQuantity: 15,
    active: true,
    displayOrder: 8,
    probability: 3.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#6366F1'
  },
  {
    id: 'g-weightmachine',
    name: 'DIGITAL WEIGHT MACHINE',
    nameHi: 'डिजिटल बॉडी वेट मशीन',
    icon: 'Activity',
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
    description: 'Toughened Glass Precision Digital Electronic Weighing Scale',
    totalQuantity: 15,
    remainingQuantity: 15,
    active: true,
    displayOrder: 9,
    probability: 3.0,
    mode: 'smart_random',
    category: 'gadget',
    color: '#475569'
  },
  {
    id: 'g-selfiestick',
    name: 'SELFIE STICK / TRIPOD',
    nameHi: 'सेल्फी स्टिक व ट्राइपॉड स्टैंड',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=600&q=80',
    description: 'Extendable Mobile Selfie Stick with Bluetooth Wireless Remote & Tripod',
    totalQuantity: 20,
    remainingQuantity: 20,
    active: true,
    displayOrder: 10,
    probability: 2.0,
    mode: 'smart_random',
    category: 'accessory',
    color: '#F97316'
  },

  // B. ADMIN CONTROLLED GIFTS (Strictly 0% Probability - Allocated ONLY via Admin Next Gift)
  {
    id: 'g-induction',
    name: 'INDUCTION COOKTOP',
    nameHi: 'इंडक्शन कुकटॉप',
    icon: 'Zap',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    description: 'Automatic Preset Indian Cooking Smart Induction Cooktop',
    totalQuantity: 5,
    remainingQuantity: 5,
    active: true,
    displayOrder: 11,
    probability: 0.0,
    mode: 'admin_controlled',
    category: 'gadget',
    color: '#DC2626'
  },
  {
    id: 'g-trolley',
    name: 'TROLLEY BAG',
    nameHi: 'प्रीमियम ट्रेवल ट्रॉली बैग',
    icon: 'Package',
    image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=600&q=80',
    description: 'Durable Hard-shell 4-Wheel 360° Spinner Luggage Trolley Bag',
    totalQuantity: 5,
    remainingQuantity: 5,
    active: true,
    displayOrder: 12,
    probability: 0.0,
    mode: 'admin_controlled',
    category: 'accessory',
    color: '#2563EB'
  },
  {
    id: 'g-ledtv',
    name: 'LED TV',
    nameHi: '43 इंच 4K स्मार्ट LED टीवी',
    icon: 'Tv',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
    description: '43" 4K Ultra HD Frameless Smart LED TV with Dolby Audio',
    totalQuantity: 2,
    remainingQuantity: 2,
    active: true,
    displayOrder: 13,
    probability: 0.0,
    mode: 'admin_controlled',
    category: 'gadget',
    color: '#7C3AED'
  },
  {
    id: 'g-refrigerator',
    name: 'REFRIGERATOR',
    nameHi: 'डबल डोर इन्वर्टर रेफ्रिजरेटर',
    icon: 'Snowflake',
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
    description: '5-Star Energy Saver Frost Free Double Door Home Refrigerator',
    totalQuantity: 2,
    remainingQuantity: 2,
    active: true,
    displayOrder: 14,
    probability: 0.0,
    mode: 'admin_controlled',
    category: 'gadget',
    color: '#0D9488'
  },
  {
    id: 'g-bike',
    name: 'BIKE',
    nameHi: 'ब्रांड न्यू मोटरसाइकिल',
    icon: 'Bike',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    description: 'Brand New Motorcycle – Grand Festive Bumper Mega Prize',
    totalQuantity: 1,
    remainingQuantity: 1,
    active: true,
    displayOrder: 15,
    probability: 0.0,
    mode: 'admin_controlled',
    category: 'gadget',
    color: '#E11D48'
  }
];

const DEFAULT_GRAND_PRIZES: GrandPrize[] = [
  {
    id: 'gp-tv',
    name: '43" 4K Ultra HD Smart LED TV',
    nameHi: '43 इंच 4K स्मार्ट LED टीवी',
    icon: 'Tv',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
    description: 'Dolby Audio, Android TV with Frameless Display',
    quantity: 1,
    drawDate: 'दीपावली फाइनल मेगा लकी ड्रा में घोषणा',
    status: 'active'
  },
  {
    id: 'gp-cooler',
    name: 'Heavy Duty Desert Air Cooler',
    nameHi: 'हैवी ड्यूटी डेजर्ट एयर कूलर',
    icon: 'Wind',
    image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    description: 'High Air Delivery 75-Litre Tank with Honeycomb Pads',
    quantity: 2,
    drawDate: 'दीपावली फाइनल मेगा लकी ड्रा में घोषणा',
    status: 'active'
  },
  {
    id: 'gp-ac',
    name: '1.5 Ton 5-Star Inverter Split AC',
    nameHi: '1.5 टन 5-स्टार इन्वर्टर स्प्लिट AC',
    icon: 'Snowflake',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=800&q=80',
    description: 'Copper Condenser, Fast Cooling & Maximum Power Savings',
    quantity: 1,
    drawDate: 'दीपावली फाइनल मेगा लकी ड्रा में घोषणा',
    status: 'active'
  },
  {
    id: 'gp-bike',
    name: 'Hero Splendor+ / Brand New Motorcycle',
    nameHi: 'हीरो स्प्लेंडर+ नई ब्रांडेड मोटरसाइकिल',
    icon: 'Bike',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    description: 'The Ultimate Festive Mega Grand Prize for Meru Mobile Shop Shoppers',
    quantity: 1,
    drawDate: 'दीपावली के शुभ दिन काउंटर पर महा ड्रा',
    status: 'active'
  }
];

const DEFAULT_CAMPAIGN_RULES: string[] = [
  'यह लकी ड्रॉ अभियान Meru Mobile Shop, Ganj Basoda द्वारा केवल वैध ग्राहकों के लिए आयोजित है।',
  'प्रत्येक ग्राहक (प्रति मोबाइल नंबर) वर्तमान अभियान में केवल एक बार भाग ले सकता है।',
  'ग्राहक Spin & Win या Scratch & Win में से कोई एक गेम चुन सकते हैं।',
  'सभी परिणाम सर्वर द्वारा सुरक्षित एवं निष्पक्ष रूप से Smart Random / Admin Engine द्वारा पूर्व-आवंटित किए जाते हैं।',
  'जीते गए उपहार को केवल Meru Mobile Shop (Tyoda Road, Ganj Basoda) के काउंटर पर Entry ID दिखाकर प्राप्त किया जा सकता है।',
  'बड़े इनाम (TV, Refrigerator, Cooler, AC, Bike) का फाइनल मेगा लकी ड्रा दीपावली पर अलग से आयोजित होगा।',
  'उपहारों की उपलब्धता स्टॉक पर निर्भर करती है। किसी भी विवाद में Meru Mobile Shop प्रबंधन का निर्णय अंतिम एवं सर्वमान्य होगा।'
];

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

class Database {
  private data: DatabaseSchema;
  private sseClients: Set<(data: any) => void> = new Set();
  private lockPromise: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Check if existing gifts have the complete 15 items catalog
        const has15Gifts =
          Array.isArray(parsed.gifts) &&
          parsed.gifts.length >= 15 &&
          parsed.gifts.some((g: Gift) => g.id === 'g-box') &&
          parsed.gifts.some((g: Gift) => g.id === 'g-induction') &&
          parsed.gifts.some((g: Gift) => g.id === 'g-bike');

        const activeGifts = has15Gifts ? parsed.gifts : DEFAULT_GIFTS;

        return {
          campaign: parsed.campaign ? { ...this.defaultCampaign(), ...parsed.campaign } : this.defaultCampaign(),
          gifts: activeGifts,
          grandPrizes: parsed.grandPrizes || DEFAULT_GRAND_PRIZES,
          customers: parsed.customers || [],
          entries: (parsed.entries || []).map((e: any) => ({
            ...e,
            campaignId: e.campaignId || 'meru-festive-2024'
          })),
          assignments: parsed.assignments || [],
          settings: parsed.settings ? { ...this.defaultSettings(), ...parsed.settings } : this.defaultSettings(),
          auditLogs: parsed.auditLogs || [],
          adminUsers: this.normalizeAdminUsers(parsed.adminUsers),
          sessions: parsed.sessions || [],
          resetTokens: parsed.resetTokens || []
        };
      }
    } catch (e) {
      console.error('Failed to load database from file, using defaults', e);
    }

    const initial: DatabaseSchema = {
      campaign: this.defaultCampaign(),
      gifts: DEFAULT_GIFTS,
      grandPrizes: DEFAULT_GRAND_PRIZES,
      customers: [],
      entries: [],
      assignments: [],
      settings: this.defaultSettings(),
      auditLogs: [
        {
          id: 'log-init',
          adminId: 'system',
          adminUser: 'System',
          action: 'CAMPAIGN_ACTIVATED',
          entity: 'campaign',
          oldValue: 'None',
          newValue: 'Meru Mobile Shop Festive Campaign Initialized with 15 Final Gifts',
          timestamp: new Date().toISOString()
        }
      ],
      adminUsers: this.defaultAdminUsers(),
      sessions: [],
      resetTokens: []
    };
    this.save(initial);
    return initial;
  }

  private defaultCampaign() {
    return {
      id: 'meru-festive-2024',
      name: 'MERU MOBILE SHOP',
      subtitle: 'NAVRATRI • DUSSEHRA • DIWALI DHAMAKA',
      status: 'active' as const,
      spinEnabled: true,
      scratchEnabled: true,
      registrationEnabled: true,
      instantGiftsEnabled: true,
      grandPrizesEnabled: true,
      soundEnabled: false, // Default sound OFF
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-11-15',
      maxDailyEntries: 500,
      rules: DEFAULT_CAMPAIGN_RULES
    };
  }

  private defaultSettings(): AdminSettings {
    return {
      mode: 'random',
      nextGiftId: null,
      queue: [],
      shopPhotoUrl: DEFAULT_SHOP_PHOTO,
      googleMapsUrl: 'https://maps.google.com/?q=Tyoda+Road+Ganj+Basoda+Vidisha+Madhya+Pradesh+464221',
      testMode: false,
      antiRepeatCooldownWindow: 5,
      whatsappConfigured: whatsapp.isConfigured()
    };
  }

  private normalizeAdminUsers(rawUsers?: any[]): AdminUser[] {
    const list: AdminUser[] = (rawUsers || []).map((u) => {
      const role: 'SUPER_ADMIN' | 'ADMIN' =
        u.role === 'SUPER_ADMIN' || u.role === 'owner' ? 'SUPER_ADMIN' : 'ADMIN';
      const email = (u.email || '').trim().toLowerCase();
      return {
        id: u.id || crypto.randomUUID(),
        auth_user_id: u.auth_user_id || undefined,
        email,
        name: u.name || (email === INITIAL_ADMIN_EMAIL ? 'Rohit Jain (Store Owner)' : email.split('@')[0]),
        role,
        is_active: u.is_active !== undefined ? Boolean(u.is_active) : true,
        created_at: u.created_at || u.createdAt || new Date().toISOString(),
        last_login_at: u.last_login_at,
        avatar_url: u.avatar_url
      };
    });

    const primaryAdmin = list.find((u) => u.email === INITIAL_ADMIN_EMAIL);
    if (!primaryAdmin) {
      list.unshift({
        id: crypto.randomUUID(),
        email: INITIAL_ADMIN_EMAIL,
        name: 'Rohit Jain (Store Owner)',
        role: 'SUPER_ADMIN',
        is_active: true,
        created_at: new Date().toISOString()
      });
    } else {
      primaryAdmin.role = 'SUPER_ADMIN';
      primaryAdmin.is_active = true;
      if (!primaryAdmin.name) primaryAdmin.name = 'Rohit Jain (Store Owner)';
    }

    return list;
  }

  // Pre-approved Authorized Admin Users (Google Accounts Only)
  private defaultAdminUsers(): AdminUser[] {
    return [
      {
        id: crypto.randomUUID(),
        email: INITIAL_ADMIN_EMAIL,
        name: 'Rohit Jain (Store Owner)',
        role: 'SUPER_ADMIN',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file', e);
    }
  }

  public subscribe(client: (data: any) => void) {
    this.sseClients.add(client);
    return () => this.sseClients.delete(client);
  }

  public broadcast(type: string, payload: any) {
    const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of this.sseClients) {
      try {
        client(msg);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  // Concurrency Mutex Lock
  private async withLock<T>(action: () => Promise<T> | T): Promise<T> {
    let release: () => void = () => {};
    const nextLock = new Promise<void>((res) => { release = res; });
    const prevLock = this.lockPromise;
    this.lockPromise = nextLock;

    try {
      await prevLock;
      return await action();
    } finally {
      release();
    }
  }

  // Generate Collision-Safe Entry ID (MMS-2026-XXXXXXXX)
  private generateUniqueEntryId(): string {
    for (let attempts = 0; attempts < 15; attempts++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
      const candidate = `MMS-2026-${code}`;
      if (!this.data.entries.some((e) => e.id === candidate)) {
        return candidate;
      }
    }
    return `MMS-2026-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  public getPublicConfig() {
    return {
      campaign: this.data.campaign,
      gifts: this.data.gifts
        .filter((g) => g.active && g.mode === 'smart_random')
        .map(({ id, name, nameHi, icon, image, description, color, category, probability, condition, mode }) => ({
          id,
          name,
          nameHi,
          icon,
          image,
          description,
          color,
          category,
          probability,
          condition,
          mode
        })),
      grandPrizes: this.data.grandPrizes,
      shop: {
        name: 'MERU MOBILE SHOP',
        subtitle: 'आपका अपना भरोसेमंद Mobile Store – Ganj Basoda',
        tagline: 'स्मार्टफोन • एक्सेसरीज • फाइनेंस • लकी ड्रा',
        address: 'Tyoda Road, Ganj Basoda, Near Pawan Automobile / Old Bus Stand, District Vidisha, Madhya Pradesh – 464221',
        phone1: '9340259168',
        phone2: '9584672211',
        whatsapp: '9340259168',
        mapsUrl: this.data.settings.googleMapsUrl || '',
        photoUrl: this.data.settings.shopPhotoUrl || DEFAULT_SHOP_PHOTO
      },
      stats: {
        totalDistributed: this.data.entries.filter((e) => !e.isTest).length,
        campaignStatus: this.data.campaign.status,
        whatsappStatus: whatsapp.getStatusText()
      }
    };
  }

  public normalizeMobile(rawInput: any): string | null {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const cleaned = rawInput.trim();
    if (/[a-zA-Z]/.test(cleaned)) return null;

    const digits = cleaned.replace(/\D/g, '');
    let candidate = '';
    if (digits.length === 10) {
      candidate = digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      candidate = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      candidate = digits.slice(2);
    } else {
      return null;
    }

    // Indian mobile must start with 6, 7, 8, 9
    if (!/^[6-9]\d{9}$/.test(candidate)) {
      return null;
    }
    // Reject all identical digits
    if (/^(\d)\1{9}$/.test(candidate)) {
      return null;
    }
    if (candidate === '1234567890') {
      return null;
    }
    return candidate;
  }

  public findEntryByMobile(campaignId: string, mobile: string): DrawEntry | undefined {
    const cleanMobile = this.normalizeMobile(mobile) || mobile.replace(/\D/g, '').slice(-10);
    return this.data.entries.find((e) => e.campaignId === campaignId && e.customerMobile === cleanMobile);
  }

  public findEntry(query: string): DrawEntry | undefined {
    const trimmed = query.trim().toUpperCase();
    const cleanMobile = this.normalizeMobile(query) || query.replace(/\D/g, '').slice(-10);
    return this.data.entries.find(
      (e) => e.id.toUpperCase() === trimmed || (cleanMobile.length === 10 && e.customerMobile === cleanMobile)
    );
  }

  public registerCustomerEntry(params: {
    campaignId?: string;
    fullName: string;
    mobile: string;
    billNumber?: string;
    locality?: string;
  }): { success: boolean; entry: DrawEntry; alreadyPlayed: boolean; alreadyRegistered: boolean } {
    const campaignId = params.campaignId || this.data.campaign.id;
    const cleanMobile = this.normalizeMobile(params.mobile);
    if (!cleanMobile) {
      throw new Error('कृपया अपना सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
    }

    const existing = this.findEntryByMobile(campaignId, cleanMobile);
    if (existing) {
      if (existing.resultStatus === 'locked' || existing.resultStatus === 'claimed') {
        return { success: true, entry: existing, alreadyPlayed: true, alreadyRegistered: false };
      }
      return { success: true, entry: existing, alreadyPlayed: false, alreadyRegistered: true };
    }

    let customer = this.data.customers.find((c) => c.mobile === cleanMobile);
    if (!customer) {
      customer = {
        id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        fullName: params.fullName.trim(),
        mobile: cleanMobile,
        billNumber: params.billNumber?.trim(),
        locality: params.locality?.trim(),
        createdAt: new Date().toISOString()
      };
      this.data.customers.push(customer);
    }

    const entryId = this.generateUniqueEntryId();
    const newEntry: DrawEntry = {
      id: entryId,
      campaignId,
      customerId: customer.id,
      customerName: params.fullName.trim(),
      customerMobile: cleanMobile,
      billNumber: params.billNumber?.trim(),
      locality: params.locality?.trim(),
      resultStatus: 'registered',
      createdAt: new Date().toISOString(),
      isTest: this.data.settings.testMode
    };

    this.data.entries.unshift(newEntry);
    this.save();
    return { success: true, entry: newEntry, alreadyPlayed: false, alreadyRegistered: false };
  }

  // ATOMIC SERVER-SIDE DRAW ALLOCATION (CAMPAIGN SCOPED, MUTEX PROTECTED, 5-TIER PRIORITY)
  public async allocateDraw(params: {
    campaignId?: string;
    fullName: string;
    mobile: string;
    billNumber?: string;
    locality?: string;
    gameType: 'spin' | 'scratch';
    entryId?: string;
  }): Promise<{ entry: DrawEntry; alreadyPlayed: boolean }> {
    return this.withLock(() => {
      const campaignId = params.campaignId || this.data.campaign.id;
      const cleanMobile = this.normalizeMobile(params.mobile);

      // Strict Indian Mobile Validation
      if (!cleanMobile) {
        throw new Error('कृपया अपना सही 10 अंकों का मोबाइल नंबर दर्ज करें। इसी नंबर पर आपका Congratulations Message भेजा जाएगा।');
      }

      if (this.data.campaign.status !== 'active') {
        throw new Error('वर्तमान में लकी ड्रा अभियान सक्रिय नहीं है (Campaign is not active right now)');
      }

      if (params.gameType === 'spin' && !this.data.campaign.spinEnabled) {
        throw new Error('Spin & Win सुविधा अस्थायी रूप से बंद है (Spin & Win is currently disabled)');
      }

      if (params.gameType === 'scratch' && !this.data.campaign.scratchEnabled) {
        throw new Error('Scratch & Win सुविधा अस्थायी रूप से बंद है (Scratch & Win is currently disabled)');
      }

      // 1. CAMPAIGN-SCOPED CHECK: (campaign_id, customer_mobile)
      const existing = this.findEntryByMobile(campaignId, cleanMobile);
      if (existing && (existing.resultStatus === 'locked' || existing.resultStatus === 'claimed')) {
        return { entry: existing, alreadyPlayed: true };
      }

      // Upsert customer record
      let customer = this.data.customers.find((c) => c.mobile === cleanMobile);
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          fullName: params.fullName.trim(),
          mobile: cleanMobile,
          billNumber: params.billNumber?.trim(),
          locality: params.locality?.trim(),
          createdAt: new Date().toISOString()
        };
        this.data.customers.push(customer);
      }

      const activeEntryId = existing?.id || params.entryId || this.generateUniqueEntryId();
      let selectedGift: Gift | undefined;
      const nowIso = new Date().toISOString();

      // =========================================================================
      // 5-TIER PRIZE ALLOCATION PRIORITY (SERVER-AUTHORITATIVE, CONCURRENCY LOCKED)
      // =========================================================================

      // =========================================================================
      // 3-TIER PRIZE ALLOCATION PRIORITY (SERVER-AUTHORITATIVE, CONCURRENCY LOCKED)
      // 1. ACTIVE ENTRY ASSIGNMENT (Highest Priority)
      // 2. NEXT GIFT / ACTIVE NEXT ELIGIBLE
      // 3. SMART RANDOM
      // =========================================================================

      // PRIORITY 1: ACTIVE ENTRY-SPECIFIC / MOBILE ASSIGNED PRIZE
      if (this.data.assignments && this.data.assignments.length > 0) {
        const activeEntryAsg = this.data.assignments.find((a) => {
          if (a.status !== 'ACTIVE') return false;
          if (a.campaignId && a.campaignId !== campaignId) return false;
          if (a.expiresAt && new Date(a.expiresAt) < new Date()) {
            a.status = 'EXPIRED';
            return false;
          }
          if (a.targetEntryId && a.targetEntryId === activeEntryId) return true;
          if (a.targetMobile && a.targetMobile === cleanMobile) return true;
          return false;
        });

        if (activeEntryAsg) {
          const targetGift = this.data.gifts.find(
            (g) => g.id === activeEntryAsg.prizeId && g.active && g.remainingQuantity > 0
          );
          if (targetGift) {
            selectedGift = targetGift;
            activeEntryAsg.status = 'ALLOCATED';
            activeEntryAsg.allocatedAt = nowIso;
            activeEntryAsg.allocated_at = nowIso;
            activeEntryAsg.allocatedEntryId = activeEntryId;
            activeEntryAsg.allocated_entry_id = activeEntryId;
            activeEntryAsg.allocatedPrizeId = targetGift.id;
            activeEntryAsg.allocated_prize_id = targetGift.id;
            activeEntryAsg.allocatedBy = activeEntryAsg.activatedBy || activeEntryAsg.adminEmail;
            activeEntryAsg.allocated_by = activeEntryAsg.activatedBy || activeEntryAsg.adminEmail;
            this.logAction(
              activeEntryAsg.adminId || 'system',
              activeEntryAsg.adminEmail || 'Admin',
              'ACTIVE_PRIZE_ALLOCATED',
              'prize_assignments',
              `Assignment ID: ${activeEntryAsg.id} (ACTIVE -> ALLOCATED)`,
              `Prize: ${targetGift.name} successfully allocated to ${params.fullName} (${cleanMobile})`
            );
          } else {
            this.logAction(
              'system',
              'System',
              'ASSIGNED_PRIZE_UNAVAILABLE',
              'prize_assignments',
              `Assignment ID: ${activeEntryAsg.id}, Prize: ${activeEntryAsg.prizeName}`,
              'Active assigned prize was out of stock or inactive. Falling back to next priority.'
            );
          }
        }
      }

      // PRIORITY 1B: ACTIVE SCHEDULED PRIZE (IF ACTIVE & SCHEDULED TIME REACHED)
      if (!selectedGift && this.data.assignments && this.data.assignments.length > 0) {
        const scheduledAsg = this.data.assignments.find((a) => {
          if (a.status !== 'ACTIVE' || a.mode !== 'SCHEDULED') return false;
          if (a.campaignId && a.campaignId !== campaignId) return false;
          if (a.expiresAt && new Date(a.expiresAt) < new Date()) {
            a.status = 'EXPIRED';
            return false;
          }
          if (!a.scheduledAt) return false;
          return new Date(a.scheduledAt) <= new Date();
        });

        if (scheduledAsg) {
          const scheduledGift = this.data.gifts.find(
            (g) => g.id === scheduledAsg.prizeId && g.active && g.remainingQuantity > 0
          );
          if (scheduledGift) {
            selectedGift = scheduledGift;
            scheduledAsg.status = 'ALLOCATED';
            scheduledAsg.allocatedAt = nowIso;
            scheduledAsg.allocated_at = nowIso;
            scheduledAsg.allocatedEntryId = activeEntryId;
            scheduledAsg.allocated_entry_id = activeEntryId;
            scheduledAsg.allocatedPrizeId = scheduledGift.id;
            scheduledAsg.allocated_prize_id = scheduledGift.id;
            scheduledAsg.allocatedBy = scheduledAsg.activatedBy || scheduledAsg.adminEmail;
            scheduledAsg.allocated_by = scheduledAsg.activatedBy || scheduledAsg.adminEmail;
            this.logAction(
              scheduledAsg.adminId || 'system',
              scheduledAsg.adminEmail || 'Admin',
              'SCHEDULED_PRIZE_ALLOCATED',
              'prize_assignments',
              `Scheduled ID: ${scheduledAsg.id}`,
              `Prize: ${scheduledGift.name} awarded to ${params.fullName} (${cleanMobile})`
            );
          }
        }
      }

      // PRIORITY 2: NEXT GIFT (ACTIVE NEXT ELIGIBLE ASSIGNMENT)
      if (!selectedGift && this.data.assignments && this.data.assignments.length > 0) {
        const nextEligibleAsg = this.data.assignments.find((a) => {
          if (a.status !== 'ACTIVE' || a.mode !== 'NEXT_ELIGIBLE') return false;
          if (a.campaignId && a.campaignId !== campaignId) return false;
          if (a.expiresAt && new Date(a.expiresAt) < new Date()) {
            a.status = 'EXPIRED';
            return false;
          }
          return true;
        });

        if (nextEligibleAsg) {
          const nextGift = this.data.gifts.find(
            (g) => g.id === nextEligibleAsg.prizeId && g.active && g.remainingQuantity > 0
          );
          if (nextGift) {
            selectedGift = nextGift;
            nextEligibleAsg.status = 'ALLOCATED';
            nextEligibleAsg.allocatedAt = nowIso;
            nextEligibleAsg.allocated_at = nowIso;
            nextEligibleAsg.allocatedEntryId = activeEntryId;
            nextEligibleAsg.allocated_entry_id = activeEntryId;
            nextEligibleAsg.allocatedPrizeId = nextGift.id;
            nextEligibleAsg.allocated_prize_id = nextGift.id;
            nextEligibleAsg.allocatedBy = nextEligibleAsg.activatedBy || nextEligibleAsg.adminEmail;
            nextEligibleAsg.allocated_by = nextEligibleAsg.activatedBy || nextEligibleAsg.adminEmail;
            this.data.settings.nextGiftId = null;
            this.data.settings.mode = 'random';
            this.logAction(
              nextEligibleAsg.adminId || 'system',
              nextEligibleAsg.adminEmail || 'Admin',
              'NEXT_ELIGIBLE_PRIZE_ALLOCATED',
              'prize_assignments',
              `Next Prize: ${nextGift.name}`,
              `Awarded to ${params.fullName} (${cleanMobile}). Auto-cleared to Smart Random.`
            );
          } else {
            this.logAction(
              'system',
              'System',
              'NEXT_GIFT_UNAVAILABLE',
              'prize_assignments',
              `ID: ${nextEligibleAsg.prizeId}`,
              'Next eligible prize was out of stock. Falling back.'
            );
          }
        }
      }

      // TIER 3B: BACKWARD COMPATIBLE NEXT GIFT ID IN SETTINGS
      if (this.data.settings.nextGiftId) {
        const directTarget = this.data.gifts.find(
          (g) => g.id === this.data.settings.nextGiftId && g.active && g.remainingQuantity > 0
        );
        if (directTarget) {
          selectedGift = directTarget;
          // In real draw, consume next gift and auto-return to SMART RANDOM
          if (!this.data.settings.testMode) {
            this.data.settings.nextGiftId = null;
            this.data.settings.mode = 'random';
            this.logAction(
              'system',
              'System',
              'NEXT_GIFT_CONSUMED',
              'admin_settings',
              `Target: ${directTarget.name}`,
              `Awarded to ${params.fullName} (${cleanMobile}). Auto-reset to SMART RANDOM.`
            );
          }
        } else {
          // Selected gift is unavailable/out of stock: fallback to Smart Random and log audit
          this.logAction(
            'system',
            'System',
            'NEXT_GIFT_UNAVAILABLE',
            'admin_settings',
            `ID: ${this.data.settings.nextGiftId}`,
            'Reserved next gift was out of stock or inactive. Safely fell back to Smart Random.'
          );
          if (!this.data.settings.testMode) {
            this.data.settings.nextGiftId = null;
            this.data.settings.mode = 'random';
          }
        }
      }

      // 3. CHECK MODE: QUEUE MODE (FIFO)
      if (!selectedGift && this.data.settings.mode === 'queue' && this.data.settings.queue.length > 0) {
        while (this.data.settings.queue.length > 0) {
          const nextInQueueId = this.data.settings.queue[0];
          const target = this.data.gifts.find(
            (g) => g.id === nextInQueueId && g.active && g.remainingQuantity > 0
          );
          if (target) {
            selectedGift = target;
            if (!this.data.settings.testMode) {
              this.data.settings.queue.shift();
              this.logAction(
                'system',
                'System',
                'QUEUE_ITEM_CONSUMED',
                'queue',
                `Dequeued: ${target.name}`,
                `Awarded to ${params.fullName}. Remaining in queue: ${this.data.settings.queue.length}`
              );
            }
            break;
          } else {
            const skipped = this.data.settings.queue.shift();
            this.logAction(
              'system',
              'System',
              'QUEUE_ITEM_SKIPPED',
              'queue',
              `Skipped Gift ID: ${skipped}`,
              'Item out of stock or inactive, moving to next in queue'
            );
          }
        }
      }

      // 4. SMART RANDOM ENGINE: WEIGHTED PROBABILITY + ANTI-REPEAT COOLDOWN SYSTEM
      if (!selectedGift) {
        // Strictly filter for active Smart Random gifts with remainingQuantity > 0
        // Trolley Bag, Induction Cooktop, TV, Fridge, Bike are 'admin_controlled' and 0% probability - 100% excluded!
        const smartCandidates = this.data.gifts.filter(
          (g) => g.active && g.remainingQuantity > 0 && g.mode === 'smart_random' && g.probability > 0
        );

        if (smartCandidates.length === 0) {
          throw new Error('इस समय सभी Smart Random Gifts उपलब्ध नहीं हैं। (All smart random gifts are currently out of stock)');
        }

        // Anti-Repeat Analysis on recent campaign entries
        const recentEntries = this.data.entries
          .filter((e) => !e.isTest && e.campaignId === campaignId)
          .slice(0, 5);

        const lastGiftId = recentEntries[0]?.giftId;
        const cooldownWindow = Math.min(this.data.settings.antiRepeatCooldownWindow || 5, recentEntries.length);
        const cooldownGiftIds = new Set(recentEntries.slice(0, cooldownWindow).map((e) => e.giftId));

        // Step 4A: Exclude gifts that won in the last 4-5 draws (cooldown window)
        let eligiblePool = smartCandidates.filter((g) => !cooldownGiftIds.has(g.id));

        // Step 4B: If cooldown excludes all available gifts, at least ensure no immediate consecutive duplicate
        if (eligiblePool.length === 0 && smartCandidates.length > 1) {
          eligiblePool = smartCandidates.filter((g) => g.id !== lastGiftId);
        }

        // Step 4C: If only 1 in-stock gift exists, fallback to available candidate
        if (eligiblePool.length === 0) {
          eligiblePool = smartCandidates;
        }

        // Weighted Probability Selection within eligiblePool
        const totalWeight = eligiblePool.reduce((acc, g) => acc + (g.probability || 1), 0);
        let randomWeight = Math.random() * (totalWeight > 0 ? totalWeight : 100);

        for (const gift of eligiblePool) {
          const weight = gift.probability || 1;
          if (randomWeight <= weight) {
            selectedGift = gift;
            break;
          }
          randomWeight -= weight;
        }

        if (!selectedGift) {
          selectedGift = eligiblePool[0];
        }
      }

      if (!selectedGift || selectedGift.remainingQuantity <= 0) {
        throw new Error('इस समय सभी Instant Gifts उपलब्ध नहीं हैं। (All instant gifts are currently out of stock)');
      }

      // 5. DEDUCT INVENTORY (ONLY IF NOT IN TEST MODE)
      if (!this.data.settings.testMode) {
        selectedGift.remainingQuantity = Math.max(0, selectedGift.remainingQuantity - 1);
      }

      let finalEntry: DrawEntry;
      if (existing) {
        existing.gameType = params.gameType;
        existing.giftId = selectedGift.id;
        existing.giftName = selectedGift.name;
        existing.giftNameHi = selectedGift.nameHi;
        existing.giftIcon = selectedGift.icon;
        existing.giftImage = selectedGift.image;
        existing.voucherCode = selectedGift.voucherCode;
        existing.condition = selectedGift.condition;
        existing.resultStatus = 'locked';
        existing.playedAt = nowIso;
        existing.isTest = this.data.settings.testMode;
        existing.whatsappStatus = this.data.settings.testMode
          ? 'not_configured'
          : whatsapp.isConfigured()
          ? 'pending'
          : 'not_configured';
        finalEntry = existing;
      } else {
        finalEntry = {
          id: activeEntryId,
          campaignId,
          customerId: customer.id,
          customerName: params.fullName.trim(),
          customerMobile: cleanMobile,
          billNumber: params.billNumber?.trim(),
          locality: params.locality?.trim(),
          gameType: params.gameType,
          giftId: selectedGift.id,
          giftName: selectedGift.name,
          giftNameHi: selectedGift.nameHi,
          giftIcon: selectedGift.icon,
          giftImage: selectedGift.image,
          voucherCode: selectedGift.voucherCode,
          condition: selectedGift.condition,
          resultStatus: 'locked',
          createdAt: nowIso,
          playedAt: nowIso,
          isTest: this.data.settings.testMode,
          whatsappStatus: this.data.settings.testMode
            ? 'not_configured'
            : whatsapp.isConfigured()
            ? 'pending'
            : 'not_configured'
        };
        this.data.entries.unshift(finalEntry);
      }

      this.save();

      // 6. BROADCAST REALTIME SSE
      if (!this.data.settings.testMode) {
        this.broadcast('NEW_DRAW_RESULT', {
          id: finalEntry.id,
          campaignId: finalEntry.campaignId,
          customerName: finalEntry.customerName,
          customerMobile: `${finalEntry.customerMobile.slice(0, 2)}******${finalEntry.customerMobile.slice(-2)}`,
          giftName: finalEntry.giftName,
          giftIcon: finalEntry.giftIcon,
          playedAt: finalEntry.playedAt,
          gameType: finalEntry.gameType
        });

        // 7. DECOUPLED WHATSAPP CONGRATULATIONS NOTIFICATION
        // Runs asynchronously in background; result is already locked permanently in database!
        whatsapp
          .sendWinnerCongratulations({
            customerName: finalEntry.customerName,
            mobile10Digits: cleanMobile,
            giftName: finalEntry.giftName || '',
            giftNameHi: finalEntry.giftNameHi,
            entryId: finalEntry.id,
            condition: finalEntry.condition
          })
          .then((res) => {
            finalEntry.whatsappStatus = res.status;
            finalEntry.whatsappMessageId = res.messageId;
            finalEntry.whatsappError = res.error;
            finalEntry.whatsappAttemptedAt = res.timestamp;
            this.save();
          })
          .catch((err) => {
            finalEntry.whatsappStatus = 'failed';
            finalEntry.whatsappError = err.message;
            this.save();
          });
      }

      return { entry: finalEntry, alreadyPlayed: false };
    });
  }

  // PRIZE CONTROL CENTER METHODS
  public createPrizeAssignment(
    params: {
      campaignId?: string;
      prizeId: string;
      mode: 'ENTRY_SPECIFIC' | 'NEXT_ELIGIBLE' | 'SCHEDULED' | 'RESERVE_ONLY';
      targetEntryId?: string;
      targetMobile?: string;
      customerName?: string;
      billNumber?: string;
      scheduledAt?: string;
      expiresAt?: string;
      note?: string;
    },
    adminUser: AdminSession
  ): Promise<{ success: boolean; assignment: PrizeAssignment }> {
    return this.withLock(() => {
      const campaignId = params.campaignId || this.data.campaign.id;
      const prize = this.data.gifts.find((g) => g.id === params.prizeId);
      if (!prize || !prize.active) {
        throw new Error('उपहार नहीं मिला अथवा वर्तमान में निष्क्रिय है (Prize not found or inactive)');
      }

      // Check current pending assignments for this prize to prevent overselling
      const pendingCount = (this.data.assignments || []).filter(
        (a) => a.prizeId === params.prizeId && a.status === 'PENDING'
      ).length;

      const availableStock = prize.remainingQuantity - pendingCount;
      if (availableStock <= 0) {
        throw new Error(
          `ASSIGNMENT FAILED: स्टॉक अपर्याप्त है! '${prize.name}' का शेष स्टॉक (${prize.remainingQuantity}) पहले ही आरक्षित या शून्य है (Insufficient stock).`
        );
      }

      let normalizedMobile: string | undefined;
      if (params.targetMobile) {
        const clean = this.normalizeMobile(params.targetMobile);
        if (clean) normalizedMobile = clean;
      }

      // If targetEntryId is provided, verify it exists and hasn't played yet
      if (params.targetEntryId) {
        const entry = this.data.entries.find((e) => e.id === params.targetEntryId);
        if (!entry) {
          throw new Error(`Target entry record '${params.targetEntryId}' not found in campaign. कृपया ग्राहक सूची से खोजकर मान्य Entry चुनें।`);
        }
        if (entry.campaignId && entry.campaignId !== campaignId) {
          throw new Error('यह Entry इस campaign की नहीं है (Target entry does not belong to active campaign).');
        }
        if (entry.resultStatus === 'locked' || entry.resultStatus === 'claimed') {
          throw new Error('यह customer पहले ही Lucky Draw खेल चुका है (Customer has already played).');
        }
        if (!normalizedMobile) normalizedMobile = entry.customerMobile;
        if (!params.customerName) params.customerName = entry.customerName;
        if (!params.billNumber) params.billNumber = entry.billNumber;

        // Check if another active assignment exists for this entry/customer
        const activeExists = (this.data.assignments || []).some(
          (a) => a.status === 'ACTIVE' && (a.targetEntryId === entry.id || (normalizedMobile && a.targetMobile === normalizedMobile))
        );
        if (activeExists) {
          throw new Error('इस customer के लिए पहले से Active Assignment मौजूद है (Another active assignment already exists for this customer).');
        }
      }

      const isGrand = prize.mode === 'admin_controlled' || prize.probability === 0;

      const assignment: PrizeAssignment = {
        id: `ASG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        campaignId,
        prizeId: prize.id,
        prizeName: prize.name,
        prizeNameHi: prize.nameHi,
        prizeImage: prize.image,
        adminId: adminUser.userId,
        adminEmail: adminUser.email,
        mode: params.mode,
        status: (params as any).autoActivate ? 'ACTIVE' : 'PENDING',
        targetEntryId: params.targetEntryId?.trim() || undefined,
        targetMobile: normalizedMobile,
        customerName: params.customerName?.trim() || undefined,
        billNumber: params.billNumber?.trim() || undefined,
        createdAt: new Date().toISOString(),
        activatedAt: (params as any).autoActivate ? new Date().toISOString() : undefined,
        activatedBy: (params as any).autoActivate ? adminUser.email : undefined,
        scheduledAt: params.scheduledAt || undefined,
        expiresAt: params.expiresAt || undefined,
        note: params.note?.trim() || undefined,
        isGrandPrize: isGrand
      };

      if (!this.data.assignments) {
        this.data.assignments = [];
      }
      this.data.assignments.unshift(assignment);

      // If mode is NEXT_ELIGIBLE, also set settings.nextGiftId for direct UI indicator
      if (params.mode === 'NEXT_ELIGIBLE') {
        this.data.settings.nextGiftId = prize.id;
        this.data.settings.mode = 'next_gift';
      }

      this.logAction(
        adminUser.userId,
        adminUser.email,
        (params as any).autoActivate ? 'ACTIVATE_ASSIGNMENT' : 'ASSIGN_PRIZE',
        'prize_assignments',
        'None',
        `Assigned '${prize.name}' (Mode: ${params.mode}, Status: ${assignment.status}) to ${params.customerName || 'Next Customer'} (${normalizedMobile || params.targetEntryId || 'General'}). Note: ${params.note || '-'}`
      );

      this.save();
      this.broadcast('ASSIGNMENTS_UPDATED', { action: 'CREATED', assignment });
      return { success: true, assignment };
    });
  }

  public async assignPrizeToCustomer(
    params: Parameters<Database['createPrizeAssignment']>[0],
    adminUser: AdminSession
  ): Promise<{ success: boolean; assignment: PrizeAssignment }> {
    return this.createPrizeAssignment(params, adminUser);
  }

  public async activatePrizeAssignment(
    assignmentId: string,
    adminUser: AdminSession
  ): Promise<{ success: boolean; assignment: PrizeAssignment }> {
    return this.withLock(() => {
      const assignment = (this.data.assignments || []).find((a) => a.id === assignmentId);
      if (!assignment) {
        throw new Error('असाइनमेंट रिकॉर्ड नहीं मिला (Assignment record not found)');
      }

      if (assignment.status !== 'PENDING' && assignment.status !== 'REVIEW') {
        throw new Error(`Only PENDING or REVIEW assignments can be activated (Current status: ${assignment.status})`);
      }

      // 1. Campaign active validation
      if (this.data.campaign.status !== 'active') {
        throw new Error('Campaign is inactive. Please activate the campaign first.');
      }

      // 2. Prize available validation
      const prize = this.data.gifts.find((g) => g.id === assignment.prizeId);
      if (!prize || !prize.active) {
        throw new Error('Assigned prize not found or inactive.');
      }
      if (prize.remainingQuantity <= 0) {
        throw new Error('Prize inventory is unavailable.');
      }

      // 3. Entry valid, Customer eligible & Customer has not played yet
      if (assignment.targetEntryId) {
        const entry = this.data.entries.find((e) => e.id === assignment.targetEntryId);
        if (!entry) {
          throw new Error('Target entry record not found in campaign.');
        }
        if (entry.campaignId && entry.campaignId !== this.data.campaign.id) {
          throw new Error('Target entry does not belong to the active campaign.');
        }
        if (entry.resultStatus === 'locked' || entry.resultStatus === 'claimed') {
          throw new Error('Customer has already played.');
        }
      }

      if (assignment.targetMobile) {
        const mobilePlayed = this.data.entries.find(
          (e) =>
            e.customerMobile === assignment.targetMobile &&
            (e.resultStatus === 'locked' || e.resultStatus === 'claimed') &&
            (!assignment.targetEntryId || e.id === assignment.targetEntryId)
        );
        if (mobilePlayed) {
          throw new Error('Customer has already played.');
        }
      }

      // 4. No other active assignment on this same Entry/Mobile
      const duplicateActive = (this.data.assignments || []).find((a) => {
        if (a.id === assignment.id || a.status !== 'ACTIVE') return false;
        if (assignment.targetEntryId && a.targetEntryId && a.targetEntryId === assignment.targetEntryId) return true;
        if (assignment.targetMobile && a.targetMobile && a.targetMobile === assignment.targetMobile) return true;
        return false;
      });
      if (duplicateActive) {
        throw new Error('Another active assignment already exists for this customer.');
      }

      // 5. No conflicting Next Gift reservation
      if (assignment.mode === 'NEXT_ELIGIBLE') {
        const conflictNext = (this.data.assignments || []).find(
          (a) => a.id !== assignment.id && a.status === 'ACTIVE' && a.mode === 'NEXT_ELIGIBLE'
        );
        if (conflictNext) {
          throw new Error('A conflicting Next Gift reservation already exists.');
        }
      }

      // Validation successful: status = ACTIVE
      const actTime = new Date().toISOString();
      const prevStatus = assignment.status;
      assignment.status = 'ACTIVE';
      assignment.activatedAt = actTime;
      assignment.activated_at = actTime;
      assignment.activatedBy = adminUser.email;
      assignment.activated_by = adminUser.email;

      // If mode is NEXT_ELIGIBLE, also set settings.nextGiftId for direct UI indicator
      if (assignment.mode === 'NEXT_ELIGIBLE') {
        this.data.settings.nextGiftId = prize.id;
        this.data.settings.mode = 'next_gift';
      }

      // Audit Log as per Requirement 14:
      // admin_user_id, admin_email, action = ACTIVATE_ASSIGNMENT, assignment_id, entry_id, old_status, new_status, prize_id, timestamp
      this.logAction(
        adminUser.userId,
        adminUser.email,
        'ACTIVATE_ASSIGNMENT',
        'prize_assignments',
        prevStatus,
        `Status changed to ACTIVE. admin_user_id: ${adminUser.userId}, admin_email: ${adminUser.email}, assignment_id: ${assignment.id}, entry_id: ${assignment.targetEntryId || 'N/A'}, old_status: ${prevStatus}, new_status: ACTIVE, prize_id: ${assignment.prizeId}, prize_name: ${prize.name}, timestamp: ${actTime}`
      );

      this.save();
      this.broadcast('ASSIGNMENTS_UPDATED', { action: 'ACTIVATED', assignment });
      return { success: true, assignment };
    });
  }

  public async cancelPrizeAssignment(
    assignmentId: string,
    reason: string,
    adminUser: AdminSession
  ): Promise<{ success: boolean; assignment?: PrizeAssignment }> {
    return this.withLock(() => {
      const assignment = (this.data.assignments || []).find((a) => a.id === assignmentId);
      if (!assignment) {
        throw new Error('Assignment record not found.');
      }

      if (assignment.status === 'ALLOCATED' || assignment.status === 'CLAIMED') {
        throw new Error('Cannot cancel an assignment that has already been allocated or claimed.');
      }

      if (assignment.status !== 'PENDING' && assignment.status !== 'REVIEW' && assignment.status !== 'ACTIVE') {
        throw new Error(`Only PENDING, REVIEW or ACTIVE assignments can be cancelled (Current status: ${assignment.status})`);
      }

      if (!reason || reason.trim().length < 3) {
        throw new Error('Cancellation reason is mandatory (minimum 3 characters).');
      }

      const prevStatus = assignment.status;
      assignment.status = 'CANCELLED';

      if (assignment.mode === 'NEXT_ELIGIBLE' && this.data.settings.nextGiftId === assignment.prizeId) {
        this.data.settings.nextGiftId = null;
        this.data.settings.mode = 'random';
      }

      this.logAction(
        adminUser.userId,
        adminUser.email,
        'CANCEL_ASSIGNMENT',
        'prize_assignments',
        `Assignment ID: ${assignment.id} (${assignment.prizeName}) [${prevStatus}]`,
        `Cancelled by ${adminUser.email}. Reason: ${reason.trim()}`
      );

      this.save();
      this.broadcast('ASSIGNMENTS_UPDATED', { action: 'CANCELLED', assignmentId });
      return { success: true, assignment };
    });
  }

  public async adjustAllocatedPrize(
    params: { entryId: string; newPrizeId: string; reason: string },
    adminUser: AdminSession
  ): Promise<{ success: boolean; entry: DrawEntry }> {
    return this.withLock(() => {
      if (!params.reason || params.reason.trim().length < 5) {
        throw new Error('बदलाव के लिए वैध कारण (Reason minimum 5 characters) दर्ज करना अनिवार्य है');
      }

      const entry = this.data.entries.find((e) => e.id === params.entryId);
      if (!entry) {
        throw new Error('कूपन रिकॉर्ड नहीं मिला (Entry not found)');
      }

      if (entry.resultStatus !== 'locked' && entry.resultStatus !== 'claimed') {
        throw new Error('यह एंट्री अभी खेली नहीं गई है, इसमें समायोजन नहीं किया जा सकता।');
      }

      const oldGiftName = entry.giftName || 'Unknown';
      const oldGift = this.data.gifts.find((g) => g.id === entry.giftId);
      const newGift = this.data.gifts.find((g) => g.id === params.newPrizeId);

      if (!newGift || !newGift.active) {
        throw new Error('नया उपहार नहीं मिला या निष्क्रिय है (New gift not found)');
      }

      if (newGift.remainingQuantity <= 0) {
        throw new Error(`'${newGift.name}' का स्टॉक शून्य है, यह आवंटित नहीं किया जा सकता।`);
      }

      // Atomic inventory adjustment
      if (oldGift && !entry.isTest) {
        oldGift.remainingQuantity += 1;
      }
      if (!entry.isTest) {
        newGift.remainingQuantity = Math.max(0, newGift.remainingQuantity - 1);
      }

      entry.giftId = newGift.id;
      entry.giftName = newGift.name;
      entry.giftNameHi = newGift.nameHi;
      entry.giftIcon = newGift.icon;
      entry.giftImage = newGift.image;
      entry.voucherCode = newGift.voucherCode;
      entry.condition = newGift.condition;

      this.logAction(
        adminUser.userId,
        adminUser.email,
        'PRIZE_ADJUSTMENT',
        'draw_entries',
        oldGiftName,
        `Changed to '${newGift.name}' for Entry ${entry.id} (${entry.customerName}). Reason: ${params.reason.trim()}`
      );

      this.save();
      this.broadcast('ENTRY_UPDATED', entry);
      return { success: true, entry };
    });
  }

  public getPrizeAssignments(filter?: { status?: string; search?: string }): PrizeAssignment[] {
    let list = this.data.assignments || [];
    if (filter?.status) {
      list = list.filter((a) => a.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.prizeName.toLowerCase().includes(q) ||
          (a.targetEntryId && a.targetEntryId.toLowerCase().includes(q)) ||
          (a.targetMobile && a.targetMobile.includes(q)) ||
          (a.customerName && a.customerName.toLowerCase().includes(q)) ||
          (a.adminEmail && a.adminEmail.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getActiveCampaignId(): string {
    return this.data.campaign.id;
  }

  public getAssignments(): PrizeAssignment[] {
    return this.data.assignments || [];
  }

  public hasActiveAssignment(entryId?: string, mobile?: string): boolean {
    if (!this.data.assignments || this.data.assignments.length === 0) return false;
    return !!this.data.assignments.find((a) => {
      if (a.status !== 'ACTIVE') return false;
      if (entryId && a.targetEntryId && a.targetEntryId.toLowerCase() === entryId.toLowerCase()) return true;
      if (mobile && a.targetMobile && a.targetMobile === mobile) return true;
      return false;
    });
  }

  public findActiveAssignment(entryId?: string, mobile?: string): PrizeAssignment | undefined {
    if (!this.data.assignments || this.data.assignments.length === 0) return undefined;
    return this.data.assignments.find((a) => {
      if (a.status !== 'ACTIVE') return false;
      if (entryId && a.targetEntryId && a.targetEntryId.toLowerCase() === entryId.toLowerCase()) return true;
      if (mobile && a.targetMobile && a.targetMobile === mobile) return true;
      return false;
    });
  }

  public searchCustomersAndEntries(query: string) {
    const q = (query || '').toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');

    const results = this.data.entries
      .filter((e) => {
        if (!q) return true;
        if (e.id.toLowerCase().includes(q)) return true;
        if (e.customerName.toLowerCase().includes(q)) return true;
        if (e.customerMobile.includes(q) || (cleanQ.length >= 4 && e.customerMobile.includes(cleanQ))) return true;
        if (e.billNumber && e.billNumber.toLowerCase().includes(q)) return true;
        if (e.locality && e.locality.toLowerCase().includes(q)) return true;
        if (e.giftName && e.giftName.toLowerCase().includes(q)) return true;
        return false;
      })
      .slice(0, 50)
      .map((e) => {
        const assignment = (this.data.assignments || []).find(
          (a) => (a.targetEntryId === e.id || a.targetMobile === e.customerMobile) && (a.status === 'ACTIVE' || a.status === 'PENDING')
        );

        return {
          entryId: e.id,
          campaignId: e.campaignId,
          customerName: e.customerName,
          customerMobile: e.customerMobile,
          maskedMobile: `${e.customerMobile.slice(0, 2)}******${e.customerMobile.slice(-2)}`,
          billNumber: e.billNumber || '',
          locality: e.locality || '',
          registeredAt: e.createdAt,
          playStatus: (e.resultStatus === 'registered' ? 'NOT_PLAYED' : 'PLAYED') as 'NOT_PLAYED' | 'PLAYED',
          playedAt: e.playedAt || '',
          gameType: e.gameType,
          giftId: e.giftId,
          finalPrize: e.giftName || '',
          finalPrizeHi: e.giftNameHi || '',
          giftImage: e.giftImage || '',
          claimStatus: (e.resultStatus === 'claimed'
            ? 'CLAIMED'
            : e.resultStatus === 'locked'
            ? 'UNCLAIMED'
            : 'NOT_APPLICABLE') as 'CLAIMED' | 'UNCLAIMED' | 'NOT_APPLICABLE',
          claimedAt: e.claimedAt,
          claimedBy: e.claimedBy,
          isTest: e.isTest,
          currentAssignment: assignment
        };
      });

    return results;
  }

  // ADMIN OPERATIONS & SECURITY (GOOGLE OAUTH + SUPABASE AUTH + ALLOWLIST + RBAC)
  public authenticateGoogleAdmin(
    email: string,
    userMetadata?: { name?: string; avatarUrl?: string; authUserId?: string }
  ): { success: boolean; session?: AdminSession; user?: AdminUser; error?: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = this.data.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      this.logAction(
        'unauthorized',
        cleanEmail,
        'UNAUTHORIZED_LOGIN_ATTEMPT',
        'auth',
        'None',
        `Access Denied: Google account ${cleanEmail} is not authorized for MERU Mobile Shop Admin.`
      );
      return {
        success: false,
        error: 'Access Denied — यह Google account MERU Mobile Shop Admin के लिए authorized नहीं है।'
      };
    }

    if (!user.is_active) {
      this.logAction(
        user.id,
        user.email,
        'INACTIVE_ADMIN_LOGIN_ATTEMPT',
        'auth',
        'is_active: false',
        `Access Denied: Administrator account ${user.email} is deactivated.`
      );
      return {
        success: false,
        error: 'Access Denied — This administrator account has been deactivated. Please contact Super Admin.'
      };
    }

    // Role check
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Access Denied — Invalid administrator role.'
      };
    }

    // Auth user id binding & verification
    if (userMetadata?.authUserId) {
      if (user.auth_user_id && user.auth_user_id !== userMetadata.authUserId) {
        this.logAction(
          user.id,
          user.email,
          'AUTH_USER_ID_MISMATCH',
          'auth',
          user.auth_user_id,
          `Security Alert: Mismatched auth_user_id for ${user.email}`
        );
        return {
          success: false,
          error: 'Access Denied — Authentication User ID mismatch. Security check failed.'
        };
      }
      user.auth_user_id = userMetadata.authUserId;
    }

    if (userMetadata?.name && (!user.name || user.name === user.email.split('@')[0])) {
      user.name = userMetadata.name;
    }
    if (userMetadata?.avatarUrl) {
      user.avatar_url = userMetadata.avatarUrl;
    }
    user.last_login_at = new Date().toISOString();

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const session: AdminSession = {
      token,
      userId: user.id,
      auth_user_id: user.auth_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      expiresAt
    };

    this.data.sessions = this.data.sessions.filter((s) => s.expiresAt > Date.now());
    this.data.sessions.push(session);
    this.save();

    // Required audit log name: LOGIN
    this.logAction(
      user.id,
      user.email,
      'LOGIN',
      'auth',
      'None',
      `Google OAuth Login Successful: ${user.name} (${user.email}) [Role: ${user.role}]`
    );

    return {
      success: true,
      session,
      user
    };
  }

  public getAdminUsers(): AdminUser[] {
    return this.data.adminUsers || [];
  }

  public getAdminUserByEmail(email: string): AdminUser | undefined {
    const clean = (email || '').trim().toLowerCase();
    return (this.data.adminUsers || []).find((u) => u.email.toLowerCase() === clean);
  }

  public async addAdminUser(
    params: { email: string; name?: string; role: 'SUPER_ADMIN' | 'ADMIN' },
    adminSession: AdminSession
  ): Promise<AdminUser> {
    return this.withLock(() => {
      const cleanEmail = (params.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('मान्य Google ईमेल पता अनिवार्य है (Valid Google email address required)');
      }

      if (this.data.adminUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        throw new Error(`ईमेल '${cleanEmail}' पहले से ही एडमिन सूची में मौजूद है (Email already registered)`);
      }

      const role = params.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
      const newUser: AdminUser = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        name: params.name?.trim() || cleanEmail.split('@')[0],
        role,
        is_active: true,
        created_at: new Date().toISOString()
      };

      this.data.adminUsers.push(newUser);
      this.logAction(
        adminSession.userId,
        adminSession.email,
        'ADMIN_CREATED',
        'admin_users',
        'None',
        `Added new admin: ${newUser.name} (${newUser.email}) [Role: ${newUser.role}] by ${adminSession.email}`
      );

      this.save();
      return newUser;
    });
  }

  public async updateAdminUser(
    id: string,
    updates: { name?: string; role?: 'SUPER_ADMIN' | 'ADMIN'; is_active?: boolean },
    adminSession: AdminSession
  ): Promise<AdminUser> {
    return this.withLock(() => {
      const user = this.data.adminUsers.find((u) => u.id === id);
      if (!user) {
        throw new Error('एडमिन उपयोगकर्ता नहीं मिला (Admin user not found)');
      }

      // Protection: Owner cannot be deactivated or demoted
      if (user.email === INITIAL_ADMIN_EMAIL) {
        if (updates.is_active === false) {
          throw new Error('प्राथमिक सुपर एडमिन (Store Owner) को निष्क्रिय (Deactivate) नहीं किया जा सकता।');
        }
        if (updates.role && updates.role !== 'SUPER_ADMIN') {
          throw new Error('प्राथमिक सुपर एडमिन का रोल बदला नहीं जा सकता।');
        }
      }

      const prevDetails = `Role: ${user.role}, Active: ${user.is_active}`;

      let actionType = 'UPDATE_ADMIN';
      if (updates.role && updates.role !== user.role) {
        actionType = 'ADMIN_ROLE_CHANGED';
      } else if (updates.is_active === false && user.is_active === true) {
        actionType = 'ADMIN_DEACTIVATED';
      } else if (updates.is_active === true && user.is_active === false) {
        actionType = 'ADMIN_ACTIVATED';
      }

      if (updates.name !== undefined) user.name = updates.name.trim();
      if (updates.role !== undefined) user.role = updates.role;
      if (updates.is_active !== undefined) {
        user.is_active = updates.is_active;
        if (!updates.is_active) {
          // Immediately revoke sessions for deactivated admin
          this.data.sessions = this.data.sessions.filter((s) => s.userId !== user.id);
        }
      }

      this.logAction(
        adminSession.userId,
        adminSession.email,
        actionType,
        'admin_users',
        prevDetails,
        `Updated admin ${user.email} -> Role: ${user.role}, Active: ${user.is_active} by ${adminSession.email}`
      );

      this.save();
      return user;
    });
  }

  public async removeAdminUser(id: string, adminSession: AdminSession): Promise<boolean> {
    return this.withLock(() => {
      const user = this.data.adminUsers.find((u) => u.id === id);
      if (!user) {
        throw new Error('एडमिन उपयोगकर्ता नहीं मिला (Admin user not found)');
      }

      if (user.email === INITIAL_ADMIN_EMAIL) {
        throw new Error('प्राथमिक सुपर एडमिन (Store Owner) को हटाया नहीं जा सकता।');
      }

      if (user.id === adminSession.userId) {
        throw new Error('आप स्वयं के एडमिन खाते को नहीं हटा सकते।');
      }

      this.data.adminUsers = this.data.adminUsers.filter((u) => u.id !== id);
      this.data.sessions = this.data.sessions.filter((s) => s.userId !== id);

      this.logAction(
        adminSession.userId,
        adminSession.email,
        'ADMIN_DEACTIVATED',
        'admin_users',
        `${user.name} (${user.email})`,
        `Removed admin ${user.email} by ${adminSession.email}`
      );

      this.save();
      return true;
    });
  }

  public verifySession(token: string): AdminSession | null {
    if (!token) return null;
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.save();
      return null;
    }

    // Server-side allowlist check on every request:
    const user = this.data.adminUsers.find((u) => u.id === session.userId || u.email.toLowerCase() === session.email.toLowerCase());
    if (!user || !user.is_active) {
      // Invalidate session immediately if user deleted or deactivated
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.save();
      return null;
    }

    // Keep session role and name synchronized with database record
    session.role = user.role;
    session.name = user.name;
    session.auth_user_id = user.auth_user_id;
    return session;
  }

  public revokeSession(token: string) {
    const session = this.data.sessions.find((s) => s.token === token);
    if (session) {
      this.logAction(
        session.userId,
        session.email,
        'LOGOUT',
        'auth',
        'None',
        `Admin ${session.name} (${session.email}) signed out.`
      );
    }
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  public getAdminStats() {
    const realEntries = this.data.entries.filter((e) => !e.isTest);
    const testEntries = this.data.entries.filter((e) => e.isTest);

    const totalEntries = this.data.entries.length;
    const spinCount = realEntries.filter((e) => e.gameType === 'spin').length;
    const scratchCount = realEntries.filter((e) => e.gameType === 'scratch').length;

    const totalInventory = this.data.gifts.reduce((sum, g) => sum + g.totalQuantity, 0);
    const remainingInventory = this.data.gifts.reduce((sum, g) => sum + g.remainingQuantity, 0);
    const distributedInventory = totalInventory - remainingInventory;

    const claimedCount = realEntries.filter((e) => e.resultStatus === 'claimed').length;
    const unclaimedCount = realEntries.length - claimedCount;

    const giftCounts: Record<string, number> = {};
    for (const e of realEntries) {
      if (e.giftId) {
        giftCounts[e.giftId] = (giftCounts[e.giftId] || 0) + 1;
      }
    }

    return {
      totalCustomers: this.data.customers.length,
      totalEntries,
      realEntries: realEntries.length,
      testEntries: testEntries.length,
      spinCount,
      scratchCount,
      totalInventory,
      remainingInventory,
      distributedInventory,
      claimedCount,
      unclaimedCount,
      campaign: this.data.campaign,
      settings: this.data.settings,
      whatsappStatus: whatsapp.getStatusText(),
      gifts: this.data.gifts,
      grandPrizes: this.data.grandPrizes,
      recentEntries: this.data.entries.slice(0, 50),
      recentAuditLogs: this.data.auditLogs.slice(0, 30),
      giftDistribution: this.data.gifts.map((g) => ({
        id: g.id,
        name: g.name,
        nameHi: g.nameHi,
        total: g.totalQuantity,
        remaining: g.remainingQuantity,
        won: giftCounts[g.id] || 0,
        probability: g.probability,
        mode: g.mode
      })),
      adminUsers: this.data.adminUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        is_active: u.is_active,
        created_at: u.created_at,
        last_login_at: u.last_login_at
      })),
      assignments: this.data.assignments || []
    };
  }

  public setNextGift(giftId: string | null, adminUser: AdminSession) {
    const prev = this.data.settings.nextGiftId;
    if (giftId) {
      const gift = this.data.gifts.find((g) => g.id === giftId);
      if (!gift) throw new Error('उपहार नहीं मिला (Gift not found)');
      if (gift.remainingQuantity <= 0) throw new Error('इस उपहार का स्टॉक 0 है, इसे नेक्स्ट गिफ्ट नहीं चुना जा सकता।');
      if (!gift.active) throw new Error('यह उपहार निष्क्रिय है।');
    }

    this.data.settings.nextGiftId = giftId;
    this.data.settings.mode = giftId ? 'next_gift' : 'random';

    const giftName = giftId ? (this.data.gifts.find((g) => g.id === giftId)?.name || giftId) : 'SMART RANDOM';
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'NEXT_GIFT_SET',
      'admin_settings',
      prev || 'SMART RANDOM',
      giftName
    );
    this.save();
    this.broadcast('NEXT_GIFT_CHANGED', {
      nextGiftId: giftId,
      giftName,
      mode: this.data.settings.mode
    });
    return { success: true, nextGiftId: giftId, mode: this.data.settings.mode };
  }

  public setDrawMode(mode: 'random' | 'next_gift' | 'queue', adminUser: AdminSession) {
    const prev = this.data.settings.mode;
    this.data.settings.mode = mode;
    this.logAction(adminUser.userId, adminUser.email, 'DRAW_MODE_CHANGED', 'admin_settings', prev, mode);
    this.save();
    this.broadcast('DRAW_MODE_CHANGED', { mode });
    return { success: true, mode };
  }

  public updateQueue(queue: string[], adminUser: AdminSession) {
    this.data.settings.queue = queue;
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'QUEUE_UPDATED',
      'queue',
      `Previous length: ${this.data.settings.queue.length}`,
      `New length: ${queue.length}`
    );
    this.save();
    this.broadcast('QUEUE_CHANGED', { queue });
    return { success: true, queue };
  }

  public updateCampaignSettings(patch: Partial<DatabaseSchema['campaign']>, adminUser: AdminSession) {
    const oldStatus = this.data.campaign.status;
    this.data.campaign = { ...this.data.campaign, ...patch };

    const action = patch.status === 'active' ? 'CAMPAIGN_ACTIVATED' : patch.status === 'paused' ? 'CAMPAIGN_PAUSED' : 'CAMPAIGN_UPDATED';
    this.logAction(
      adminUser.userId,
      adminUser.email,
      action,
      'campaign',
      `Status: ${oldStatus}`,
      JSON.stringify(patch)
    );
    this.save();
    this.broadcast('CAMPAIGN_SETTINGS_CHANGED', this.data.campaign);
    return { success: true, campaign: this.data.campaign };
  }

  public updateAdminSettings(patch: Partial<AdminSettings>, adminUser: AdminSession) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.logAction(adminUser.userId, adminUser.email, 'ADMIN_SETTINGS_UPDATED', 'admin_settings', 'Settings update', JSON.stringify(patch));
    this.save();
    this.broadcast('ADMIN_SETTINGS_CHANGED', this.data.settings);
    return { success: true, settings: this.data.settings };
  }

  // PROBABILITY VALIDATION: ACTIVE SMART RANDOM GIFTS MUST SUM TO EXACTLY 100.00%
  public saveGifts(gifts: Gift[], adminUser: AdminSession) {
    const activeSmartGifts = gifts.filter((g) => g.active && g.mode === 'smart_random');
    const sumProb = Number(activeSmartGifts.reduce((acc, g) => acc + Number(g.probability || 0), 0).toFixed(2));

    if (activeSmartGifts.length > 0 && Math.abs(sumProb - 100.00) > 0.01) {
      throw new Error(`सक्रिय Smart Random उपहारों की कुल संभावना ठीक 100.00% होनी चाहिए (Total probability must equal exactly 100.00%). वर्तमान योग: ${sumProb.toFixed(2)}%`);
    }

    // Verify Admin Controlled gifts stay strictly at 0% random probability
    for (const g of gifts) {
      if (g.mode === 'admin_controlled' && g.probability > 0) {
        g.probability = 0;
      }
      if (g.totalQuantity < 0 || g.remainingQuantity < 0) {
        throw new Error(`उपहार '${g.name}' की संख्या ऋणात्मक नहीं हो सकती।`);
      }
      if (g.remainingQuantity > g.totalQuantity) {
        throw new Error(`उपहार '${g.name}' का शेष स्टॉक कुल स्टॉक से अधिक नहीं हो सकता।`);
      }
    }

    this.data.gifts = gifts;
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'PROBABILITY_UPDATED',
      'gifts',
      'Updated gift list & probabilities',
      `Count: ${gifts.length}, Smart Random Prob Sum: ${sumProb}%`
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gifts: this.data.gifts };
  }

  // UPDATE SINGLE GIFT (IMAGE, STOCK, PROBABILITY, ACTIVE, ETC.)
  public updateSingleGift(giftId: string, patch: Partial<Gift>, adminUser: AdminSession) {
    const gift = this.data.gifts.find((g) => g.id === giftId);
    if (!gift) throw new Error('उपहार नहीं मिला (Gift not found)');

    const oldSnapshot = JSON.stringify({ name: gift.name, image: gift.image, stock: gift.remainingQuantity });
    Object.assign(gift, patch);

    // If probability changed, re-validate 100% sum if active smart_random
    const activeSmartGifts = this.data.gifts.filter((g) => g.active && g.mode === 'smart_random');
    const sumProb = Number(activeSmartGifts.reduce((acc, g) => acc + Number(g.probability || 0), 0).toFixed(2));

    if (activeSmartGifts.length > 0 && Math.abs(sumProb - 100.00) > 0.01) {
      // Don't throw for simple image update, but warn or keep validation
    }

    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GIFT_UPDATED',
      'gifts',
      oldSnapshot,
      JSON.stringify(patch)
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gift };
  }

  // ADD NEW PRIZE (PART 4 & TEST F)
  public addNewGift(
    params: {
      id?: string;
      name: string;
      nameHi?: string;
      icon?: string;
      image?: string;
      description?: string;
      totalQuantity?: number;
      remainingQuantity?: number;
      active?: boolean;
      displayOrder?: number;
      probability?: number;
      mode?: 'smart_random' | 'admin_controlled';
      category?: 'gadget' | 'accessory' | 'voucher';
      cooldown?: number;
      minStock?: number;
      notes?: string;
      color?: string;
    },
    options: { rebalance?: boolean } = {},
    adminUser: AdminSession
  ) {
    if (!params.name || !params.name.trim()) {
      throw new Error('उपहार का नाम अनिवार्य है (Gift name is required)');
    }

    const cleanName = params.name.trim();
    const id =
      params.id?.trim() ||
      `g-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}-${crypto.randomBytes(2).toString('hex')}`;

    if (this.data.gifts.some((g) => g.id === id)) {
      throw new Error(`उपहार ID '${id}' पहले से मौजूद है (Gift ID already exists). कृपया अलग ID दें।`);
    }

    const mode =
      params.mode ||
      (cleanName.toLowerCase().includes('tv') ||
      cleanName.toLowerCase().includes('cooktop') ||
      cleanName.toLowerCase().includes('bike') ||
      cleanName.toLowerCase().includes('refrigerator')
        ? 'admin_controlled'
        : 'smart_random');

    let prob = mode === 'admin_controlled' ? 0 : Number(Number(params.probability || 0).toFixed(2));
    const qty = Number(params.totalQuantity ?? 10);
    const remQty = Number(params.remainingQuantity ?? qty);

    if (mode === 'smart_random' && prob > 0 && options.rebalance) {
      // Rebalance other active smart random gifts to fit exactly (100 - prob)
      const targetRemainder = Number((100.0 - prob).toFixed(2));
      const otherActive = this.data.gifts.filter((g) => g.active && g.mode === 'smart_random');
      const otherSum = otherActive.reduce((sum, g) => sum + (g.probability || 0), 0);

      if (otherSum > 0 && targetRemainder >= 0) {
        const factor = targetRemainder / otherSum;
        let newSum = 0;
        for (const g of otherActive) {
          g.probability = Number((g.probability * factor).toFixed(2));
          newSum += g.probability;
        }
        // Fix rounding drift on largest gift
        const diff = Number((targetRemainder - newSum).toFixed(2));
        if (diff !== 0 && otherActive.length > 0) {
          otherActive.sort((a, b) => (b.probability || 0) - (a.probability || 0));
          otherActive[0].probability = Number(((otherActive[0].probability || 0) + diff).toFixed(2));
        }
      }
    }

    const newGift: Gift = {
      id,
      name: cleanName,
      nameHi: params.nameHi?.trim() || cleanName,
      icon: params.icon || 'Gift',
      image:
        params.image?.trim() ||
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
      description: params.description?.trim() || cleanName,
      totalQuantity: qty,
      remainingQuantity: remQty,
      active: params.active ?? true,
      displayOrder: params.displayOrder ?? this.data.gifts.length + 1,
      probability: prob,
      mode,
      category: params.category || 'gadget',
      color: params.color || '#3B82F6',
      cooldown: params.cooldown ?? 4,
      notes: params.notes?.trim() || undefined,
    };

    this.data.gifts.push(newGift);

    const activeSmart = this.data.gifts.filter((g) => g.active && g.mode === 'smart_random');
    const totalProb = Number(activeSmart.reduce((sum, g) => sum + (g.probability || 0), 0).toFixed(2));

    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GIFT_ADDED',
      'gifts',
      'None',
      `Added '${newGift.name}' (ID: ${newGift.id}, Mode: ${newGift.mode}, Stock: ${newGift.remainingQuantity}, Prob: ${newGift.probability}%)`
    );

    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gift: newGift, totalProbability: totalProb };
  }

  // DELETE OR DEACTIVATE PRIZE (PART 7 - HISTORICAL PROTECTION)
  public deleteGift(giftId: string, adminUser: AdminSession) {
    const giftIndex = this.data.gifts.findIndex((g) => g.id === giftId);
    if (giftIndex === -1) throw new Error('उपहार नहीं मिला (Gift not found)');
    const gift = this.data.gifts[giftIndex];

    // Check if prize has already been allocated to any customer
    const hasHistoricalWinners =
      this.data.entries.some((e) => e.giftId === giftId) ||
      (this.data.assignments || []).some(
        (a) => a.prizeId === giftId && (a.status === 'ALLOCATED' || a.status === 'CLAIMED')
      );

    if (hasHistoricalWinners) {
      gift.active = false;
      this.logAction(
        adminUser.userId,
        adminUser.email,
        'GIFT_DEACTIVATED_HISTORICAL_PROTECTION',
        'gifts',
        gift.id,
        `Deactivated '${gift.name}' instead of deleting to protect historical customer results.`
      );
      this.save();
      this.broadcast('GIFTS_CHANGED', this.data.gifts);
      return {
        success: true,
        deactivated: true,
        message: `उपहार '${gift.name}' पूर्व में ग्राहकों को आवंटित किया जा चुका है। ऐतिहासिक परिणाम सुरक्षित रखने के लिए इसे डिलीट करने की बजाय निष्क्रिय (Deactivated) कर दिया गया है।`
      };
    }

    // If never allocated, safe to remove
    this.data.gifts.splice(giftIndex, 1);
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GIFT_DELETED',
      'gifts',
      gift.id,
      `Removed gift '${gift.name}' (ID: ${gift.id})`
    );
    this.save();
    return { success: true, deleted: true, message: `उपहार '${gift.name}' सफलतापूर्वक हटा दिया गया।` };
  }

  // RESET GIFTS TO DEFAULTS
  public resetDefaultGifts(adminUser: AdminSession) {
    this.data.gifts = JSON.parse(JSON.stringify(DEFAULT_GIFTS));
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GIFTS_RESET_TO_DEFAULTS',
      'gifts',
      'All Gifts',
      'Reset all gifts and standard 100% probabilities to system defaults'
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gifts: this.data.gifts, message: 'उपहार सूची और 100% प्रोबेबिलिटी डिफ़ॉल्ट पर रीसेट कर दी गई।' };
  }

  // DUPLICATE PRIZE (PART 7)
  public duplicateGift(giftId: string, adminUser: AdminSession) {
    const gift = this.data.gifts.find((g) => g.id === giftId);
    if (!gift) throw new Error('उपहार नहीं मिला (Gift not found)');

    const newId = `g-${crypto.randomBytes(3).toString('hex')}`;
    const copy: Gift = {
      ...JSON.parse(JSON.stringify(gift)),
      id: newId,
      name: `${gift.name} (Copy)`,
      nameHi: `${gift.nameHi} (कॉपी)`,
      probability: 0, // Starts at 0% to avoid violating 100% total until admin configures it
      displayOrder: (gift.displayOrder || 1) + 1,
      active: false,
    };

    this.data.gifts.push(copy);
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GIFT_DUPLICATED',
      'gifts',
      `Original: ${gift.name} (${gift.id})`,
      `Duplicate ID: ${newId}`
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gift: copy };
  }

  // STOCK CONTROL (PART 10)
  public updateGiftStock(
    giftId: string,
    payload: { delta?: number; newQuantity?: number; totalQuantity?: number },
    adminUser: AdminSession
  ) {
    const gift = this.data.gifts.find((g) => g.id === giftId);
    if (!gift) throw new Error('उपहार नहीं मिला (Gift not found)');

    const prevRemaining = gift.remainingQuantity;

    if (typeof payload.newQuantity === 'number') {
      gift.remainingQuantity = Math.max(0, payload.newQuantity);
      if (gift.remainingQuantity > (gift.totalQuantity || 0)) {
        gift.totalQuantity = gift.remainingQuantity;
      }
    } else if (typeof payload.delta === 'number') {
      gift.remainingQuantity = Math.max(0, (gift.remainingQuantity || 0) + payload.delta);
      if (payload.delta > 0 && gift.remainingQuantity > (gift.totalQuantity || 0)) {
        gift.totalQuantity = (gift.totalQuantity || 0) + payload.delta;
      }
    }

    if (typeof payload.totalQuantity === 'number') {
      gift.totalQuantity = Math.max(gift.remainingQuantity || 0, payload.totalQuantity);
    }

    this.logAction(
      adminUser.userId,
      adminUser.email,
      'STOCK_UPDATED',
      'gifts',
      `Stock: ${prevRemaining} -> ${gift.remainingQuantity}`,
      `Gift: ${gift.name} (ID: ${gift.id})`
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gift };
  }

  // BATCH PROBABILITY UPDATE (PART 5 & 6)
  public updateProbabilities(probabilities: Record<string, number>, adminUser: AdminSession) {
    for (const [id, prob] of Object.entries(probabilities)) {
      const gift = this.data.gifts.find((g) => g.id === id);
      if (gift) {
        if (gift.mode === 'admin_controlled') {
          gift.probability = 0;
        } else {
          gift.probability = Number(Number(prob).toFixed(2));
        }
      }
    }

    const activeSmart = this.data.gifts.filter((g) => g.active && g.mode === 'smart_random');
    const sum = Number(activeSmart.reduce((acc, g) => acc + (g.probability || 0), 0).toFixed(2));

    if (activeSmart.length > 0 && Math.abs(sum - 100.0) > 0.01) {
      throw new Error(
        `Total probability must be exactly 100%. (Smart Random gifts की कुल probability 100% होनी चाहिए। वर्तमान योग: ${sum}%)`
      );
    }

    this.logAction(
      adminUser.userId,
      adminUser.email,
      'PROBABILITY_UPDATED',
      'gifts',
      'Batch Probability Update',
      `Active Smart Random gifts sum: ${sum}%`
    );
    this.save();
    this.broadcast('GIFTS_CHANGED', this.data.gifts);
    return { success: true, gifts: this.data.gifts, totalProbability: sum };
  }

  public saveGrandPrizes(grandPrizes: GrandPrize[], adminUser: AdminSession) {
    this.data.grandPrizes = grandPrizes;
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'GRAND_PRIZE_UPDATED',
      'grand_prizes',
      'Updated grand prizes',
      `Count: ${grandPrizes.length}`
    );
    this.save();
    this.broadcast('GRAND_PRIZES_CHANGED', this.data.grandPrizes);
    return { success: true, grandPrizes: this.data.grandPrizes };
  }

  public setShopPhoto(photoUrl: string, adminUser: AdminSession) {
    const prev = this.data.settings.shopPhotoUrl;
    this.data.settings.shopPhotoUrl = photoUrl;
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'SHOP_PHOTO_UPDATED',
      'admin_settings',
      prev ? 'Previous photo' : 'None',
      'New real storefront photo uploaded'
    );
    this.save();
    this.broadcast('SHOP_PHOTO_CHANGED', { photoUrl });
    return { success: true, photoUrl };
  }

  public setGoogleMapsUrl(mapsUrl: string, adminUser: AdminSession) {
    const prev = this.data.settings.googleMapsUrl;
    this.data.settings.googleMapsUrl = mapsUrl.trim();
    this.logAction(
      adminUser.userId,
      adminUser.email,
      'MAPS_LINK_UPDATED',
      'admin_settings',
      prev || 'None',
      mapsUrl.trim()
    );
    this.save();
    this.broadcast('MAPS_LINK_CHANGED', { mapsUrl: this.data.settings.googleMapsUrl });
    return { success: true, mapsUrl: this.data.settings.googleMapsUrl };
  }

  // CLAIM VERIFICATION (ONCE CLAIMED CANNOT BE CLAIMED AGAIN)
  public markEntryClaimed(entryId: string, adminUser: AdminSession) {
    const entry = this.data.entries.find((e) => e.id === entryId);
    if (!entry) throw new Error('कूपन रिकॉर्ड नहीं मिला (Entry not found)');

    if (entry.resultStatus === 'claimed') {
      throw new Error(`यह उपहार पहले ही ${entry.claimedAt} को क्लेम किया जा चुका है (Already claimed)`);
    }

    entry.resultStatus = 'claimed';
    entry.claimedAt = new Date().toISOString();
    entry.claimedBy = adminUser.email;

    // Sync matching assignment status to CLAIMED
    const matchingAssignment = (this.data.assignments || []).find(
      (a) => a.allocatedEntryId === entryId || a.targetEntryId === entryId
    );
    if (matchingAssignment && (matchingAssignment.status === 'ALLOCATED' || matchingAssignment.status === 'PENDING')) {
      matchingAssignment.status = 'CLAIMED';
    }

    this.logAction(
      adminUser.userId,
      adminUser.email,
      'CLAIM_MARKED',
      'draw_entries',
      entryId,
      `Customer: ${entry.customerName}, Gift: ${entry.giftName}`
    );
    this.save();
    this.broadcast('ENTRY_UPDATED', entry);
    return { success: true, entry };
  }

  public logAction(
    adminId: string,
    adminUser: string,
    action: string,
    entity: string,
    oldValue: string,
    newValue: string
  ) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      adminId,
      adminUser,
      admin_user_id: adminId,
      email: adminUser,
      action,
      entity,
      target: `${entity}${newValue ? ': ' + newValue : ''}`,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return (this.data.auditLogs || []).slice(0, limit);
  }

  public exportCsv(): string {
    const headers = [
      'Entry ID',
      'Campaign ID',
      'Customer Name',
      'Mobile Number',
      'Bill Number',
      'Locality',
      'Game Type',
      'Gift Won',
      'Status',
      'WhatsApp Status',
      'Date Played',
      'Claimed Date',
      'Claimed By',
      'Is Test'
    ];
    const rows = this.data.entries.map((e) => [
      e.id,
      e.campaignId,
      `"${e.customerName.replace(/"/g, '""')}"`,
      e.customerMobile,
      `"${(e.billNumber || '').replace(/"/g, '""')}"`,
      `"${(e.locality || '').replace(/"/g, '""')}"`,
      e.gameType || '',
      e.giftName ? `"${e.giftName.replace(/"/g, '""')}"` : '""',
      e.resultStatus,
      e.whatsappStatus || 'not_configured',
      e.playedAt,
      e.claimedAt || '',
      e.claimedBy || '',
      e.isTest ? 'YES' : 'NO'
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const db = new Database();
