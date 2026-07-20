# Fix: Inventory Not Updating in Real-Time

## The Problem
✅ Inventory deduction works in the database
❌ Frontend Inventario page doesn't refresh automatically

## The Solution

Follow these 3 steps to enable real-time inventory updates:

---

## Step 1: Enable Realtime in Supabase Dashboard

1. Go to your **Supabase Project Dashboard**
2. Click on **Database** in the left sidebar
3. Click on **Replication** (or **Publications** in older UI)
4. Find the `supabase_realtime` publication
5. Make sure **`inventory_items`** table is checked/enabled
   - If it's not in the list, click "Add table" and select `inventory_items`
6. Click **Save** or **Update publication**

![Supabase Realtime Enable](https://supabase.com/docs/img/realtime-replication.png)

**Alternative via SQL:**
```sql
-- Check current publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add inventory_items to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;

-- Verify it was added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items';
```

---

## Step 2: Run the Updated_At Trigger Migration

This ensures the `updated_at` column is updated whenever inventory changes, which helps trigger the realtime subscription.

1. Go to **Supabase SQL Editor**
2. Run the file: `database/019_fix_inventory_updated_at.sql`

Or copy/paste this:

```sql
-- Create or replace trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;

-- Create trigger on inventory_items
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 3: Test the Real-Time Updates

1. **Open two browser windows side-by-side:**
   - Window 1: Kitchen/Comandas page (`/cocina`)
   - Window 2: Inventario page (`/restaurant/inventario`)

2. **Open Developer Console (F12) in Window 2** (Inventario page)

3. **In Window 1** (Kitchen), click "Iniciar preparación" on an order

4. **Check Console Logs in Window 2:**

You should see:
```
📡 [INVENTORY] Subscription status: SUBSCRIBED
📦 [INVENTORY] Fetching inventory items...
📦 [INVENTORY] Inventory items fetched: 5
🔔 [INVENTORY] Realtime update received: {eventType: "UPDATE", ...}
📦 [INVENTORY] Fetching inventory items...
📦 [INVENTORY] Inventory items fetched: 5
```

5. **The Inventario page should automatically refresh** and show the new quantities!

---

## Step 4: Verify in Database

You can manually verify the deduction is working:

```sql
-- Check inventory transactions log
SELECT
  it.created_at,
  ii.name as item_name,
  it.quantity_change,
  it.quantity_before,
  it.quantity_after,
  o.order_number
FROM inventory_transactions it
JOIN inventory_items ii ON it.inventory_item_id = ii.id
LEFT JOIN orders o ON it.order_id = o.id
ORDER BY it.created_at DESC
LIMIT 20;

-- Check current inventory quantities
SELECT
  name,
  current_quantity,
  unit,
  alert_threshold,
  updated_at
FROM inventory_items
ORDER BY updated_at DESC;
```

---

## Troubleshooting

### Console shows: `📡 [INVENTORY] Subscription status: CHANNEL_ERROR`
- **Problem:** Realtime is not enabled on the table
- **Solution:** Go back to Step 1 and enable Realtime

### Console shows: No "🔔 [INVENTORY] Realtime update received" message
- **Problem:** The table update isn't triggering the subscription
- **Solutions:**
  1. Make sure you ran the trigger migration (Step 2)
  2. Check if Realtime is enabled (Step 1)
  3. Try refreshing the Inventario page

### Inventory shows old values after refresh
- **Problem:** The database update might not be happening
- **Solution:** Check the console logs when clicking "Iniciar preparación":
  - Should see: `✅ [INVENTORY] Deduction successful`
  - If you see an error, check the order has menu items with ingredients linked

### Nothing happens when clicking "Iniciar preparación"
- **Problem:** Menu items don't have ingredients linked
- **Solution:**
  1. Go to Restaurant → Menu
  2. Click on a menu item
  3. Add ingredients (insumos) with quantities used
  4. Try the order again

---

## Quick Test Command

Run this to simulate an inventory update and see if realtime works:

```sql
-- Update an inventory item manually
UPDATE inventory_items
SET current_quantity = current_quantity - 1
WHERE name = 'Tomate'  -- Replace with your item name
RETURNING name, current_quantity, updated_at;
```

Watch the browser console - you should see the realtime update message!

---

## Summary

Once you complete all 3 steps:
1. ✅ Realtime enabled in Supabase
2. ✅ Trigger migration applied
3. ✅ Console logs confirmed

The inventory will automatically update in real-time when orders move to "Preparando" status! 🎉
