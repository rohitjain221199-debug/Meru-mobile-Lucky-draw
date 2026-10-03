-- ==============================================================================
-- MERU MOBILE SHOP – FESTIVE DHAMAKA LUCKY DRAW SYSTEM
-- Production SQL Schema with RLS, Atomic Allocation RPC, Supabase Storage, and Realtime Triggers
-- ==============================================================================

-- 1. Enable UUID & Crypto Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    spin_enabled BOOLEAN NOT NULL DEFAULT true,
    scratch_enabled BOOLEAN NOT NULL DEFAULT true,
    registration_enabled BOOLEAN NOT NULL DEFAULT true,
    instant_gifts_enabled BOOLEAN NOT NULL DEFAULT true,
    grand_prizes_enabled BOOLEAN NOT NULL DEFAULT true,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    max_daily_entries INT NOT NULL DEFAULT 500,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GIFTS (INSTANT REWARDS) TABLE
CREATE TABLE IF NOT EXISTS gifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    icon TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    total_quantity INT NOT NULL CHECK (total_quantity >= 0),
    remaining_quantity INT NOT NULL CHECK (remaining_quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    probability NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (probability >= 0 AND probability <= 100),
    category TEXT NOT NULL DEFAULT 'accessory' CHECK (category IN ('gadget', 'accessory', 'voucher')),
    voucher_code TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GRAND PRIZES (MEGA DRAW) TABLE
CREATE TABLE IF NOT EXISTS grand_prizes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    icon TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    draw_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'announced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    bill_number TEXT,
    locality TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DRAW ENTRIES TABLE (LOCKED RESULTS WITH CAMPAIGN SCOPE & COLLISION-SAFE ID)
CREATE TABLE IF NOT EXISTS draw_entries (
    id TEXT PRIMARY KEY, -- Format: 'MMS-2026-XXXXXXXX'
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    bill_number TEXT,
    locality TEXT,
    game_type TEXT NOT NULL CHECK (game_type IN ('spin', 'scratch')),
    gift_id TEXT NOT NULL REFERENCES gifts(id),
    gift_name TEXT NOT NULL,
    gift_name_hi TEXT NOT NULL,
    gift_icon TEXT NOT NULL,
    gift_image TEXT NOT NULL,
    voucher_code TEXT,
    result_status TEXT NOT NULL DEFAULT 'locked' CHECK (result_status IN ('locked', 'claimed')),
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    claimed_by TEXT,
    is_test BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- STRICT 1 DRAW PER MOBILE PER CAMPAIGN
    CONSTRAINT uq_campaign_customer_mobile UNIQUE (campaign_id, customer_mobile)
);

-- 7. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    mode TEXT NOT NULL DEFAULT 'random' CHECK (mode IN ('random', 'next_gift', 'queue')),
    next_gift_id TEXT REFERENCES gifts(id) ON DELETE SET NULL,
    shop_photo_url TEXT NOT NULL,
    google_maps_url TEXT NOT NULL DEFAULT '',
    test_mode BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- 8. GIFT QUEUE TABLE (For Sequential Mode)
CREATE TABLE IF NOT EXISTS gift_queue (
    id BIGSERIAL PRIMARY KEY,
    gift_id TEXT NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
    queue_order INT NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT false,
    consumed_at TIMESTAMPTZ
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT NOT NULL,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9B. AUTHORIZED ADMIN USERS (ALLOWLIST & RBAC)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- linked to auth.users.id upon Google OAuth login
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index for instant lookup on normalized lowercase email
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON admin_users (auth_user_id);

-- Automatic binding of auth.users to admin_users upon successful Google OAuth sign in
CREATE OR REPLACE FUNCTION public.handle_admin_auth_user_binding()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.admin_users
    SET auth_user_id = NEW.id,
        last_login_at = NOW(),
        name = COALESCE(admin_users.name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    WHERE LOWER(admin_users.email) = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_admin_bind ON auth.users;
CREATE TRIGGER on_auth_user_admin_bind
    AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_admin_auth_user_binding();

-- Seed Initial Super Admin (Store Owner)
INSERT INTO admin_users (email, name, role, is_active)
VALUES ('rohitjain221199@gmail.com', 'Rohit Jain (Store Owner)', 'SUPER_ADMIN', true)
ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'SUPER_ADMIN';

-- 9C. PRIZE ASSIGNMENTS TABLE (PRIZE CONTROL CENTER)
CREATE TABLE IF NOT EXISTS prize_assignments (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    prize_id TEXT NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
    prize_name TEXT NOT NULL,
    prize_name_hi TEXT NOT NULL,
    prize_image TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('ENTRY_SPECIFIC', 'NEXT_ELIGIBLE', 'SCHEDULED', 'RESERVE_ONLY')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'ALLOCATED', 'CLAIMED', 'CANCELLED', 'EXPIRED')),
    target_entry_id TEXT,
    target_mobile TEXT,
    customer_name TEXT,
    bill_number TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    activated_by TEXT,
    allocated_at TIMESTAMPTZ,
    allocated_entry_id TEXT,
    allocated_prize_id TEXT,
    allocated_by TEXT,
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- ==============================================================================
-- 10. SUPABASE STORAGE SETUP FOR SHOP PHOTOS & ASSETS
-- ==============================================================================

-- Create public bucket 'store-assets' for real storefront photograph
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Read Store Assets" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'store-assets');

CREATE POLICY "Admin Upload Store Assets" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'store-assets' AND
        EXISTS (SELECT 1 FROM admin_users au WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email') AND au.is_active = true)
    );

CREATE POLICY "Admin Update Store Assets" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'store-assets' AND
        EXISTS (SELECT 1 FROM admin_users au WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email') AND au.is_active = true)
    );

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grand_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_assignments ENABLE ROW LEVEL SECURITY;

-- 11.1 PUBLIC (ANONYMOUS & CUSTOMER) ACCESS: STRICTLY READ-ONLY FOR PERMITTED DATA
-- Public can read active campaigns, active gifts, and grand prizes
CREATE POLICY "Public campaigns read" ON campaigns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public active gifts read" ON gifts FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Public grand prizes read" ON grand_prizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public verify entries" ON draw_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public admin settings read" ON admin_settings FOR SELECT TO anon, authenticated USING (true);

-- 11.2 SENSITIVE ADMIN TABLES: CUSTOMER PUBLIC ACCESS IS STRICTLY BLOCKED (DENIED)
-- Public cannot read admin_users, prize_assignments, audit_logs, or gift_queue!
-- Only authenticated users present in admin_users allowlist with is_active = true can access!

-- ADMIN USERS RLS
CREATE POLICY "Active Admin Users Read Allowlist" ON admin_users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE (au.auth_user_id = auth.uid() OR LOWER(au.email) = LOWER(auth.jwt() ->> 'email'))
              AND au.is_active = true
        )
    );

