import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
  Copy,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
} from "../../services/restaurantService";
import type { MenuItem, Order } from "../../config/supabase";
import {
  formatCurrency,
  formatDateTime,
  isValidPhone,
  copyToClipboard,
} from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import {
  initOpenpay,
  tokenizeCard,
  processCardPayment,
  formatCardNumber,
  validateCardNumber,
  getCardType,
} from "../../services/openpayFrontendService";
import type { CardData } from "../../services/openpayFrontendService";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Load restaurant and menu
  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        setMenuItems(data);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Restaurant not found");
      setLoading(false);
      return;
    }

    setRestaurant(data);
  };

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (
    item: MenuItem,
    selectedSize?: any,
    selectedAddons: any[] = []
  ) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const itemTotal = basePrice + addonsTotal;

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      selectedSize,
      selectedAddons,
      itemTotal,
    };

    const existingIndex = cart.findIndex(
      (ci) =>
        ci.id === item.id &&
        ci.selectedSize?.name === selectedSize?.name &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    if (item.sizes && item.sizes.length > 0) {
      setSelectedItem(item);
      setShowItemModal(true);
    } else {
      addToCart(item);
    }
  };

  if (loading) {
    return <Loading text="Cargando menú..." />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            Restaurante no encontrado
          </h2>
          <p className="text-text-secondary">
            El restaurante que buscas no existe o está inactivo actualmente.
          </p>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return cart.reduce((sum, cartItem) => {
      if (cartItem.id === itemId) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);
  };

  const handleAddSimple = (item: MenuItem) => {
    addToCart(item);
  };

  const handleRemoveItem = (itemId: string) => {
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-800">
                {restaurant.name}
              </h1>
              <p className="text-xs text-gray-500">
                {restaurant.restaurant_type}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[108px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  categoryFilter === category
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              const hasVariations =
                (item.sizes && item.sizes.length > 0) ||
                (item.addons && item.addons.length > 0);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="relative h-36">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                          Not Available
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 h-10">
                      {item.name}
                    </h3>

                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="font-bold text-gray-800">
                          {item.sizes && item.sizes.length > 0
                            ? formatCurrency(
                                Math.min(...item.sizes.map((s) => s.price))
                              )
                            : formatCurrency(item.base_price)}
                        </p>
                      </div>

                      {item.is_available && (
                        <div className="flex-shrink-0">
                          {quantity === 0 ? (
                            <button
                              onClick={() =>
                                hasVariations
                                  ? handleItemClick(item)
                                  : handleAddSimple(item)
                              }
                              className="px-5 py-1.5 border-2 border-accent text-accent font-bold text-xs rounded-md hover:shadow-md transition-shadow"
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-md">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2 py-1 hover:bg-accent-hover rounded-l-md"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 font-bold text-sm">
                                {quantity}
                              </span>
                              <button
                                onClick={() =>
                                  hasVariations
                                    ? handleItemClick(item)
                                    : handleAddSimple(item)
                                }
                                className="px-2 py-1 hover:bg-accent-hover rounded-r-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        restaurant={restaurant}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>View Cart</span>
              <span className="text-lg">›</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

// Cart Modal Component
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}) => {
  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tu Carrito" size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">
                        Tamaño: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Extras:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-accent font-semibold mt-1">
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 text-error hover:bg-error/10 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                Continuar al Pedido
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Item Customization Modal Component
interface ItemCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedSize?: any, selectedAddons?: any[]) => void;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  item,
  onClose,
  onAdd,
}) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0]);
    }
  }, [item]);

  if (!item) return null;

  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    return basePrice + addonsTotal;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name} size="md">
      <div className="space-y-6">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        {item.description && (
          <p className="text-text-secondary">{item.description}</p>
        )}

        {/* Sizes */}
        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Elige el tamaño</h4>
            <div className="space-y-2">
              {item.sizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setSelectedSize(size)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedSize?.name === size.name
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{size.name}</span>
                  <span className="text-accent font-semibold">
                    {formatCurrency(size.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addons */}
        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">
              Extras (Opcional)
            </h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedAddons.find((a) => a.name === addon.name)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{addon.name}</span>
                  <span className="text-accent font-semibold">
                    +{formatCurrency(addon.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xl font-bold text-text mb-4">
            <span>Total</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button
            onClick={() => onAdd(item, selectedSize, selectedAddons)}
            fullWidth
            size="lg"
          >
            Agregar al Carrito
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  restaurant: any;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  restaurant,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"form" | "confirm" | "ticket">("form");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"now" | "cash_at_bar" | "terminal_at_table">("terminal_at_table");
  const [cashAmount, setCashAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentCode, setPaymentCode] = useState<string>("");

  // Card payment states
  const [cardData, setCardData] = useState<CardData>({
    card_number: "",
    holder_name: "",
    expiration_year: "",
    expiration_month: "",
    cvv2: "",
  });
  const [deviceSessionId, setDeviceSessionId] = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const total = subtotal;

  const isPhoneRequired = orderType !== "table";

  // Initialize Openpay SDK when modal opens
  useEffect(() => {
    if (isOpen) {
      const initializeOpenpay = async () => {
        try {
          const sessionId = await initOpenpay();
          setDeviceSessionId(sessionId);
          console.log('[CustomerMenu] Openpay SDK initialized');
        } catch (error) {
          console.error('[CustomerMenu] Error initializing Openpay SDK:', error);
        }
      };

      initializeOpenpay();
    }
  }, [isOpen]);

  // Generate a unique 4-digit payment code for the day (from database)
  const generatePaymentCode = async (restaurantId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('generate_unique_daily_payment_code', {
        p_restaurant_id: restaurantId
      });

      if (error) {
        console.error('Error generating payment code:', error);
        // Fallback to random code if database function fails
        return Math.floor(1000 + Math.random() * 9000).toString();
      }

      return data as string;
    } catch (err) {
      console.error('Error calling generate_unique_daily_payment_code:', err);
      // Fallback to random code
      return Math.floor(1000 + Math.random() * 9000).toString();
    }
  };

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Ingresa tu nombre");
      return;
    }

    if (isPhoneRequired && !isValidPhone(customerPhone)) {
      setError("Ingresa un teléfono válido a 10 dígitos");
      return;
    }
    if (customerPhone && !isValidPhone(customerPhone)) {
      setError("Ingresa un teléfono válido a 10 dígitos");
      return;
    }

    if (orderType === "table" && !tableNumber.trim()) {
      setError("Ingresa el número de mesa");
      return;
    }

    // Validate card data if paying now
    if (paymentMethod === "now") {
      if (!cardData.card_number || cardData.card_number.length < 15) {
        setError("Ingresa un número de tarjeta válido");
        return;
      }
      if (!validateCardNumber(cardData.card_number)) {
        setError("El número de tarjeta es inválido");
        return;
      }
      if (!cardData.holder_name.trim()) {
        setError("Ingresa el nombre del titular de la tarjeta");
        return;
      }
      if (!cardData.expiration_month || !cardData.expiration_year) {
        setError("Ingresa la fecha de expiración de la tarjeta");
        return;
      }
      if (!cardData.cvv2 || cardData.cvv2.length < 3) {
        setError("Ingresa el CVV de la tarjeta");
        return;
      }
    }

    // Go to confirmation step
    setStep("confirm");
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError("");

    try {
      // Process card payment FIRST if "Pagar ahora" is selected
      if (paymentMethod === "now") {
        setCardProcessing(true);
        try {
          // Tokenize the card
          const cardToken = await tokenizeCard(cardData);
          console.log('[CustomerMenu] Card tokenized successfully');

          // Create order first to get order_id
          const orderData = {
            restaurant_id: restaurantId,
            order_type: (orderType === "table" ? "qr" : "counter") as "qr" | "counter",
            table_number: orderType === "table" ? tableNumber : undefined,
            customer_name: customerName,
            customer_phone: customerPhone || undefined,
            items: cart.map((item) => ({
              menu_item_id: item.id,
              name: item.name,
              quantity: item.quantity,
              base_price: item.base_price,
              selected_size: item.selectedSize,
              selected_addons: item.selectedAddons,
              item_total: item.itemTotal,
            })),
            subtotal,
            tax: 0,
            total,
            customer_notes: notes,
            payment_type: paymentMethod,
            is_blocked: true, // Block until payment is confirmed
            status: "pending" as const,
            payment_status: "pending",
          };

          const { data: orderCreated, error: orderError } = await createOrder(orderData);
          if (orderError || !orderCreated) {
            throw new Error(orderError?.message || "Error al crear el pedido");
          }

          // Process the payment
          const paymentResult = await processCardPayment(
            orderCreated.order_number,
            cardToken,
            deviceSessionId,
            total,
            `Pedido ${orderCreated.order_number} - ${restaurant?.name || 'Restaurante'}`
          );

          if (paymentResult.success) {
            setPlacedOrder(orderCreated);
            setStep("ticket");
            console.log('[CustomerMenu] Payment successful');
          } else {
            throw new Error(paymentResult.error || 'Error al procesar el pago');
          }
        } catch (error: any) {
          setError(error.message || "Error al procesar el pago con tarjeta");
          console.error('[CustomerMenu] Card payment error:', error);
        } finally {
          setCardProcessing(false);
        }
        return; // Exit early after handling card payment
      }

      // Generate payment code if cash_at_bar
      let generatedCode = "";
      if (paymentMethod === "cash_at_bar") {
        generatedCode = await generatePaymentCode(restaurantId);
        setPaymentCode(generatedCode);
      }

      // Determine if order should be blocked based on payment method
      let shouldBlock = false;
      let initialStatus: "pending" | "preparing" = "pending";

      if (paymentMethod === "cash_at_bar") {
        shouldBlock = true; // Always block for cash at bar
        initialStatus = "pending";
      } else if (paymentMethod === "terminal_at_table") {
        // Check restaurant settings for terminal payment
        const autoApprove = restaurant?.terminal_payment_auto_approve;
        shouldBlock = !autoApprove;
        initialStatus = autoApprove ? "preparing" : "pending";
      }

      const orderData = {
        restaurant_id: restaurantId,
        order_type: (orderType === "table" ? "qr" : "counter") as "qr" | "counter",
        table_number: orderType === "table" ? tableNumber : undefined,
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          base_price: item.base_price,
          selected_size: item.selectedSize,
          selected_addons: item.selectedAddons,
          item_total: item.itemTotal,
        })),
        subtotal,
        tax: 0,
        total,
        customer_notes: notes,
        payment_type: paymentMethod,
        cash_payment_code: paymentMethod === "cash_at_bar" ? generatedCode : undefined,
        cash_amount_brought: paymentMethod === "cash_at_bar" ? parseFloat(cashAmount) : undefined,
        is_blocked: shouldBlock,
        status: initialStatus,
        payment_status: "pending",
      };

      const { data, error: orderError } = await createOrder(orderData);

      if (!orderError && data) {
        setPlacedOrder(data);
        setStep("ticket");
        // Don't call onSuccess() here - wait until user closes the ticket modal
      } else {
        setError(orderError?.message || "Error al crear el pedido");
      }
    } catch (error: any) {
      setError(error.message || "Error al procesar el pedido");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    // Clear all form state
    setCustomerName("");
    setCustomerPhone("");
    setTableNumber("");
    setNotes("");
    setOrderType("table");
    setPaymentMethod("terminal_at_table");
    setCashAmount("");
    setPaymentCode("");
    setStep("form");
    setPlacedOrder(null);
    setCopied(false);
    setError("");

    // Clear card data
    setCardData({
      card_number: "",
      holder_name: "",
      expiration_year: "",
      expiration_month: "",
      cvv2: "",
    });
    setDeviceSessionId("");
    setCardProcessing(false);

    // Call onSuccess to clear cart and close modal
    onSuccess();
    onClose();
  };

  const handleCopyTicket = async () => {
    if (!placedOrder) return;
    const lines = [
      `Pedido #${placedOrder.order_number}`,
      placedOrder.table_number
        ? `Mesa: ${placedOrder.table_number}`
        : "Para llevar",
      formatDateTime(placedOrder.created_at),
      "",
      ...placedOrder.items.map(
        (item) =>
          `${item.quantity}x ${item.name} - ${formatCurrency(
            item.item_total * item.quantity
          )}`
      ),
      "",
      `Total: ${formatCurrency(placedOrder.total)}`,
    ];
    const success = await copyToClipboard(lines.join("\n"));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Ticket / Receipt step
  if (step === "ticket" && placedOrder) {
    const orderTotal = placedOrder.total;
    const cashBrought = placedOrder.cash_amount_brought || parseFloat(cashAmount) || 0;
    const change = placedOrder.payment_type === "cash_at_bar" ? cashBrought - orderTotal : 0;

    return (
      <Modal
        isOpen={isOpen}
        onClose={resetAndClose}
        title="¡Pedido Confirmado!"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="text-text-secondary">
              {placedOrder.payment_type === "cash_at_bar"
                ? "Tu pedido ha sido recibido. Ve a la barra con tu código para pagar."
                : placedOrder.payment_type === "terminal_at_table"
                ? placedOrder.is_blocked
                  ? "Tu pedido ha sido recibido. Un mesero llevará la terminal a tu mesa para confirmar el pago y enviar tu orden a cocina."
                  : "Tu pedido está siendo preparado. Un mesero llevará la terminal con tu orden lista."
                : "Tu pedido ha sido recibido. El restaurante lo preparará en breve."}
            </p>
          </div>

          {/* Payment Code for Cash at Bar */}
          {placedOrder.payment_type === "cash_at_bar" && placedOrder.cash_payment_code && (
            <div className="bg-green-50 border-4 border-green-600 rounded-xl p-6 text-center shadow-lg">
              <Banknote className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700 mb-2">Tu código de pago es:</p>
              <p className="text-6xl font-black text-green-600 tracking-widest mb-4">{placedOrder.cash_payment_code}</p>
              <p className="text-sm font-medium text-gray-600 mb-4">
                Muestra este código al personal en la barra
              </p>
              <div className="mt-4 space-y-2 text-base bg-white rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Total a pagar:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(orderTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Traes:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(cashBrought)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-200 pt-2">
                  <span className="text-gray-600 font-medium">Tu cambio:</span>
                  <span className="font-black text-green-600 text-lg">{formatCurrency(change)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ticket */}
          <div className="bg-bg-subtle rounded-lg p-4 space-y-3 border border-dashed border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-accent" />
                <h4 className="font-bold text-text">
                  Pedido #{placedOrder.order_number}
                </h4>
              </div>
              <span className="text-xs text-text-secondary">
                {formatDateTime(placedOrder.created_at)}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {placedOrder.table_number
                ? `Mesa: ${placedOrder.table_number}`
                : "Para llevar"}
            </p>

            <div className="border-t border-border pt-3 space-y-2">
              {placedOrder.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {item.quantity}x {item.name}
                    {item.selected_size && ` (${item.selected_size.name})`}
                  </span>
                  <span className="text-text">
                    {formatCurrency(item.item_total * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-2 flex justify-between text-lg font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(placedOrder.total)}</span>
            </div>
          </div>

          <Button
            variant="outline"
            fullWidth
            icon={<Copy className="w-4 h-4" />}
            onClick={handleCopyTicket}
          >
            {copied ? "¡Copiado!" : "Copiar Ticket"}
          </Button>

          <Button onClick={resetAndClose} fullWidth>
            Listo
          </Button>
        </div>
      </Modal>
    );
  }

  // Confirmation step
  if (step === "confirm") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={resetAndClose}
        title="Confirma tu pedido"
        size="lg"
      >
        <div className="space-y-6">
          {error && <Alert type="error" message={error} />}

          <Alert
            type="warning"
            message="Revisa bien tu pedido antes de confirmar. Una vez enviado, el restaurante empezará a prepararlo."
          />

          {paymentMethod === "cash_at_bar" && (
            <Alert
              type="info"
              message="Si el código no es proporcionado en la barra en dos horas el pedido será cancelado automáticamente."
            />
          )}

          <div className="bg-bg-subtle rounded-lg p-4 space-y-2 text-sm">
            <p className="text-text">
              <strong>Nombre:</strong> {customerName}
            </p>
            {customerPhone && (
              <p className="text-text">
                <strong>Teléfono:</strong> {customerPhone}
              </p>
            )}
            <p className="text-text">
              <strong>Tipo:</strong>{" "}
              {orderType === "table"
                ? `Mesa ${tableNumber}`
                : "Para llevar"}
            </p>
            <p className="text-text">
              <strong>Pago:</strong>{" "}
              {paymentMethod === "cash_at_bar" ? "Efectivo en barra" : "Pagar ahora"}
            </p>
            {paymentMethod === "cash_at_bar" && (
              <p className="text-text">
                <strong>Traerás:</strong> {formatCurrency(parseFloat(cashAmount))}
              </p>
            )}
            {notes && (
              <p className="text-text">
                <strong>Notas:</strong> {notes}
              </p>
            )}
          </div>

          <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-text mb-2">
              Resumen del pedido
            </h4>
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  {item.quantity}x {item.name}
                  {item.selectedSize && ` (${item.selectedSize.name})`}
                </span>
                <span className="text-text">
                  {formatCurrency(item.itemTotal * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-xl font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("form")}
              fullWidth
            >
              Editar
            </Button>
            <Button
              onClick={handleConfirmOrder}
              loading={loading || cardProcessing}
              fullWidth
            >
              {cardProcessing ? "Procesando pago..." : "Confirmar Pedido"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Form step
  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Datos del pedido" size="lg">
      <form onSubmit={handleValidateForm} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-3">Tipo de pedido</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "table"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Comer aquí (Mesa)
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "takeaway"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Para llevar
            </button>
          </div>
        </div>

        {/* Table Number (only for table orders) */}
        {orderType === "table" && (
          <Input
            label="Número de mesa"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Ingresa el número de tu mesa"
            required
          />
        )}

        {/* Customer Details */}
        <Input
          label="Tu nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ingresa tu nombre"
          required
        />

        <Input
          label={`Teléfono${isPhoneRequired ? "" : " (Opcional)"}`}
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Celular a 10 dígitos"
          required={isPhoneRequired}
          helperText={
            isPhoneRequired
              ? "Lo usaremos para avisarte sobre tu pedido"
              : "Opcional para pedidos en mesa"
          }
        />

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Instrucciones especiales (Opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguna petición especial para tu pedido..."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="label mb-3">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("terminal_at_table")}
              className={`p-3 rounded-lg border-2 font-semibold transition-colors flex flex-col items-center gap-2 ${
                paymentMethod === "terminal_at_table"
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-border hover:border-blue-400"
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-xs">Terminal a la mesa</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("cash_at_bar")}
              className={`p-3 rounded-lg border-2 font-semibold transition-colors flex flex-col items-center gap-2 ${
                paymentMethod === "cash_at_bar"
                  ? "border-green-600 bg-green-50 text-green-600"
                  : "border-border hover:border-green-400"
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs">Efectivo en barra</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("now")}
              className={`p-3 rounded-lg border-2 font-semibold transition-colors flex flex-col items-center gap-2 ${
                paymentMethod === "now"
                  ? "border-purple-600 bg-purple-50 text-purple-600"
                  : "border-border hover:border-purple-400"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Pagar ahora</span>
            </button>
          </div>
        </div>

        {/* Cash Amount (only for cash at bar) */}
        {paymentMethod === "cash_at_bar" && (
          <div>
            <Input
              label="¿Cuánto dinero traerás?"
              type="number"
              step="0.01"
              min={total}
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder={`Mínimo ${formatCurrency(total)}`}
              required
              helperText="Ingresa el monto en efectivo que traerás para calcular tu cambio"
            />
            {cashAmount && parseFloat(cashAmount) >= total && (
              <div className="mt-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Tu cambio será: {formatCurrency(parseFloat(cashAmount) - total)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Card Payment Form (only for pay now) */}
        {paymentMethod === "now" && (
          <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-semibold text-text mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Información de la tarjeta
            </h4>

            {/* Card Number */}
            <div>
              <label className="label mb-2">Número de tarjeta</label>
              <input
                type="text"
                value={formatCardNumber(cardData.card_number)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\s/g, '');
                  if (cleaned.length <= 16 && /^\d*$/.test(cleaned)) {
                    setCardData({ ...cardData, card_number: cleaned });
                  }
                }}
                placeholder="1234 5678 9012 3456"
                className="input-field font-mono"
                maxLength={19}
                required
              />
              {cardData.card_number.length >= 15 && (
                <p className="text-xs text-text-secondary mt-1">
                  {validateCardNumber(cardData.card_number)
                    ? `✓ ${getCardType(cardData.card_number)}`
                    : '⚠ Número de tarjeta inválido'}
                </p>
              )}
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="label mb-2">Nombre del titular</label>
              <input
                type="text"
                value={cardData.holder_name}
                onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value.toUpperCase() })}
                placeholder="NOMBRE APELLIDO"
                className="input-field uppercase"
                required
              />
            </div>

            {/* Expiration and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">Mes de expiración</label>
                <select
                  value={cardData.expiration_month}
                  onChange={(e) => setCardData({ ...cardData, expiration_month: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Mes</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, '0');
                    return <option key={month} value={month}>{month}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="label mb-2">Año de expiración</label>
                <select
                  value={cardData.expiration_year}
                  onChange={(e) => setCardData({ ...cardData, expiration_year: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Año</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = (new Date().getFullYear() + i).toString().slice(-2);
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">CVV</label>
                <input
                  type="text"
                  value={cardData.cvv2}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 4 && /^\d*$/.test(value)) {
                      setCardData({ ...cardData, cvv2: value });
                    }
                  }}
                  placeholder="123"
                  className="input-field font-mono text-center"
                  maxLength={4}
                  required
                />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-text-secondary">
                  Código de seguridad de 3 o 4 dígitos
                </p>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-2 text-xs text-text-secondary bg-white p-2 rounded border border-purple-200">
              <span className="text-green-600">🔒</span>
              <span>Tus datos están protegidos y encriptados</span>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Resumen del pedido</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {item.name}
                {item.selectedSize && ` (${item.selectedSize.name})`}
              </span>
              <span className="text-text">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={resetAndClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" fullWidth>
            Revisar Pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
