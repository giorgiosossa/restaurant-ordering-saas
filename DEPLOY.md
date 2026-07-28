# 🚀 Guía de Despliegue a Producción - Cocina Cantera POS

## Pre-requisitos

- ✅ Base de datos Supabase configurada y en producción
- ✅ Código limpio sin credenciales hardcoded
- ⏳ Credenciales de producción de Openpay (pendiente)

## Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Verificar que .env no esté en el repositorio
git status

# Si .env aparece, asegúrate de que está en .gitignore
echo ".env" >> .gitignore
git rm --cached .env  # Si ya fue commiteado antes
```

### 2. Configurar Variables de Entorno en Hosting

#### Opción A: Vercel (Recomendada)

1. Instalar Vercel CLI:
```bash
npm i -g vercel
```

2. Desplegar:
```bash
vercel
```

3. Configurar variables de entorno en Vercel Dashboard:
   - Ve a tu proyecto > Settings > Environment Variables
   - Agrega:
     ```
     VITE_SUPABASE_URL = https://rphwlsiwwxeqerakevvq.supabase.co
     VITE_SUPABASE_ANON_KEY = tu_anon_key_aqui
     ```

4. Redesplegar:
```bash
vercel --prod
```

#### Opción B: Netlify

1. Conectar repositorio en [netlify.com](https://netlify.com)

2. Configuración de Build:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. Variables de entorno (Site settings > Environment variables):
   ```
   VITE_SUPABASE_URL = https://rphwlsiwwxeqerakevvq.supabase.co
   VITE_SUPABASE_ANON_KEY = tu_anon_key_aqui
   ```

### 3. Configurar Supabase Edge Functions

```bash
# Login a Supabase
supabase login

# Link al proyecto
supabase link --project-ref rphwlsiwwxeqerakevvq

# Configurar secrets (para Edge Functions)
supabase secrets set SUPABASE_URL="https://rphwlsiwwxeqerakevvq.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"

# Desplegar todas las Edge Functions
supabase functions deploy
```

### 4. Verificar Base de Datos

```bash
# Verificar que todas las migraciones estén aplicadas
supabase db push

# Verificar RLS policies
supabase db execute --file database/setup.sql
```

### 5. Configurar Dominio Personalizado (Opcional)

#### En Vercel:
- Settings > Domains > Add Domain
- Sigue las instrucciones para configurar DNS

#### En Netlify:
- Domain settings > Add custom domain
- Configura los registros DNS

### 6. Habilitar Openpay (Cuando tengas credenciales de producción)

1. Actualizar variables de entorno en tu hosting:
   ```
   VITE_OPENPAY_MERCHANT_ID = tu_merchant_id_produccion
   VITE_OPENPAY_PUBLIC_KEY = tu_public_key_produccion
   VITE_OPENPAY_ENVIRONMENT = production
   ```

2. Configurar secrets de Supabase para Edge Functions:
   ```bash
   supabase secrets set OPENPAY_MERCHANT_ID="tu_merchant_id"
   supabase secrets set OPENPAY_PRIVATE_KEY="tu_private_key"
   supabase secrets set OPENPAY_ENVIRONMENT="production"
   supabase secrets set OPENPAY_WEBHOOK_URL="https://tu-dominio.com/webhooks/openpay"
   ```

3. Actualizar el código:
   ```typescript
   // En src/services/openpayFrontendService.ts
   const OPENPAY_ENABLED = true; // Cambiar de false a true
   ```

4. Redesplegar:
   ```bash
   git add .
   git commit -m "Enable Openpay for production"
   git push
   ```

### 7. Configurar Webhooks de Openpay

1. Ve al dashboard de Openpay
2. Configura el webhook URL:
   ```
   https://rphwlsiwwxeqerakevvq.supabase.co/functions/v1/openpay-webhook
   ```
3. Selecciona los eventos:
   - `charge.succeeded`
   - `charge.failed`
   - `charge.cancelled`
   - `charge.refunded`

## Checklist Post-Despliegue

- [ ] Aplicación accesible en URL de producción
- [ ] HTTPS funcionando correctamente
- [ ] Registro de nuevos restaurantes funcional
- [ ] Login de administrador funcional
- [ ] Login de restaurantes funcional
- [ ] Menú digital visible para clientes
- [ ] Pedidos por QR funcionando
- [ ] Pagos en terminal funcionando
- [ ] Pagos en efectivo funcionando
- [ ] Panel de cocina operativo
- [ ] Reportes generando correctamente
- [ ] Inventario funcionando
- [ ] Sistema de empleados operativo

## Estado Actual de Pagos en Línea

🚧 **DESHABILITADO TEMPORALMENTE**

Los métodos de pago de **tarjeta** y **transferencia bancaria** están deshabilitados hasta recibir credenciales de producción de Openpay.

Los clientes verán el siguiente mensaje:
> 💳 Los pagos en línea (tarjeta y transferencia) estarán disponibles próximamente. Estamos trabajando en ello.

### Métodos de Pago Disponibles:
✅ **Terminal en mesa** - El mesero cobra con terminal
✅ **Efectivo en barra** - Cliente paga en efectivo

### Métodos Pendientes (Openpay):
⏳ **Tarjeta de crédito/débito** - Requiere credenciales de producción
⏳ **Transferencia SPEI** - Requiere credenciales de producción

## Monitoreo

### Logs de Supabase
```bash
# Ver logs de Edge Functions
supabase functions logs --follow

# Ver logs de una función específica
supabase functions logs openpay-webhook --follow
```

### Errores en Producción
- Configura error tracking con [Sentry](https://sentry.io)
- Monitorea Analytics con Google Analytics o Plausible

## Backups

```bash
# Backup manual de la base de datos
supabase db dump > backup-$(date +%Y%m%d).sql
```

Configura backups automáticos en Supabase Dashboard:
- Database > Backups
- Habilita "Point in Time Recovery" (PITR) para proyectos Pro

## Soporte

- **Supabase**: [support@supabase.com](mailto:support@supabase.com)
- **Openpay**: [soporte@openpay.mx](mailto:soporte@openpay.mx)
- **Hosting (Vercel)**: [support@vercel.com](mailto:support@vercel.com)

---

**Última actualización**: 2026-07-28
