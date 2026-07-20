import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package, ChefHat } from "lucide-react";
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
  subscribeToMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../../services/restaurantService";
import {
  getMenuItemIngredients,
  getInventoryItems,
  addIngredientToMenuItem,
  updateMenuItemIngredient,
  removeIngredientFromMenuItem,
} from "../../services/inventoryService";
import type { MenuItem, InventoryItem, MenuItemIngredientWithDetails } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToMenuItems(user.restaurant_id, (data) => {
      setMenuItems(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    // Search by name, category, OR description
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchLower) ||
      (item.category && item.category.toLowerCase().includes(searchLower)) ||
      (item.description && item.description.toLowerCase().includes(searchLower));

    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.is_available);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleManageIngredients = (item: MenuItem) => {
    setSelectedItem(item);
    setShowIngredientsModal(true);
  };

  if (loading) {
    return <Loading text="Cargando menú..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestión de Menú</h2>
          <p className="text-text-secondary">
            Administra tus platillos y su disponibilidad
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
        >
          Agregar Platillo
        </Button>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>
          Actualizaciones en vivo • Los cambios de disponibilidad se reflejan al instante
        </span>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre, categoría o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category || "all")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                categoryFilter === category
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface border border-border text-text-secondary hover:bg-bg-subtle"
              }`}
            >
              {category === "all" ? "Todos" : category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Se Encontraron Platillos
          </h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || categoryFilter !== "all"
              ? "Intenta ajustar tus filtros"
              : "Comienza agregando tu primer platillo"}
          </p>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar Primer Platillo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`p-5 hover:shadow-lg transition-all duration-200 ${
                !item.is_available ? "opacity-60" : ""
              }`}
            >
              {/* Image */}
              {item.image_url && (
                <div className="mb-4 -mx-5 -mt-5">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                </div>
              )}

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-text line-clamp-2 flex-1">
                    {item.name}
                  </h3>
                  <ChefHat className="w-6 h-6 text-text-secondary opacity-30 flex-shrink-0 ml-2" />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant={item.is_available ? "success" : "neutral"}>
                    {item.is_available ? "Disponible" : "No disponible"}
                  </Badge>
                  {item.category && (
                    <Badge variant="neutral">{item.category}</Badge>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}

                {/* Price Display */}
                <div className="text-center py-3 bg-bg-subtle rounded-lg">
                  <p className="text-2xl font-bold text-accent">
                    {formatCurrency(item.base_price)}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Precio base</p>
                </div>
              </div>

              {/* Details */}
              <div className="mb-4 space-y-2 text-xs">
                {item.sizes && item.sizes.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Tamaños:</span>
                    <span className="text-text font-medium">
                      {item.sizes.length} opciones
                    </span>
                  </div>
                )}
                {item.addons && item.addons.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Extras:</span>
                    <span className="text-text font-medium">
                      {item.addons.length} disponibles
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-border">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.is_available
                      ? "bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle"
                      : "bg-accent text-accent-foreground hover:bg-accent/90"
                  }`}
                >
                  {item.is_available ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Mostrar
                    </>
                  )}
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleManageIngredients(item)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-xs font-medium transition-colors"
                    title="Ingredientes"
                  >
                    <ChefHat className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-xs font-medium transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-surface border border-border text-text-secondary hover:text-error hover:bg-bg-subtle rounded-lg text-xs font-medium transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modals */}
      <MenuItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
      />

      <MenuItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        mode="edit"
      />

      {/* Ingredients Modal */}
      <IngredientsModal
        isOpen={showIngredientsModal}
        item={selectedItem}
        onClose={() => {
          setShowIngredientsModal(false);
          setSelectedItem(null);
        }}
      />

      {/* Delete Modal */}
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

