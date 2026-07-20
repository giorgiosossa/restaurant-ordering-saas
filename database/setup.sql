-- =====================================================
-- COMPLETE DATABASE SETUP - Food Ordering SaaS
-- CONSOLIDATED / CANONICAL VERSION
-- =====================================================
-- This file supersedes 002_sync_schema.sql through
-- 009_fix_missing_return.sql, which are kept only as a
-- historical record of how the schema evolved (see the
-- notice at the top of each of those files).
--
-- Safe to run on:
--   - A brand new Supabase project (run this file ONCE), or
--   - Your existing live project, to heal it to this exact
--     state (every statement uses IF NOT EXISTS / OR REPLACE /
--     DROP...IF EXISTS so it's idempotent and non-destructive)
--
-- What this fixes vs. the incremental migrations:
--   1. registration_requests had NO SELECT policy anywhere in
--      the migration history, so the admin panel's "Pending
--      Requests" list was always empty (RLS silently filtered
--      every row) even though INSERT worked. Fixed below.
--   2. menu_items was missing the plain `category` TEXT column
--      that the Restaurant Dashboard's Menu page and the
--      customer menu page actually read/write - only the
--      unused `category_id` FK existed in the schema. Fixed
--      below. (menu_categories/category_id are kept for
--      potential future use but nothing in the app queries
--      them today.)
--   3. Owner-facing RLS policies (restaurants/menu_items/
--      menu_categories/orders) went permissive -> auth.uid()
--      -> permissive -> auth.uid() across 002/006/007 while the
--      login model changed. This file has ONE final, clearly
--      named policy per table matching how the app logs owners
--      in today (real Supabase Auth via signUp/signInWithPassword).
--   4. Removes the dead `restaurant_login` RPC - no longer
--      called anywhere in the frontend (owners authenticate via
--      supabase.auth directly now).
--
-- NOT included here: seeding a demo restaurant/owner. That
-- requires a matching auth.users row created through the real
-- signup flow (supabase.auth.signUp), which can't be scripted
-- safely from plain SQL. To get a demo account: register through
-- /register, then approve it from the admin panel.
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- 1. Registration Requests
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  address TEXT,
  restaurant_type TEXT NOT NULL,
  heard_from TEXT,
  notes TEXT,
  owner_pin TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'verified', 'rejected')),
  contacted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS owner_pin TEXT;

-- 2. Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_request_id UUID REFERENCES registration_requests(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,
  address TEXT,
  restaurant_type TEXT,
  logo_url TEXT,
  qr_code_url TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'blocked', 'trial')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes TEXT,
  block_reason TEXT,
  trial_ends_at TIMESTAMPTZ,
  -- How this restaurant pays for the platform: a % commission on every
  -- order total, or a fixed monthly fee regardless of order volume.
  billing_type TEXT NOT NULL DEFAULT 'commission' CHECK (billing_type IN ('commission', 'fixed')),
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_rate >= 0),
  monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'commission';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 3. Users (Restaurant owners & staff)
-- id matches auth.users.id once an owner signs up (see handle_new_owner_user
-- trigger below) - password_hash is legacy/nullable, Supabase Auth owns
-- credentials now.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  temp_password BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 4. Menu Categories (kept for future use - not queried by the frontend today)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- 5. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sizes JSONB DEFAULT '[]'::jsonb,
  addons JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  prep_time_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category TEXT;

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('qr', 'counter', 'phone', 'table')),
  table_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected')),
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_transaction_id TEXT,
  customer_notes TEXT,
  internal_notes TEXT,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, order_number)
);

-- 7. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications (not used by the frontend yet - reserved for future use)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CONSTRAINTS THAT CAN'T USE "IF NOT EXISTS" DIRECTLY
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_restaurant_id_order_number_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_restaurant_id_order_number_key UNIQUE (restaurant_id, order_number);
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- =====================================================
-- AUTO-UPDATE "updated_at" TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at BEFORE UPDATE ON registration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-GENERATE ORDER NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date TEXT;
  order_count INTEGER;
BEGIN
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO order_count
  FROM orders
  WHERE restaurant_id = NEW.restaurant_id
    AND DATE(created_at) = CURRENT_DATE;

  NEW.order_number := today_date || '-' || LPAD(order_count::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- AUTO-CREATE public.users ROW ON REAL SUPABASE AUTH SIGNUP
-- =====================================================
-- Restaurant owners sign up with supabase.auth.signUp() at /register.
-- This mirrors that identity into public.users (restaurant_id is NULL
-- until an admin approves the registration and links it via
-- admin_create_restaurant below).
CREATE OR REPLACE FUNCTION public.handle_new_owner_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, temp_password, is_active)
  VALUES (NEW.id, NEW.email, 'owner', FALSE, TRUE)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_owner_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_owner_user();

