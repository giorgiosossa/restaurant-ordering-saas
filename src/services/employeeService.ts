import { supabase } from "../config/supabase";
import type { Employee, EmployeeRole, EmployeeShift, OrderEventType } from "../config/supabase";

/**
 * Employee Management Service (Sistema Unificado)
 * Service for managing restaurant employees:
 * - Labor cost calculations (Prime Cost)
 * - PIN validation and shifts (Comandas)
 */

// =====================================================
// EMPLOYEE CRUD OPERATIONS
// =====================================================

/**
 * Get all employees for a restaurant
 */
export const getRestaurantEmployees = async (
  restaurantId: string
): Promise<Employee[]> => {
  console.log("👥 [EMPLOYEE] Fetching employees for restaurant:", restaurantId);

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("❌ [EMPLOYEE] Error fetching employees:", error);
    return [];
  }

  console.log("✅ [EMPLOYEE] Employees fetched:", data?.length || 0);
  return data || [];
};

/**
 * Get active employees only
 */
export const getActiveEmployees = async (
  restaurantId: string
): Promise<Employee[]> => {
  console.log("👥 [EMPLOYEE] Fetching active employees for restaurant:", restaurantId);

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name", { ascending: true});

  if (error) {
    console.error("❌ [EMPLOYEE] Error fetching active employees:", error);
    return [];
  }

  console.log("✅ [EMPLOYEE] Active employees fetched:", data?.length || 0);
  return data || [];
};

/**
 * Subscribe to restaurant employees with real-time updates
 */