// Menu Item Modal (Add/Edit)
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  item,
  onClose,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    base_price: "",
    image_url: "",
    is_available: true,
    sizes: [] as { name: string; price: number }[],
    addons: [] as { name: string; price: number }[],
  });

  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        category: item.category || "",
        base_price: item.base_price.toString(),
        image_url: item.image_url || "",
        is_available: item.is_available,
        sizes: item.sizes || [],
        addons: item.addons || [],
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        base_price: "",
        image_url: "",
        is_available: true,
        sizes: [],
        addons: [],
      });
    }
  }, [mode, item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.base_price) {
      setError("El nombre y el precio base son obligatorios");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("No se encontró el ID del restaurante");
      return;
    }

    setLoading(true);

    const menuItemData = {
      restaurant_id: user.restaurant_id,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category || undefined,
      base_price: parseFloat(formData.base_price),
      image_url: formData.image_url || undefined,
      is_available: formData.is_available,
      sizes: formData.sizes.length > 0 ? formData.sizes : undefined,
      addons: formData.addons.length > 0 ? formData.addons : undefined,
    };

    let success = false;
    if (mode === "add") {
      success = await createMenuItem(menuItemData);
    } else if (item) {
      success = await updateMenuItem(item.id, menuItemData);
    }

    setLoading(false);

    if (success) {
      onClose();
    } else {
      setError(
        mode === "add"
          ? "No se pudo agregar el platillo"
          : "No se pudo actualizar el platillo"
      );
    }
  };

  const addSize = () => {
    if (newSize.name && newSize.price) {
      setFormData({
        ...formData,
        sizes: [
          ...formData.sizes,
          { name: newSize.name, price: parseFloat(newSize.price) },
        ],
      });
      setNewSize({ name: "", price: "" });
    }
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index),
    });
  };

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [
          ...formData.addons,
          { name: newAddon.name, price: parseFloat(newAddon.price) },
        ],
      });
      setNewAddon({ name: "", price: "" });
    }
  };

  const removeAddon = (index: number) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar Platillo" : "Editar Platillo"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Nombre del platillo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ej. Pizza Margherita"
          required
        />

        <Textarea
          label="Descripción (Opcional)"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe tu platillo..."
          rows={2}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Categoría"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="ej. Pizzas, Hamburguesas"
          />

          <Input
            label="Precio base"
            type="number"
            step="0.01"
            value={formData.base_price}
            onChange={(e) =>
              setFormData({ ...formData, base_price: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        <Input
          label="URL de imagen (Opcional)"
          value={formData.image_url}
          onChange={(e) =>
            setFormData({ ...formData, image_url: e.target.value })
          }
          placeholder="https://ejemplo.com/imagen.jpg"
        />

        {/* Sizes */}
        <div>
          <label className="label mb-3">Tamaños (Opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.sizes.map((size, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {size.name} - {formatCurrency(size.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del tamaño"
              value={newSize.name}
              onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
            />
            <Input
              placeholder="Precio"
              type="number"
              step="0.01"
              value={newSize.price}
              onChange={(e) =>
                setNewSize({ ...newSize, price: e.target.value })
              }
            />
            <Button type="button" onClick={addSize} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <label className="label mb-3">Extras (Opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.addons.map((addon, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {addon.name} - +{formatCurrency(addon.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddon(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del extra"
              value={newAddon.name}
              onChange={(e) =>
                setNewAddon({ ...newAddon, name: e.target.value })
              }
            />
            <Input
              placeholder="Precio"
              type="number"
              step="0.01"
              value={newAddon.price}
              onChange={(e) =>
                setNewAddon({ ...newAddon, price: e.target.value })
              }
            />
            <Button type="button" onClick={addAddon} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Availability */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={(e) =>
              setFormData({ ...formData, is_available: e.target.checked })
            }
            className="rounded border-border"
          />
          <span className="text-text">Disponible para pedidos</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar Platillo" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Ingredients Modal
interface IngredientsModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const IngredientsModal: React.FC<IngredientsModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<MenuItemIngredientWithDetails[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      loadData();
    }
  }, [isOpen, item]);

  const loadData = async () => {
    if (!item) return;

    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Load current ingredients
    const currentIngredients = await getMenuItemIngredients(item.id);
    setIngredients(currentIngredients as MenuItemIngredientWithDetails[]);

    // Load available inventory items
    const inventory = await getInventoryItems(user.restaurant_id);
    setAvailableInventory(inventory.filter(inv => inv.is_active));
    setLoading(false);
  };

  const handleAddIngredient = async () => {
    if (!item || !selectedInventoryId || !quantity) return;

    setLoading(true);
    const success = await addIngredientToMenuItem(
      item.id,
      selectedInventoryId,
      parseFloat(quantity)
    );
    setLoading(false);

    if (success) {
      setSelectedInventoryId("");
      setQuantity("");
      loadData();
    }
  };

  const handleRemoveIngredient = async (ingredientId: string) => {
    setLoading(true);
    const success = await removeIngredientFromMenuItem(ingredientId);
    setLoading(false);

    if (success) {
      loadData();
    }
  };

  if (!item) return null;

  const usedInventoryIds = ingredients.map(ing => ing.inventory_item_id);
  const availableForSelection = availableInventory.filter(
    inv => !usedInventoryIds.includes(inv.id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ingredientes - ${item.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Current Ingredients */}
        <div>
          <label className="label mb-3">Ingredientes Actuales</label>
          {ingredients.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay ingredientes asignados a este platillo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-text font-medium">
                      {ingredient.inventory_item?.name || "Ingrediente eliminado"}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {ingredient.quantity_used} {ingredient.inventory_item?.unit} por porción
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ingredient.id)}
                    disabled={loading}
                    className="text-error hover:bg-error/10 p-2 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Ingredient */}
        <div className="border-t border-border pt-6">
          <label className="label mb-3">Agregar Ingrediente</label>

          {availableForSelection.length === 0 ? (
            <Alert
              type="info"
              message="No hay insumos disponibles para agregar. Todos los insumos activos ya están asignados o no tienes insumos creados en tu inventario."
            />
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label text-sm">Seleccionar Insumo</label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">-- Selecciona un insumo --</option>
                  {availableForSelection.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInventoryId && (
                <div>
                  <label className="label text-sm">
                    Cantidad Usada Por Porción (
                    {availableInventory.find(inv => inv.id === selectedInventoryId)?.unit})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              <Button
                onClick={handleAddIngredient}
                disabled={!selectedInventoryId || !quantity || loading}
                loading={loading}
                fullWidth
                icon={<Plus className="w-4 h-4" />}
              >
                Agregar Ingrediente
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    setLoading(true);
    const success = await deleteMenuItem(item.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Platillo" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Seguro que quieres eliminar "${item.name}"? Esta acción no se puede deshacer.`}
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
            Eliminar Platillo
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
