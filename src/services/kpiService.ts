import { supabase } from "../config/supabase";
import type { RestaurantKPIs } from "../config/supabase";

/**
 * KPI Service
 * Service for fetching restaurant Key Performance Indicators
 */

export interface KPIDateRange {
  start_date: string;
  end_date: string;
}

/**
 * Calculate all KPIs for a restaurant within a date range
 */
export const calculateRestaurantKPIs = async (
  restaurantId: string,
  dateRange?: KPIDateRange
): Promise<RestaurantKPIs | null> => {
  console.log("📊 [KPI] Calculating KPIs for restaurant:", restaurantId, dateRange);

  try {
    const params: any = {
      p_restaurant_id: restaurantId,
    };

    if (dateRange) {
      params.p_start_date = dateRange.start_date;
      params.p_end_date = dateRange.end_date;
    }

    const { data, error } = await supabase.rpc("calculate_restaurant_kpis", params);

    if (error) {
      console.error("❌ [KPI] Error calculating KPIs:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ [KPI] No KPI data found");
      return null;
    }

    const kpis = data[0];
    console.log("✅ [KPI] KPIs calculated successfully");

    return {
      gross_margin_percentage: Number(kpis.gross_margin_percentage) || 0,
      gross_margin_by_category: kpis.gross_margin_by_category || {},
      gross_margin_by_item: kpis.gross_margin_by_item || [],
      prime_cost_percentage: Number(kpis.prime_cost_percentage) || 0,
      cogs: Number(kpis.cogs) || 0,
      labor_cost: Number(kpis.labor_cost) || 0,
      total_revenue: Number(kpis.total_revenue) || 0,
      average_ticket: Number(kpis.average_ticket) || 0,
      total_transactions: Number(kpis.total_transactions) || 0,
      protein_waste_percentage: Number(kpis.protein_waste_percentage) || 0,
      total_protein_purchases: Number(kpis.total_protein_purchases) || 0,
      total_protein_waste: Number(kpis.total_protein_waste) || 0,
      sales_mix: kpis.sales_mix || {},
      dessert_conversion_percentage: Number(kpis.dessert_conversion_percentage) || 0,
      coffee_conversion_percentage: Number(kpis.coffee_conversion_percentage) || 0,
      tickets_with_desserts: Number(kpis.tickets_with_desserts) || 0,
      tickets_with_coffee: Number(kpis.tickets_with_coffee) || 0,
    };
  } catch (error) {
    console.error("❌ [KPI] Exception calculating KPIs:", error);
    throw error;
  }
};

/**
 * Get KPIs for different time periods (daily, weekly, monthly)
 */
export const getKPIsByPeriod = async (
  restaurantId: string,
  period: "daily" | "weekly" | "monthly"
): Promise<RestaurantKPIs | null> => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "monthly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  return calculateRestaurantKPIs(restaurantId, {
    start_date: startDate.toISOString(),
    end_date: now.toISOString(),
  });
};
