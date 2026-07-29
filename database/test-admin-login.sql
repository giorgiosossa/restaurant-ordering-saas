-- ============================================
-- TEST: Verificar Admin y Login
-- ============================================

-- 1. Verificar que el admin existe
SELECT
  id,
  email,
  name,
  password_hash IS NOT NULL as has_password,
  length(password_hash) as hash_length,
  created_at
FROM admin_users
WHERE email = 'sosapererajorge@gmail.com';

-- 2. Test de la función de login
SELECT * FROM admin_login('sosapererajorge@gmail.com', 'ConverseBlancos2920');

-- 3. Verificar que la extensión pgcrypto está habilitada
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