CREATE POLICY "Super Admin Manage Admin Users" ON admin_users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE (au.auth_user_id = auth.uid() OR LOWER(au.email) = LOWER(auth.jwt() ->> 'email'))
              AND au.role = 'SUPER_ADMIN'
              AND au.is_active = true
        )
    );

-- PRIZE ASSIGNMENTS RLS (Customer public access NEVER permitted)
CREATE POLICY "Active Admin View Prize Assignments" ON prize_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

CREATE POLICY "Active Admin Manage Prize Assignments" ON prize_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

-- AUDIT LOGS RLS (SUPER_ADMIN and active Admins only)
CREATE POLICY "Active Admin Read Audit Logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

CREATE POLICY "System Insert Audit Logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- OPERATIONAL ADMIN RLS POLICIES FOR CAMPAIGNS, GIFTS, SETTINGS, ENTRIES
CREATE POLICY "Admin manage campaigns" ON campaigns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.role = 'SUPER_ADMIN'
              AND au.is_active = true
        )
    );

CREATE POLICY "Admin manage gifts" ON gifts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

CREATE POLICY "Admin manage grand_prizes" ON grand_prizes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.role = 'SUPER_ADMIN'
              AND au.is_active = true
        )
    );

CREATE POLICY "Admin manage draw_entries" ON draw_entries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

CREATE POLICY "Admin manage settings" ON admin_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.role = 'SUPER_ADMIN'
              AND au.is_active = true
        )
    );

CREATE POLICY "Admin manage gift_queue" ON gift_queue
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE LOWER(au.email) = LOWER(auth.jwt() ->> 'email')
              AND au.is_active = true
        )
    );

