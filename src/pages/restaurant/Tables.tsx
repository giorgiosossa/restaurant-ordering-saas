import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToRestaurantTables,
  createRestaurantTable,
  updateRestaurantTable,
  deleteRestaurantTable,
} from "../../services/tableService";
import type { RestaurantTable } from "../../config/supabase";

const Tables: React.FC = () => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active">("all");
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToRestaurantTables(user.restaurant_id, (data) => {
      setTables(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.table_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && table.is_active);
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowEditModal(true);
  };

  const handleDelete = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowDeleteModal(true);
  };

  const totalSeats = tables
    .filter((t) => t.is_active)
    .reduce((sum, table) => sum + table.seat_capacity, 0);

  if (loading) {
    return <Loading text="Cargando mesas..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestión de Mesas</h2>
          <p className="text-text-secondary">
            Administra las mesas de tu restaurante y monitorea ocupación
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
        >
          Agregar Mesa
        </Button>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Actualizaciones en vivo • Los cambios se reflejan al instante</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Mesas</p>
              <p className="text-2xl font-bold text-text">{tables.length}</p>
            </div>
            <Users className="w-8 h-8 text-accent opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Capacidad Total</p>
              <p className="text-2xl font-bold text-success">{totalSeats} sillas</p>
            </div>
            <Users className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar mesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all", label: "Todas" },
            { value: "active", label: "Activas" },
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

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Se Encontraron Mesas
          </h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || filterStatus !== "all"
              ? "Intenta ajustar tus filtros"
              : "Comienza agregando tu primera mesa"}
          </p>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar Primera Mesa
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTables.map((table) => {
            return (
              <Card
                key={table.id}
                className={`p-5 hover:shadow-lg transition-all duration-200 ${
                  !table.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text truncate mb-2">
                      Mesa {table.table_number}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {!table.is_active && <Badge variant="neutral">Inactiva</Badge>}
                      {table.is_active && (
                        <Badge variant="success">Disponible</Badge>
                      )}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-text-secondary opacity-30 flex-shrink-0 ml-2" />
                </div>

                {/* Capacity Display */}
                <div className="mb-4">
                  <div className="text-center py-4 bg-bg-subtle rounded-lg">
                    <p className="text-3xl font-bold text-accent">
                      {table.seat_capacity}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">sillas</p>
                  </div>
                </div>

                {/* Notes */}
                {table.notes && (
                  <div className="mb-4">
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {table.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(table)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
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
      <TableModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
      />

      <TableModal
        isOpen={showEditModal}
        table={selectedTable}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTable(null);
        }}
        mode="edit"
      />

      <DeleteModal
        isOpen={showDeleteModal}
        table={selectedTable}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTable(null);
        }}
      />
    </div>
  );
};

// Table Modal (Add/Edit)
interface TableModalProps {
  isOpen: boolean;
  table?: RestaurantTable | null;
  onClose: () => void;
  mode: "add" | "edit";
}

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  table,
  onClose,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    table_number: "",
    seat_capacity: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (mode === "edit" && table) {
      setFormData({
        table_number: table.table_number,
        seat_capacity: table.seat_capacity.toString(),
        notes: table.notes || "",
        is_active: table.is_active,
      });
    } else {
      setFormData({
        table_number: "",
        seat_capacity: "",
        notes: "",
        is_active: true,
      });
    }
  }, [mode, table, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.table_number || !formData.seat_capacity) {
      setError("El número de mesa y capacidad son obligatorios");
      return;
    }

    const seatCapacity = parseInt(formData.seat_capacity);
    if (isNaN(seatCapacity) || seatCapacity <= 0) {
      setError("La capacidad debe ser un número mayor a 0");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("No se encontró el ID del restaurante");
      return;
    }

    setLoading(true);

    try {
      const tableData = {
        restaurant_id: user.restaurant_id,
        table_number: formData.table_number.trim(),
        seat_capacity: seatCapacity,
        notes: formData.notes || undefined,
        is_active: formData.is_active,
      };

      let success = false;
      if (mode === "add") {
        success = await createRestaurantTable(tableData);
      } else if (table) {
        success = await updateRestaurantTable(table.id, tableData);
      }

      setLoading(false);

      if (success) {
        onClose();
      } else {
        setError(
          mode === "add"
            ? "No se pudo agregar la mesa. Verifica que el número no esté duplicado."
            : "No se pudo actualizar la mesa"
        );
      }
    } catch (err: any) {
      setLoading(false);
      if (err?.code === "23505" || err?.message?.includes("duplicate key")) {
        setError(`Ya existe una mesa con el número "${formData.table_number}". Por favor usa un número diferente.`);
      } else {
        setError(
          mode === "add"
            ? "Error al agregar la mesa. Intenta de nuevo."
            : "Error al actualizar la mesa. Intenta de nuevo."
        );
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar Mesa" : "Editar Mesa"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Número de Mesa"
          value={formData.table_number}
          onChange={(e) =>
            setFormData({ ...formData, table_number: e.target.value })
          }
          placeholder="ej. 1, A1, VIP-1"
          required
        />

        <Input
          label="Capacidad de Sillas"
          type="number"
          min="1"
          value={formData.seat_capacity}
          onChange={(e) =>
            setFormData({ ...formData, seat_capacity: e.target.value })
          }
          placeholder="4"
          required
        />

        <Input
          label="Notas (Opcional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Ventana, cerca de la barra, etc."
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
          <span className="text-text">Mesa Activa</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar Mesa" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  table: RestaurantTable | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, table, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!table) return;

    setLoading(true);
    const success = await deleteRestaurantTable(table.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!table) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Mesa" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Seguro que quieres eliminar la mesa ${table.table_number}? Esta acción no se puede deshacer.`}
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
            Eliminar Mesa
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Tables;
