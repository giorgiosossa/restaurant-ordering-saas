-- ============================================
-- FIX: Admin Login Function
-- ============================================
-- This fixes the admin_login function to properly verify passwords
-- using bcrypt instead of comparing hashes directly
-- ============================================

CREATE OR REPLACE FUNCTION admin_login(
  p_email TEXT,
  p_password TEXT  -- Changed from p_password_hash to p_password (plain text)
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
    AND au.password_hash = crypt(p_password, au.password_hash);  -- Use crypt to verify
END;
$$;

-- Verify the function was updated
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'admin_login'
  AND routine_schema = 'public';
