-- =====================================================
-- Add UPDATE Policy for orders table
-- Allow employees using PIN authentication to update orders
-- =====================================================

-- Drop if exists
DROP POLICY IF EXISTS "public_update_orders" ON orders;

-- Create public UPDATE policy
-- Allows anyone to update orders (employees with PIN don't have auth.uid())
CREATE POLICY "public_update_orders" ON orders
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);
