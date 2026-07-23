# ⚡ Openpay Quick Start

Guía rápida para integrar Openpay en 5 pasos.

---

## 📦 1. Instalación

```bash
npm install openpay express
npm install --save-dev @types/express @types/node
```

---

## ⚙️ 2. Configuración (.env)

```env
OPENPAY_MERCHANT_ID=mbdayyuhcki0qyt3sjsx
OPENPAY_PRIVATE_KEY=sk_9609869aed4f4113990c47bb50ea5e1a
OPENPAY_PUBLIC_KEY=pk_3d0f7efb1ab64999b80bbe271536337f
OPENPAY_ENVIRONMENT=sandbox
```

---

## 🚀 3. Inicializar Servicio

```typescript
// En tu server.ts o index.ts
import { openpayService } from './services/openpayService';

openpayService.init();
console.log('✅ Openpay ready');
```

---

## 🏪 4. Registrar Restaurante

```typescript
import { openpayService } from './services/openpayService';

const result = await openpayService.registerRestaurant({
  restaurantId: 'rest_123',
  businessName: 'Tacos El Güero',
  rfc: 'XAXX010101000',
  email: 'contacto@ejemplo.com',
  phone: '5512345678',
  address: {
    line1: 'Calle Principal 123',
    postal_code: '06000',
    state: 'CDMX',
    city: 'Ciudad de México',
    country_code: 'MX',
  },
  bankAccount: {
    clabe: '012298026516924616',
    holder_name: 'Tacos El Güero SA',
    bank_name: 'BBVA Bancomer',
  },
});

// Guardar el Customer ID en tu DB
const openpayCustomerId = result.data.id;
```

---

## 💳 5. Procesar Pago

### Frontend: Tokenizar Tarjeta

```html
<script src="https://resources.openpay.mx/openpay.v1.min.js"></script>
<script>
OpenPay.setId('mbdayyuhcki0qyt3sjsx');
OpenPay.setApiKey('pk_3d0f7efb1ab64999b80bbe271536337f');
OpenPay.setSandboxMode(true);

OpenPay.token.create({
  card_number: '4111111111111111',
  holder_name: 'Juan Pérez',
  expiration_year: '25',
  expiration_month: '12',
  cvv2: '123'
}, (response) => {
  const token = response.data.id;
  // Enviar token al backend
}, (error) => {
  console.error(error);
});
</script>
```

### Backend: Procesar Pago

```typescript
const result = await openpayService.processCardPayment({
  restaurantOpenpayId: restaurant.openpay_customer_id,
  orderId: order.order_number,
  amount: order.total,
  description: `Orden #${order.order_number}`,
  cardToken: token, // Token del frontend
  deviceSessionId: deviceSessionId,
  customerInfo: {
    name: order.customer_name,
    email: order.customer_email,
  },
});

if (result.success) {
  console.log('✅ Pago exitoso:', result.data.id);
}
```

---

## 🔔 6. Configurar Webhooks

### Crear Endpoint

```typescript
import express from 'express';
import { handleOpenpayWebhook } from './controllers/openpayWebhookController';

const app = express();
app.use(express.json());

app.post('/webhooks/openpay', handleOpenpayWebhook);

app.listen(3000);
```

### Registrar en Openpay

1. Ve a: https://sandbox-dashboard.openpay.mx/webhooks
2. Agrega: `https://tu-dominio.com/webhooks/openpay`
3. Selecciona eventos: `charge.succeeded`, `charge.failed`

---

## 🧪 Testing

### Tarjetas de Prueba

| Número | Resultado |
|--------|-----------|
| `4111111111111111` | ✅ Aprobada |
| `4000000000000002` | ❌ Declinada |

**Datos adicionales:**
- CVV: `123`
- Expiración: `12/25`
- Nombre: Cualquiera

---

## 📂 Archivos Creados

```
src/
├── types/
│   └── openpay.types.ts           # Tipos TypeScript
├── services/
│   └── openpayService.ts          # Servicio principal
├── controllers/
│   └── openpayWebhookController.ts # Webhooks
└── routes/
    └── openpay.routes.example.ts  # Rutas de ejemplo
```

---

## 🔥 Funciones Principales

```typescript
// Registrar restaurante
await openpayService.registerRestaurant(request);

// Procesar pago con tarjeta
await openpayService.processCardPayment(request);

// Crear pago con CoDi (QR)
await openpayService.createCodiPayment(restaurantId, orderId, amount, description);

// Reembolsar
await openpayService.refundCharge(restaurantId, chargeId, description);

// Obtener cargo
await openpayService.getCharge(restaurantId, chargeId);
```

---

## 📚 Documentación Completa

Para guía detallada, ver: `OPENPAY_IMPLEMENTATION_GUIDE.md`

---

## ✅ Checklist

- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] Servicio inicializado
- [ ] Restaurantes registrados
- [ ] Pagos funcionando
- [ ] Webhooks configurados
- [ ] Testing completado

---

**¿Necesitas ayuda?** Consulta la [documentación oficial de Openpay](https://www.openpay.mx/docs/) o revisa `OPENPAY_IMPLEMENTATION_GUIDE.md`.
