import React, { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Store as StoreIcon,
  Settings,
  Search,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
  Alert,
} from "../../components/ui";
import {
  getRestaurantUsageStats,
  updateRestaurantBilling,
  type RestaurantUsageStats,
} from "../../services/adminService";
import { formatCurrency, formatDateTime } from "../../utils/helpers";

const Analytics: React.FC = () => {
  const [stats, setStats] = useState<RestaurantUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<RestaurantUsageStats | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    const data = await getRestaurantUsageStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const filtered = stats.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = stats.reduce(
    (acc, r) => ({
      orders: acc.orders + r.orderCount,
      revenue: acc.revenue + r.revenue,
      owed: acc.owed + r.amountOwed,
    }),
    { orders: 0, revenue: 0, owed: 0 }
  );

  if (loading) {
    return <Loading text="Cargando estadísticas de uso..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">
          Uso y Cobros por Restaurante
        </h2>
        <p className="text-text-secondary">
          Cuánto está usando la plataforma cada restaurante, y cuánto te debe
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Pedidos Totales</p>
              <p className="text-3xl font-bold text-text">{totals.orders}</p>
            </div>
            <div className="p-3 bg-accent-secondary/10 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-accent-secondary" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Ingresos Procesados
              </p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(totals.revenue)}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Te Deben (histórico)
              </p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(totals.owed)}
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="!p-4">
        <Input
          placeholder="Buscar restaurantes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </Card>

      {/* Per-restaurant list */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <StoreIcon className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Se Encontraron Restaurantes
          </h3>
          <p className="text-text-secondary">
            {searchTerm
              ? "Intenta con otra búsqueda"
              : "Aún no hay restaurantes registrados"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-text">{r.name}</h3>
                    {r.status === "active" ? (
                      <Badge variant="success">Activo</Badge>
                    ) : r.status === "blocked" ? (
                      <Badge variant="error">Bloqueado</Badge>
                    ) : (
                      <Badge variant="warning">{r.status}</Badge>
                    )}
                    <Badge variant="neutral">
                      {r.billing_type === "fixed"
                        ? `Renta fija ${formatCurrency(r.monthly_fee)}/mes`
                        : `Comisión ${r.commission_rate}%`}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-text-secondary">Pedidos</p>
                      <p className="font-semibold text-text">
                        {r.orderCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Ingresos generados</p>
                      <p className="font-semibold text-text">
                        {formatCurrency(r.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">A cobrar</p>
                      <p className="font-semibold text-accent">
                        {formatCurrency(r.amountOwed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Última actividad</p>
                      <p className="font-semibold text-text">
                        {r.lastOrderAt
                          ? formatDateTime(r.lastOrderAt)
                          : "Sin pedidos"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<Settings className="w-4 h-4" />}
                  onClick={() => {
                    setSelected(r);
                    setShowBillingModal(true);
                  }}
                >
                  Editar plan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BillingModal
        isOpen={showBillingModal}
        restaurant={selected}
        onClose={() => {
          setShowBillingModal(false);
          setSelected(null);
        }}
        onSaved={() => {
          setShowBillingModal(false);
          setSelected(null);
          loadStats();
        }}
      />
    </div>
  );
};

// Billing Plan Edit Modal
interface BillingModalProps {
  isOpen: boolean;
  restaurant: RestaurantUsageStats | null;
  onClose: () => void;
  onSaved: () => void;
}

const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  restaurant,
  onClose,
  onSaved,
}) => {
  const [billingType, setBillingType] = useState<"commission" | "fixed">(
    "commission"
  );
  const [commissionRate, setCommissionRate] = useState("5");
  const [monthlyFee, setMonthlyFee] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (restaurant) {
      setBillingType(restaurant.billing_type);
      setCommissionRate(String(restaurant.commission_rate));
      setMonthlyFee(String(restaurant.monthly_fee));
      setError("");
    }
  }, [restaurant]);

  if (!restaurant) return null;

  const handleSave = async () => {
    setError("");
    const rate = parseFloat(commissionRate);
    const fee = parseFloat(monthlyFee);

    if (billingType === "commission" && (isNaN(rate) || rate < 0)) {
      setError("Ingresa un porcentaje de comisión válido");
      return;
    }
    if (billingType === "fixed" && (isNaN(fee) || fee < 0)) {
      setError("Ingresa una renta mensual válida");
      return;
    }

    setLoading(true);
    const success = await updateRestaurantBilling(
      restaurant.id,
      billingType,
      isNaN(rate) ? 0 : rate,
      isNaN(fee) ? 0 : fee
    );
    setLoading(false);

    if (success) {
      onSaved();
    } else {
      setError("No se pudo actualizar el plan. Intenta de nuevo.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Plan de cobro - ${restaurant.name}`}
      size="md"
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div>
          <label className="label mb-3">Tipo de cobro</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBillingType("commission")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors text-left ${
                billingType === "commission"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Comisión por pedido
            </button>
            <button
              type="button"
              onClick={() => setBillingType("fixed")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors text-left ${
                billingType === "fixed"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Renta fija mensual
            </button>
          </div>
        </div>

        {billingType === "commission" ? (
          <Input
            label="Porcentaje de comisión (%)"
            type="number"
            step="0.1"
            min="0"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            helperText="Se aplica sobre el total de cada pedido completo"
            required
          />
        ) : (
          <Input
            label="Renta mensual fija"
            type="number"
            step="1"
            min="0"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            helperText="Monto fijo por mes, sin importar cuántos pedidos genere"
            required
          />
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading} fullWidth>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Analytics;