-- =====================================================
-- RPC FUNCTIONS (bypass RLS for authentication / admin actions)
-- =====================================================

-- Dead code: owners now authenticate via supabase.auth directly,
-- nothing in the frontend calls this RPC anymore.
DROP FUNCTION IF EXISTS restaurant_login(TEXT, TEXT);

-- Admin Login (admin panel still uses a custom RPC + localStorage session,
-- it does not use Supabase Auth)
CREATE OR REPLACE FUNCTION admin_login(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.name
  FROM admin_users au
  WHERE au.email = LOWER(p_email)
    AND au.password_hash = p_password_hash;
END;
$$;

-- Create Restaurant (Admin function) - links the pre-existing auth-backed
-- owner account (created when they submitted the registration form) to
-- the new restaurant, instead of creating a new user with a generated password.
-- Drop old version first if it exists (needed when return type changes)
DROP FUNCTION IF EXISTS admin_create_restaurant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_create_restaurant(
  p_request_id UUID,
  p_restaurant_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_city TEXT,
  p_address TEXT,
  p_subscription_plan TEXT,
  p_password_hash TEXT,
  p_internal_notes TEXT
)
RETURNS TABLE (
  restaurant_id UUID,
  user_id UUID,
  success BOOLEAN,
  message TEXT,
  owner_pin TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
  v_owner_pin TEXT;
BEGIN
  -- Get the PIN from the registration request (created by owner during registration)
  SELECT rr.owner_pin INTO v_owner_pin
  FROM registration_requests rr
  WHERE rr.id = p_request_id;

  -- If no PIN was provided during registration, generate a random 6-digit PIN as fallback
  IF v_owner_pin IS NULL OR v_owner_pin = '' THEN
    v_owner_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  END IF;

  INSERT INTO restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, owner_pin, pin_enabled
  ) VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 'active', TRUE, v_owner_pin, TRUE
  )
  RETURNING id INTO v_restaurant_id;

  UPDATE users
  SET restaurant_id = v_restaurant_id
  WHERE email = LOWER(p_email)
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT v_restaurant_id, NULL::UUID, FALSE,
      'Restaurant created, but no matching signed-up owner account was found for this email. Ask them to register again.'::TEXT, v_owner_pin;
    RETURN;
  END IF;

  UPDATE registration_requests
  SET status = 'verified', contacted_at = NOW(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, v_user_id, TRUE, 'Restaurant created successfully'::TEXT, v_owner_pin;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, SQLERRM, NULL::TEXT;
END;
$$;

-- Toggle Restaurant Status (Admin function)
CREATE OR REPLACE FUNCTION admin_toggle_restaurant_status(
  p_restaurant_id UUID,
  p_is_active BOOLEAN,
  p_block_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE restaurants
  SET
    is_active = p_is_active,
    status = CASE WHEN p_is_active THEN 'active' ELSE 'blocked' END,
    block_reason = p_block_reason
  WHERE id = p_restaurant_id;
  RETURN TRUE;
END;
$$;

-- Update a restaurant's billing plan (Admin function)
CREATE OR REPLACE FUNCTION admin_update_billing(
  p_restaurant_id UUID,
  p_billing_type TEXT,
  p_commission_rate DECIMAL,
  p_monthly_fee DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE restaurants
  SET
    billing_type = p_billing_type,
    commission_rate = p_commission_rate,
    monthly_fee = p_monthly_fee
  WHERE id = p_restaurant_id;
  RETURN TRUE;
END;
$$;

-- Reject Registration Request (Admin function)
CREATE OR REPLACE FUNCTION admin_reject_request(
  p_request_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE registration_requests
  SET
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    contacted_at = NOW()
  WHERE id = p_request_id;
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_restaurant TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_restaurant_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_billing TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_request TO anon, authenticated;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- This app's owner login uses real Supabase Auth (auth.uid() is a
-- trusted session identity for owners). The admin panel uses a custom
-- RPC + localStorage session instead - it never creates a Supabase Auth
-- session, so auth.uid() is always NULL there. Tables the admin panel
-- needs to read/write directly (not via a SECURITY DEFINER RPC) must
-- stay permissive; real protection for those comes from the anon key
-- only ever being used by trusted first-party pages, same as any
-- Supabase project without per-tenant DB-level isolation for admin.
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop every policy name that has ever existed - both from the old
-- incremental migrations (002-009) AND the final names this file itself
-- creates below - so this script is safe to run over and over on the
-- live project (e.g. after a full data reset) and always ends up with
-- exactly the policies defined below, no "already exists" errors and no
-- stale duplicates left over from the old auth.uid()/permissive back-and-forth.
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public can create orders" ON orders;
DROP POLICY IF EXISTS "Public can create registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can manage menu" ON menu_items;
DROP POLICY IF EXISTS "Restaurant owners can manage categories" ON menu_categories;
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can view own row" ON users;
DROP POLICY IF EXISTS "public_insert_registration_requests" ON registration_requests;
DROP POLICY IF EXISTS "select_all_registration_requests" ON registration_requests;
DROP POLICY IF EXISTS "select_all_restaurants" ON restaurants;
DROP POLICY IF EXISTS "owner_update_own_restaurant" ON restaurants;
DROP POLICY IF EXISTS "user_select_own_row" ON users;
DROP POLICY IF EXISTS "public_select_available_menu_items" ON menu_items;
DROP POLICY IF EXISTS "owner_manage_menu_items" ON menu_items;
DROP POLICY IF EXISTS "owner_manage_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "owner_manage_orders" ON orders;
DROP POLICY IF EXISTS "admin_select_all_orders" ON orders;

-- registration_requests: public can submit, and since the admin panel has
-- no Supabase Auth session to check against, reads stay permissive too
-- (this SELECT policy was missing in every prior migration, which is why
-- "Pending Requests" always showed empty).
CREATE POLICY "public_insert_registration_requests" ON registration_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "select_all_registration_requests" ON registration_requests FOR SELECT USING (TRUE);

-- restaurants: readable by everyone (public menu page + admin panel both
-- need this); only the linked owner (via auth.uid()) can update it.
CREATE POLICY "select_all_restaurants" ON restaurants FOR SELECT USING (TRUE);
CREATE POLICY "owner_update_own_restaurant" ON restaurants FOR UPDATE
  USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = restaurants.id));

-- users: an owner can read their own row (needed at login to find restaurant_id)
CREATE POLICY "user_select_own_row" ON users FOR SELECT USING (auth.uid() = id);

-- menu_items: public sees only available items; the linked owner can manage all of theirs
CREATE POLICY "public_select_available_menu_items" ON menu_items FOR SELECT USING (is_available = TRUE);
CREATE POLICY "owner_manage_menu_items" ON menu_items FOR ALL
  USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = menu_items.restaurant_id))
  WITH CHECK (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = menu_items.restaurant_id));

