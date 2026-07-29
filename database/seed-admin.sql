-- ============================================
-- SEED: Create Initial Admin User
-- ============================================
-- This script creates the initial admin account for the platform
--
-- IMPORTANT: Change the email and password before running!
-- Password will be hashed automatically by the trigger
--
-- Usage:
--   1. Update the email and password below
--   2. Run in Supabase SQL Editor or via CLI
-- ============================================

-- Insert admin user
-- REPLACE: 'admin@cocinacantera.com' with your email
-- REPLACE: 'TU_PASSWORD_SEGURO_AQUI' with your secure password
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@cocinacantera.com',  -- ← CHANGE THIS
  crypt('TU_PASSWORD_SEGURO_AQUI', gen_salt('bf')),  -- ← CHANGE THIS
  'Administrador'
)
ON CONFLICT (email) DO NOTHING;

-- Verify admin was created
SELECT id, email, name, created_at
FROM admin_users
WHERE email = 'admin@cocinacantera.com';  -- ← CHANGE THIS to match your email

-- ============================================
-- NOTES:
-- ============================================
-- - The password is automatically hashed using bcrypt
-- - ON CONFLICT prevents errors if admin already exists
-- - The SELECT query at the end confirms creation
-- ============================================
