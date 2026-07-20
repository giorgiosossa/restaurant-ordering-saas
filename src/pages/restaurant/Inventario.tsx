import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Textarea,
} from "../../components/ui";
import {
  subscribeToInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryQuantity,
  getLowStockItems,
} from "../../services/inventoryService";
import type { InventoryItem } from "../../config/supabase";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

const Inventario: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "low_stock">("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToInventoryItems(user.restaurant_id, (data) => {
      setInventoryItems(data);
      setLoading(false);
    });

    // Fetch low stock items
    const fetchLowStock = async () => {
      const lowStock = await getLowStockItems(user.restaurant_id);
      setLowStockItems(lowStock);
    };
    fetchLowStock();

    // Refresh low stock items every 30 seconds
    const interval = setInterval(fetchLowStock, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && item.is_active) ||
      (filterStatus === "low_stock" && item.current_quantity <= item.alert_threshold);
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleAdjustQuantity = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowAdjustModal(true);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_quantity <= item.alert_threshold) {
      return { label: "Stock Bajo", variant: "error" as const };
    }
    if (item.current_quantity <= item.alert_threshold * 1.5) {
      return { label: "Stock Medio", variant: "warning" as const };
    }
    return { label: "Stock Bueno", variant: "success" as const };
  };

  if (loading) {
    return <Loading text="Cargando inventario..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestión de Inventario</h2>
          <p className="text-text-secondary">
            Administra tus ingredientes e insumos
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
        >
          Agregar Insumo
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert
          type="warning"
          message={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>
                  {lowStockItems.length} {lowStockItems.length === 1 ? "insumo tiene" : "insumos tienen"} stock bajo
                </span>
              </div>
              <button
                onClick={() => setFilterStatus("low_stock")}
                className="text-sm underline hover:no-underline"
              >
                Ver todos
              </button>
            </div>
          }
        />
      )}

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>
          Actualizaciones en vivo • Los cambios se reflejan al instante
        </span>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar insumos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all", label: "Todos" },
            { value: "active", label: "Activos" },
            { value: "low_stock", label: "Stock Bajo" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface border border-border text-text-secondary hover:bg-bg-subtle"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Insumos</p>
              <p className="text-2xl font-bold text-text">{inventoryItems.length}</p>
            </div>
            <Package className="w-8 h-8 text-accent opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Activos</p>
              <p className="text-2xl font-bold text-success">
                {inventoryItems.filter((i) => i.is_active).length}
              </p>
            </div>
            <Package className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Stock Bajo</p>
              <p className="text-2xl font-bold text-error">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-error opacity-50" />
          </div>
        </Card>
      </div>

      {/* Inventory Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Se Encontraron Insumos
          </h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || filterStatus !== "all"
              ? "Intenta ajustar tus filtros"
              : "Comienza agregando tu primer insumo"}
          </p>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar Primer Insumo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <Card
                key={item.id}
                className={`p-5 hover:shadow-lg transition-all duration-200 ${
                  !item.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text truncate mb-2">
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                      {!item.is_active && (
                        <Badge variant="neutral">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                  <Package className="w-8 h-8 text-text-secondary opacity-30 flex-shrink-0 ml-2" />
                </div>

                {/* Quantity Display */}
                <div className="mb-4">
                  <div className="text-center py-4 bg-bg-subtle rounded-lg">
                    <p className="text-3xl font-bold text-accent">
                      {item.current_quantity}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {item.unit}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                    <span>Stock</span>
                    <span>Alerta: ≤ {item.alert_threshold}</span>
                  </div>
                  <div className="w-full bg-bg-subtle rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.current_quantity <= item.alert_threshold
                          ? "bg-error"
                          : item.current_quantity <= item.alert_threshold * 1.5
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (item.current_quantity / (item.alert_threshold * 2)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Details */}
                {(item.notes || (item.cost_per_unit && item.cost_per_unit > 0)) && (
                  <div className="mb-4 space-y-2">
                    {item.notes && (
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                    {item.cost_per_unit && item.cost_per_unit > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Costo:</span>
                        <span className="text-text font-medium">
                          {formatCurrency(item.cost_per_unit)}/{item.unit}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <button
                    onClick={() => handleAdjustQuantity(item)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Ajustar Cantidad
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-border text-text-secondary hover:text-error hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <InventoryItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
      />

      <InventoryItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        mode="edit"
      />

      <AdjustQuantityModal
        isOpen={showAdjustModal}
        item={selectedItem}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedItem(null);
        }}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        item={selectedItem}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

// Inventory Item Modal (Add/Edit)
interface InventoryItemModalProps {
  isOpen: boolean;
  item?: InventoryItem | null;
  onClose: () => void;
  mode: "add" | "edit";
}

const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  item,
  onClose,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    unit: "gramos" as InventoryItem["unit"],
    current_quantity: "",
    alert_threshold: "",
    cost_per_unit: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        name: item.name,
        unit: item.unit,
        current_quantity: item.current_quantity.toString(),
        alert_threshold: item.alert_threshold.toString(),
        cost_per_unit: item.cost_per_unit?.toString() || "",
        notes: item.notes || "",
        is_active: item.is_active,
      });
    } else {
      setFormData({
        name: "",
        unit: "gramos",
        current_quantity: "",
        alert_threshold: "",
        cost_per_unit: "",
        notes: "",
        is_active: true,
      });
    }
  }, [mode, item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.current_quantity || !formData.alert_threshold) {
      setError("El nombre, cantidad actual y umbral de alerta son obligatorios");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("No se encontró el ID del restaurante");
      return;
    }

    setLoading(true);

    const inventoryItemData = {
      restaurant_id: user.restaurant_id,
      name: formData.name,
      unit: formData.unit,
      current_quantity: parseFloat(formData.current_quantity),
      alert_threshold: parseFloat(formData.alert_threshold),
      cost_per_unit: formData.cost_per_unit
        ? parseFloat(formData.cost_per_unit)
        : undefined,
      notes: formData.notes || undefined,
      is_active: formData.is_active,
    };

    let success = false;
    if (mode === "add") {
      success = await createInventoryItem(inventoryItemData);
    } else if (item) {
      success = await updateInventoryItem(item.id, inventoryItemData);
    }

    setLoading(false);

    if (success) {
      onClose();
    } else {
      setError(
        mode === "add"
          ? "No se pudo agregar el insumo"
          : "No se pudo actualizar el insumo"
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar Insumo" : "Editar Insumo"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Nombre del insumo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ej. Queso Mozzarella, Tomates"
          required
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Unidad de medida</label>
            <select
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value as InventoryItem["unit"] })
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="gramos">Gramos</option>
              <option value="kilogramos">Kilogramos</option>
              <option value="litros">Litros</option>
              <option value="mililitros">Mililitros</option>
              <option value="unidades">Unidades</option>
              <option value="piezas">Piezas</option>
            </select>
          </div>

          <Input
            label="Cantidad actual"
            type="number"
            step="0.01"
            value={formData.current_quantity}
            onChange={(e) =>
              setFormData({ ...formData, current_quantity: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Umbral de alerta"
            type="number"
            step="0.01"
            value={formData.alert_threshold}
            onChange={(e) =>
              setFormData({ ...formData, alert_threshold: e.target.value })
            }
            placeholder="0.00"
            required
            helperText="Recibirás alertas cuando el stock esté en o por debajo de este nivel"
          />

          <Input
            label={`Costo por ${formData.unit} (Opcional)`}
            type="number"
            step="0.01"
            value={formData.cost_per_unit}
            onChange={(e) =>
              setFormData({ ...formData, cost_per_unit: e.target.value })
            }
            placeholder="0.00"
          />
        </div>

        <Textarea
          label="Notas (Opcional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Información adicional sobre este insumo..."
          rows={2}
        />

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="rounded border-border"
          />
          <span className="text-text">Activo</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar Insumo" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Adjust Quantity Modal
interface AdjustQuantityModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [quantity, setQuantity] = useState("");

  const handleAdjust = async () => {
    if (!item || !quantity) return;

    setLoading(true);
    const quantityChange =
      adjustType === "add" ? parseFloat(quantity) : -parseFloat(quantity);
    const success = await updateInventoryQuantity(item.id, quantityChange);
    setLoading(false);

    if (success) {
      setQuantity("");
      onClose();
    }
  };

  if (!item) return null;

  const newQuantity =
    adjustType === "add"
      ? item.current_quantity + (parseFloat(quantity) || 0)
      : Math.max(0, item.current_quantity - (parseFloat(quantity) || 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar Cantidad" size="md">
      <div className="space-y-4">
        <div className="p-4 bg-bg-subtle rounded-lg">
          <p className="text-text-secondary text-sm">Insumo</p>
          <p className="text-lg font-bold text-text">{item.name}</p>
          <p className="text-text-secondary">
            Cantidad actual: {item.current_quantity} {item.unit}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAdjustType("add")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              adjustType === "add"
                ? "bg-success text-white"
                : "bg-surface border border-border text-text-secondary hover:bg-bg-subtle"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Agregar</span>
          </button>
          <button
            onClick={() => setAdjustType("subtract")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              adjustType === "subtract"
                ? "bg-error text-white"
                : "bg-surface border border-border text-text-secondary hover:bg-bg-subtle"
            }`}
          >
            <TrendingDown className="w-5 h-5" />
            <span>Restar</span>
          </button>
        </div>

        <Input
          label={`Cantidad a ${adjustType === "add" ? "agregar" : "restar"}`}
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={`0.00 ${item.unit}`}
        />

        {quantity && (
          <div className="p-4 bg-bg-subtle rounded-lg">
            <p className="text-text-secondary text-sm">Nueva cantidad</p>
            <p className="text-2xl font-bold text-accent">
              {newQuantity.toFixed(2)} {item.unit}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            onClick={handleAdjust}
            loading={loading}
            disabled={!quantity || parseFloat(quantity) <= 0}
            fullWidth
          >
            Confirmar Ajuste
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    setLoading(true);
    const success = await deleteInventoryItem(item.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Insumo" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Seguro que quieres eliminar "${item.name}"? También se eliminarán todas las referencias a este insumo en tus platillos. Esta acción no se puede deshacer.`}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            fullWidth
          >
            Eliminar Insumo
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Inventario;
