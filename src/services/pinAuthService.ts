import { supabase } from "../config/supabase";
import { validatePin } from "./employeeService";
import type { Employee } from "../config/supabase";

/**
 * PIN Authentication Service
 * Handles PIN validation for both admin (owner) and employees
 */

export interface AdminPinAuthResult {
  success: boolean;
  role: "admin";
  restaurantId: string;
  error?: string;
}

export interface EmployeePinAuthResult {
  success: boolean;
  role: "employee";
  employee: Employee;
  error?: string;
}

export type PinAuthResult = AdminPinAuthResult | EmployeePinAuthResult | { success: false; error: string };

/**
 * Check if PIN authentication is required for this restaurant
 */
export const isPinRequired = async (
  restaurantId: string
): Promise<{ required: boolean; hasOwnerPin: boolean; pinEnabled: boolean }> => {
  console.log("🔍 [PIN AUTH] Checking if PIN is required for restaurant:", restaurantId);

  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("owner_pin, pin_enabled")
      .eq("id", restaurantId)
      .single();

    if (error || !data) {
      console.error("❌ [PIN AUTH] Error fetching restaurant:", error);
      return { required: false, hasOwnerPin: false, pinEnabled: false };
    }

    const hasOwnerPin = !!data.owner_pin;
    const pinEnabled = data.pin_enabled ?? true; // Default to true if not set

    // PIN is required if both owner_pin is set AND pin_enabled is true
    const required = hasOwnerPin && pinEnabled;

    console.log(`📌 [PIN AUTH] hasOwnerPin: ${hasOwnerPin}, pinEnabled: ${pinEnabled}, required: ${required}`);

    return { required, hasOwnerPin, pinEnabled };
  } catch (err) {
    console.error("❌ [PIN AUTH] Error checking PIN requirement:", err);
    return { required: false, hasOwnerPin: false, pinEnabled: false };
  }
};

/**
 * Validate admin (owner) PIN
 */
export const validateAdminPin = async (
  restaurantId: string,
  pin: string
): Promise<{ success: boolean; error?: string }> => {
  console.log("🔐 [PIN AUTH] Validating admin PIN for restaurant:", restaurantId);

  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("owner_pin, pin_enabled")
      .eq("id", restaurantId)
      .single();

    if (error || !data) {
      console.error("❌ [PIN AUTH] Error fetching restaurant:", error);
      return { success: false, error: "Error al validar PIN" };
    }

    // Check if owner PIN is set
    if (!data.owner_pin) {
      console.log("⚠️ [PIN AUTH] No owner PIN configured");
      return { success: false, error: "PIN de administrador no configurado" };
    }

    // Check if PIN authentication is enabled
    if (!data.pin_enabled) {
      console.log("⚠️ [PIN AUTH] PIN authentication is disabled for this restaurant");
      return { success: false, error: "Autenticación PIN no está habilitada" };
    }

    // Validate PIN
    if (data.owner_pin === pin) {
      console.log("✅ [PIN AUTH] Admin PIN validated successfully");
      return { success: true };
    } else {
      console.log("❌ [PIN AUTH] Invalid admin PIN");
      return { success: false, error: "PIN de administrador incorrecto" };
    }
  } catch (err) {
    console.error("❌ [PIN AUTH] Error validating admin PIN:", err);
    return { success: false, error: "Error al validar PIN" };
  }
};

/**
 * Validate employee PIN
 */
export const validateEmployeePin = async (
  restaurantId: string,
  pin: string
): Promise<{ success: boolean; employee?: Employee; error?: string }> => {
  console.log("🔐 [PIN AUTH] Validating employee PIN for restaurant:", restaurantId);

  try {
    const employee = await validatePin(restaurantId, pin);

    if (employee) {
      console.log("✅ [PIN AUTH] Employee PIN validated successfully:", employee.name);
      return { success: true, employee };
    } else {
      console.log("❌ [PIN AUTH] Invalid employee PIN");
      return { success: false, error: "PIN de empleado incorrecto" };
    }
  } catch (err) {
    console.error("❌ [PIN AUTH] Error validating employee PIN:", err);
    return { success: false, error: "Error al validar PIN" };
  }
};

/**
 * Unified PIN validation - tries employee first (4 digits), then admin (6 digits)
 */
export const validateUnifiedPin = async (
  restaurantId: string,
  pin: string
): Promise<PinAuthResult> => {
  console.log("🔐 [PIN AUTH] Validating PIN (length:", pin.length, ")");

  // Employee PINs are 4 digits
  if (pin.length === 4) {
    const employeeResult = await validateEmployeePin(restaurantId, pin);
    if (employeeResult.success && employeeResult.employee) {
      return {
        success: true,
        role: "employee",
        employee: employeeResult.employee,
      };
    }
    // Don't return error yet - might be part of a 6-digit admin PIN
    return { success: false, error: "Continúa ingresando dígitos o verifica tu PIN" };
  }

  // Admin PINs are 6 digits
  if (pin.length === 6) {
    const adminResult = await validateAdminPin(restaurantId, pin);
    if (adminResult.success) {
      return {
        success: true,
        role: "admin",
        restaurantId,
      };
    }
    return { success: false, error: adminResult.error || "PIN incorrecto" };
  }

  return { success: false, error: "PIN inválido" };
};
