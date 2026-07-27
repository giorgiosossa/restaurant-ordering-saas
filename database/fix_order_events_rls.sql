-- =====================================================
-- Fix RLS Policies for order_events
-- Allow employees using PIN authentication to insert events
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "order_events_insert_policy" ON order_events;
DROP POLICY IF EXISTS "order_events_select_policy" ON order_events;

-- Drop if the new policies already exist
DROP POLICY IF EXISTS "public_insert_order_events" ON order_events;
DROP POLICY IF EXISTS "public_select_order_events" ON order_events;

-- Create new permissive policies
-- Allow anyone to insert order events (employees with PIN don't have auth.uid())
CREATE POLICY "public_insert_order_events" ON order_events
  FOR INSERT
  WITH CHECK (TRUE);

-- Allow anyone to select order events
-- (needed for analytics and reporting, already have owner_manage_order_events for UPDATE/DELETE)
CREATE POLICY "public_select_order_events" ON order_events
  FOR SELECT
  USING (TRUE);

-- Note: owner_manage_order_events policy already exists for ALL operations
-- which provides owner-level access for UPDATE/DELETE operations
