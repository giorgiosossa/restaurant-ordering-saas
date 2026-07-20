import { supabase } from "../config/supabase";
import type { Employee, EmployeeRole, EmployeeShift, OrderEventType } from "../config/supabase";

/**
 * Employee Service
 * Employee CRUD, PIN validation, shift clock-in/out, and order event logging
 */

// =====================================================
// EMPLOYEES
// =====================================================

// Subscribe to employees with real-time updates
export const subscribeToEmployees = (
  restaurantId: string,
  callback: (employees: Employee[]) => void
) => {
  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true });

    if (!error && data) {
      callback(data);
    }
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
        fetchEmployees();
      }
    )
    .subscribe();

  return subscription;
};

export const createEmployee = async (
  restaurantId: string,
  name: string,
  pin: string,
  roles: EmployeeRole[]
) => {
  const { data, error } = await supabase
    .from("employees")
    .insert([{ restaurant_id: restaurantId, name, pin, roles }])
    .select()
    .single();

  return { data, error };
};

export const updateEmployee = async (
  employeeId: string,
  updates: Partial<Pick<Employee, "name" | "roles">>
) => {
  const { error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", employeeId);

  return !error ? { error: null } : { error };
};

export const resetEmployeePin = async (employeeId: string, newPin: string) => {
  const { error } = await supabase
    .from("employees")
    .update({ pin: newPin })
    .eq("id", employeeId);

  return { error };
};

// Deactivating frees the PIN (partial unique index only covers is_active =
// true) and must close any shift still open for this employee.
export const deactivateEmployee = async (employeeId: string) => {
  const { error: shiftError } = await supabase
    .from("employee_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("employee_id", employeeId)
    .is("ended_at", null);

  if (shiftError) return { error: shiftError };

  const { error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", employeeId);

  return { error };
};

export const reactivateEmployee = async (employeeId: string) => {
  const { error } = await supabase
    .from("employees")
    .update({ is_active: true })
    .eq("id", employeeId);

  return { error };
};

// =====================================================
// PIN LOGIN / SHIFTS
// =====================================================

export const validatePin = async (restaurantId: string, pin: string) => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("pin", pin)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Employee;
};

// Reuses an already-open shift for this employee if one exists, otherwise
// starts a new one. Keeps a single device from creating duplicate shifts
// for the same employee while still allowing other employees/devices to
// have their own concurrent active shifts.
export const startOrResumeShift = async (employeeId: string, restaurantId: string) => {
  const { data: existing } = await supabase
    .from("employee_shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { data: existing as EmployeeShift, error: null };

  const { data, error } = await supabase
    .from("employee_shifts")
    .insert([{ employee_id: employeeId, restaurant_id: restaurantId }])
    .select()
    .single();

  return { data: data as EmployeeShift | null, error };
};

export const endShift = async (shiftId: string) => {
  const { error } = await supabase
    .from("employee_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", shiftId);

  return { error };
};

// =====================================================
// ORDER EVENTS
// =====================================================

export const recordOrderEvent = async (
  restaurantId: string,
  orderId: string,
  eventType: OrderEventType,
  employeeId?: string,
  employeeShiftId?: string
) => {
  const { error } = await supabase.from("order_events").insert([
    {
      restaurant_id: restaurantId,
      order_id: orderId,
      employee_id: employeeId ?? null,
      employee_shift_id: employeeShiftId ?? null,
      event_type: eventType,
    },
  ]);

  return { error };
};
