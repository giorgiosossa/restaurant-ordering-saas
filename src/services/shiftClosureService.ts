import { supabase } from "../config/supabase";

// Types for shift closure
export interface PaymentBreakdownItem {
  method: string;
  count: number;
  amount: number;
}

export interface OrderDetail {
  order_number: string;
  total: number;
  payment_method: string;
  customer_name?: string;
  table_number?: string;
  created_at: string;
  completed_at?: string;
}

export interface ShiftSummary {
  shift_id: string;
  employee_id: string;
  employee_name: string;
  restaurant_id: string;
  shift_start: string;
  shift_end: string;
  total_orders: number;
  total_amount: number;
  payment_breakdown: PaymentBreakdownItem[];
  expected_cash: number;
  orders_detail: OrderDetail[];
}

export interface ShiftClosure {
  id: string;
  employee_shift_id: string;
  employee_id: string;
  employee_name: string;
  restaurant_id: string;
  total_orders: number;
  total_amount: number;
  payment_breakdown: PaymentBreakdownItem[];
  expected_cash: number;
  actual_cash?: number;
  cash_difference?: number;
  notes?: string;
  shift_start: string;
  shift_end: string;
  closed_at: string;
}

/**
 * Get shift summary for the current active shift
 */
export const getShiftSummary = async (shiftId: string): Promise<ShiftSummary | null> => {
  console.log("📊 [SHIFT] Getting summary for shift:", shiftId);

  try {
    const { data, error } = await supabase.rpc("get_shift_summary", {
      p_shift_id: shiftId,
    });

    if (error) {
      console.error("❌ [SHIFT] Error getting shift summary:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ [SHIFT] No summary data found");
      return null;
    }

    const summary = data[0];
    console.log("✅ [SHIFT] Summary retrieved:", {
      total_orders: summary.total_orders,
      total_amount: summary.total_amount,
    });

    return {
      shift_id: summary.shift_id,
      employee_id: summary.employee_id,
      employee_name: summary.employee_name,
      restaurant_id: summary.restaurant_id,
      shift_start: summary.shift_start,
      shift_end: summary.shift_end,
      total_orders: Number(summary.total_orders),
      total_amount: Number(summary.total_amount),
      payment_breakdown: summary.payment_breakdown || [],
      expected_cash: Number(summary.expected_cash),
      orders_detail: summary.orders_detail || [],
    };
  } catch (error) {
    console.error("❌ [SHIFT] Exception getting summary:", error);
    throw error;
  }
};

/**
 * Create a shift closure (corte de caja)
 */
export const createShiftClosure = async (
  shiftId: string,
  actualCash?: number,
  notes?: string
): Promise<string> => {
  console.log("💰 [SHIFT] Creating shift closure:", { shiftId, actualCash, notes });

  try {
    const { data, error } = await supabase.rpc("create_shift_closure", {
      p_shift_id: shiftId,
      p_actual_cash: actualCash,
      p_notes: notes,
    });

    if (error) {
      console.error("❌ [SHIFT] Error creating closure:", error);
      throw error;
    }

    console.log("✅ [SHIFT] Closure created successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ [SHIFT] Exception creating closure:", error);
    throw error;
  }
};

/**
 * Get shift closure details by ID
 */
export const getShiftClosure = async (closureId: string): Promise<ShiftClosure | null> => {
  console.log("📄 [SHIFT] Getting closure details:", closureId);

  try {
    const { data, error } = await supabase.rpc("get_shift_closure", {
      p_closure_id: closureId,
    });

    if (error) {
      console.error("❌ [SHIFT] Error getting closure:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ [SHIFT] No closure data found");
      return null;
    }

    const closure = data[0];
    console.log("✅ [SHIFT] Closure retrieved");

    return {
      id: closure.id,
      employee_shift_id: closure.employee_shift_id,
      employee_id: closure.employee_id,
      employee_name: closure.employee_name,
      restaurant_id: closure.restaurant_id,
      total_orders: closure.total_orders,
      total_amount: Number(closure.total_amount),
      payment_breakdown: closure.payment_breakdown || [],
      expected_cash: Number(closure.expected_cash),
      actual_cash: closure.actual_cash ? Number(closure.actual_cash) : undefined,
      cash_difference: closure.cash_difference ? Number(closure.cash_difference) : undefined,
      notes: closure.notes,
      shift_start: closure.shift_start,
      shift_end: closure.shift_end,
      closed_at: closure.closed_at,
    };
  } catch (error) {
    console.error("❌ [SHIFT] Exception getting closure:", error);
    throw error;
  }
};

/**
 * Get all shift closures for a restaurant
 */
export const getRestaurantShiftClosures = async (
  restaurantId: string,
  limit = 50
): Promise<ShiftClosure[]> => {
  console.log("📋 [SHIFT] Getting closures for restaurant:", restaurantId);

  try {
    const { data, error } = await supabase
      .from("shift_closures")
      .select(
        `
        *,
        employees!shift_closures_employee_id_fkey(name)
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("closed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [SHIFT] Error getting closures:", error);
      throw error;
    }

    console.log(`✅ [SHIFT] Retrieved ${data?.length || 0} closures`);

    return (data || []).map((closure: any) => ({
      id: closure.id,
      employee_shift_id: closure.employee_shift_id,
      employee_id: closure.employee_id,
      employee_name: closure.employees?.name || "Unknown",
      restaurant_id: closure.restaurant_id,
      total_orders: closure.total_orders,
      total_amount: Number(closure.total_amount),
      payment_breakdown: closure.payment_breakdown || [],
      expected_cash: Number(closure.expected_cash),
      actual_cash: closure.actual_cash ? Number(closure.actual_cash) : undefined,
      cash_difference: closure.cash_difference ? Number(closure.cash_difference) : undefined,
      notes: closure.notes,
      shift_start: closure.shift_start,
      shift_end: closure.shift_end,
      closed_at: closure.closed_at,
    }));
  } catch (error) {
    console.error("❌ [SHIFT] Exception getting closures:", error);
    throw error;
  }
};

/**
 * Get shift closures for a specific employee
 */
export const getEmployeeShiftClosures = async (
  employeeId: string,
  limit = 50
): Promise<ShiftClosure[]> => {
  console.log("👤 [SHIFT] Getting closures for employee:", employeeId);

  try {
    const { data, error } = await supabase
      .from("shift_closures")
      .select(
        `
        *,
        employees!shift_closures_employee_id_fkey(name)
      `
      )
      .eq("employee_id", employeeId)
      .order("closed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [SHIFT] Error getting employee closures:", error);
      throw error;
    }

    console.log(`✅ [SHIFT] Retrieved ${data?.length || 0} closures for employee`);

    return (data || []).map((closure: any) => ({
      id: closure.id,
      employee_shift_id: closure.employee_shift_id,
      employee_id: closure.employee_id,
      employee_name: closure.employees?.name || "Unknown",
      restaurant_id: closure.restaurant_id,
      total_orders: closure.total_orders,
      total_amount: Number(closure.total_amount),
      payment_breakdown: closure.payment_breakdown || [],
      expected_cash: Number(closure.expected_cash),
      actual_cash: closure.actual_cash ? Number(closure.actual_cash) : undefined,
      cash_difference: closure.cash_difference ? Number(closure.cash_difference) : undefined,
      notes: closure.notes,
      shift_start: closure.shift_start,
      shift_end: closure.shift_end,
      closed_at: closure.closed_at,
    }));
  } catch (error) {
    console.error("❌ [SHIFT] Exception getting employee closures:", error);
    throw error;
  }
};
