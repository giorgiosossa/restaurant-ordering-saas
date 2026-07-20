import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChefHat,
  Package,
  StickyNote,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronsUp,
  ChevronsDown,
  LayoutGrid,
  Sun,
  Moon,
  History,
  Search,
  X,
  Lock,
  Unlock,
  Banknote,
  LogOut,
  UserRound,
  Calculator,
  DollarSign,
  CreditCard,
  Wallet,
} from "lucide-react";
import { subscribeToOrders, updateOrderStatus } from "../../services/restaurantService";
import { recordOrderEvent } from "../../services/employeeService";
import { deductInventoryForOrder } from "../../services/inventoryService";
import {
  getShiftSummary,
  createShiftClosure,
  type ShiftSummary,
} from "../../services/shiftClosureService";
import type { Order, OrderEventType, EmployeeRole } from "../../config/supabase";
import { supabase } from "../../config/supabase";
import { formatCurrency, formatDateTime } from "../../utils/helpers";
import { useTheme } from "../../contexts/ThemeContext";
import { useEmployeeSession } from "../../contexts/EmployeeSessionContext";
import PinPad from "./PinPad";

const VISIBLE_ITEMS = 2;

type FilterTab = "pending" | "preparing" | "ready";

const ROLE_TAB_MAP: Record<EmployeeRole, FilterTab> = {
  caja: "pending",
  cocina: "preparing",
  mesero: "ready",
};

const ALL_TABS: FilterTab[] = ["pending", "preparing", "ready"];

