import { supabase } from "../config/supabase";
import type { RestaurantTable, ProteinWaste } from "../config/supabase";

/**
 * Table Management Service
 * Service for managing restaurant tables
 */

// =====================================================
// RESTAURANT TABLES
// =====================================================

/**
 * Get all tables for a restaurant
 */
export const getRestaurantTables = async (restaurantId: string): Promise<RestaurantTable[]> => {
  console.log("🪑 [TABLE] Fetching tables for restaurant:", restaurantId);

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });

  if (error) {
    console.error("❌ [TABLE] Error fetching tables:", error);
    return [];
  }

  console.log("✅ [TABLE] Tables fetched:", data?.length || 0);
  return data || [];
};

/**
 * Subscribe to restaurant tables with real-time updates
 */
export const subscribeToRestaurantTables = (
  restaurantId: string,
  callback: (tables: RestaurantTable[]) => void
) => {
  const fetchTables = async () => {
    const tables = await getRestaurantTables(restaurantId);
    callback(tables);
  };

  fetchTables();

  const subscription = supabase
    .channel(`restaurant-tables-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "restaurant_tables",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        console.log("🔔 [TABLE] Realtime update received");
        fetchTables();
      }
    )
    .subscribe((status) => {
      console.log("📡 [TABLE] Subscription status:", status);
    });

  return subscription;
};

/**
 * Create a new table
 */
export const createRestaurantTable = async (
  tableData: Partial<RestaurantTable>
): Promise<boolean> => {
  console.log("➕ [TABLE] Creating table:", tableData);

  const { error } = await supabase
    .from("restaurant_tables")
    .insert([tableData])
    .select()
    .single();

  if (error) {
    console.error("❌ [TABLE] Error creating table:", error);
    // Throw the error so it can be caught in the component
    throw error;
  }

  console.log("✅ [TABLE] Table created successfully");
  return true;
};

/**
 * Update a table
 */
export const updateRestaurantTable = async (
  tableId: string,
  updates: Partial<RestaurantTable>
): Promise<boolean> => {
  console.log("✏️ [TABLE] Updating table:", tableId, updates);

  const { error } = await supabase
    .from("restaurant_tables")
    .update(updates)
    .eq("id", tableId);

  if (error) {
    console.error("❌ [TABLE] Error updating table:", error);
    return false;
  }

  console.log("✅ [TABLE] Table updated successfully");
  return true;
};

/**
 * Delete a table
 */
export const deleteRestaurantTable = async (tableId: string): Promise<boolean> => {
  console.log("🗑️ [TABLE] Deleting table:", tableId);

  const { error } = await supabase.from("restaurant_tables").delete().eq("id", tableId);

  if (error) {
    console.error("❌ [TABLE] Error deleting table:", error);
    return false;
  }

  console.log("✅ [TABLE] Table deleted successfully");
  return true;
};

// =====================================================
// PROTEIN WASTE TRACKING
// =====================================================

/**
 * Record protein waste
 */
export const recordProteinWaste = async (
  wasteData: Partial<ProteinWaste>
): Promise<boolean> => {
  console.log("🗑️ [WASTE] Recording protein waste:", wasteData);

  const { error } = await supabase
    .from("protein_waste")
    .insert([wasteData])
    .select()
    .single();

  if (error) {
    console.error("❌ [WASTE] Error recording waste:", error);
    return false;
  }

  console.log("✅ [WASTE] Protein waste recorded successfully");
  return true;
};

/**
 * Get protein waste records
 */
export const getProteinWaste = async (
  restaurantId: string,
  startDate?: string,
  endDate?: string
): Promise<ProteinWaste[]> => {
  console.log("📊 [WASTE] Fetching protein waste for restaurant:", restaurantId);

  let query = supabase
    .from("protein_waste")
    .select("*, inventory_item:inventory_items(*)")
    .eq("restaurant_id", restaurantId)
    .order("wasted_at", { ascending: false });

  if (startDate) {
    query = query.gte("wasted_at", startDate);
  }
  if (endDate) {
    query = query.lte("wasted_at", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ [WASTE] Error fetching waste:", error);
    return [];
  }

  console.log("✅ [WASTE] Protein waste fetched:", data?.length || 0);
  return data || [];
};

/**
 * Delete protein waste record
 */
export const deleteProteinWaste = async (wasteId: string): Promise<boolean> => {
  console.log("🗑️ [WASTE] Deleting protein waste:", wasteId);

  const { error } = await supabase.from("protein_waste").delete().eq("id", wasteId);

  if (error) {
    console.error("❌ [WASTE] Error deleting waste:", error);
    return false;
  }

  console.log("✅ [WASTE] Protein waste deleted successfully");
  return true;
};
