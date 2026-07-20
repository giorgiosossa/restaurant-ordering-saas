import { supabase } from "../config/supabase";
import type { InventoryItem, MenuItemIngredient, MenuItemIngredientWithDetails } from "../config/supabase";

/**
 * Inventory Service
 * All inventory and ingredient management operations with real-time support
 */

// =====================================================
// INVENTORY ITEMS
// =====================================================

// Subscribe to inventory items with real-time updates
export const subscribeToInventoryItems = (
  restaurantId: string,
  callback: (items: InventoryItem[]) => void
) => {
  const fetchItems = async () => {
    console.log("📦 [INVENTORY] Fetching inventory items...");
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true });

    if (!error && data) {
      console.log("📦 [INVENTORY] Inventory items fetched:", data.length);
      callback(data);
    } else if (error) {
      console.error("❌ [INVENTORY] Error fetching items:", error);
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-inventory-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inventory_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        console.log("🔔 [INVENTORY] Realtime update received:", payload);
        fetchItems();
      }
    )
    .subscribe((status) => {
      console.log("📡 [INVENTORY] Subscription status:", status);
    });

  return subscription;
};

// Get all inventory items for a restaurant
export const getInventoryItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching inventory items:", error);
    return [];
  }

  return data || [];
};

// Get inventory items with low stock
export const getLowStockItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching low stock items:", error);
    return [];
  }

  // Filter items where current_quantity <= alert_threshold
  return (data || []).filter(
    (item) => item.current_quantity <= item.alert_threshold
  );
};

// Create inventory item
export const createInventoryItem = async (item: Partial<InventoryItem>) => {
  const { error } = await supabase
    .from("inventory_items")
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error("Error creating inventory item:", error);
    return false;
  }

  return true;
};

// Update inventory item
export const updateInventoryItem = async (
  itemId: string,
  updates: Partial<InventoryItem>
) => {
  const { error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating inventory item:", error);
    return false;
  }

  return true;
};

// Delete inventory item
export const deleteInventoryItem = async (itemId: string) => {
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting inventory item:", error);
    return false;
  }

  return true;
};

// Update inventory quantity (add or subtract)
export const updateInventoryQuantity = async (
  itemId: string,
  quantityChange: number
) => {
  // Get current quantity
  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("current_quantity")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) {
    console.error("Error fetching inventory item:", fetchError);
    return false;
  }

  const newQuantity = Math.max(0, item.current_quantity + quantityChange);

  const { error } = await supabase
    .from("inventory_items")
    .update({ current_quantity: newQuantity })
    .eq("id", itemId);

  if (error) {
    console.error("Error updating inventory quantity:", error);
    return false;
  }

  return true;
};

// =====================================================
// MENU ITEM INGREDIENTS
// =====================================================

// Get ingredients for a specific menu item
export const getMenuItemIngredients = async (menuItemId: string) => {
  const { data, error } = await supabase
    .from("menu_item_ingredients")
    .select(`
      *,
      inventory_item:inventory_items(*)
    `)
    .eq("menu_item_id", menuItemId);

  if (error) {
    console.error("Error fetching menu item ingredients:", error);
    return [];
  }

  return data || [];
};

// Subscribe to menu item ingredients with real-time updates
export const subscribeToMenuItemIngredients = (
  menuItemId: string,
  callback: (ingredients: MenuItemIngredientWithDetails[]) => void
) => {
  const fetchIngredients = async () => {
    const data = await getMenuItemIngredients(menuItemId);
    callback(data as MenuItemIngredientWithDetails[]);
  };

  fetchIngredients();

  const subscription = supabase
    .channel(`menu-item-ingredients-${menuItemId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_item_ingredients",
        filter: `menu_item_id=eq.${menuItemId}`,
      },
      () => {
        fetchIngredients();
      }
    )
    .subscribe();

  return subscription;
};

// Add ingredient to menu item
export const addIngredientToMenuItem = async (
  menuItemId: string,
  inventoryItemId: string,
  quantityUsed: number
) => {
  const { error } = await supabase
    .from("menu_item_ingredients")
    .insert([
      {
        menu_item_id: menuItemId,
        inventory_item_id: inventoryItemId,
        quantity_used: quantityUsed,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding ingredient to menu item:", error);
    return false;
  }

  return true;
};

// Update ingredient quantity for menu item
export const updateMenuItemIngredient = async (
  ingredientId: string,
  quantityUsed: number
) => {
  const { error } = await supabase
    .from("menu_item_ingredients")
    .update({ quantity_used: quantityUsed })
    .eq("id", ingredientId);

  if (error) {
    console.error("Error updating menu item ingredient:", error);
    return false;
  }

  return true;
};

// Remove ingredient from menu item
export const removeIngredientFromMenuItem = async (ingredientId: string) => {
  const { error } = await supabase
    .from("menu_item_ingredients")
    .delete()
    .eq("id", ingredientId);

  if (error) {
    console.error("Error removing ingredient from menu item:", error);
    return false;
  }

  return true;
};

// Get all menu items that use a specific inventory item
export const getMenuItemsUsingIngredient = async (inventoryItemId: string) => {
  const { data, error } = await supabase
    .from("menu_item_ingredients")
    .select(`
      *,
      menu_item:menu_items(*)
    `)
    .eq("inventory_item_id", inventoryItemId);

  if (error) {
    console.error("Error fetching menu items using ingredient:", error);
    return [];
  }

  return data || [];
};

// =====================================================
// INVENTORY DEDUCTION FOR ORDERS
// =====================================================

export interface InventoryDeductionResult {
  success: boolean;
  message: string;
  insufficient_items?: Array<{
    item_name: string;
    required: number;
    available: number;
    unit: string;
    menu_item_id: string;
  }>;
}

// Deduct inventory items for an order when it moves to preparing status
export const deductInventoryForOrder = async (
  orderId: string
): Promise<InventoryDeductionResult> => {
  console.log("🔍 [INVENTORY] Starting deduction for order:", orderId);

  try {
    const { data, error } = await supabase.rpc("deduct_inventory_for_order", {
      p_order_id: orderId,
    });

    console.log("🔍 [INVENTORY] RPC Response:", { data, error });

    if (error) {
      console.error("❌ [INVENTORY] Error deducting inventory:", error);
      return {
        success: false,
        message: error.message || "Failed to deduct inventory",
      };
    }

    // The function returns a table with a single row
    const result = data?.[0];

    console.log("🔍 [INVENTORY] Parsed result:", result);

    if (!result) {
      console.error("❌ [INVENTORY] No result returned from function");
      return {
        success: false,
        message: "No result returned from deduction function",
      };
    }

    if (result.success) {
      console.log("✅ [INVENTORY] Deduction successful:", result.message);
    } else {
      console.error("⚠️ [INVENTORY] Deduction failed:", result.message, result.insufficient_items);
    }

    return {
      success: result.success,
      message: result.message,
      insufficient_items:
        result.insufficient_items && result.insufficient_items.length > 0
          ? result.insufficient_items
          : undefined,
    };
  } catch (error) {
    console.error("❌ [INVENTORY] Exception calling deduct_inventory_for_order:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
};