-- ==============================================================================
-- 12. SECURE ATOMIC ALLOCATION RPC FUNCTION (CAMPAIGN-SCOPED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION allocate_lucky_draw(
    p_campaign_id TEXT,
    p_full_name TEXT,
    p_mobile TEXT,
    p_bill_number TEXT,
    p_locality TEXT,
    p_game_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_mobile TEXT;
    v_existing RECORD;
    v_campaign RECORD;
    v_settings RECORD;
    v_selected_gift RECORD;
    v_customer_id UUID;
    v_entry_id TEXT;
    v_new_entry RECORD;
    v_random_pct NUMERIC;
    v_running_pct NUMERIC := 0;
    v_collision_check INT;
BEGIN
    -- 1. Normalize 10-digit mobile number
    v_clean_mobile := RIGHT(REGEXP_REPLACE(p_mobile, '\D', '', 'g'), 10);
    IF LENGTH(v_clean_mobile) <> 10 THEN
        RAISE EXCEPTION 'कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें (Invalid 10-digit mobile number)';
    END IF;

    -- 2. Validate campaign status
    SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id LIMIT 1;
    IF NOT FOUND OR v_campaign.status <> 'active' THEN
        RAISE EXCEPTION 'वर्तमान में लकी ड्रा अभियान सक्रिय नहीं है (Campaign is not currently active)';
    END IF;

    -- 3. Check if customer already has a locked draw result FOR THIS CAMPAIGN
    SELECT * INTO v_existing FROM draw_entries
    WHERE campaign_id = p_campaign_id AND customer_mobile = v_clean_mobile
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'already_played', true,
            'entry', row_to_json(v_existing)
        );
    END IF;

    -- 4. Read Admin Control Settings FOR UPDATE
    SELECT * INTO v_settings FROM admin_settings WHERE id = 1 FOR UPDATE;

    -- 5. Strategy 2: Admin Next Gift Control
    IF v_settings.next_gift_id IS NOT NULL THEN
        SELECT * INTO v_selected_gift 
        FROM gifts 
        WHERE id = v_settings.next_gift_id AND active = true AND remaining_quantity > 0 
        FOR UPDATE;
        
        IF FOUND THEN
            -- In real mode, clear next_gift_id back to NULL (Auto/Random)
            IF NOT v_settings.test_mode THEN
                UPDATE admin_settings SET next_gift_id = NULL, mode = 'random', updated_at = NOW() WHERE id = 1;
                INSERT INTO audit_logs (admin_id, admin_user, action, entity, old_value, new_value)
                VALUES ('system', 'System', 'NEXT_GIFT_CONSUMED', 'admin_settings', v_selected_gift.name, 'Awarded to ' || p_full_name);
            END IF;
        ELSE
            -- Gift was unavailable: fallback to random mode and log
            INSERT INTO audit_logs (admin_id, admin_user, action, entity, old_value, new_value)
            VALUES ('system', 'System', 'NEXT_GIFT_UNAVAILABLE_FALLBACK', 'admin_settings', v_settings.next_gift_id, 'Fallback to probability');
            UPDATE admin_settings SET next_gift_id = NULL, mode = 'random', updated_at = NOW() WHERE id = 1;
        END IF;
    END IF;

    -- 6. Strategy 3: Queue Mode
    IF v_selected_gift IS NULL AND v_settings.mode = 'queue' THEN
        SELECT g.* INTO v_selected_gift
        FROM gift_queue q
        JOIN gifts g ON q.gift_id = g.id
        WHERE q.consumed = false AND g.active = true AND g.remaining_quantity > 0
        ORDER BY q.queue_order ASC
        LIMIT 1
        FOR UPDATE OF g;

        IF FOUND AND NOT v_settings.test_mode THEN
            UPDATE gift_queue SET consumed = true, consumed_at = NOW() WHERE gift_id = v_selected_gift.id AND consumed = false;
        END IF;
    END IF;

    -- 7. Strategy 1: Random Probability Selection (Filtered by in-stock items)
    IF v_selected_gift IS NULL THEN
        v_random_pct := RANDOM() * 100;
        FOR v_selected_gift IN 
            SELECT * FROM gifts WHERE active = true AND remaining_quantity > 0 ORDER BY display_order ASC FOR UPDATE
        LOOP
            v_running_pct := v_running_pct + v_selected_gift.probability;
            IF v_random_pct <= v_running_pct THEN
                EXIT;
            END IF;
        END LOOP;

        IF v_selected_gift IS NULL THEN
            SELECT * INTO v_selected_gift FROM gifts WHERE active = true AND remaining_quantity > 0 ORDER BY display_order ASC LIMIT 1 FOR UPDATE;
        END IF;
    END IF;

    IF v_selected_gift IS NULL THEN
        RAISE EXCEPTION 'इस समय सभी Instant Gifts उपलब्ध नहीं हैं। (All instant gifts are currently out of stock)';
    END IF;

    -- 8. Deduct Inventory (Atomic, only when not in test mode)
    IF NOT v_settings.test_mode THEN
        UPDATE gifts SET remaining_quantity = remaining_quantity - 1 WHERE id = v_selected_gift.id;
    END IF;

    -- 9. Upsert Customer
    INSERT INTO customers (full_name, mobile, bill_number, locality)
    VALUES (p_full_name, v_clean_mobile, p_bill_number, p_locality)
    ON CONFLICT (mobile) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_customer_id;

    -- 10. Generate Collision-Safe Entry ID (MMS-2026-XXXXXXXX)
    LOOP
        v_entry_id := 'MMS-2026-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
        SELECT COUNT(*) INTO v_collision_check FROM draw_entries WHERE id = v_entry_id;
        EXIT WHEN v_collision_check = 0;
    END LOOP;

    -- 11. Insert Locked Draw Entry
    INSERT INTO draw_entries (
        id, campaign_id, customer_id, customer_name, customer_mobile, bill_number, locality,
        game_type, gift_id, gift_name, gift_name_hi, gift_icon, gift_image,
        voucher_code, result_status, played_at, is_test
    ) VALUES (
        v_entry_id, p_campaign_id, v_customer_id, p_full_name, v_clean_mobile, p_bill_number, p_locality,
        p_game_type, v_selected_gift.id, v_selected_gift.name, v_selected_gift.name_hi,
        v_selected_gift.icon, v_selected_gift.image, v_selected_gift.voucher_code,
        'locked', NOW(), v_settings.test_mode
    ) RETURNING * INTO v_new_entry;

    RETURN jsonb_build_object(
        'already_played', false,
        'entry', row_to_json(v_new_entry)
    );
END;
$$;
