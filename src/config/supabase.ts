import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface RegistrationRequest {
  id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  restaurant_type: string;
  heard_from?: string;
  notes?: string;
  status: "pending" | "contacted" | "verified" | "rejected";
  contacted_at?: string;
  rejection_reason?: string;
  internal_notes?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  registration_request_id?: string;
  name: string;
  slug: string;
  owner_name?: string;
  phone: string;
  email: string;
  city?: string;
  address?: string;
  restaurant_type?: string;
  logo_url?: string;
  qr_code_url?: string;
  subscription_plan: "free_trial" | "starter" | "pro" | "enterprise";
  status: "active" | "blocked" | "trial";
  is_active: boolean;
  terminal_payment_auto_approve?: boolean;
  openpay_customer_id?: string;
  owner_pin?: string;
  pin_enabled?: boolean;
  internal_notes?: string;
  block_reason?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  restaurant_id?: string;
  email: string;
  password_hash: string;
  temp_password: boolean;
  role: "owner" | "staff";
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  base_price: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  sizes?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  order_type: "qr" | "counter" | "phone" | "table";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "rejected";
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  payment_type?: "now" | "cash_at_bar" | "terminal_at_table";
  cash_payment_code?: string;
  cash_amount_brought?: number;
  is_blocked?: boolean;
  payment_verified_at?: string;
  customer_notes?: string;
  internal_notes?: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  base_price: number;
  selected_size?: { name: string; price: number };
  selected_addons?: { name: string; price: number }[];
  item_total: number;
  special_instructions?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
}

// Inventory Items
export interface InventoryItem {
  id: string;
  restaurant_id: string;
  name: string;
  unit: "gramos" | "kilogramos" | "litros" | "mililitros" | "unidades" | "piezas";
  current_quantity: number;
  alert_threshold: number;
  cost_per_unit?: number;
  is_protein?: boolean;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Menu Item Ingredients (junction table)
export interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  inventory_item_id: string;
  quantity_used: number;
  created_at: string;
}

export interface MenuItemIngredientWithDetails extends MenuItemIngredient {
  inventory_item: InventoryItem;
}

// Restaurant Tables
export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  seat_capacity: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Table Occupancy - REMOVED (KPI de Rotación de Sillas eliminado)
// export interface TableOccupancy {
//   id: string;
//   restaurant_id: string;
//   table_id: string;
//   order_id?: string;
//   seated_at: string;
//   freed_at?: string;
//   guest_count?: number;
//   created_at: string;
//   updated_at: string;
// }

// Protein Waste
export interface ProteinWaste {
  id: string;
  restaurant_id: string;
  inventory_item_id: string;
  quantity_wasted: number;
  waste_cost?: number;
  reason?: string;
  wasted_at: string;
  created_at: string;
}

// Employee Roles (para Comandas)
export type EmployeeRole = "caja" | "cocina" | "mesero";

// Employees (Sistema Unificado: Sueldo + PIN + Roles)
export interface Employee {
  id: string;
  restaurant_id: string;
  name: string;
  position?: string;
  employment_type: "full_time" | "part_time" | "hourly";
  monthly_salary?: number;
  hourly_rate?: number;
  hours_per_week?: number;
  is_active: boolean;
  notes?: string;
  pin?: string; // PIN de 4 dígitos para acceso a Comandas
  roles: EmployeeRole[]; // Roles para sistema de Comandas
  created_at: string;
  updated_at: string;
}

// Employee Shifts (Turnos de trabajo)
export interface EmployeeShift {
  id: string;
  employee_id: string;
  restaurant_id: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

// Order Events (Tracking de eventos)
export type OrderEventType = "accepted" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderEvent {
  id: string;
  restaurant_id: string;
  order_id: string;
  employee_id?: string;
  employee_shift_id?: string;
  event_type: OrderEventType;
  created_at: string;
}

// KPI Data Types
export interface GrossMarginByCategory {
  [categoryType: string]: {
    revenue: number;
    cost: number;
    margin_percentage: number;
  };
}

export interface GrossMarginByItem {
  item_id: string;
  item_name: string;
  revenue: number;
  cost: number;
  margin_percentage: number;
  units_sold: number;
}

export interface SalesMix {
  [categoryType: string]: {
    revenue: number;
    percentage: number;
    transaction_count: number;
  };
}

export interface RestaurantKPIs {
  // Margen Bruto
  gross_margin_percentage: number;
  gross_margin_by_category: GrossMarginByCategory;
  gross_margin_by_item: GrossMarginByItem[];

  // Prime Cost
  prime_cost_percentage: number;
  cogs: number;
  labor_cost: number;
  total_revenue: number;

  // Ticket Promedio
  average_ticket: number;
  total_transactions: number;

  // Mermas de Proteínas
  protein_waste_percentage: number;
  total_protein_purchases: number;
  total_protein_waste: number;

  // Mix de Ventas
  sales_mix: SalesMix;

  // Conversión de Postres y Café
  dessert_conversion_percentage: number;
  coffee_conversion_percentage: number;
  tickets_with_desserts: number;
  tickets_with_coffee: number;
}