const Comandas: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { session, clockOut } = useEmployeeSession();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [showHistory, setShowHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentCodeInput, setPaymentCodeInput] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [inventoryError, setInventoryError] = useState<{
    message: string;
    items?: Array<{
      item_name: string;
      required: number;
      available: number;
      unit: string;
    }>;
  } | null>(null);
  const [showInventoryErrorModal, setShowInventoryErrorModal] = useState(false);

  // Shift closure (Corte de Caja) state
  const [showShiftClosureModal, setShowShiftClosureModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actualCashAmount, setActualCashAmount] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closingShift, setClosingShift] = useState(false);

  const allowedTabs: FilterTab[] =
    session && !session.isAdminBypass
      ? ALL_TABS.filter((tab) => session.roles.some((role) => ROLE_TAB_MAP[role] === tab))
      : ALL_TABS;

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(filter)) {
      setFilter(allowedTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const hideMoney = filter === "preparing";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      navigate("/login");
      return;
    }
    setRestaurantId(user.restaurant_id);

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      // Filter only active orders (not completed or cancelled)
      const activeOrders = data.filter(
        (order) => !["completed", "cancelled", "rejected"].includes(order.status)
      );

      // Play sound if new order arrives
      if (soundEnabled && activeOrders.length > lastOrderCount && lastOrderCount > 0) {
        playNotificationSound();
      }
      setLastOrderCount(activeOrders.length);

      setAllOrders(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [soundEnabled, lastOrderCount]);

  // Force a re-render every second so the elapsed-time labels tick live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const playNotificationSound = () => {
    // Simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Could not play sound:", e);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"],
    eventType?: OrderEventType
  ) => {
    const result = await updateOrderStatus(orderId, newStatus);

    // Check if the result indicates an error (e.g., insufficient inventory)
    if (typeof result === "object" && "success" in result && !result.success) {
      setInventoryError({
        message: result.error || "Error updating order status",
        items: result.insufficient_items,
      });
      setShowInventoryErrorModal(true);
      return;
    }

    if (eventType && restaurantId) {
      const employeeId = session && !session.isAdminBypass ? session.employeeId : undefined;
      const shiftId = session && !session.isAdminBypass ? session.shiftId : undefined;
      await recordOrderEvent(restaurantId, orderId, eventType, employeeId, shiftId);
    }
  };

  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentCodeInput("");
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_verified_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      if (restaurantId) {
        const employeeId = session && !session.isAdminBypass ? session.employeeId : undefined;
        const shiftId = session && !session.isAdminBypass ? session.shiftId : undefined;
        await recordOrderEvent(restaurantId, orderId, "payment_verified", employeeId, shiftId);
      }
    } catch (error) {
      console.error("Error marking order as paid:", error);
    }
  };

  const handleValidatePayment = async () => {
    if (!selectedOrderForPayment) return;

    // For cash_at_bar: validate code
    if (selectedOrderForPayment.payment_type === "cash_at_bar") {
      if (paymentCodeInput.trim() !== selectedOrderForPayment.cash_payment_code) {
        setPaymentError("Código incorrecto. Verifica el código del cliente.");
        return;
      }
    }
    // For terminal_at_table: no code needed, just confirmation

    // Deduct inventory first before updating order status
    try {
      const deductionResult = await deductInventoryForOrder(selectedOrderForPayment.id);

      if (!deductionResult.success) {
        // Close payment modal and show inventory error
        setShowPaymentModal(false);
        setInventoryError({
          message: deductionResult.message,
          items: deductionResult.insufficient_items,
        });
        setShowInventoryErrorModal(true);
        return;
      }

      // Inventory deduction successful, now update order status
      const { error } = await supabase
        .from("orders")
        .update({
          is_blocked: false,
          payment_verified_at: new Date().toISOString(),
          status: "preparing",
          preparing_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderForPayment.id);

      if (error) throw error;

      if (restaurantId) {
        const employeeId = session && !session.isAdminBypass ? session.employeeId : undefined;
        const shiftId = session && !session.isAdminBypass ? session.shiftId : undefined;
        await recordOrderEvent(
          restaurantId,
          selectedOrderForPayment.id,
          "accepted",
          employeeId,
          shiftId
        );
      }

      setShowPaymentModal(false);
      setSelectedOrderForPayment(null);
      setPaymentCodeInput("");
      setPaymentError("");
    } catch (error) {
      console.error("Error validating payment:", error);
      setPaymentError("Error al validar el pago. Intenta de nuevo.");
    }
  };

  // Handle opening shift closure modal
  const handleOpenShiftClosure = async () => {
    if (!session || !session.shiftId) {
      alert("No hay un turno activo");
      return;
    }

    setLoadingSummary(true);
    setShowShiftClosureModal(true);
    setActualCashAmount("");
    setClosureNotes("");

    try {
      const summary = await getShiftSummary(session.shiftId);
      setShiftSummary(summary);
    } catch (error) {
      console.error("Error loading shift summary:", error);
      alert("Error al cargar el resumen del turno");
      setShowShiftClosureModal(false);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle creating shift closure
  const handleCreateShiftClosure = async () => {
    if (!session || !session.shiftId) {
      alert("No hay un turno activo");
      return;
    }

    setClosingShift(true);

    try {
      const actualCash = actualCashAmount.trim() ? parseFloat(actualCashAmount) : undefined;

      await createShiftClosure(session.shiftId, actualCash, closureNotes.trim() || undefined);

      alert("Corte de caja realizado exitosamente");
      setShowShiftClosureModal(false);

      // Close the shift (clock out)
      clockOut();
    } catch (error) {
      console.error("Error creating shift closure:", error);
      alert("Error al realizar el corte de caja. Intenta de nuevo.");
    } finally {
      setClosingShift(false);
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case "qr":
        return "Mesa QR";
      case "counter":
        return "Mostrador";
      case "phone":
        return "Teléfono";
      case "table":
        return "Mesa";
      default:
        return "Para llevar";
    }
  };

  const getTimeAgo = (date: string) => {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Nuevo";
      case "accepted":
        return "Aceptado";
      case "preparing":
        return "Preparando";
      case "ready":
        return "Listo";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      case "rejected":
        return "Rechazado";
      default:
        return status;
    }
  };

  const orders = allOrders.filter(
    (order) => !["completed", "cancelled", "rejected"].includes(order.status)
  );

  const filteredOrders = orders.filter((order) => {
    if (filter === "preparing") return order.status === "preparing" || order.status === "accepted";
    return order.status === filter;
  });

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing" || o.status === "accepted").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  const historyResults = allOrders
    .filter((order) => {
      if (historyDate) {
        const orderDate = new Date(order.created_at).toLocaleDateString("en-CA");
        if (orderDate !== historyDate) return false;
      }
      if (historyQuery.trim()) {
        const q = historyQuery.trim().toLowerCase();
        const matchesName = order.customer_name?.toLowerCase().includes(q);
        const matchesTable = order.table_number?.toString().toLowerCase().includes(q);
        const matchesOrderNumber = order.order_number?.toString().toLowerCase().includes(q);
        const matchesProduct = order.items?.some((item) =>
          item.name.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesTable && !matchesOrderNumber && !matchesProduct) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const clearHistoryFilters = () => {
    setHistoryQuery("");
    setHistoryDate("");
  };

  if (loading || !restaurantId) {
    return (
      <div className={theme === "dark" ? "dark" : ""}>
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
          <div className="text-neutral-500 dark:text-neutral-400 text-lg">Cargando comandas...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={theme === "dark" ? "dark" : ""}>
        <PinPad restaurantId={restaurantId} />
      </div>
    );
  }

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <header className="bg-white/95 dark:bg-black/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50">
          <div className="px-3 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-0">
              {/* Left: Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => navigate("/restaurant")}
                  className="p-1.5 sm:p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Volver al panel"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 dark:text-neutral-400" />
                <div>
                  <h1 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white leading-none">
                    Comandas
                  </h1>
                  <p className="text-neutral-500 text-xs mt-1">
                    {orders.length} {orders.length === 1 ? "orden" : "órdenes"}
                  </p>
                </div>
              </div>

              {/* Right: All buttons - Desktop only */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Status Filters - Desktop */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
                  {[
                    { key: "pending", label: "Nuevas", count: ordersByStatus.pending },
                    { key: "preparing", label: "Preparando", count: ordersByStatus.preparing },
                    { key: "ready", label: "Listas", count: ordersByStatus.ready },
                  ]
                    .filter((tab) => allowedTabs.includes(tab.key as FilterTab))
                    .map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as typeof filter)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        filter === tab.key
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {/* Corte de Caja */}
                <button
                  onClick={handleOpenShiftClosure}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Corte de Caja"
                >
                  <Calculator className="w-4 h-4" />
                </button>

                {/* History */}
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Historial"
                >
                  <History className="w-4 h-4" />
                </button>

                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-lg border transition-colors ${
                    soundEnabled
                      ? "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                  title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}
                >
                  {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>

                {/* Density Toggle */}
                <button
                  onClick={() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Cambiar densidad"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Active Employee + End Shift */}
                <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    <UserRound className="w-4 h-4" />
                    {session.name}
                  </div>
                  <button
                    onClick={() => clockOut()}
                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    title="Terminar turno"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile utility buttons only */}
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  onClick={handleOpenShiftClosure}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Corte de Caja"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowHistory(true)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Historial"
                >
                  <History className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    soundEnabled
                      ? "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                  title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}
                >
                  {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                >
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => clockOut()}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Terminar turno"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status Filters - Mobile only (second row) */}
            <div className="flex sm:hidden items-center justify-center">
              <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5">
                {[
                  { key: "pending", label: "Nuevas", count: ordersByStatus.pending },
                  { key: "preparing", label: "Preparando", count: ordersByStatus.preparing },
                  { key: "ready", label: "Listas", count: ordersByStatus.ready },
                ]
                  .filter((tab) => allowedTabs.includes(tab.key as FilterTab))
                  .map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as typeof filter)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      filter === tab.key
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Payment Validation Modal */}
        {showPaymentModal && selectedOrderForPayment && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-neutral-500" />
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      {selectedOrderForPayment.payment_type === "cash_at_bar"
                        ? "Validar Pago en Barra"
                        : "Confirmar Pago con Terminal"}
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Orden #{selectedOrderForPayment.order_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Payment Details */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    {selectedOrderForPayment.payment_type === "cash_at_bar" ? (
                      <Banknote className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-neutral-500" />
                    )}
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      Detalles del pago
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">Total a cobrar:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(selectedOrderForPayment.total)}
                    </span>
                  </div>
                  {selectedOrderForPayment.payment_type === "cash_at_bar" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">Cliente trae:</span>
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {formatCurrency(selectedOrderForPayment.cash_amount_brought || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-600 dark:text-neutral-400">Cambio:</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-500">
                          {formatCurrency(
                            (selectedOrderForPayment.cash_amount_brought || 0) - selectedOrderForPayment.total
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Code Input (only for cash_at_bar) */}
                {selectedOrderForPayment.payment_type === "cash_at_bar" ? (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Ingresa el código del cliente
                    </label>
                    <input
                      type="text"
                      value={paymentCodeInput}
                      onChange={(e) => {
                        setPaymentCodeInput(e.target.value);
                        setPaymentError("");
                      }}
                      placeholder="Código de 4 dígitos"
                      maxLength={4}
                      className="w-full h-14 text-center text-3xl font-bold tracking-widest rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                      autoFocus
                    />
                    {paymentError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{paymentError}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                      Lleva la terminal a la mesa, cobra el monto y confirma para enviar la orden a cocina.
                    </p>
                  </div>
                )}

                {/* Customer Info */}
                {selectedOrderForPayment.customer_name && (
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium">Cliente:</span> {selectedOrderForPayment.customer_name}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleValidatePayment}
                  disabled={selectedOrderForPayment.payment_type === "cash_at_bar" && paymentCodeInput.length !== 4}
                  className="flex-1 h-10 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {selectedOrderForPayment.payment_type === "cash_at_bar"
                    ? "Validar y Desbloquear"
                    : "Confirmar Pago y Desbloquear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Error Modal */}
        {showInventoryErrorModal && inventoryError && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInventoryErrorModal(false)}
          >
            <div
              className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-500" />
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Inventario Insuficiente
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      No hay suficientes insumos para preparar esta orden
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInventoryErrorModal(false)}
                  className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {inventoryError.message}
                </p>

                {inventoryError.items && inventoryError.items.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-3">
                      Insumos faltantes:
                    </h3>
                    <div className="space-y-3">
                      {inventoryError.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-start text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-red-800 dark:text-red-300">
                              {item.item_name}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Requerido: {item.required} {item.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Disponible:
                            </p>
                            <p className="font-bold text-red-700 dark:text-red-400">
                              {item.available} {item.unit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-lg p-3">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    <strong>Acción requerida:</strong> Por favor, reabastece los insumos faltantes
                    en el inventario antes de poder iniciar la preparación de esta orden.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setShowInventoryErrorModal(false)}
                  className="w-full h-10 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shift Closure Modal (Corte de Caja) */}
        {showShiftClosureModal && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
            onClick={() => !closingShift && setShowShiftClosureModal(false)}
          >
            <div
              className="w-full max-w-2xl my-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Corte de Caja
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {session?.name} - Resumen del turno
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !closingShift && setShowShiftClosureModal(false)}
                  disabled={closingShift}
                  className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {loadingSummary ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-neutral-500 dark:text-neutral-400">
                      Cargando resumen del turno...
                    </div>
                  </div>
                ) : shiftSummary ? (
                  <>
                    {/* Shift Duration */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserRound className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Información del turno
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400">Inicio:</p>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {formatDateTime(shiftSummary.shift_start)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400">Fin:</p>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {formatDateTime(shiftSummary.shift_end)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Total Orders */}
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                            Total de Órdenes
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {shiftSummary.total_orders}
                        </p>
                      </div>

                      {/* Total Amount */}
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-900 dark:text-green-200">
                            Total Vendido
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(shiftSummary.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    {shiftSummary.payment_breakdown && shiftSummary.payment_breakdown.length > 0 && (
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Wallet className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            Desglose por método de pago
                          </span>
                        </div>
                        <div className="space-y-2">
                          {shiftSummary.payment_breakdown.map((payment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {payment.method === "cash" ? (
                                  <Banknote className="w-4 h-4 text-green-600" />
                                ) : (
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                )}
                                <span className="text-sm font-medium text-neutral-900 dark:text-white capitalize">
                                  {payment.method === "cash" ? "Efectivo" : payment.method === "card" ? "Tarjeta" : payment.method}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  ({payment.count} {payment.count === 1 ? "orden" : "órdenes"})
                                </span>
                              </div>
                              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cash Reconciliation */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Reconciliación de efectivo
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Efectivo esperado:
                          </span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {formatCurrency(shiftSummary.expected_cash)}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Efectivo contado (opcional):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={actualCashAmount}
                            onChange={(e) => setActualCashAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                          />
                        </div>
                        {actualCashAmount && (
                          <div className="flex justify-between text-sm pt-2 border-t border-amber-200 dark:border-amber-900">
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Diferencia:
                            </span>
                            <span
                              className={`font-bold ${
                                parseFloat(actualCashAmount) - shiftSummary.expected_cash >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatCurrency(
                                parseFloat(actualCashAmount) - shiftSummary.expected_cash
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Notas adicionales (opcional):
                      </label>
                      <textarea
                        value={closureNotes}
                        onChange={(e) => setClosureNotes(e.target.value)}
                        placeholder="Agrega cualquier observación sobre el turno..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-red-600 dark:text-red-400">
                    Error al cargar el resumen del turno
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex gap-3">
                <button
                  onClick={() => setShowShiftClosureModal(false)}
                  disabled={closingShift}
                  className="flex-1 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateShiftClosure}
                  disabled={closingShift || !shiftSummary}
                  className="flex-1 h-10 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {closingShift ? (
                    <>Procesando...</>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Confirmar y Cerrar Turno
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8"
            onClick={() => setShowHistory(false)}
          >
            <div
              className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    Historial de órdenes
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {historyResults.length} resultado{historyResults.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Controls */}
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Buscar por nombre, producto o mesa..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                  />
                </div>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                />
                {(historyQuery || historyDate) && (
                  <button
                    onClick={clearHistoryFilters}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="overflow-y-auto px-5 py-3 space-y-2">
                {historyResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-600">
                    <Search className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      No se encontraron órdenes
                    </p>
                  </div>
                ) : (
                  historyResults.map((order) => (
                    <HistoryRow key={order.id} order={order} getStatusLabel={getStatusLabel} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Grid */}
        <main className="p-4 sm:p-6">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
              <Package className="w-16 h-16 mb-4 opacity-40" />
              <h2 className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                No hay órdenes
              </h2>
              <p className="text-sm">{`No hay órdenes en estado "${getStatusLabel(filter)}"`}</p>
            </div>
          ) : (
            <div
              className={`grid ${
                density === "compact"
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              } gap-4`}
            >
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  onMarkAsPaid={handleMarkAsPaid}
                  getOrderTypeLabel={getOrderTypeLabel}
                  getTimeAgo={getTimeAgo}
                  getStatusLabel={getStatusLabel}
                  hideMoney={hideMoney}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Order Card Component
interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: Order["status"], eventType?: OrderEventType) => void;
  onOpenPaymentModal: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  getOrderTypeLabel: (type: string) => string;
  getTimeAgo: (date: string) => string;
  getStatusLabel: (status: string) => string;
  hideMoney: boolean;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-black text-white dark:bg-white dark:text-black";
    case "ready":
    case "completed":
      return "bg-neutral-200 text-black";
    case "cancelled":
    case "rejected":
      return "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 line-through";
    default:
      return "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700";
  }
};

// History Row Component
interface HistoryRowProps {
  order: Order;
  getStatusLabel: (status: string) => string;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ order, getStatusLabel }) => {
  const itemsSummary = (order.items || [])
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(", ");

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {order.table_number ? `Mesa ${order.table_number}` : order.customer_name || "Para llevar"}
            </h4>
            <span className="text-xs text-neutral-500 flex-shrink-0">#{order.order_number}</span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">
            {itemsSummary || "Sin artículos"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span
            className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClass(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
          <p className="text-xs text-neutral-500 mt-1">{formatDateTime(order.created_at)}</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
            {formatCurrency(order.total)}
          </p>
        </div>
      </div>
    </div>
  );
};

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onOpenPaymentModal,
  onMarkAsPaid,
  getOrderTypeLabel,
  getTimeAgo,
  getStatusLabel,
  hideMoney,
}) => {
  const [expanded, setExpanded] = useState(false);

  const isForHere = order.table_number || order.order_type === "table" || order.order_type === "qr";
  const typeLabel = isForHere ? "Para comer aquí" : "Para llevar";
  const title = order.table_number
    ? `Mesa ${order.table_number}`
    : order.customer_name || typeLabel;

  const items = order.items || [];
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_ITEMS);
  const remaining = items.length - VISIBLE_ITEMS;

  // Check if order is blocked (waiting for payment)
  const isBlocked = order.is_blocked === true;

  // Check if terminal payment (pending or not)
  const isTerminalPayment = order.payment_type === "terminal_at_table" && !order.payment_verified_at;
  const isCashAtBar = order.payment_type === "cash_at_bar";

  return (
    <div
      className={`break-inside-avoid mb-4 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border-2 shadow-sm dark:shadow-lg transition-colors ${
        isBlocked
          ? isCashAtBar
            ? "border-yellow-500 dark:border-yellow-600 relative"
            : "border-red-600 dark:border-red-700 relative"
          : isTerminalPayment
          ? "border-red-600 dark:border-red-700 relative"
          : "border-neutral-200 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700"
      }`}
    >
      {/* Blocked Badge Overlay */}
      {isBlocked && (
        <div
          className={`absolute top-0 right-0 text-white px-3 py-1 rounded-bl-lg flex items-center gap-1.5 z-10 ${
            isCashAtBar ? "bg-yellow-500" : "bg-red-600"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            {isCashAtBar ? "PAGO PENDIENTE" : "PAGO CON TERMINAL"}
          </span>
        </div>
      )}

      {/* Terminal Payment Badge (for auto-approved but unpaid) */}
      {!isBlocked && isTerminalPayment && (
        <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 rounded-bl-lg flex items-center gap-1.5 z-10">
          <CreditCard className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">COBRAR CON TERMINAL</span>
        </div>
      )}
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight truncate">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Orden #{order.order_number}</p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
            {getTimeAgo(order.created_at)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
            {order.table_number ? typeLabel : getOrderTypeLabel(order.order_type)}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClass(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
          {order.table_number && order.customer_name && (
            <span className="text-[11px] text-neutral-500 truncate">· {order.customer_name}</span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-3">
        {visibleItems.map((item, index) => (
          <div key={index}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {item.quantity} {item.name}
              </span>
              {!hideMoney && (
                <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">
                  {formatCurrency(item.item_total)}
                </span>
              )}
            </div>

            {item.selected_size && (
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mt-0.5">
                {item.selected_size.name}
              </p>
            )}

            {item.selected_addons && item.selected_addons.length > 0 && (
              <div className="mt-0.5">
                {item.selected_addons.map((addon, addonIndex) => (
                  <p key={addonIndex} className="text-xs text-neutral-500">
                    {addon.name}
                  </p>
                ))}
              </div>
            )}

            {item.special_instructions && (
              <div className="mt-1.5 flex items-start gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-1.5 rounded-lg">
                <StickyNote className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  {item.special_instructions}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more / less */}
      {items.length > VISIBLE_ITEMS && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white border-t border-neutral-200 dark:border-neutral-800 transition-colors"
        >
          {expanded ? <ChevronsUp className="w-3.5 h-3.5" /> : <ChevronsDown className="w-3.5 h-3.5" />}
          {expanded ? "Ver menos" : `${remaining} producto${remaining === 1 ? "" : "s"} más`}
          {expanded ? <ChevronsUp className="w-3.5 h-3.5" /> : <ChevronsDown className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Customer Notes */}
      {order.customer_notes && (
        <div className="mx-4 mb-3 mt-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg">
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
              {order.customer_notes}
            </p>
          </div>
        </div>
      )}

      {/* Total */}
      {!hideMoney && (
        <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500">Total</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">
            {formatCurrency(order.total)}
          </span>
        </div>
      )}

      {/* Card Footer - Action Buttons */}
      <div className="px-4 pb-4 pt-1 space-y-1.5">
        {isBlocked ? (
          <>
            <button
              onClick={() => onOpenPaymentModal(order)}
              className={`w-full h-10 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                order.payment_type === "cash_at_bar"
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <Unlock className="w-5 h-5" />
              {order.payment_type === "cash_at_bar" ? "Validar Pago en Barra" : "Confirmar Pago con Terminal"}
            </button>
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
              {order.payment_type === "cash_at_bar"
                ? "El cliente debe mostrar su código de pago"
                : "Lleva la terminal a la mesa y cobra"}
            </p>
          </>
        ) : (
          <>
            {/* Show "Mark as Paid" button for terminal payments that are in progress */}
            {isTerminalPayment && order.status !== "pending" && (
              <button
                onClick={() => onMarkAsPaid(order.id)}
                className="w-full h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar como Cobrado
              </button>
            )}

            {order.status === "pending" && (
              <>
                <button
                  onClick={() => onStatusChange(order.id, "accepted", "accepted")}
                  className="w-full h-9 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aceptar orden
                </button>
                <button
                  onClick={() => onStatusChange(order.id, "rejected")}
                  className="w-full h-8 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium rounded-lg transition-colors"
                >
                  Rechazar
                </button>
              </>
            )}

            {(order.status === "accepted" || order.status === "preparing") && (
              <button
                onClick={() =>
                  onStatusChange(
                    order.id,
                    order.status === "accepted" ? "preparing" : "ready",
                    order.status === "accepted" ? "preparing" : "ready"
                  )
                }
                className="w-full h-9 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <ChefHat className="w-4 h-4" />
                {order.status === "accepted" ? "Iniciar preparación" : "Marcar como listo"}
              </button>
            )}

            {order.status === "ready" && (
              <button
                onClick={() => onStatusChange(order.id, "completed", "delivered")}
                className="w-full h-9 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar como completada
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Comandas;
