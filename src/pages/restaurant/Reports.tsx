import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Calendar,
  Download,
  Users,
  Coffee,
  UtensilsCrossed,
  Percent,
  ChefHat,
  AlertCircle,
} from "lucide-react";
import { Card, Button, Loading } from "../../components/ui";
import { KPICard } from "../../components/KPICard";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { calculateRestaurantKPIs } from "../../services/kpiService";
import type { RestaurantKPIs } from "../../config/supabase";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  orderTypeDistribution: { type: string; count: number }[];
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [kpiData, setKpiData] = useState<RestaurantKPIs | null>(null);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    fetchReportData();
    fetchKPIs();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.restaurant_id) return;

      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", user.restaurant_id)
        .gte("created_at", startDate.toISOString())
        .in("status", ["completed", "ready", "preparing", "accepted"]);

      if (error) throw error;

      // Calculate metrics
      const totalRevenue =
        orders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orders?.forEach((order) => {
        order.items?.forEach((item: any) => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { count: 0, revenue: 0 };
          }
          itemCounts[item.name].count += item.quantity;
          itemCounts[item.name].revenue += item.item_total;
        });
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Daily revenue
      const dailyData: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("es-MX", {
          month: "short",
          day: "numeric",
        });
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0 };
        }
        dailyData[date].revenue += order.total;
        dailyData[date].orders += 1;
      });

      const dailyRevenue = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .slice(-14);

      // Order type distribution
      const typeCounts: Record<string, number> = {};
      orders?.forEach((order) => {
        const type = order.order_type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const orderTypeDistribution = Object.entries(typeCounts).map(
        ([type, count]) => ({ type, count })
      );

      setReportData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        topItems,
        dailyRevenue,
        orderTypeDistribution,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  };

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.restaurant_id) return;

      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const kpis = await calculateRestaurantKPIs(user.restaurant_id, {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      setKpiData(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData || !kpiData) return;

    const csvContent = [
      ["Métrica", "Valor"],
      ["Ingresos Totales", formatCurrency(reportData.totalRevenue)],
      ["Total de Pedidos", reportData.totalOrders.toString()],
      ["Valor Promedio de Pedido", formatCurrency(reportData.avgOrderValue)],
      [""],
      ["=== KPIs CLAVE ==="],
      ["Margen Bruto (%)", kpiData.gross_margin_percentage.toFixed(2)],
      ["Prime Cost (%)", kpiData.prime_cost_percentage.toFixed(2)],
      ["Ticket Promedio", formatCurrency(kpiData.average_ticket)],
      ["Mermas de Proteínas (%)", kpiData.protein_waste_percentage.toFixed(2)],
      [
        "Conversión de Postres (%)",
        kpiData.dessert_conversion_percentage.toFixed(2),
      ],
      [
        "Conversión de Café (%)",
        kpiData.coffee_conversion_percentage.toFixed(2),
      ],
      [""],
      ["Platillos Más Vendidos", "Cantidad", "Ingresos"],
      ...reportData.topItems.map((item) => [
        item.name,
        item.count.toString(),
        formatCurrency(item.revenue),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${dateRange}-dias.csv`;
    a.click();
  };

  if (loading) {
    return <Loading text="Cargando reportes..." />;
  }

  if (!reportData || !kpiData) {
    return (
      <div className="text-center text-text-secondary">
        No hay datos disponibles
      </div>
    );
  }

  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  // Prepare sales mix data for chart
  const salesMixData = Object.entries(kpiData.sales_mix || {}).map(
    ([type, data]) => ({
      name: type === "food" ? "Alimentos" : type === "beverage" ? "Bebidas" : type === "dessert" ? "Postres" : "Café",
      value: data.revenue,
      percentage: data.percentage,
    })
  );

  // Prepare margin by category data for chart
  const marginByCategoryData = Object.entries(
    kpiData.gross_margin_by_category || {}
  ).map(([type, data]) => ({
    name: type === "food" ? "Alimentos" : type === "beverage" ? "Bebidas" : type === "dessert" ? "Postres" : "Café",
    margin: data.margin_percentage,
    revenue: data.revenue,
    cost: data.cost,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">
            Reportes y KPIs
          </h2>
          <p className="text-text-secondary">
            Analiza el rendimiento de tu restaurante con indicadores clave
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "7" | "30" | "90")}
            className="input"
          >
            <option value="7">Últimos 7 Días</option>
            <option value="30">Últimos 30 Días</option>
            <option value="90">Últimos 90 Días</option>
          </select>
          <Button
            icon={<Download className="w-5 h-5" />}
            onClick={exportReport}
            variant="outline"
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h3 className="text-lg font-bold text-text mb-4">
          Indicadores Principales
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Ingresos Totales"
            value={reportData.totalRevenue}
            format="currency"
            icon={DollarSign}
            iconColor="text-success"
            subtitle={`${reportData.totalOrders} pedidos`}
          />

          <KPICard
            title="Ticket Promedio"
            value={kpiData.average_ticket}
            format="currency"
            icon={ShoppingBag}
            iconColor="text-accent"
            subtitle={`${kpiData.total_transactions} transacciones`}
          />

          <KPICard
            title="Margen Bruto"
            value={kpiData.gross_margin_percentage}
            format="percentage"
            icon={TrendingUp}
            iconColor="text-success"
            subtitle="Utilidad sobre ventas"
          />

          <KPICard
            title="Prime Cost"
            value={kpiData.prime_cost_percentage}
            format="percentage"
            icon={ChefHat}
            iconColor={
              kpiData.prime_cost_percentage > 65 ? "text-error" : "text-warning"
            }
            subtitle="COGS + Mano de obra"
          />
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <h3 className="text-lg font-bold text-text mb-4">
          Indicadores Operativos
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            title="Conversión de Postres"
            value={kpiData.dessert_conversion_percentage}
            format="percentage"
            icon={UtensilsCrossed}
            iconColor="text-accent-secondary"
            subtitle={`${kpiData.tickets_with_desserts} tickets con postres`}
          />

          <KPICard
            title="Conversión de Café"
            value={kpiData.coffee_conversion_percentage}
            format="percentage"
            icon={Coffee}
            iconColor="text-warning"
            subtitle={`${kpiData.tickets_with_coffee} tickets con café`}
          />

          <KPICard
            title="Mermas de Proteínas"
            value={kpiData.protein_waste_percentage}
            format="percentage"
            icon={AlertCircle}
            iconColor={
              kpiData.protein_waste_percentage > 5 ? "text-error" : "text-success"
            }
            subtitle={formatCurrency(kpiData.total_protein_waste) + " desperdiciado"}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">
            Tendencia de Ingresos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B6B"
                strokeWidth={2}
                name="Ingresos"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Sales Mix: Food vs Beverages */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">
            Mix de Ventas (Alimentos vs Bebidas)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesMixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {salesMixData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Margin by Category */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">
            Margen Bruto por Categoría
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marginByCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) =>
                  name === "margin" ? `${value.toFixed(2)}%` : formatCurrency(value)
                }
              />
              <Legend />
              <Bar dataKey="margin" fill="#4ECDC4" name="Margen (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Order Type Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">
            Distribución por Tipo de Pedido
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.orderTypeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) =>
                  `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.orderTypeDistribution.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">
            Platillos Más Vendidos (Por Ingresos)
          </h3>
          <Package className="w-5 h-5 text-accent" />
        </div>

        {reportData.topItems.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            Aún no hay platillos vendidos
          </p>
        ) : (
          <div className="space-y-3">
            {reportData.topItems.map((item, index) => {
              // Find margin data for this item
              const itemMargin = kpiData.gross_margin_by_item?.find(
                (i) => i.item_name === item.name
              );

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text">{item.name}</div>
                      <div className="text-sm text-text-secondary">
                        {item.count} pedidos
                        {itemMargin && (
                          <span className="ml-3 text-success">
                            • Margen: {itemMargin.margin_percentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      {formatCurrency(item.revenue)}
                    </div>
                    <div className="text-xs text-text-secondary">Ingresos</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Daily Orders Chart */}
      <Card>
        <h3 className="text-lg font-bold text-text mb-4">Pedidos por Día</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="orders" fill="#4ECDC4" name="Pedidos" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* KPI Explanation */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-text mb-4">
          Acerca de los KPIs
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-text mb-2">Margen Bruto</h4>
            <p className="text-text-secondary">
              Porcentaje de utilidad después de restar el costo de los ingredientes.
              Fórmula: ((Ventas - Costo) / Ventas) × 100
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-2">Prime Cost</h4>
            <p className="text-text-secondary">
              Suma del costo de materia prima (COGS) más el costo de personal.
              Ideal: {'<'}60%. Fórmula: ((COGS + Mano de Obra) / Ventas) × 100
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-2">Ticket Promedio</h4>
            <p className="text-text-secondary">
              Valor promedio de cada transacción. Mayor ticket promedio indica mayor
              gasto por cliente.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-2">Mermas de Proteínas</h4>
            <p className="text-text-secondary">
              Porcentaje de proteínas desperdiciadas vs compradas. Monitorea para
              reducir pérdidas.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text mb-2">
              Conversión de Postres/Café
            </h4>
            <p className="text-text-secondary">
              Porcentaje de tickets que incluyen postres o café. Indica oportunidades
              de venta adicional.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