export const subscribeToRestaurantEmployees = (
  restaurantId: string,
  callback: (employees: Employee[]) => void
) => {
  const fetchEmployees = async () => {
    const employees = await getRestaurantEmployees(restaurantId);
    callback(employees);
  };

  fetchEmployees();

  const subscription = supabase
    .channel(`restaurant-employees-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "employees",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        console.log("🔔 [EMPLOYEE] Realtime update received");
        fetchEmployees();
      }
    )
    .subscribe((status) => {
      console.log("📡 [EMPLOYEE] Subscription status:", status);
    });

  return subscription;
};

/**
 * Create a new employee
 */
export const createEmployee = async (
  employeeData: Partial<Employee>
): Promise<boolean> => {
  console.log("➕ [EMPLOYEE] Creating employee:", employeeData);

  const { error } = await supabase
    .from("employees")
    .insert([employeeData])
    .select()
    .single();

  if (error) {
    console.error("❌ [EMPLOYEE] Error creating employee:", error);
    throw error;
  }

  console.log("✅ [EMPLOYEE] Employee created successfully");
  return true;
};

/**
 * Update an employee
 */
export const updateEmployee = async (
  employeeId: string,
  updates: Partial<Employee>
): Promise<boolean> => {
  console.log("✏️ [EMPLOYEE] Updating employee:", employeeId, updates);

  const { error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error updating employee:", error);
    return false;
  }

  console.log("✅ [EMPLOYEE] Employee updated successfully");
  return true;
};

/**
 * Delete an employee
 */
export const deleteEmployee = async (employeeId: string): Promise<boolean> => {
  console.log("🗑️ [EMPLOYEE] Deleting employee:", employeeId);

  const { error } = await supabase.from("employees").delete().eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error deleting employee:", error);
    return false;
  }

  console.log("✅ [EMPLOYEE] Employee deleted successfully");
  return true;
};

/**
 * Toggle employee active status
 */
export const toggleEmployeeStatus = async (
  employeeId: string,
  isActive: boolean
): Promise<boolean> => {
  console.log("🔄 [EMPLOYEE] Toggling employee status:", employeeId, isActive);

  const { error } = await supabase
    .from("employees")
    .update({ is_active: isActive })
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error toggling employee status:", error);
    return false;
  }

  console.log("✅ [EMPLOYEE] Employee status updated successfully");
  return true;
};

// =====================================================
// LABOR COST CALCULATIONS
// =====================================================

/**
 * Calculate total monthly labor cost for active employees
 */
export const calculateMonthlyLaborCost = (employees: Employee[]): number => {
  return employees
    .filter((emp) => emp.is_active)
    .reduce((total, emp) => {
      switch (emp.employment_type) {
        case "full_time":
          return total + (emp.monthly_salary || 0);

        case "part_time":
          // horas semanales × rate × 4.33 semanas promedio por mes
          return total + (emp.hourly_rate || 0) * (emp.hours_per_week || 0) * 4.33;

        case "hourly":
          // Estimación: 40 horas/semana × rate × 4.33 semanas
          return total + (emp.hourly_rate || 0) * 40 * 4.33;

        default:
          return total;
      }
    }, 0);
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = (
  employees: Employee[]
): {
  total: number;
  active: number;
  inactive: number;
  fullTime: number;
  partTime: number;
  hourly: number;
  monthlyLaborCost: number;
} => {
  const activeEmployees = employees.filter((e) => e.is_active);

  return {
    total: employees.length,
    active: activeEmployees.length,
    inactive: employees.filter((e) => !e.is_active).length,
    fullTime: activeEmployees.filter((e) => e.employment_type === "full_time").length,
    partTime: activeEmployees.filter((e) => e.employment_type === "part_time").length,
    hourly: activeEmployees.filter((e) => e.employment_type === "hourly").length,
    monthlyLaborCost: calculateMonthlyLaborCost(employees),
  };
};

/**
 * Calculate estimated labor cost for a date range
 */
export const calculateLaborCostForPeriod = (
  employees: Employee[],
  startDate: Date,
  endDate: Date
): number => {
  const daysInPeriod =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const weeksInPeriod = daysInPeriod / 7;

  return employees
    .filter((emp) => emp.is_active)
    .reduce((total, emp) => {
      switch (emp.employment_type) {
        case "full_time":
          // Salario mensual prorrateado
          return total + (emp.monthly_salary || 0) * (daysInPeriod / 30);

        case "part_time":
          // Horas semanales × rate × semanas
          return total + (emp.hourly_rate || 0) * (emp.hours_per_week || 0) * weeksInPeriod;

        case "hourly":
          // Estimación: 40 horas/semana
          return total + (emp.hourly_rate || 0) * 40 * weeksInPeriod;

        default:
          return total;
      }
    }, 0);
};

// =====================================================
// PIN LOGIN / SHIFTS (Para Comandas)
// =====================================================

/**
 * Validate employee PIN
 */
export const validatePin = async (restaurantId: string, pin: string): Promise<Employee | null> => {
  console.log("🔐 [EMPLOYEE] Validating PIN for restaurant:", restaurantId);

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("pin", pin)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    console.error("❌ [EMPLOYEE] PIN validation failed:", error);
    return null;
  }

  console.log("✅ [EMPLOYEE] PIN validated for employee:", data.name);
  return data as Employee;
};

/**
 * Start or resume a shift for an employee
 */
export const startOrResumeShift = async (
  employeeId: string,
  restaurantId: string
): Promise<{ data: EmployeeShift | null; error: any }> => {
  console.log("⏰ [SHIFT] Starting/resuming shift for employee:", employeeId);

  // Check if there's already an active shift
  const { data: existing } = await supabase
    .from("employee_shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("✅ [SHIFT] Resuming existing shift:", existing.id);
    return { data: existing as EmployeeShift, error: null };
  }

  // Create new shift
  const { data, error } = await supabase
    .from("employee_shifts")
    .insert([{ employee_id: employeeId, restaurant_id: restaurantId }])
    .select()
    .single();

  if (error) {
    console.error("❌ [SHIFT] Error creating shift:", error);
    return { data: null, error };
  }

  console.log("✅ [SHIFT] New shift created:", data.id);
  return { data: data as EmployeeShift, error: null };
};

/**
 * End a shift
 */
export const endShift = async (shiftId: string): Promise<{ error: any }> => {
  console.log("🛑 [SHIFT] Ending shift:", shiftId);

  const { error } = await supabase
    .from("employee_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", shiftId);

  if (error) {
    console.error("❌ [SHIFT] Error ending shift:", error);
  } else {
    console.log("✅ [SHIFT] Shift ended successfully");
  }

  return { error };
};

/**
 * Subscribe to employees (alias for compatibility)
 */
export const subscribeToEmployees = subscribeToRestaurantEmployees;

/**
 * Create employee (extended version with PIN and roles)
 */
export const createEmployeeWithPin = async (
  restaurantId: string,
  name: string,
  pin: string,
  roles: EmployeeRole[]
): Promise<{ data: Employee | null; error: any }> => {
  console.log("➕ [EMPLOYEE] Creating employee with PIN:", name);

  const { data, error } = await supabase
    .from("employees")
    .insert([{
      restaurant_id: restaurantId,
      name,
      pin,
      roles,
      employment_type: "hourly", // Default
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    console.error("❌ [EMPLOYEE] Error creating employee:", error);
    return { data: null, error };
  }

  console.log("✅ [EMPLOYEE] Employee created successfully");
  return { data: data as Employee, error: null };
};

/**
 * Update employee (basic info only, not PIN)
 */
export const updateEmployeeBasic = async (
  employeeId: string,
  updates: Partial<Pick<Employee, "name" | "roles">>
): Promise<{ error: any }> => {
  console.log("✏️ [EMPLOYEE] Updating employee:", employeeId);

  const { error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error updating employee:", error);
  } else {
    console.log("✅ [EMPLOYEE] Employee updated successfully");
  }

  return { error };
};

/**
 * Reset employee PIN
 */
export const resetEmployeePin = async (
  employeeId: string,
  newPin: string
): Promise<{ error: any }> => {
  console.log("🔑 [EMPLOYEE] Resetting PIN for employee:", employeeId);

  const { error } = await supabase
    .from("employees")
    .update({ pin: newPin })
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error resetting PIN:", error);
  } else {
    console.log("✅ [EMPLOYEE] PIN reset successfully");
  }

  return { error };
};

/**
 * Deactivate employee (closes any active shifts)
 */
export const deactivateEmployee = async (employeeId: string): Promise<{ error: any }> => {
  console.log("🚫 [EMPLOYEE] Deactivating employee:", employeeId);

  // Close any active shifts
  const { error: shiftError } = await supabase
    .from("employee_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("ended_at", null);

  if (shiftError) {
    console.error("❌ [EMPLOYEE] Error closing shifts:", shiftError);
    return { error: shiftError };
  }

  // Deactivate employee
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error deactivating employee:", error);
  } else {
    console.log("✅ [EMPLOYEE] Employee deactivated successfully");
  }

  return { error };
};

/**
 * Reactivate employee
 */
export const reactivateEmployee = async (employeeId: string): Promise<{ error: any }> => {
  console.log("✅ [EMPLOYEE] Reactivating employee:", employeeId);

  const { error } = await supabase
    .from("employees")
    .update({ is_active: true })
    .eq("id", employeeId);

  if (error) {
    console.error("❌ [EMPLOYEE] Error reactivating employee:", error);
  } else {
    console.log("✅ [EMPLOYEE] Employee reactivated successfully");
  }

  return { error };
};

// =====================================================
// ORDER EVENTS (Para tracking en Comandas)
// =====================================================

/**
 * Record an order event
 */
export const recordOrderEvent = async (
  restaurantId: string,
  orderId: string,
  eventType: OrderEventType,
  employeeId?: string,
  employeeShiftId?: string
): Promise<{ error: any }> => {
  console.log("📝 [EVENT] Recording order event:", eventType, orderId);

  const { error } = await supabase.from("order_events").insert([
    {
      restaurant_id: restaurantId,
      order_id: orderId,
      employee_id: employeeId ?? null,
      employee_shift_id: employeeShiftId ?? null,
      event_type: eventType,
    },
  ]);

  if (error) {
    console.error("❌ [EVENT] Error recording event:", error);
  } else {
    console.log("✅ [EVENT] Event recorded successfully");
  }

  return { error };
};
