# 🚀 Guía de Openpay con Supabase Edge Functions

Implementación completa de Openpay usando Supabase Edge Functions para tu SaaS de restaurantes.

---

## 📋 Contenido

1. [Funciones Creadas](#funciones-creadas)
2. [Despliegue de Funciones](#despliegue-de-funciones)
3. [Uso desde el Frontend](#uso-desde-el-frontend)
4. [Configuración de Webhooks](#configuración-de-webhooks)
5. [Testing](#testing)

---

## 🎯 Funciones Creadas

Se han creado **4 Edge Functions** en `supabase/functions/`:

### 1. `openpay-register-restaurant`
Registra un restaurante en Openpay con su cuenta bancaria.

**Endpoint**: `POST /functions/v1/openpay-register-restaurant`

**Body**:
```json
{
  "restaurantId": "rest_123",
  "businessName": "Tacos El Güero",
  "rfc": "XAXX010101000",
  "email": "contacto@ejemplo.com",
  "phone": "5512345678",
  "address": {
    "line1": "Calle Principal 123",
    "postal_code": "06000",
    "state": "CDMX",
    "city": "Ciudad de México",
    "country_code": "MX"
  },
  "bankAccount": {
    "clabe": "012298026516924616",
    "holder_name": "Tacos El Güero SA",
    "bank_name": "BBVA Bancomer"
  }
}
```

### 2. `openpay-charge`
Procesa un pago con tarjeta (usando token).

**Endpoint**: `POST /functions/v1/openpay-charge`

**Body**:
```json
{
  "orderId": "ORD-12345",
  "cardToken": "tok_abc123...",
  "deviceSessionId": "device123...",
  "amount": 250.00,
  "description": "Orden #12345"
}
```

### 3. `openpay-codi`
Genera un código QR para pago con CoDi.

**Endpoint**: `POST /functions/v1/openpay-codi`

**Body**:
```json
{
  "orderId": "ORD-12345",
  "amount": 250.00,
  "description": "Orden #12345",
  "dueDate": "2025-07-25T23:59:59Z"
}
```

### 4. `openpay-webhook`
Recibe notificaciones de Openpay sobre el estado de los pagos.

**Endpoint**: `POST /functions/v1/openpay-webhook`

---

## 🚀 Despliegue de Funciones

### 1. Configurar Variables de Entorno en Supabase

Las funciones ya están configuradas para leer las variables del archivo `.env` local. Para producción, configura los secretos en Supabase:

```bash
# Configurar secretos de Openpay
supabase secrets set OPENPAY_MERCHANT_ID=mbdayyuhcki0qyt3sjsx
supabase secrets set OPENPAY_PRIVATE_KEY=sk_9609869aed4f4113990c47bb50ea5e1a
supabase secrets set OPENPAY_PUBLIC_KEY=pk_3d0f7efb1ab64999b80bbe271536337f
supabase secrets set OPENPAY_ENVIRONMENT=sandbox
```

### 2. Desplegar las Funciones

```bash
# Desplegar todas las funciones a la vez
supabase functions deploy openpay-register-restaurant
supabase functions deploy openpay-charge
supabase functions deploy openpay-codi
supabase functions deploy openpay-webhook

# O desplegar todas a la vez
supabase functions deploy
```

### 3. Verificar el Despliegue

```bash
# Listar funciones desplegadas
supabase functions list

# Ver logs de una función
supabase functions logs openpay-charge
```

---

## 💻 Uso desde el Frontend

### 1. Configurar Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rphwlsiwwxeqerakevvq.supabase.co',
  'tu-anon-key'
);
```

### 2. Registrar un Restaurante

```typescript
async function registerRestaurantInOpenpay(restaurantData) {
  const { data, error } = await supabase.functions.invoke('openpay-register-restaurant', {
    body: {
      restaurantId: restaurantData.id,
      businessName: restaurantData.name,
      rfc: restaurantData.rfc,
      email: restaurantData.email,
      phone: restaurantData.phone,
      address: {
        line1: restaurantData.address,
        postal_code: restaurantData.postal_code,
        state: restaurantData.state,
        city: restaurantData.city,
        country_code: 'MX',
      },
      bankAccount: {
        clabe: restaurantData.clabe,
        holder_name: restaurantData.bank_holder_name,
        bank_name: restaurantData.bank_name,
      },
    },
  });

  if (error) {
    console.error('Error registering restaurant:', error);
    return null;
  }

  console.log('Restaurant registered!', data);
  return data;
}
```

### 3. Tokenizar Tarjeta y Procesar Pago

#### Paso 1: Incluir Openpay.js en tu HTML

```html
<!-- En tu index.html -->
<script src="https://resources.openpay.mx/openpay.v1.min.js"></script>
<script src="https://resources.openpay.mx/openpay-data.v1.min.js"></script>
```

#### Paso 2: Configurar Openpay en el Frontend

```typescript
// Configurar Openpay (una sola vez al cargar la app)
declare const OpenPay: any;

OpenPay.setId('mbdayyuhcki0qyt3sjsx');
OpenPay.setApiKey('pk_3d0f7efb1ab64999b80bbe271536337f');
OpenPay.setSandboxMode(true);

// Obtener Device Session ID
const deviceSessionId = OpenPay.deviceData.setup();
```

#### Paso 3: Tokenizar y Pagar

```typescript
async function processCardPayment(orderNumber, cardData) {
  try {
    // 1. Tokenizar la tarjeta (frontend)
    const token = await new Promise((resolve, reject) => {
      OpenPay.token.create(
        {
          card_number: cardData.cardNumber,
          holder_name: cardData.holderName,
          expiration_year: cardData.expirationYear,
          expiration_month: cardData.expirationMonth,
          cvv2: cardData.cvv,
        },
        (response) => resolve(response.data.id),
        (error) => reject(error)
      );
    });

    console.log('Card tokenized:', token);

    // 2. Procesar el pago (backend via Edge Function)
    const { data, error } = await supabase.functions.invoke('openpay-charge', {
      body: {
        orderId: orderNumber,
        cardToken: token,
        deviceSessionId: deviceSessionId,
        amount: 250.00,
        description: `Orden #${orderNumber}`,
      },
    });

    if (error) {
      console.error('Payment failed:', error);
      alert('Error al procesar el pago: ' + error.message);
      return null;
    }

    console.log('Payment successful!', data);
    alert('¡Pago procesado exitosamente!');
    return data;
  } catch (error) {
    console.error('Error:', error);
    alert('Error al procesar el pago');
    return null;
  }
}

// Ejemplo de uso:
await processCardPayment('ORD-12345', {
  cardNumber: '4111111111111111',
  holderName: 'Juan Pérez',
  expirationYear: '25',
  expirationMonth: '12',
  cvv: '123',
});
```

### 4. Generar Pago con CoDi (QR)

```typescript
async function createCodiPayment(orderNumber, amount) {
  const { data, error } = await supabase.functions.invoke('openpay-codi', {
    body: {
      orderId: orderNumber,
      amount: amount,
      description: `Orden #${orderNumber}`,
    },
  });

  if (error) {
    console.error('Error creating CoDi payment:', error);
    return null;
  }

  console.log('CoDi payment created:', data);

  // Mostrar QR al usuario
  const qrCodeUrl = data.data.qrCodeUrl;
  const reference = data.data.reference;

  // Puedes mostrar el QR en una imagen:
  // <img src={qrCodeUrl} alt="Código QR para pago" />

  return data;
}
```

---

## 🔔 Configuración de Webhooks

### 1. URL del Webhook

Usa esta URL para registrar en Openpay Dashboard:

**Sandbox**:
```
https://rphwlsiwwxeqerakevvq.supabase.co/functions/v1/openpay-webhook
```

**Producción** (cuando estés listo):
```
https://tu-proyecto.supabase.co/functions/v1/openpay-webhook
```

### 2. Registrar en Openpay Dashboard

1. Ve a: https://sandbox-dashboard.openpay.mx/webhooks
2. Click en "Agregar Webhook"
3. Pega la URL de arriba
4. Selecciona eventos:
   - ✅ `charge.succeeded`
   - ✅ `charge.failed`
   - ✅ `charge.cancelled`
   - ✅ `charge.refunded`
   - ✅ `charge.chargeback.created`
5. Guarda

### 3. El Webhook Actualiza Automáticamente

Cuando un pago sea exitoso, el webhook:
- ✅ Marca la orden como "PAGADO" (`payment_status = 'paid'`)
- ✅ Cambia el estado a "ACEPTADO" (`status = 'accepted'`)
- ✅ Desbloquea la orden (`is_blocked = false`)
- ✅ Guarda el ID de transacción de Openpay

---

## 🧪 Testing

### Tarjetas de Prueba

| Número | Resultado |
|--------|-----------|
| `4111111111111111` | ✅ Aprobada |
| `4242424242424242` | ✅ Aprobada |
| `5555555555554444` | ✅ Aprobada (Mastercard) |
| `4000000000000002` | ❌ Declinada |

**Datos adicionales**:
- CVV: Cualquier 3 dígitos (ej: `123`)
- Expiración: Cualquier fecha futura (ej: `12/25`)
- Nombre: Cualquier nombre

### Probar Localmente

```bash
# Iniciar funciones localmente
supabase functions serve

# Tus funciones estarán disponibles en:
# http://localhost:54321/functions/v1/openpay-charge
# http://localhost:54321/functions/v1/openpay-codi
# etc.
```

### Probar con cURL

```bash
# Probar procesamiento de pago
curl -X POST https://rphwlsiwwxeqerakevvq.supabase.co/functions/v1/openpay-charge \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-TEST-123",
    "cardToken": "tok_test_abc123",
    "amount": 100.00,
    "description": "Test payment"
  }'
```

---

## 📊 Ver Logs

```bash
# Ver logs en tiempo real
supabase functions logs openpay-charge --tail

# Ver logs de webhook
supabase functions logs openpay-webhook --tail

# Ver logs con filtro
supabase functions logs openpay-charge --grep "ERROR"
```

---

## ✅ Checklist de Implementación

- [ ] Variables de entorno configuradas en Supabase
- [ ] Funciones desplegadas (`supabase functions deploy`)
- [ ] Openpay.js incluido en el frontend
- [ ] Tokenización de tarjetas implementada
- [ ] Llamadas a Edge Functions desde el frontend
- [ ] Webhook URL registrada en Openpay Dashboard
- [ ] Testing con tarjetas de prueba completado
- [ ] Columna `openpay_customer_id` agregada a tabla `restaurants`
- [ ] Flujo completo probado end-to-end

---

## 🔗 URLs Útiles

- **Supabase Dashboard**: https://app.supabase.com/project/rphwlsiwwxeqerakevvq
- **Openpay Sandbox**: https://sandbox-dashboard.openpay.mx
- **Documentación Openpay**: https://www.openpay.mx/docs/

---

## 🎉 ¡Listo!

Ahora tienes Openpay completamente integrado con Supabase Edge Functions. Los pagos van directo a las cuentas bancarias de tus restaurantes, sin pasar por tu plataforma.

**Próximos pasos**:
1. Desplegar las funciones a Supabase
2. Registrar el webhook en Openpay
3. Probar el flujo completo con tarjetas de prueba
4. Implementar la UI de pago en tu frontend
