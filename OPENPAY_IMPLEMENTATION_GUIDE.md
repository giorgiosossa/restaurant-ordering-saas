# 🚀 Guía de Implementación Openpay

Esta guía te ayudará a integrar Openpay en tu SaaS de restaurantes para procesar pagos directamente en las cuentas bancarias de cada restaurante (multi-tenant) **sin cobrar comisiones**.

---

## 📋 Índice

1. [Instalación](#instalación)
2. [Configuración Inicial](#configuración-inicial)
3. [Registro de Restaurantes (Onboarding)](#registro-de-restaurantes)
4. [Procesamiento de Pagos](#procesamiento-de-pagos)
5. [Configuración de Webhooks](#configuración-de-webhooks)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Testing en Sandbox](#testing-en-sandbox)
8. [Migración a Producción](#migración-a-producción)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Instalación

### 1. Instalar Dependencias

```bash
npm install openpay express
npm install --save-dev @types/express @types/node
```

### 2. Estructura de Archivos Creados

```
src/
├── types/
│   └── openpay.types.ts           # Definiciones TypeScript
├── services/
│   └── openpayService.ts          # Servicio principal (singleton)
└── controllers/
    └── openpayWebhookController.ts # Manejo de webhooks
```

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Asegúrate de que tu archivo `.env` contenga:

```env
# OPENPAY CONFIGURATION (SANDBOX)
OPENPAY_MERCHANT_ID=mbdayyuhcki0qyt3sjsx
OPENPAY_PRIVATE_KEY=sk_9609869aed4f4113990c47bb50ea5e1a
OPENPAY_PUBLIC_KEY=pk_3d0f7efb1ab64999b80bbe271536337f
OPENPAY_ENVIRONMENT=sandbox
OPENPAY_WEBHOOK_URL=https://your-domain.com/webhooks/openpay
```

⚠️ **IMPORTANTE**:
- `OPENPAY_PRIVATE_KEY` nunca debe exponerse al frontend
- `OPENPAY_PUBLIC_KEY` es seguro para usar en el frontend (tokenización de tarjetas)

### 2. Inicializar el Servicio

En tu archivo principal de backend (ej: `server.ts` o `index.ts`):

```typescript
import { openpayService } from './services/openpayService';

// Inicializar Openpay al arrancar el servidor
openpayService.init();

console.log('✅ Openpay service initialized');
```

---

## 🏪 Registro de Restaurantes

### Flujo de Onboarding

Cuando un restaurante se registra en tu plataforma, debes crear su cuenta en Openpay:

```typescript
import { openpayService } from './services/openpayService';
import type { RegisterRestaurantRequest } from './types/openpay.types';

async function onboardRestaurant() {
  const request: RegisterRestaurantRequest = {
    restaurantId: 'rest_12345', // Tu ID interno
    businessName: 'Tacos El Güero',
    rfc: 'XAXX010101000', // RFC del negocio
    email: 'contacto@tacoselguero.com',
    phone: '5512345678',
    address: {
      line1: 'Calle Principal 123',
      line2: 'Col. Centro',
      postal_code: '06000',
      state: 'CDMX',
      city: 'Ciudad de México',
      country_code: 'MX',
    },
    // CRÍTICO: Cuenta bancaria para recibir depósitos
    bankAccount: {
      clabe: '012298026516924616', // CLABE interbancaria
      holder_name: 'Tacos El Güero SA de CV',
      bank_name: 'BBVA Bancomer',
      bank_code: '012',
    },
  };

  const result = await openpayService.registerRestaurant(request);

  if (result.success && result.data) {
    console.log('✅ Restaurant registered in Openpay');
    console.log('Openpay Customer ID:', result.data.id);

    // IMPORTANTE: Guarda este ID en tu base de datos
    await saveOpenpayCustomerId(request.restaurantId, result.data.id);
  } else {
    console.error('❌ Error:', result.error?.message);
  }
}
```

### Guardar el Customer ID

En tu tabla `restaurants`, agrega una columna:

```sql
ALTER TABLE restaurants ADD COLUMN openpay_customer_id TEXT;
```

Y guárdalo al registrar:

```typescript
async function saveOpenpayCustomerId(restaurantId: string, openpayCustomerId: string) {
  await supabase
    .from('restaurants')
    .update({ openpay_customer_id: openpayCustomerId })
    .eq('id', restaurantId);
}
```

---

## 💳 Procesamiento de Pagos

### Flujo Completo de Pago

#### 1. Frontend: Tokenizar Tarjeta

En tu frontend, usa la librería Openpay.js para tokenizar la tarjeta:

```html
<!-- Incluir Openpay.js -->
<script src="https://resources.openpay.mx/openpay.v1.min.js"></script>
<script src="https://resources.openpay.mx/openpay-data.v1.min.js"></script>

<script>
// Configurar Openpay con tu Public Key
OpenPay.setId('mbdayyuhcki0qyt3sjsx');
OpenPay.setApiKey('pk_3d0f7efb1ab64999b80bbe271536337f');
OpenPay.setSandboxMode(true);

// Función para tokenizar
async function tokenizeCard() {
  const cardData = {
    card_number: '4111111111111111',
    holder_name: 'Juan Pérez',
    expiration_year: '25',
    expiration_month: '12',
    cvv2: '123'
  };

  return new Promise((resolve, reject) => {
    OpenPay.token.create(cardData,
      (response) => {
        console.log('Token generado:', response.data.id);
        resolve(response.data.id);
      },
      (error) => {
        console.error('Error al tokenizar:', error);
        reject(error);
      }
    );
  });
}

// Obtener Device Session ID (para prevención de fraude)
const deviceSessionId = OpenPay.deviceData.setup();
</script>
```

#### 2. Backend: Procesar el Pago

Una vez que tienes el token, procesa el pago en el backend:

```typescript
import { openpayService } from './services/openpayService';
import type { ProcessPaymentRequest } from './types/openpay.types';

async function processOrderPayment(orderId: string, token: string, deviceSessionId: string) {
  // 1. Obtener datos del restaurante
  const restaurant = await getRestaurantByOrderId(orderId);

  if (!restaurant.openpay_customer_id) {
    throw new Error('Restaurant not registered in Openpay');
  }

  // 2. Obtener datos de la orden
  const order = await getOrder(orderId);

  // 3. Procesar el pago
  const paymentRequest: ProcessPaymentRequest = {
    restaurantOpenpayId: restaurant.openpay_customer_id,
    orderId: order.order_number,
    amount: order.total,
    description: `Orden ${order.order_number} - ${restaurant.name}`,
    cardToken: token,
    deviceSessionId: deviceSessionId,
    customerInfo: {
      name: order.customer_name || 'Cliente',
      email: order.customer_email || 'sin-email@example.com',
      phone: order.customer_phone,
    },
  };

  const result = await openpayService.processCardPayment(paymentRequest);

  if (result.success && result.data) {
    console.log('✅ Payment successful!');
    console.log('Transaction ID:', result.data.id);
    console.log('Authorization:', result.data.authorization);
    console.log('Status:', result.data.status);

    // Actualizar orden en la base de datos
    await updateOrderPaymentStatus(orderId, 'paid', result.data.id);

    return result.data;
  } else {
    console.error('❌ Payment failed:', result.error?.message);
    throw new Error(result.error?.message);
  }
}
```

### Opción: Pago con CoDi (QR)

Para generar un pago con CoDi:

```typescript
const result = await openpayService.createCodiPayment(
  restaurant.openpay_customer_id,
  order.order_number,
  order.total,
  `Orden ${order.order_number}`,
  '2025-07-25T23:59:59Z' // Fecha de expiración
);

if (result.success && result.data) {
  console.log('QR Code URL:', result.data.payment_method?.barcode_url);
  console.log('Reference:', result.data.payment_method?.reference);

  // Mostrar QR al cliente para que escanee y pague
  showQRToCustomer(result.data.payment_method?.barcode_url);
}
```

---

## 🔔 Configuración de Webhooks

### 1. Crear el Endpoint

En tu servidor Express:

```typescript
import express from 'express';
import { handleOpenpayWebhook } from './controllers/openpayWebhookController';

const app = express();

// IMPORTANTE: Usar express.json() para parsear el body
app.use(express.json());

// Endpoint para webhooks de Openpay
app.post('/webhooks/openpay', handleOpenpayWebhook);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 2. Registrar la URL en Openpay Dashboard

1. Ve al Dashboard de Openpay:
   - Sandbox: https://sandbox-dashboard.openpay.mx
   - Producción: https://dashboard.openpay.mx

2. Navega a: **Configuración → Webhooks**

3. Agrega tu URL: `https://tu-dominio.com/webhooks/openpay`

4. Selecciona los eventos a escuchar:
   - ✅ `charge.succeeded` (pago exitoso)
   - ✅ `charge.failed` (pago fallido)
   - ✅ `charge.refunded` (reembolso)
   - ✅ `charge.chargeback.created` (contracargo)

5. Guarda los cambios

### 3. Verificación del Webhook

Al guardar, Openpay enviará un evento de `verification`. El controlador lo maneja automáticamente:

```typescript
// El webhook responderá automáticamente a la verificación
{
  "type": "verification",
  "verification_code": "abc123..."
}
```

### 4. Eventos que se Procesan

El webhook actualiza automáticamente el estado de las órdenes:

| Evento | Acción |
|--------|--------|
| `charge.succeeded` | Marca la orden como "PAGADO" y la desbloquea |
| `charge.failed` | Marca la orden como "CANCELADO" |
| `charge.refunded` | Marca la orden como "REEMBOLSADO" |
| `charge.chargeback.created` | Marca la orden como "CONTRACARGO" y notifica |

---

## 💡 Ejemplos de Uso Completos

### Ejemplo 1: Flujo Completo de Pago con Tarjeta

```typescript
// 1. Cliente hace una orden
const order = await createOrder({
  restaurant_id: 'rest_123',
  items: [...],
  total: 250.00,
  customer_name: 'María García',
  customer_email: 'maria@example.com'
});

// 2. Frontend tokeniza la tarjeta
const cardToken = await tokenizeCard({
  card_number: '4111111111111111',
  holder_name: 'Maria Garcia',
  expiration_year: '25',
  expiration_month: '12',
  cvv2: '123'
});

// 3. Backend procesa el pago
const payment = await openpayService.processCardPayment({
  restaurantOpenpayId: restaurant.openpay_customer_id,
  orderId: order.order_number,
  amount: order.total,
  description: `Orden #${order.order_number}`,
  cardToken: cardToken,
  deviceSessionId: deviceSessionId,
  customerInfo: {
    name: order.customer_name,
    email: order.customer_email
  }
});

// 4. Webhook confirma el pago (automático)
// La orden se marca como "paid" automáticamente

console.log('✅ Pago completado:', payment.data?.id);
```

### Ejemplo 2: Reembolsar una Orden

```typescript
async function refundOrder(orderId: string, reason: string) {
  // 1. Obtener orden y restaurante
  const order = await getOrder(orderId);
  const restaurant = await getRestaurant(order.restaurant_id);

  // 2. Procesar reembolso
  const result = await openpayService.refundCharge(
    restaurant.openpay_customer_id,
    order.payment_transaction_id, // ID de la transacción de Openpay
    reason
  );

  if (result.success) {
    console.log('✅ Refund processed');
    // Webhook actualizará la orden automáticamente
  }
}
```

---

## 🧪 Testing en Sandbox

### Tarjetas de Prueba

Openpay proporciona estas tarjetas para testing:

| Tarjeta | Resultado |
|---------|-----------|
| `4111111111111111` | ✅ Aprobada |
| `4242424242424242` | ✅ Aprobada |
| `5555555555554444` | ✅ Aprobada (Mastercard) |
| `4000000000000002` | ❌ Declinada |
| `4000000000000069` | ❌ Declinada (tarjeta expirada) |
| `4000000000000127` | ❌ Declinada (CVV incorrecto) |

**Datos adicionales para testing:**
- **CVV**: Cualquier 3 dígitos (ej: `123`)
- **Fecha de expiración**: Cualquier fecha futura (ej: `12/25`)
- **Nombre**: Cualquier nombre

### Testing de Webhooks

Para probar webhooks localmente, usa **ngrok**:

```bash
# 1. Instalar ngrok
npm install -g ngrok

# 2. Exponer tu servidor local
ngrok http 3000

# 3. Copiar la URL pública (ej: https://abc123.ngrok.io)
# 4. Registrar en Openpay Dashboard: https://abc123.ngrok.io/webhooks/openpay
```

---

## 🚀 Migración a Producción

### 1. Obtener Credenciales de Producción

1. Completa el proceso de KYC (Know Your Customer) en Openpay
2. Openpay te proporcionará credenciales de producción
3. Actualiza tu `.env`:

```env
OPENPAY_MERCHANT_ID=tu_merchant_id_prod
OPENPAY_PRIVATE_KEY=sk_tu_private_key_prod
OPENPAY_PUBLIC_KEY=pk_tu_public_key_prod
OPENPAY_ENVIRONMENT=production
```

### 2. Checklist de Producción

- [ ] Credenciales de producción configuradas
- [ ] Webhook URL registrada con HTTPS
- [ ] Frontend usando Public Key de producción
- [ ] SSL/TLS habilitado en tu dominio
- [ ] Logs de errores configurados
- [ ] Monitoreo de webhooks activo
- [ ] Backup de transacciones implementado
- [ ] Pruebas end-to-end completadas

### 3. Seguridad

```typescript
// NUNCA hagas esto:
❌ const privateKey = 'sk_abc123...'; // Hardcoded

// Siempre usa variables de entorno:
✅ const privateKey = process.env.OPENPAY_PRIVATE_KEY;

// Valida siempre el origen de los webhooks:
✅ if (!validateWebhookSource(req)) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

---

## 🔍 Troubleshooting

### Problema 1: "Openpay service not initialized"

**Solución**: Asegúrate de llamar `openpayService.init()` al inicio de tu aplicación.

```typescript
// En tu archivo principal
import { openpayService } from './services/openpayService';
openpayService.init();
```

### Problema 2: Webhook no se recibe

**Diagnóstico**:
1. Verifica que la URL esté registrada en Openpay Dashboard
2. Asegúrate de que el endpoint responda 200
3. Revisa los logs del servidor
4. Usa ngrok para testing local

```bash
# Ver logs de webhooks en el controlador
[WEBHOOK] 📥 Received Openpay webhook: { type: 'charge.succeeded', ... }
```

### Problema 3: "Invalid card token"

**Causas comunes**:
- Token expiró (válido solo 5 minutos)
- Token ya fue usado
- Public Key incorrecta en el frontend

**Solución**: Genera un nuevo token antes de cada transacción.

### Problema 4: Pago se procesa pero orden no se actualiza

**Diagnóstico**:
1. Verifica que el webhook se esté recibiendo
2. Revisa los logs del webhook controller
3. Confirma que el `order_id` coincida con tu DB

```typescript
// El webhook busca por order_number
const orderId = transaction.order_id; // Debe coincidir con tu campo
```

---

## 📚 Recursos Adicionales

- [Documentación Oficial Openpay](https://www.openpay.mx/docs/)
- [API Reference](https://www.openpay.mx/docs/api/)
- [Sandbox Dashboard](https://sandbox-dashboard.openpay.mx)
- [Soporte Openpay](https://www.openpay.mx/soporte/)

---

## ✅ Checklist de Implementación

- [ ] Dependencias instaladas (`npm install openpay`)
- [ ] Variables de entorno configuradas
- [ ] Servicio inicializado en el backend
- [ ] Función de registro de restaurantes implementada
- [ ] Tokenización de tarjetas en el frontend
- [ ] Procesamiento de pagos en el backend
- [ ] Endpoint de webhooks creado
- [ ] Webhook URL registrada en Openpay
- [ ] Testing con tarjetas de prueba completado
- [ ] Manejo de errores implementado
- [ ] Logs y monitoreo configurados
- [ ] Documentación del equipo actualizada

---

## 🎉 ¡Listo!

Ahora tienes una integración completa de Openpay que permite a tus restaurantes recibir pagos directamente en sus cuentas bancarias, sin comisiones adicionales de tu plataforma.

**Próximos pasos recomendados**:
1. Implementar notificaciones por email/SMS al confirmar pagos
2. Agregar dashboard de transacciones para los restaurantes
3. Implementar reportes de conciliación automática
4. Agregar soporte para pagos en cuotas (meses sin intereses)

¿Preguntas? Revisa la sección de [Troubleshooting](#troubleshooting) o consulta la [documentación oficial de Openpay](https://www.openpay.mx/docs/).
