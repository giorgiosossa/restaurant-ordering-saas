-- Add SELECT policy for admin and public reads
-- This allows the .insert().select() to work for anonymous users
DROP POLICY IF EXISTS "admin_select_all_orders" ON orders;

CREATE POLICY "admin_select_all_orders" ON orders FOR SELECT USING (TRUE);
