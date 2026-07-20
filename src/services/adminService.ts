import { supabase } from "../config/supabase";
import type { RegistrationRequest, Restaurant } from "../config/supabase";
import { generateSlug } from "../utils/helpers";

/**
 * Admin API Service
 * All admin-related database operations
 */

// Get all pending registration requests with real-time updates
export const subscribeToPendingRequests = (
  callback: (requests: RegistrationRequest[]) => void
) => {
  // Initial fetch
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchPending();

  // Subscribe to changes
  const subscription = supabase
    .channel("pending-requests")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "registration_requests",
        filter: "status=eq.pending",
      },
      () => {
        fetchPending();
      }
    )
    .subscribe();

  return subscription;
};

// Create restaurant account from registration request
export const createRestaurantAccount = async (
  requestId: string,
  data: {
    email: string;
    subscriptionPlan: string;
    internalNotes?: string;
  }
) => {
  try {
    // 1. Get registration request
    const { data: request, error: requestError } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      throw new Error("Registration request not found");
    }

    // 2. Generate slug
    const slug = generateSlug(request.restaurant_name);

    // 3. Use RPC function to create the restaurant and link the owner's
    // account (they already created it themselves with a password when
    // they submitted the registration form)
    const { data: result, error: rpcError } = await supabase.rpc(
      "admin_create_restaurant",
      {
        p_request_id: requestId,
        p_restaurant_name: request.restaurant_name,
        p_slug: slug,
        p_owner_name: request.owner_name,
        p_phone: request.phone,
        p_email: data.email,
        p_city: request.city,
        p_address: request.address || null,
        p_subscription_plan: data.subscriptionPlan,
        p_password_hash: null,
        p_internal_notes: data.internalNotes || null,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      throw new Error(rpcError.message);
    }

    if (!result || result.length === 0 || !result[0].success) {
      throw new Error(result?.[0]?.message || "Failed to create restaurant");
    }

    return {
      success: true,
      restaurant: {
        id: result[0].restaurant_id,
        name: request.restaurant_name,
        slug: slug,
      },
      credentials: {
        email: data.email,
        ownerPin: result[0].owner_pin,
        loginUrl: `${window.location.origin}/login`,
      },
    };
  } catch (error: any) {
    console.error("Create account error:", error);
    return {
      success: false,
      error: error.message || "Failed to create account",
    };
  }
};

// Reject registration request
export const rejectRegistrationRequest = async (
  requestId: string,
  reason: string
) => {
  const { error } = await supabase.rpc("admin_reject_request", {
    p_request_id: requestId,
    p_rejection_reason: reason,
  });

  return !error;
};

// Get all restaurants with real-time updates
export const subscribeToRestaurants = (
  callback: (restaurants: Restaurant[]) => void
) => {
  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchRestaurants();

  const subscription = supabase
    .channel("restaurants")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "restaurants",
      },
      () => {
        fetchRestaurants();
      }
    )
    .subscribe();

  return subscription;
};

// Toggle restaurant block/unblock status
export const toggleRestaurantStatus = async (
  restaurantId: string,
  isCurrentlyBlocked: boolean,
  blockReason?: string
) => {
  const { error } = await supabase.rpc("admin_toggle_restaurant_status", {
    p_restaurant_id: restaurantId,
    p_is_active: isCurrentlyBlocked, // If currently blocked, set to active (true)
    p_block_reason: blockReason || null,
  });

  return !error;
};

// Per-restaurant usage & billing stats (orders, revenue, amount owed based
// on each restaurant's billing plan). Excludes cancelled/rejected orders
// since those didn't generate real revenue.
export interface RestaurantUsageStats {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_active: boolean;
  billing_type: "commission" | "fixed";
  commission_rate: number;
  monthly_fee: number;
  orderCount: number;
  revenue: number;
  amountOwed: number;
  lastOrderAt: string | null;
}

export const getRestaurantUsageStats = async (): Promise<
  RestaurantUsageStats[]
> => {
  const [{ data: restaurants, error: restError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select(
          "id, name, slug, status, is_active, billing_type, commission_rate, monthly_fee"
        )
        .order("name", { ascending: true }),
      supabase
        .from("orders")
        .select("restaurant_id, total, status, created_at")
        .not("status", "in", "(cancelled,rejected)"),
    ]);

  if (restError || !restaurants) {
    console.error("Error fetching restaurant usage stats:", restError, ordersError);
    return [];
  }

  return restaurants.map((r) => {
    const restaurantOrders = (orders || []).filter(
      (o) => o.restaurant_id === r.id
    );
    const orderCount = restaurantOrders.length;
    const revenue = restaurantOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );
    const lastOrderAt = restaurantOrders.reduce<string | null>(
      (latest, o) => (!latest || o.created_at > latest ? o.created_at : latest),
      null
    );
    const amountOwed =
      r.billing_type === "fixed"
        ? r.monthly_fee
        : revenue * (r.commission_rate / 100);

    return { ...r, orderCount, revenue, amountOwed, lastOrderAt };
  });
};

// Update a restaurant's billing plan (commission % or fixed monthly fee)
export const updateRestaurantBilling = async (
  restaurantId: string,
  billingType: "commission" | "fixed",
  commissionRate: number,
  monthlyFee: number
) => {
  const { error } = await supabase.rpc("admin_update_billing", {
    p_restaurant_id: restaurantId,
    p_billing_type: billingType,
    p_commission_rate: commissionRate,
    p_monthly_fee: monthlyFee,
  });

  return !error;
};

// Get platform statistics
export const getPlatformStats = async () => {
  try {
    // Get counts
    const [
      { count: activeRestaurants },
      { count: pendingRequests },
      { count: totalOrders },
      { data: todayOrders },
    ] = await Promise.all([
      supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("registration_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("total")
        .gte(
          "created_at",
          new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        ),
    ]);

    const todayRevenue =
      todayOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    return {
      activeRestaurants: activeRestaurants || 0,
      pendingRequests: pendingRequests || 0,
      totalOrders: totalOrders || 0,
      todayRevenue,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      activeRestaurants: 0,
      pendingRequests: 0,
      totalOrders: 0,
      todayRevenue: 0,
    };
  }
};
