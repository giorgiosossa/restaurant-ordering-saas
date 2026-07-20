// Supabase Configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://rphwlsiwwxeqerakevvq.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwaHdsc2l3d3hlcWVyYWtldnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODcwODUsImV4cCI6MjA5ODU2MzA4NX0.qqbjxXx3bv7z1WNjOHrWmrMfqnhYLptsW0gb4VXl2cY";

// Application Configuration
export const APP_CONFIG = {
  appName: "FoodOrder",
  defaultCurrency: "$",
  currencyCode: "MXN",
  orderPrefix: "ORD",

  // Subscription plans
  plans: {
    free_trial: {
      name: "Prueba Gratis",
      price: 0,
      duration: "14 días",
      features: [
        "Hasta 50 pedidos/mes",
        "Gestión básica de menú",
        "Pedidos por QR",
        "Soporte por email",
      ],
    },
    starter: {
      name: "Starter",
      price: 299,
      duration: "por mes",
      features: [
        "Pedidos ilimitados",
        "Gestión completa de menú",
        "Pedidos por QR",
        "Reportes",
        "Soporte por WhatsApp",
      ],
    },
    pro: {
      name: "Pro",
      price: 599,
      duration: "por mes",
      features: [
        "Todo lo de Starter",
        "Múltiples sucursales",
        "Analítica avanzada",
        "Marca personalizada",
        "Soporte prioritario",
      ],
    },
  },

  // Restaurant types
  restaurantTypes: [
    "Restaurante",
    "Food Truck",
    "Cafetería",
    "Panadería",
    "Cocina Oculta",
    "Alta Cocina",
    "Comida Rápida",
    "Otro",
  ],

  // Menu categories
  menuCategories: [
    "Entradas",
    "Platos Fuertes",
    "Desayuno",
    "Comida",
    "Cena",
    "Bebidas",
    "Postres",
    "Antojitos",
    "Otro",
  ],

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendiente", color: "warning" },
    accepted: { label: "Aceptado", color: "accent-secondary" },
    preparing: { label: "Preparando", color: "accent-secondary" },
    ready: { label: "Listo", color: "success" },
    completed: { label: "Completado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rechazado", color: "error" },
  },

  // Payment methods
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta", "Otro"],

  // Registration sources
  heardFromOptions: [
    "Búsqueda en Google",
    "Redes Sociales",
    "Recomendación",
    "Publicidad",
    "Otro",
  ],
};