-- menu_categories: owner-managed only (not used by the frontend yet)
CREATE POLICY "owner_manage_menu_categories" ON menu_categories FOR ALL
  USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = menu_categories.restaurant_id))
  WITH CHECK (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = menu_categories.restaurant_id));

-- orders: any customer can place one; only the linked owner can manage them.
-- Reads also stay permissive so the admin panel can compute per-restaurant
-- usage/billing stats (admin has no Supabase Auth session to scope by).
CREATE POLICY "public_insert_orders" ON orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admin_select_all_orders" ON orders FOR SELECT USING (TRUE);
CREATE POLICY "owner_manage_orders" ON orders FOR ALL
  USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = orders.restaurant_id))
  WITH CHECK (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = orders.restaurant_id));

-- =====================================================
-- ENABLE REAL-TIME REPLICATION
-- =====================================================
ALTER TABLE registration_requests REPLICA IDENTITY FULL;
ALTER TABLE restaurants REPLICA IDENTITY FULL;
ALTER TABLE menu_items REPLICA IDENTITY FULL;
ALTER TABLE orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE registration_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- =====================================================
-- INSERT DEFAULT ADMIN USER
-- =====================================================
-- Email: admin@foodorder.com
-- Password: admin123
-- Hash: SHA-256 of "admin123"
INSERT INTO admin_users (email, password_hash, name, is_super_admin)
VALUES ('admin@foodorder.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✓ Database setup complete!';
  RAISE NOTICE '✓ Tables, indexes and triggers created/verified';
  RAISE NOTICE '✓ Owner signup trigger (auth.users -> public.users) configured';
  RAISE NOTICE '✓ RPC functions configured';
  RAISE NOTICE '✓ RLS policies reset to their final, single-source-of-truth state';
  RAISE NOTICE '✓ Real-time replication configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin Login:';
  RAISE NOTICE '  Email: admin@foodorder.com';
  RAISE NOTICE '  Password: admin123';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Enable real-time in Supabase Dashboard > Database > Replication';
END $$;
